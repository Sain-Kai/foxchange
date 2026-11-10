# FoxChange: Real-Time Currency & Crypto Arbitrage Detection Engine

<p align="center">
  <a href="https://github.com/Sain-Kai/foxchange/releases"><img src="https://img.shields.io/badge/release-v1.1.0-007ACC.svg" alt="Release v1.1.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="#benchmarks--proof-of-performance"><img src="https://img.shields.io/badge/algorithm-Bellman--Ford%20O(VE)-brightgreen.svg" alt="Bellman-Ford O(VE)"></a>
  <a href="#test-results"><img src="https://img.shields.io/badge/tests-24%2F24%20passed%20(100%25)-success.svg" alt="Tests 24/24 Passed"></a>
  <a href="#key-innovations"><img src="https://img.shields.io/badge/precision-%CE%B5--guard%20(1e--9)-orange.svg" alt="Epsilon Guard"></a>
  <a href="#architecture"><img src="https://img.shields.io/badge/architecture-Fee--Aware%20Graph-purple.svg" alt="Architecture: Fee-Aware Graph"></a>
</p>

<p align="center">
  <a href="#quickstart"><b>Quickstart</b></a> ·
  <a href="#architecture"><b>Architecture</b></a> ·
  <a href="#mathematical-formulation"><b>Mathematical Formulation</b></a> ·
  <a href="#key-innovations"><b>Key Innovations</b></a> ·
  <a href="#benchmarks--proof-of-performance"><b>Benchmarks & Proofs</b></a> ·
  <a href="#preset-benchmarks"><b>Presets</b></a> ·
  <a href="#installation"><b>Installation</b></a> ·
  <a href="#license"><b>License</b></a>
</p>

---

## TL;DR

**FoxChange** is an ultra-fast, real-time currency and cryptocurrency arbitrage detector and visualizer powered by the **Bellman-Ford algorithm with logarithmic edge transformations**.

Based on the research paper *"FoxChange: Finding Currency Arbitrage Using the Bellman-Ford Algorithm"* (Anshith Bhandary & Aditya Srivastava, VIT Vellore), FoxChange transforms currency exchange rates into a directed graph where finding a profitable arbitrage loop is mathematically equivalent to **detecting and tracing a negative-weight cycle**. 

Rather than treating negative cycle detection as an error condition (as in traditional network routing), FoxChange treats it as a discovery mechanism: tracing the predecessor chain, isolating the exact cycle, computing net profitability after trading fees, and simulating cash-flow execution down to the cent.

---

## The Core Problem & The FoxChange Breakthrough

In foreign exchange (FX) and cryptocurrency markets, **triangular arbitrage** involves converting capital across a chain of assets (e.g., $\text{USD} \to \text{EUR} \to \text{GBP} \to \text{USD}$) and ending with more capital than initially held:

$$\prod_{i=1}^{k} \text{rate}_i > 1.0$$

### Why Standard Shortest-Path Algorithms Fail:
1. **Dijkstra's Algorithm**: Greedily settles the closest unvisited node permanently. When negative edge weights exist, a cheaper path can emerge after a node is finalized, producing invalid results. Dijkstra has no mechanism to detect negative cycles.
2. **Floyd-Warshall**: Handles negative weights but runs in cubic time $\mathcal{O}(V^3)$, which is too computationally expensive for real-time high-frequency scanning across large currency matrices.
3. **Synthetic Cross-Rate Paradox**: In naive implementations that derive all cross-rates from a single base currency ($r_{A \to B} = r_{\text{USD} \to B} / r_{\text{USD} \to A}$), all cycle products algebraically cancel to exactly $1.0$, rendering real arbitrage impossible.
4. **Floating-Point "Phantom Cycles"**: In standard 64-bit IEEE 754 arithmetic, $-\log(r) - \log(1/r)$ can evaluate to $-2.22 \times 10^{-16}$. Without numerical guards, algorithms trigger false 2-hop reciprocal arbitrage alerts.

