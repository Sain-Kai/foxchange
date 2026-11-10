import { describe, expect, it } from "vitest";
import {
  buildGraph,
  computeProfit,
  hashCyclePath,
  rateFromWeight,
  simulateExecution,
} from "../graph";

describe("buildGraph", () => {
  it("applies -log transform to rates", () => {
    const rates = { USD: { EUR: 0.9 }, EUR: { USD: 1 / 0.9 } };
    const graph = buildGraph(rates);
    expect(graph.nodes).toContain("USD");
    expect(graph.nodes).toContain("EUR");
    const usdEur = graph.edges.find((e) => e.from === "USD" && e.to === "EUR");
    expect(usdEur).toBeDefined();
    expect(usdEur!.weight).toBeCloseTo(-Math.log(0.9), 10);
    expect(usdEur!.rawRate).toBe(0.9);
  });

  it("applies fee-aware weight transform w = -log(rate * (1 - fee))", () => {
    const rates = { USD: { EUR: 0.9 } };
    const fee = 0.001; // 0.1%
    const graph = buildGraph(rates, fee);
    const usdEur = graph.edges.find((e) => e.from === "USD" && e.to === "EUR");
    expect(usdEur).toBeDefined();
    expect(usdEur!.weight).toBeCloseTo(-Math.log(0.9 * (1 - fee)), 10);
    expect(usdEur!.fee).toBe(fee);
  });

  it("excludes self-edges", () => {
    const rates = { USD: { USD: 1, EUR: 0.9 }, EUR: { USD: 1.1 } };
    const graph = buildGraph(rates);
    expect(graph.edges.every((e) => e.from !== e.to)).toBe(true);
  });
});

describe("rateFromWeight", () => {
  it("is inverse of -log transform", () => {
    const rate = 0.85;
    const weight = -Math.log(rate);
    expect(rateFromWeight(weight)).toBeCloseTo(rate, 10);
  });

  it("handles fee in inverse calculation", () => {
    const rate = 0.85;
    const fee = 0.002;
    const weight = -Math.log(rate * (1 - fee));
    expect(rateFromWeight(weight, fee)).toBeCloseTo(rate, 10);
  });
});

describe("computeProfit", () => {
  it("returns 0 for balanced rates", () => {
    expect(computeProfit([1, 1, 1])).toBeCloseTo(0);
  });

  it("returns positive profit for arbitrage cycle without fees", () => {
    // 0.9 * 0.8 * 1.5 = 1.08 → 8% profit
    expect(computeProfit([0.9, 0.8, 1.5])).toBeCloseTo(0.08, 5);
  });

  it("deducts fees from net profit correctly", () => {
    // 1.08 * (1 - 0.01)^3 = 1.08 * 0.970299 = 1.047923
    const netProfit = computeProfit([0.9, 0.8, 1.5], 0.01);
    expect(netProfit).toBeCloseTo(0.047923, 5);
  });
});

describe("simulateExecution", () => {
  it("calculates step-by-step cash flow and net profit", () => {
    const path = ["USD", "EUR", "GBP", "USD"];
    const rates = [0.95, 0.86, 1.24837];
    const simulation = simulateExecution(path, rates, 10000, 0);

    expect(simulation.startAmount).toBe(10000);
    expect(simulation.startCurrency).toBe("USD");
    expect(simulation.steps.length).toBe(3);
    expect(simulation.finalAmount).toBeCloseTo(10199.18, 1);
    expect(simulation.netProfitAmount).toBeCloseTo(199.18, 1);
    expect(simulation.netProfitPct).toBeCloseTo(1.992, 2);
  });
});

describe("hashCyclePath", () => {
  it("produces same hash for rotated paths", () => {
    const h1 = hashCyclePath(["USD", "EUR", "JPY", "USD"]);
    const h2 = hashCyclePath(["EUR", "JPY", "USD", "EUR"]);
    const h3 = hashCyclePath(["JPY", "USD", "EUR", "JPY"]);
    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
  });

  it("produces different hashes for different cycles", () => {
    const h1 = hashCyclePath(["USD", "EUR", "JPY", "USD"]);
    const h2 = hashCyclePath(["USD", "GBP", "JPY", "USD"]);
    expect(h1).not.toBe(h2);
  });
});
