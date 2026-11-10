"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CycleResult, Graph } from "@/types/graph";
import { CurrencyGraph } from "./CurrencyGraph";
import { CycleCard } from "./CycleCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertTriangle,
  ScanLine,
  Activity,
  Zap,
  Clock,
  Coins,
  DollarSign,
  Calendar,
  Percent,
} from "lucide-react";

interface ScanResult {
  cycles: CycleResult[];
  graph: Graph;
  timestamp: string;
  market?: "fiat" | "crypto";
  fee?: number;
  date?: string;
}

export function Dashboard() {
  const router = useRouter();
  const [market, setMarket] = useState<"fiat" | "crypto">("fiat");
  const [feePct, setFeePct] = useState(0.0); // e.g. 0.0% or 0.1%
  const [isHistorical, setIsHistorical] = useState(false);
  const [historicalDate, setHistoricalDate] = useState("2024-03-01");
  const [threshold, setThreshold] = useState(0);

  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [source, setSource] = useState<string>("USD");

  const deferredThreshold = useDeferredValue(threshold);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("market", market);
      params.set("fee", feePct.toString());
      params.set("threshold", "0");
      if (market === "fiat" && isHistorical && historicalDate) {
        params.set("date", historicalDate);
      }

      const res = await fetch(`/api/scan?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScanResult = await res.json();
      setResult(data);
      setSelectedCycleId(data.cycles[0]?.id ?? null);
      if (data.graph.nodes.length > 0 && !data.graph.nodes.includes(source)) {
        setSource(data.graph.nodes[0]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [market, feePct, isHistorical, historicalDate, source]);

  useEffect(() => {
    scan();
  }, [scan]);

  const filteredCycles =
    result?.cycles.filter((c) => c.profitPct >= deferredThreshold) ?? [];

  const containerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ w: 600, h: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGraphSize({
          w: Math.round(entry.contentRect.width),
          h: Math.max(500, Math.round(entry.contentRect.width * 0.65)),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bestProfit = filteredCycles[0]?.profitPct ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hero header */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              FoxChange Arbitrage Scanner
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Currency exchange rates are modeled as a directed graph where edge weights are{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">-log(rate × (1 - fee))</code>.
              A negative weight cycle corresponds to a profitable arbitrage loop detected in real time by Bellman-Ford.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {result && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
              </div>
            )}
            <Button
              onClick={scan}
              disabled={loading}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ScanLine className="w-4 h-4" />
              )}
              {loading ? "Scanning..." : "Scan Arbitrage"}
            </Button>
          </div>
        </div>

        {/* Market & Control Bar */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Market selector */}
          <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {market === "crypto" ? (
                <Coins className="w-4 h-4 text-amber-400" />
              ) : (
                <DollarSign className="w-4 h-4 text-blue-400" />
              )}
              <span className="text-xs font-medium">Market:</span>
            </div>
            <div className="flex bg-muted rounded-lg p-0.5 text-xs">
              <button
                onClick={() => {
                  setMarket("fiat");
                  setSource("USD");
                }}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  market === "fiat"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fiat FX (ECB)
              </button>
              <button
                onClick={() => {
                  setMarket("crypto");
                  setSource("USDT");
                  setIsHistorical(false);
                }}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  market === "crypto"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Crypto (Binance)
              </button>
            </div>
          </div>

          {/* Fee settings */}
          <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Per-Hop Fee:</span>
              <span className="font-mono text-xs font-bold">{feePct.toFixed(2)}%</span>
            </div>
            <div className="flex gap-1">
              {[0, 0.05, 0.1, 0.2].map((f) => (
                <button
                  key={f}
                  onClick={() => setFeePct(f)}
                  className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors ${
                    feePct === f
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}%
                </button>
              ))}
            </div>
          </div>

          {/* Historical Mode */}
          <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium">Historical:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="historical-toggle"
                disabled={market === "crypto"}
                checked={isHistorical}
                onChange={(e) => setIsHistorical(e.target.checked)}
                className="rounded border-border accent-amber-500"
              />
              {isHistorical && (
                <input
                  type="date"
                  value={historicalDate}
                  onChange={(e) => setHistoricalDate(e.target.value)}
                  className="bg-muted border border-border rounded px-2 py-0.5 text-xs font-mono"
                  max={new Date().toISOString().slice(0, 10)}
                />
              )}
              {!isHistorical && (
                <span className="text-xs text-muted-foreground">Live Rates</span>
              )}
            </div>
          </div>
        </div>

        {/* Live stats bar */}
        {result && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground">Nodes:</span>
              <span className="text-xs font-semibold font-mono">{result.graph.nodes.length}</span>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-muted-foreground">Directed Edges:</span>
              <span className="text-xs font-semibold font-mono">{result.graph.edges.length}</span>
            </div>
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border ${
              filteredCycles.length > 0
                ? "bg-green-500/10 border-green-500/20"
                : "bg-card border-border"
            }`}>
              <div className={`w-2 h-2 rounded-full ${filteredCycles.length > 0 ? "bg-green-400" : "bg-muted-foreground/30"}`} />
              <span className="text-xs text-muted-foreground">Arbitrage:</span>
              <span className="text-xs font-semibold font-mono">
                {filteredCycles.length > 0 ? `${filteredCycles.length} cycle(s) found` : "None"}
              </span>
              {bestProfit > 0 && (
                <Badge className="bg-green-500/15 text-green-400 border-green-500/25 text-xs font-mono ml-1">
                  +{bestProfit.toFixed(3)}% Net
                </Badge>
              )}
            </div>
            {result.market === "crypto" && (
              <Badge variant="outline" className="text-xs font-mono text-amber-400 border-amber-500/30">
                Binance Orderbook Quotes
              </Badge>
            )}
            {result.date && (
              <Badge variant="outline" className="text-xs font-mono text-indigo-400 border-indigo-500/30">
                Date: {result.date}
              </Badge>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 animate-scale-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={scan}>
            Retry
          </Button>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        {/* Graph */}
        <div
          ref={containerRef}
          className="rounded-2xl border border-border overflow-hidden graph-container dot-grid min-h-[500px] relative group bg-card"
        >
          {result ? (
            <CurrencyGraph
              graph={result.graph}
              cycles={filteredCycles}
              highlightCycleId={selectedCycleId}
              onNodeClick={setSource}
              width={graphSize.w}
              height={graphSize.h}
            />
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
              {loading ? (
                <>
                  <div className="w-10 h-10 rounded-full border-2 border-muted border-t-amber-500 animate-spin" />
                  <span className="text-sm">Fetching real-time exchange rates...</span>
                </>
              ) : (
                <span className="text-sm">Graph will appear here</span>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Threshold slider */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Profit Threshold</span>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Filter out cycles below target net return
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold font-mono tabular-nums">
                  {threshold.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground ml-0.5">%</span>
              </div>
            </div>
            <Slider
              min={0}
              max={3}
              step={0.05}
              value={[threshold]}
              onValueChange={(vals) => setThreshold(Array.isArray(vals) ? vals[0] : vals)}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Filters out infinitesimal cycles below execution viability.
            </p>
          </div>

          {/* Cycle list */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Detected Arbitrage Cycles</span>
              <Badge
                variant={filteredCycles.length > 0 ? "default" : "outline"}
                className={filteredCycles.length > 0 ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : ""}
              >
                {filteredCycles.length}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed -mt-1">
              Click a cycle below to inspect the step-by-step Bellman-Ford relaxation, distance convergence, and simulated cash flow.
            </p>

            {loading && (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded-xl shimmer" />
                ))}
              </div>
            )}

            {!loading && filteredCycles.length === 0 && (
              <div className="py-8 text-center animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <ScanLine className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  No cycles above {threshold.toFixed(2)}% net profit
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground/70 leading-relaxed max-w-[260px] mx-auto">
                  {market === "fiat"
                    ? "Central banks publish triangularly consistent reference rates. Switch to 'Crypto (Binance)' or test the Sandbox."
                    : "Order book spreads and fees absorb minute price discrepancies. Try reducing the per-hop fee or threshold."}
                </p>
                <div className="mt-3">
                  <a
                    href="/sandbox"
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2"
                  >
                    Open Sandbox presets →
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredCycles.map((cycle, i) => (
                <div key={cycle.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <CycleCard
                    cycle={cycle}
                    variant="compact"
                    isSelected={selectedCycleId === cycle.id}
                    onClick={() => {
                      setSelectedCycleId(cycle.id);
                      const params = new URLSearchParams({
                        market,
                        fee: feePct.toString(),
                      });
                      if (isHistorical && historicalDate) params.set("date", historicalDate);
                      router.push(`/scan/${encodeURIComponent(cycle.id)}?${params.toString()}`);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