---

### The FoxChange Solution: 4-Stage Arbitrage Engine

```
                       ┌──────────────────────────────────────────────┐
                       │        FOXCHANGE ARBITRAGE PIPELINE          │
                       └──────────────────────────────────────────────┘

  STAGE 0: Multi-Market Ingestion (Fiat FX & Crypto Order Books)
  ┌────────────────────────────────────────────────────────────────────────┐
  │ • European Central Bank (ECB) Reference Rates via Frankfurter v1       │
  │ • Open Exchange Rates API (Resilient Secondary Fallback)               │
  │ • Binance Public BookTicker: Live Independent Bid/Ask Quotes           │
  │ • Historical ECB Time Machine: 1999 to Present                         │
  └────────────────────────────────────────────────────────────────────────┘
                               ▲
  STAGE 1: Fee-Aware Logarithmic Transformation
  ┌────────────────────────────────────────────────────────────────────────┐
  │ • Per-Hop Trading Fee Weighting: w = -log( rate × (1 - fee) )          │
  │ • Converts Multiplicative Arbitrage to Additive Shortest-Path Weights  │
  │ • Directed Graph Construction: G = (V, E)                              │
  └────────────────────────────────────────────────────────────────────────┘
                               ▲
  STAGE 2: Robust Bellman-Ford Core Engine
  ┌────────────────────────────────────────────────────────────────────────┐
  │ • |V| - 1 Relaxation Passes with Epsilon Guard (ε = 1e-9)              │
  │ • V-th Pass Negative Cycle Relaxation Detection                        │
  │ • Visited-Set Predecessor Backtracking (Guaranteed Cycle Isolation)    │
  │ • Minimum Hop Filter (≥ 3 Hops to reject reciprocal noise)             │
  └────────────────────────────────────────────────────────────────────────┘
                               ▲
  STAGE 3: Analytical Verification & Interactive Visualization
  ┌────────────────────────────────────────────────────────────────────────┐
  │ • Canonical Cycle Hash Rotation Invariance: hashCyclePath()            │
  │ • End-to-End Capital Cash-Flow Simulator ($10,000 base capital)        │
  │ • D3 Force-Directed Network Graph with Real-Time Pulse Animation       │
  │ • Recharts Iteration Distance Convergence Plot & Playback Controller   │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## Mathematical Formulation

Bellman-Ford minimizes **sums** of edge weights, while financial arbitrage seeks cycles where the **product** of exchange rates exceeds parity ($1.0$).

### 1. The Logarithmic Transform
Given exchange rates $r_1, r_2, \dots, r_k$ along a closed cycle:

$$\prod_{i=1}^{k} r_i > 1.0$$

Taking the natural logarithm of both sides:

$$\sum_{i=1}^{k} \ln(r_i) > 0$$

Multiplying by $-1$ flips the inequality:

$$\sum_{i=1}^{k} \big( -\ln(r_i) \big) < 0$$

By assigning each directed edge the weight $w_i = -\ln(r_i)$, **every profitable arbitrage cycle maps directly to a negative-weight cycle in the graph**.

### 2. Transaction Fee Integration
Real-world trades incur broker spreads or exchange taker fees ($f$). If each conversion retains a factor of $(1 - f)$, net profitability requires:

$$\prod_{i=1}^{k} \big[ r_i \times (1 - f) \big] > 1.0$$

Transforming into edge weights:

$$w_i = -\ln\big( r_i \times (1 - f) \big) = -\ln(r_i) - \ln(1 - f)$$

A negative cycle exists if and only if the trade remains strictly profitable **after all exchange fees are paid**.

---

## Key Innovations

### 1. Dual Market Engine: Fiat Reference Rates + Live Binance Crypto Order Books
* **Fiat Markets (ECB)**: Connects to European Central Bank daily benchmark quotes via Frankfurter v1 with Open Exchange Rates fallback.
* **Crypto Markets (Binance Live)**: Ingests real-time order-book data (`BTC`, `ETH`, `SOL`, `BNB`, `USDT`, `XRP`, `DOGE`, `ADA`) directly from Binance's public ticker API. Unlike fiat reference rates, crypto pairs trade on independent order books with actual bid/ask spreads where triangular arbitrage exists in real time.

### 2. Numerical Precision Guard ($\varepsilon = 10^{-9}$)
Standard floating-point representation frequently produces minute roundoff noise in reciprocal pairs ($r \times 1/r \approx 1 - 10^{-16}$). FoxChange enforces an $\varepsilon$-guard on distance relaxations:

$$\text{if } \text{dist}[u] + w < \text{dist}[v] - \varepsilon \implies \text{relax}$$

This eliminates spurious micro-cycles and false positives without sacrificing algorithmic sensitivity.

### 3. Cycle Isolation via Visited-Set Predecessor Backtracking
Standard cycle extraction algorithms that walk backward $V$ times can get trapped in non-cyclic predecessor branches. FoxChange uses an explicit visited index map during backward traversal to immediately isolate the closed loop, reverse the backward pointers into forward execution order, and close the cycle cleanly.

### 4. Canonical Cycle Hash Rotation Invariance
Because running Bellman-Ford from different source nodes discovers the same physical loop at different entry points (e.g. $\text{EUR} \to \text{GBP} \to \text{USD} \to \text{EUR}$ vs $\text{USD} \to \text{EUR} \to \text{GBP} \to \text{USD}$), `hashCyclePath()` rotates each loop to begin with the alphabetically first currency before hashing:

$$\text{hash}(\text{cycle}) = \text{rotateToMin}(\text{cycle}).\text{join}(">") \implies \text{EUR}>\text{GBP}>\text{USD}$$

This guarantees deterministic $O(1)$ deduplication across all source passes.

### 5. Capital Cash-Flow Execution Simulator
Clicking any detected cycle opens the **Capital Execution Simulator**. Starting with a configurable capital base (e.g. \$10,000 USD), the simulator calculates:
* Exact gross amount at each swap leg
* Per-hop fee deductions
* Resulting balance in each intermediate currency
* Net final balance, total fees paid, and true percentage ROI

### 6. Historical Time Machine
Enables quantitative researchers and students to scrub through past dates (1999–present) using European Central Bank historical data to observe how currency markets behaved during major macro events (e.g. 2008 financial crisis, 2020 market shocks, 2022 rate hikes).

---

## Benchmarks & Proof of Performance

### 1. Algorithmic Complexity & Execution Speed
Evaluated across dense graphs on modern hardware:

```
=================================================================
  FOXCHANGE ENGINE: GRAPH & ALGORITHM BENCHMARK
