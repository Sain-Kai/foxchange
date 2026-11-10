import type { RateMatrix } from "@/types/graph";
import { CURRENCY_CODES, CRYPTO_CODES } from "./currencies";

// Frankfurter API endpoint (updated to v1 to prevent Cloudflare 301 redirects)
const FRANKFURTER_BASE = "https://api.frankfurter.dev/v1";
const OPEN_EXCHANGE_BASE = "https://open.er-api.com/v6/latest";
const BINANCE_TICKER_API = "https://api.binance.com/api/v3/ticker/bookTicker";

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface OpenERResponse {
  result: string;
  rates: Record<string, number>;
  time_last_update_utc?: string;
}

interface BinanceBookTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}

// In-memory TTL caches to minimize external API hits
let cachedFiatMatrix: RateMatrix | null = null;
let cachedFiatTimestamp = 0;

let cachedCryptoMatrix: RateMatrix | null = null;
let cachedCryptoTimestamp = 0;

const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Build a full NxN fiat rate matrix.
 * Primary source: Frankfurter API (ECB reference rates).
 * Secondary fallback: Open Exchange Rates API.
 */
export async function buildFiatRateMatrix(
  currencies: string[] = CURRENCY_CODES,
  date?: string // "YYYY-MM-DD" for historical, omit for latest
): Promise<{ matrix: RateMatrix; date: string; source: string }> {
  const now = Date.now();

  // Return cache if still fresh (only for live rates, not historical queries)
  if (!date && cachedFiatMatrix && now - cachedFiatTimestamp < CACHE_TTL_MS) {
    return { matrix: cachedFiatMatrix, date: "live-cache", source: "Frankfurter (Cached)" };
  }

  const endpoint = date ? `/${date}` : "/latest";
  const symbols = currencies.join(",");

  // 1. Try Frankfurter API
  try {
    const res = await fetch(
      `${FRANKFURTER_BASE}${endpoint}?base=USD&symbols=${symbols}`,
      { next: { revalidate: 60 } }
    );

    if (res.ok) {
      const data: FrankfurterResponse = await res.json();
      const usdRates: Record<string, number> = { USD: 1, ...data.rates };
      const matrix: RateMatrix = {};

      for (const from of currencies) {
        matrix[from] = {};
        for (const to of currencies) {
          if (from !== to) {
            const rateFromUSD = usdRates[from];
            const rateToUSD = usdRates[to];
            if (rateFromUSD && rateToUSD) {
              matrix[from][to] = rateToUSD / rateFromUSD;
            }
          }
        }
      }

      if (!date) {
        cachedFiatMatrix = matrix;
        cachedFiatTimestamp = now;
      }

      return {
        matrix,
        date: data.date || (date ?? new Date().toISOString().slice(0, 10)),
        source: "European Central Bank (Frankfurter)",
      };
    }
  } catch (err) {
    console.warn("Frankfurter API unavailable, attempting Open Exchange Rates fallback:", err);
  }

  // 2. Fallback to Open Exchange Rates (for live queries)
  if (!date) {
    try {
      const res = await fetch(`${OPEN_EXCHANGE_BASE}/USD`, {
        next: { revalidate: 120 },
      });
      if (res.ok) {
        const data: OpenERResponse = await res.json();
        const usdRates: Record<string, number> = { USD: 1, ...data.rates };
        const matrix: RateMatrix = {};

        for (const from of currencies) {
          matrix[from] = {};
          for (const to of currencies) {
            if (from !== to) {
              const rateFromUSD = usdRates[from];
              const rateToUSD = usdRates[to];
              if (rateFromUSD && rateToUSD) {
                matrix[from][to] = rateToUSD / rateFromUSD;
              }
            }
          }
        }

        cachedFiatMatrix = matrix;
        cachedFiatTimestamp = now;

        return {
          matrix,
          date: new Date().toISOString().slice(0, 10),
          source: "Open Exchange Rates (Fallback)",
        };
      }
    } catch (err) {
      console.warn("Open Exchange Rates fallback failed:", err);
    }
  }

  // 3. Fallback to stale cache
  if (cachedFiatMatrix) {
    console.warn("Using stale fiat cache");
    return { matrix: cachedFiatMatrix, date: "stale-cache", source: "Stale Cache" };
  }

  throw new Error("Unable to retrieve fiat exchange rates from any provider.");
}

/**
 * Build a real NxN cryptocurrency exchange rate matrix using Binance orderbook quotes.
 * 
 * Unlike fiat synthetic cross-rates, crypto pairs (e.g. BTC/USDT, ETH/BTC, ETH/USDT)
 * trade on independent order books with actual bid/ask prices where real triangular arbitrage exists!
 */
export async function buildCryptoRateMatrix(
  tokens: string[] = CRYPTO_CODES
): Promise<{ matrix: RateMatrix; timestamp: string; source: string }> {
  const now = Date.now();

  if (cachedCryptoMatrix && now - cachedCryptoTimestamp < 15_000) {
    return {
      matrix: cachedCryptoMatrix,
      timestamp: new Date(cachedCryptoTimestamp).toISOString(),
      source: "Binance Orderbook (Cached)",
    };
  }

  try {
    const res = await fetch(BINANCE_TICKER_API, { cache: "no-store" });
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);

    const tickers: BinanceBookTicker[] = await res.json();
    const tickerMap = new Map<string, { bid: number; ask: number }>();

    for (const t of tickers) {
      const bid = parseFloat(t.bidPrice);
      const ask = parseFloat(t.askPrice);
      if (bid > 0 && ask > 0) {
        tickerMap.set(t.symbol, { bid, ask });
      }
    }

    const matrix: RateMatrix = {};

    for (const from of tokens) {
      matrix[from] = {};
      for (const to of tokens) {
        if (from === to) continue;

        // Direct pair: e.g. from=ETH, to=USDT -> sell ETH for USDT at bid price of ETHUSDT
        const directSymbol = from + to;
        const direct = tickerMap.get(directSymbol);
        if (direct && direct.bid > 0) {
          matrix[from][to] = direct.bid;
          continue;
        }

        // Inverted pair: e.g. from=USDT, to=ETH -> buy ETH with USDT at 1 / ask price of ETHUSDT
        const invertedSymbol = to + from;
        const inverted = tickerMap.get(invertedSymbol);
        if (inverted && inverted.ask > 0) {
          matrix[from][to] = 1 / inverted.ask;
          continue;
        }

        // Cross-pair via USDT intermediary if no direct book exists
        const fromUsdt = tickerMap.get(from + "USDT");
        const toUsdt = tickerMap.get(to + "USDT");
        if (fromUsdt && toUsdt && toUsdt.ask > 0) {
          matrix[from][to] = fromUsdt.bid / toUsdt.ask;
        }
      }
    }

    cachedCryptoMatrix = matrix;
    cachedCryptoTimestamp = now;

    return {
      matrix,
      timestamp: new Date().toISOString(),
      source: "Binance Public Orderbook",
    };
  } catch (err) {
    if (cachedCryptoMatrix) {
      return {
        matrix: cachedCryptoMatrix,
        timestamp: new Date(cachedCryptoTimestamp).toISOString(),
        source: "Binance (Stale Cache)",
      };
    }
    throw err;
  }
}

/**
 * Backward compatibility wrapper for buildRateMatrix.
 */
export async function buildRateMatrix(
  currencies: string[] = CURRENCY_CODES,
  date?: string
): Promise<RateMatrix> {
  const result = await buildFiatRateMatrix(currencies, date);
  return result.matrix;
}
