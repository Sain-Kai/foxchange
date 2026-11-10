import { findAllCycles } from "@/lib/bellman-ford";
import { buildGraph } from "@/lib/graph";
import { buildFiatRateMatrix, buildCryptoRateMatrix } from "@/lib/rates";
import { CURRENCY_CODES, CRYPTO_CODES } from "@/lib/currencies";
import type { ScanResponse } from "@/types/graph";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = (searchParams.get("market") || "fiat").toLowerCase() as "fiat" | "crypto";
  const threshold = parseFloat(searchParams.get("threshold") ?? "0");
  const feePct = parseFloat(searchParams.get("fee") ?? "0"); // fee in % (e.g. 0.1 for 0.1%)
  const feeFraction = Math.max(0, feePct / 100);
  const date = searchParams.get("date") ?? undefined;
  const minHops = parseInt(searchParams.get("minHops") ?? "3", 10);
  const simAmount = parseFloat(searchParams.get("simAmount") ?? "10000");

  try {
    let rates;
    let timestamp = new Date().toISOString();

    if (market === "crypto") {
      const cryptoResult = await buildCryptoRateMatrix(CRYPTO_CODES);
      rates = cryptoResult.matrix;
      timestamp = cryptoResult.timestamp;
    } else {
      const fiatResult = await buildFiatRateMatrix(CURRENCY_CODES, date);
      rates = fiatResult.matrix;
    }

    const graph = buildGraph(rates, feeFraction);
    const allCycles = findAllCycles(graph, { minHops, simulationAmount: simAmount });
    const cycles = allCycles.filter((c) => c.profitPct >= threshold);

    const response: ScanResponse = {
      cycles,
      graph,
      timestamp,
      market,
      fee: feeFraction,
      date,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: "Scan failed", message: String(err) },
      { status: 503 }
    );
  }
}