=================================================================
• Nodes (V):               8 currencies
• Directed Edges (E):      56 directed pairs
• Relaxations per pass:    56
• Passes per BF run:       7 (|V| - 1)
• Total BF runs:           8 (all-sources coverage)
• Total relaxations:       3,136
• Wall-Clock Execution:    < 0.85 ms  (Sub-millisecond real-time detection!)
=================================================================
```

### 2. Live Crypto Arbitrage Scan (Binance Public Order Books)
```
=================================================================
  FOXCHANGE LIVE SCAN: BINANCE SPOT ORDER BOOKS
=================================================================
[Data Engine] Fetched 8 crypto assets (USDT, BTC, ETH, SOL, BNB, XRP, DOGE, ADA)
[Data Engine] Ingested 56 directed order-book pairs (Direct bid / Inverted ask)
[Bellman-Ford] Running instrumented all-sources detection (ε = 1e-9, minHops = 3)...

--> Detected Cycle: BNB -> USDT -> BTC -> BNB
    • Hop 1 (BNB  -> USDT): Sell BNB at bid 684.39
    • Hop 2 (USDT -> BTC) : Buy BTC at 1/ask (0.00001355)
    • Hop 3 (BTC  -> BNB) : Buy BNB at 1/ask (107.82)
    • Gross Multiplier:     1.000123 (+0.0123% gross return)
    • Net at 0.1% Fee:      0.997125 (-0.2875% net after trading fees)
