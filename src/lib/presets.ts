import type { Graph } from "@/types/graph";
import { buildGraph } from "./graph";

// VIT Vellore Research Paper (Bhandary & Srivastava):
// Exactly reproduces the 1.992% cycle (EUR -> GBP -> USD -> EUR)
// With realistic bid/ask spreads so 2-node loops are unprofitable (<1.0)
// and only the forward 3-node triangular loop yields +1.992% profit:
// 1.24837 (GBP→USD) × 0.95 (USD→EUR) × 0.86 (EUR→GBP) = 1.01992
const vitPaperRates = {
  USD: { EUR: 0.95, GBP: 0.80 },
  EUR: { USD: 1.05, GBP: 0.86 },
  GBP: { USD: 1.24837, EUR: 1.16 },
};

// Crypto 4-node arbitrage cycle (USDT -> BTC -> ETH -> BNB -> USDT)
// Net loop: (1 / 73500) * 35.8 * 0.332 * 685 ≈ 1.021 (+2.10% profit)
const cryptoArbitrageRates = {
  USDT: { BTC: 0.000013605, ETH: 0.000485, BNB: 0.00146 },
  BTC: { USDT: 73500, ETH: 35.8, BNB: 107.5 },
  ETH: { USDT: 2060, BTC: 0.0279, BNB: 0.332 },
  BNB: { USDT: 685, BTC: 0.0093, ETH: 3.01 },
};

// Fee-Breakeven Trap:
// Loop gross profit is +0.22% (1.0022), but with a standard 0.1% exchange fee per hop:
// Net multiplier = 1.0022 * (1 - 0.001)^3 = 1.0022 * 0.997003 = 0.999199 (-0.08% net loss!)
const feeTrapRates = {
  USD: { EUR: 0.92, GBP: 0.78 },
  EUR: { USD: 1.085, GBP: 0.86 },
  GBP: { USD: 1.26667, EUR: 1.16 },
};

// 4-node graph with a planted ~8% arbitrage cycle A→B→C→A
// 0.9 * 0.8 * 1.5 = 1.08
const textbookRates = {
  A: { B: 0.9, C: 0.7, D: 1.1 },
  B: { A: 1.05, C: 0.8, D: 0.95 },
  C: { A: 1.5, B: 1.2, D: 0.88 },
  D: { A: 0.92, B: 1.04, C: 1.15 },
};

// Balanced graph — zero arbitrage (all cycle products ≈ 1)
const balancedRates = {
  X: { Y: 1.3, Z: 0.75 },
  Y: { X: 0.76923, Z: 0.57692 },
  Z: { X: 1.33333, Y: 1.73333 },
};

export const PRESETS = {
  triangle: {
    label: "Paper Benchmark (1.992%)",
    description: "EUR → GBP → USD → EUR with the exact 1.992% cycle from the VIT paper",
    graph: buildGraph(vitPaperRates),
    rates: vitPaperRates,
  },
  crypto: {
    label: "Crypto Arbitrage (Binance)",
    description: "4-node crypto triangle (USDT, BTC, ETH, BNB) with realistic orderbook spreads",
    graph: buildGraph(cryptoArbitrageRates),
    rates: cryptoArbitrageRates,
  },
  feeTrap: {
    label: "Fee-Breakeven Trap",
    description: "Profitable at 0% fee (+0.22%), but turns negative when 0.1% fee is applied",
    graph: buildGraph(feeTrapRates),
    rates: feeTrapRates,
  },
  textbook: {
    label: "Textbook (4 nodes)",
    description: "4-node graph with planted 8% arbitrage cycle A→B→C→A",
    graph: buildGraph(textbookRates),
    rates: textbookRates,
  },
  balanced: {
    label: "No Arbitrage (Parity)",
    description: "Balanced rates — cycle products = 1.0, Bellman-Ford converges normally",
    graph: buildGraph(balancedRates),
    rates: balancedRates,
  },
} as const;

export type PresetKey = keyof typeof PRESETS;
