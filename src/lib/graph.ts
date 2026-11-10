import type { Edge, ExecutionSimulation, ExecutionStep, Graph, RateMatrix } from "@/types/graph";

/**
 * Transform a rate matrix into a weighted directed graph.
 * Edge weight = -log(rate * (1 - fee))
 * 
 * When fee > 0:
 * w = -log(rate * (1 - fee)) = -log(rate) - log(1 - fee)
 * A negative cycle implies sum(-log(rate * (1 - fee))) < 0
 * <=> product(rate * (1 - fee)) > 1.0 (profitable even after transaction costs!)
 */
export function buildGraph(rates: RateMatrix, fee: number = 0): Graph {
  const nodes = Object.keys(rates);
  const edges: Edge[] = [];

  // Clamp fee to valid range [0, 0.99]
  const validFee = Math.max(0, Math.min(fee, 0.99));
  const feeMultiplier = 1 - validFee;

  for (const from of nodes) {
    if (!rates[from]) continue;
    for (const [to, rate] of Object.entries(rates[from])) {
      if (from !== to && rate > 0) {
        const netRate = rate * feeMultiplier;
        edges.push({
          from,
          to,
          weight: -Math.log(netRate),
          rawRate: rate,
          fee: validFee,
        });
      }
    }
  }

  return { nodes, edges, fee: validFee };
}

/** Inverse of the log transform */
export function rateFromWeight(w: number, fee: number = 0): number {
  const validFee = Math.max(0, Math.min(fee, 0.99));
  return Math.exp(-w) / (1 - validFee);
}

/**
 * Given an array of per-hop rates along a cycle,
 * returns the net profit as a fraction (e.g. 0.01 = 1%).
 * If fee is provided, each hop's rate is multiplied by (1 - fee).
 */
export function computeProfit(rates: number[], fee: number = 0): number {
  const validFee = Math.max(0, Math.min(fee, 0.99));
  const feeFactor = 1 - validFee;
  return rates.reduce((product, r) => product * (r * feeFactor), 1) - 1;
}

/**
 * Deterministic ID for a cycle — canonical rotation (smallest node first),
 * then join with ">".
 */
export function hashCyclePath(path: string[]): string {
  // path includes repeated start node at end: ["USD","EUR","JPY","USD"]
  const loop = path.slice(0, -1); // drop the closing duplicate
  if (loop.length === 0) return "";
  const sorted = [...loop].sort();
  const minIdx = loop.indexOf(sorted[0]);
  const rotated = [...loop.slice(minIdx), ...loop.slice(0, minIdx)];
  return rotated.join(">");
}

/**
 * Simulate an actual end-to-end execution of the arbitrage loop
 * starting with a specific capital amount (e.g. 10,000 USD).
 */
export function simulateExecution(
  path: string[],
  rates: number[],
  startAmount: number = 10000,
  fee: number = 0
): ExecutionSimulation {
  const startCurrency = path[0] || "USD";
  const steps: ExecutionStep[] = [];
  let currentBalance = startAmount;
  let totalFeesPaid = 0;
  const loop = path.slice(0, -1);

  for (let i = 0; i < loop.length; i++) {
    const from = loop[i];
    const to = loop[(i + 1) % loop.length];
    const rate = rates[i] ?? 1;

    const startBalance = currentBalance;
    const grossBalance = startBalance * rate;
    const feeAmount = grossBalance * fee;
    const netBalance = grossBalance - feeAmount;

    totalFeesPaid += feeAmount;
    currentBalance = netBalance;

    steps.push({
      hop: i + 1,
      from,
      to,
      rate,
      fee,
      startBalance,
      grossBalance,
      feeAmount,
      netBalance,
    });
  }

  const finalAmount = currentBalance;
  const netProfitAmount = finalAmount - startAmount;
  const netProfitPct = (netProfitAmount / startAmount) * 100;

  return {
    startAmount,
    startCurrency,
    finalAmount,
    netProfitAmount,
    netProfitPct,
    totalFeesPaid,
    steps,
  };
}