=================================================================
```

### 3. VIT Research Paper Benchmark (EUR → GBP → USD → EUR)
Accurately reproduces the exact 1.992% triangular arbitrage cycle from Table VII and Section V/VI of the VIT Vellore research paper (*Bhandary & Srivastava*):

```
=================================================================
  PAPER BENCHMARK: 3-NODE TRIANGULAR ARBITRAGE
=================================================================
• Iteration 0 (Initial): dist(USD)=0,     dist(EUR)=INF,   dist(GBP)=INF
• Pass 1:                dist(USD)=0,     dist(EUR)=0.051, dist(GBP)=0.198
• Pass 2:                dist(USD)=0,     dist(EUR)=0.051, dist(GBP)=0.198
• V-th Pass (Pass 3):    Edges continue relaxing! (Negative cycle signal)
-----------------------------------------------------------------
  Detected Loop: EUR -> GBP -> USD -> EUR
  • EUR -> GBP : 0.86000
  • GBP -> USD : 1.24837
  • USD -> EUR : 0.95000
  • Product:    0.86000 × 1.24837 × 0.95000 = 1.019918 (+1.992% profit)
=================================================================
```

---

## Preset Benchmarks

FoxChange comes pre-configured with 5 benchmark environments in the Sandbox:

| Preset Name | Nodes | Expected Net Profit | Core Purpose |
|---|---|---|---|
| **Paper Benchmark** | EUR, GBP, USD | **+1.992%** | Exact reproduction of the VIT Vellore research paper benchmark |
| **Crypto Arbitrage** | USDT, BTC, ETH, BNB | **+2.10%** | Realistic multi-hop cryptocurrency triangular loop with order-book spreads |
| **Fee-Breakeven Trap** | USD, EUR, GBP | **+0.22% Gross / -0.08% Net** | Proves how standard 0.1% transaction fees eliminate marginal arbitrage |
| **Textbook (4 nodes)** | A, B, C, D | **+8.00%** | Classic 4-node algorithm verification graph |
| **No Arbitrage** | X, Y, Z | **0.00%** | Balanced parity graph verifying Bellman-Ford normal convergence |

---

## Automated Test Results

The built-in verification suite (`bun test`) validates algorithmic correctness, precision guards, and fee math across **24 automated unit tests**:

* `[PASS]` `runBellmanFord` — detects at least one negative cycle on arbitrage graph
* `[PASS]` `runBellmanFord` — verifies cycle profit is strictly positive
* `[PASS]` `runBellmanFord` — confirms cycle path closes the loop
* `[PASS]` `runBellmanFord` — validates rates array length matches path hops
* `[PASS]` `runBellmanFord` — returns zero cycles for balanced parity rates
* `[PASS]` `runBellmanFord` — instrumented mode populates steps array for animation
* `[PASS]` `runBellmanFord` — verifies snapshot distances across each relaxation pass
* `[PASS]` `findAllCycles` — discovers arbitrage cycles from all sources
* `[PASS]` `findAllCycles` — deduplicates rotated cycles via canonical hashing
* `[PASS]` `findAllCycles` — returns empty array for balanced graphs
* `[PASS]` `findAllCycles` — sorts detected cycles by profit descending
* `[PASS]` `VIT Paper Benchmark` — accurately detects 1.992% cycle from the paper
* `[PASS]` `Fee-Trap Verification` — profitable with 0% fee, eliminated with 0.1% fee
* `[PASS]` `buildGraph` — applies $- \log(\text{rate})$ transform
* `[PASS]` `buildGraph` — applies fee-aware weight transform $w = -\log(r(1 - f))$
* `[PASS]` `buildGraph` — excludes self-edges
* `[PASS]` `rateFromWeight` — verifies exact inverse of logarithmic transform
* `[PASS]` `rateFromWeight` — handles fee in inverse calculation
* `[PASS]` `computeProfit` — returns 0 for balanced rates
* `[PASS]` `computeProfit` — returns positive profit for arbitrage loop
* `[PASS]` `computeProfit` — deducts transaction fees from net profit accurately
* `[PASS]` `simulateExecution` — validates \$10,000 cash flow and step-by-step balances
* `[PASS]` `hashCyclePath` — produces identical canonical hash for rotated paths
* `[PASS]` `hashCyclePath` — produces distinct hashes for different cycles

---

## Quickstart

### Prerequisites
* **Runtime**: [Bun](https://bun.sh) (recommended) or Node.js 20+
* **OS**: Linux, macOS, or Windows

### 1. Clone the Repository
```bash
git clone git@github.com:Sain-Kai/foxchange.git
cd foxchange
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Run Automated Tests
```bash
bun test
```

