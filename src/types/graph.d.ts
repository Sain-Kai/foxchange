export interface Currency {
  code: string;
  label: string;
  flag: string;
  color: string;
  isCrypto?: boolean;
}

export interface Edge {
  from: string;
  to: string;
  weight: number; // -log(rawRate * (1 - fee))
  rawRate: number;
  fee?: number; // per-hop fee (e.g. 0.001 for 0.1%)
}

export interface Graph {
  nodes: string[];
  edges: Edge[];
  fee?: number;
}

export interface ExecutionStep {
  hop: number;
  from: string;
  to: string;
  rate: number;
  fee: number;
  startBalance: number;
  grossBalance: number;
  feeAmount: number;
  netBalance: number;
}

export interface ExecutionSimulation {
  startAmount: number;
  startCurrency: string;
  finalAmount: number;
  netProfitAmount: number;
  netProfitPct: number;
  totalFeesPaid: number;
  steps: ExecutionStep[];
}

export interface CycleResult {
  id: string; // deterministic hash of sorted path
  path: string[]; // e.g. ["USD", "EUR", "JPY", "USD"]
  profitPct: number; // Net profit percentage after fee (e.g. 0.87 = 0.87%)
  grossProfitPct?: number; // Gross profit percentage before fee
  rates: number[]; // per-hop raw rates
  edgeWeights: number[]; // per-hop -log weights
  fee?: number; // fee fraction applied (e.g. 0.001)
  simulation?: ExecutionSimulation;
}

export interface BFStep {
  iteration: number; // 0-indexed BF pass
  edgeIndex: number; // index into graph.edges
  edge: Edge;
  relaxed: boolean; // did this relaxation update a distance?
  distances: Record<string, number>; // snapshot after this step
  updated?: string; // which node was updated (if relaxed)
}

export interface BFResult {
  distances: Record<string, number>;
  predecessors: Record<string, string | null>;
  cycles: CycleResult[];
  steps: BFStep[]; // populated only in instrumented mode
}

export type RateMatrix = Record<string, Record<string, number>>;

export interface ScanResponse {
  cycles: CycleResult[];
  graph: Graph;
  timestamp: string;
  market?: "fiat" | "crypto";
  fee?: number;
  date?: string;
}
