import type { BFResult, BFStep, CycleResult, Graph } from "@/types/graph";
import { computeProfit, hashCyclePath, simulateExecution } from "./graph";

const INF = Infinity;
const EPSILON = 1e-9; // Floating point precision tolerance

export interface BFOptions {
  /** Record every edge relaxation attempt for animation playback */
  instrument?: boolean;
  /** Minimum number of distinct nodes in a cycle (defaults to 3 to avoid reciprocal floating-point noise) */
  minHops?: number;
  /** Capital amount for trade simulation (defaults to 10000) */
  simulationAmount?: number;
}

/**
 * Run Bellman-Ford from a source node.
 *
 * On the V-th pass, we trace back through the predecessor array
 * to reconstruct negative cycles reachable from the source.
 */
export function runBellmanFord(
  graph: Graph,
  source: string,
  options: BFOptions = {}
): BFResult {
  const { nodes, edges } = graph;
  const V = nodes.length;
  const minHops = options.minHops ?? 3;
  const simAmount = options.simulationAmount ?? 10000;
  const fee = graph.fee ?? 0;

  const dist: Record<string, number> = {};
  const pred: Record<string, string | null> = {};

  for (const n of nodes) {
    dist[n] = INF;
    pred[n] = null;
  }
  dist[source] = 0;

  const steps: BFStep[] = [];

  // V-1 relaxation passes
  for (let i = 0; i < V - 1; i++) {
    for (let ei = 0; ei < edges.length; ei++) {
      const edge = edges[ei];
      const { from, to, weight } = edge;

      if (dist[from] === INF) {
        if (options.instrument) {
          steps.push({
            iteration: i,
            edgeIndex: ei,
            edge,
            relaxed: false,
            distances: { ...dist },
          });
        }
        continue;
      }

      const newDist = dist[from] + weight;
      // Using EPSILON to avoid spurious relaxations from floating-point noise
      const relaxed = newDist < dist[to] - EPSILON;

      if (relaxed) {
        dist[to] = newDist;
        pred[to] = from;
      }

      if (options.instrument) {
        steps.push({
          iteration: i,
          edgeIndex: ei,
          edge,
          relaxed,
          distances: { ...dist },
          updated: relaxed ? to : undefined,
        });
      }
    }
  }

  // V-th pass: detect negative cycles
  const cycleNodes = new Set<string>();
  for (const edge of edges) {
    const { from, to, weight } = edge;
    if (dist[from] !== INF && dist[from] + weight < dist[to] - EPSILON) {
      cycleNodes.add(to);
    }
  }

  // Reconstruct each unique cycle
  const seenIds = new Set<string>();
  const cycles: CycleResult[] = [];

  for (const startNode of cycleNodes) {
    const cycle = traceCycle(pred, startNode, V);
    if (!cycle) continue;

    // Filter out micro-cycles shorter than minHops (e.g. A->B->A is 2 hops)
    // A 3-hop cycle path is [A, B, C, A], which has length 4
    if (cycle.length - 1 < minHops) continue;

    const id = hashCyclePath(cycle);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    // Collect per-hop rates and edge weights
    const rates: number[] = [];
    const edgeWeights: number[] = [];
    const loop = cycle.slice(0, -1); // without closing duplicate

    for (let i = 0; i < loop.length; i++) {
      const from = loop[i];
      const to = loop[(i + 1) % loop.length];
      const e = graph.edges.find((e) => e.from === from && e.to === to);
      if (e) {
        rates.push(e.rawRate);
        edgeWeights.push(e.weight);
      }
    }

    // Profit calculations
    const profitPct = computeProfit(rates, fee) * 100;
    const grossProfitPct = computeProfit(rates, 0) * 100;

    // Run simulation
    const simulation = simulateExecution(cycle, rates, simAmount, fee);

    cycles.push({
      id,
      path: cycle,
      profitPct,
      grossProfitPct,
      rates,
      edgeWeights,
      fee,
      simulation,
    });
  }

  return {
    distances: dist,
    predecessors: pred,
    cycles,
    steps,
  };
}

/**
 * Walk the predecessor chain back from `startNode` to isolate the cycle.
 * Uses visited tracking to guarantee landing squarely inside the cycle.
 */
function traceCycle(
  pred: Record<string, string | null>,
  startNode: string,
  maxSteps: number
): string[] | null {
  // Walk back up to maxSteps times, tracking visited nodes to find where the loop closes
  const visitedIndex = new Map<string, number>();
  let current: string | null = startNode;
  const history: string[] = [];

  for (let i = 0; i <= maxSteps * 2; i++) {
    if (!current) return null;
    if (visitedIndex.has(current)) {
      // Loop detected!
      const loopStartIndex = visitedIndex.get(current)!;
      const backwardCycle = history.slice(loopStartIndex);

      // In backwardCycle, each node was reached by following pred:
      // history[k+1] = pred[history[k]] (i.e. edge was history[k+1] -> history[k])
      // So reversing the backward chain gives the forward edge order.
      const forwardNodes = [...backwardCycle].reverse();

      // Close the loop by appending the starting node
      return [...forwardNodes, forwardNodes[0]];
    }

    visitedIndex.set(current, history.length);
    history.push(current);
    current = pred[current] ?? null;
  }

  return null;
}

/**
 * Run BF from every node as source to discover all negative cycles in the graph.
 */
export function findAllCycles(
  graph: Graph,
  options: BFOptions = {}
): CycleResult[] {
  const seenIds = new Set<string>();
  const allCycles: CycleResult[] = [];

  for (const source of graph.nodes) {
    const { cycles } = runBellmanFord(graph, source, options);
    for (const cycle of cycles) {
      if (!seenIds.has(cycle.id)) {
        seenIds.add(cycle.id);
        allCycles.push(cycle);
      }
    }
  }

  return allCycles.sort((a, b) => b.profitPct - a.profitPct);
}