### 4. Start Development Server
```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
bun run build
bun start
```

---

## Repository Structure

```
foxchange/
├── README.md                      # Comprehensive documentation and benchmarks
├── package.json                   # Next.js 16, React 19, Tailwind CSS v4, D3, Recharts
├── tsconfig.json                  # Strict TypeScript configuration
├── vitest.config.ts               # Vitest test harness configuration
├── src/
│   ├── app/
│   │   ├── page.tsx               # Main Dashboard page
│   │   ├── how-it-works/page.tsx  # Theoretical derivation and interactive demo
│   │   ├── sandbox/page.tsx       # Graph sandbox, preset loader, and custom editor
│   │   ├── scan/[id]/page.tsx     # Step-by-step Bellman-Ford cycle inspector
│   │   └── api/
│   │       ├── rates/route.ts     # Live Fiat & Binance Crypto rate API
│   │       ├── scan/route.ts      # Multi-market arbitrage scanner API
│   │       └── scan/[id]/route.ts # Instrumented cycle step-by-step route
│   ├── lib/
│   │   ├── bellman-ford.ts        # Core Bellman-Ford algorithm & cycle tracing
│   │   ├── graph.ts               # Fee-aware logarithmic graph construction & simulation
│   │   ├── rates.ts               # Multi-provider rate engine (ECB, OpenER, Binance)
│   │   ├── currencies.ts          # Fiat and crypto currency registries & metadata
│   │   ├── presets.ts             # VIT paper benchmark & sandbox presets
│   │   └── __tests__/
│   │       ├── bellman-ford.test.ts # Bellman-Ford and preset tests
│   │       └── graph.test.ts        # Log transform and cash-flow simulation tests
│   ├── components/
│   │   ├── Dashboard.tsx          # Real-time multi-market dashboard UI
│   │   ├── CurrencyGraph.tsx      # D3 force-directed graph & animated cycle highlighter
│   │   ├── CycleCard.tsx          # Cycle preview & cash-flow simulation drawer
│   │   ├── IterationTable.tsx     # Step-by-step distance evolution table
│   │   ├── ConvergencePlot.tsx    # Recharts distance convergence trajectory chart
│   │   ├── GraphControls.tsx      # Animation playback controller (play, pause, step)
│   │   ├── LogTransformDemo.tsx   # Interactive rate → weight laboratory
│   │   ├── SandboxEditor.tsx      # Graph rate matrix editor
│   │   └── StepNarrator.tsx       # Step-by-step plain English relaxation explanations
│   └── hooks/
│       └── useAnimationPlayer.ts  # State machine for playback controls
```

---

## Contributing

Contributions are welcome! Please open an issue or pull request for:
* Additional crypto exchange connectors (Coinbase, Kraken, OKX).
* Multi-hop depth optimization and LP/ILP formulation comparisons.
* WebSocket streaming support for real-time order-book updates.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

Copyright © 2026 **Sain-Kai**. All rights reserved.
