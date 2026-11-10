import { runBellmanFord } from "@/lib/bellman-ford";
import { buildGraph } from "@/lib/graph";
import { buildFiatRateMatrix, buildCryptoRateMatrix } from "@/lib/rates";
import { CURRENCY_CODES, CRYPTO_CODES } from "@/lib/currencies";
import { PRESETS } from "@/lib/presets";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const market = (searchParams.get("market") || "fiat").toLowerCase();
  const feePct = parseFloat(searchParams.get("fee") ?? "0");
  const feeFraction = Math.max(0, feePct / 100);
  const date = searchParams.get("date") ?? undefined;

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

    let graph = buildGraph(rates, feeFraction);

    // 1. Try to find the cycle from live market graph
    for (const source of graph.nodes) {
      const result = runBellmanFord(graph, source, { instrument: true });
      const cycle = result.cycles.find((c) => c.id === id);

      if (cycle) {
        return NextResponse.json({
          cycle,
          steps: result.steps,
          graph,
          source,
          timestamp,
        });
      }
    }

    // 2. If not found in live rates, check our presets (in case the cycle is from the sandbox presets)
    for (const preset of Object.values(PRESETS)) {
      const pGraph = preset.graph;
      for (const source of pGraph.nodes) {
        const pResult = runBellmanFord(pGraph, source, { instrument: true });
        const pCycle = pResult.cycles.find((c) => c.id === id);
        if (pCycle) {
          return NextResponse.json({
            cycle: pCycle,
            steps: pResult.steps,
            graph: pGraph,
            source,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({ error: "Cycle not found or expired" }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load cycle", message: String(err) },
      { status: 503 }
    );
  }
}
