"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Graph } from "@/types/graph";
import { runBellmanFord, findAllCycles } from "@/lib/bellman-ford";
import { SandboxEditor } from "@/components/SandboxEditor";
import { CurrencyGraph } from "@/components/CurrencyGraph";
import { CycleCard } from "@/components/CycleCard";
import { IterationTable } from "@/components/IterationTable";
import { StepTable } from "@/components/StepTable";
import { GraphControls } from "@/components/GraphControls";
import { StepNarrator } from "@/components/StepNarrator";
import { useAnimationPlayer } from "@/hooks/useAnimationPlayer";
import { PRESETS, type PresetKey } from "@/lib/presets";
import { buildGraph } from "@/lib/graph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, FlaskConical, Download, CircleDot, Pencil, Percent, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_PRESET: PresetKey = "triangle";
const DEFAULT_GRAPH = PRESETS[DEFAULT_PRESET].graph;
const DEFAULT_SOURCE = DEFAULT_GRAPH.nodes[0] ?? "USD";

export default function SandboxPage() {
  const [graph, setGraph] = useState<Graph>(DEFAULT_GRAPH);
  const [activePreset, setActivePreset] = useState<PresetKey | "custom">(DEFAULT_PRESET);
  const [source, setSource] = useState<string>(DEFAULT_SOURCE);
  const [feePct, setFeePct] = useState<number>(0);
  const [steps, setSteps] = useState(
    runBellmanFord(DEFAULT_GRAPH, DEFAULT_SOURCE, { instrument: true }).steps
  );
  const [cycles, setCycles] = useState(findAllCycles(DEFAULT_GRAPH));
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(
    findAllCycles(DEFAULT_GRAPH)[0]?.id ?? null
  );
  const [hasRun, setHasRun] = useState(true);

  const player = useAnimationPlayer(steps);

  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ w: 700, h: 460 });

  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        setGraphSize({
          w,
          h: Math.max(440, Math.round(w * 0.62)),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function loadPreset(key: PresetKey) {
    const p = PRESETS[key];
    const feeFraction = feePct / 100;
    const g = buildGraph(p.rates, feeFraction);
    setGraph(g);
    setActivePreset(key);
    const firstNode = g.nodes[0] ?? "USD";
    setSource(firstNode);
    const result = runBellmanFord(g, firstNode, { instrument: true });
    setSteps(result.steps);
    const all = findAllCycles(g);
    setCycles(all);
    setSelectedCycleId(all[0]?.id ?? null);
    setHasRun(true);
  }

  async function loadLiveRates(market: "fiat" | "crypto" = "fiat") {
    try {
      const res = await fetch(`/api/rates?market=${market}`);
      const data = await res.json();
      const feeFraction = feePct / 100;
      const g = buildGraph(data.rates, feeFraction);
      setGraph(g);
      setActivePreset("custom");
      const firstNode = g.nodes[0] ?? (market === "crypto" ? "USDT" : "USD");
      setSource(firstNode);
      const result = runBellmanFord(g, firstNode, { instrument: true });
      setSteps(result.steps);
      const all = findAllCycles(g);
      setCycles(all);
      setSelectedCycleId(all[0]?.id ?? null);
      setHasRun(true);
    } catch (e) {
      console.error("Failed to load live rates:", e);
    }
  }

  function runBF() {
    // Rebuild graph with fee
    const feeFraction = feePct / 100;
    // Extract rate matrix from current graph edges
    const matrix: Record<string, Record<string, number>> = {};
    for (const e of graph.edges) {
      if (!matrix[e.from]) matrix[e.from] = {};
      matrix[e.from][e.to] = e.rawRate;
    }
    const updatedGraph = buildGraph(matrix, feeFraction);
    setGraph(updatedGraph);

    const result = runBellmanFord(updatedGraph, source, { instrument: true });
    setSteps(result.steps);
    const all = findAllCycles(updatedGraph);
    setCycles(all);
    setSelectedCycleId(all[0]?.id ?? null);
    setHasRun(true);
  }

  const handleGraphChange = useCallback((newGraph: Graph) => {
    setGraph(newGraph);
    setActivePreset("custom");
    setHasRun(false);
    setCycles([]);
    setSteps([]);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl font-bold tracking-tight">FoxChange Sandbox & Presets</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Build and customize currency exchange networks, configure per-hop trading fees, and observe step-by-step Bellman-Ford negative cycle relaxation.
            </p>
          </div>
        </div>

        {/* Presets and Live Import Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Presets:</span>
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <button
              key={key}
              onClick={() => loadPreset(key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                activePreset === key
                  ? "bg-muted border-amber-500/50 text-foreground font-semibold shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {PRESETS[key].label}
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLiveRates("fiat")}
            className="gap-1.5 h-7 text-xs"
          >
            <Download className="w-3 h-3" />
            Live Fiat (ECB)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLiveRates("crypto")}
            className="gap-1.5 h-7 text-xs text-amber-400 border-amber-500/30"
          >
            <Coins className="w-3 h-3" />
            Live Crypto (Binance)
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5">
        {/* Left column: Editor + Run + Results */}
        <div className="space-y-4 min-w-0">
          {/* Step 1: Edit */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-muted text-[10px] font-mono flex items-center justify-center text-muted-foreground">1</span>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold">Graph Rates Editor</h2>
              </div>
            </div>
            <div className="p-4">
              <SandboxEditor
                key={activePreset}
                onGraphChange={handleGraphChange}
                initialRates={
                  activePreset !== "custom" && PRESETS[activePreset as PresetKey]
                    ? PRESETS[activePreset as PresetKey].rates
                    : undefined
                }
              />
            </div>
          </div>

          {/* Step 2: Configure & Run */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-muted text-[10px] font-mono flex items-center justify-center text-muted-foreground">2</span>
              <Play className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold">Algorithm Parameters</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-muted-foreground">Source Node</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="bg-muted border border-border rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring/50"
                >
                  {graph.nodes.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Per-hop fee setting */}
              <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Per-Hop Fee</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 0.05, 0.1, 0.2].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFeePct(f)}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
                        feePct === f
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {f}%
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={runBF}
                className="w-full gap-2 h-9 text-sm bg-amber-500 hover:bg-amber-600 text-black font-semibold mt-2"
                disabled={graph.nodes.length === 0}
              >
                <Play className="w-3.5 h-3.5" /> Run Bellman-Ford
              </Button>
              {!hasRun && graph.nodes.length > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Graph changed — click Run to detect cycles.
                </p>
              )}
            </div>
          </div>

          {/* Step 3: Results */}
          {hasRun && (
            <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-muted text-[10px] font-mono flex items-center justify-center text-muted-foreground">3</span>
                <CircleDot className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold">Cycles Detected</h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-auto h-5 text-[10px] px-1.5",
                    cycles.length > 0 && "bg-green-500/15 text-green-400 border-green-500/25"
                  )}
                >
                  {cycles.length}
                </Badge>
              </div>
              <div className="p-4 space-y-2">
                {cycles.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No negative cycle found. Graph satisfies triangular parity.
                  </p>
                )}
                {cycles.map((c) => (
                  <CycleCard
                    key={c.id}
                    cycle={c}
                    variant="compact"
                    isSelected={selectedCycleId === c.id}
                    onClick={() => setSelectedCycleId(c.id)}
                  />
                ))}
                {cycles.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/80 pt-1 leading-relaxed">
                    Select a cycle to view on the force-directed graph.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Graph + Animation */}
        <div className="space-y-4 min-w-0">
          <div
            ref={graphContainerRef}
            className="rounded-xl border border-border overflow-hidden graph-container dot-grid min-h-[440px] bg-card"
          >
            <CurrencyGraph
              graph={graph}
              cycles={cycles}
              highlightCycleId={selectedCycleId}
              onNodeClick={setSource}
              width={graphSize.w}
              height={graphSize.h}
              currentStep={hasRun && steps.length > 0 ? steps[player.currentIndex] ?? null : null}
            />
          </div>

          {hasRun && steps.length > 0 && (
            <div className="animate-fade-in min-w-0 space-y-3">
              <StepNarrator
                step={steps[player.currentIndex] ?? null}
                currentIndex={player.currentIndex}
                totalSteps={player.totalSteps}
                source={source}
                cycles={cycles}
                numNodes={graph.nodes.length}
              />
              <GraphControls
                currentIndex={player.currentIndex}
                totalSteps={player.totalSteps}
                isPlaying={player.isPlaying}
                speed={player.speed}
                isAtStart={player.isAtStart}
                isAtEnd={player.isAtEnd}
                onPlay={player.play}
                onPause={player.pause}
                onStepForward={player.stepForward}
                onStepBack={player.stepBack}
                onReset={player.reset}
                onSetSpeed={player.setSpeed}
              />
            </div>
          )}
        </div>
      </div>

      {/* Full-width: distance table stacked over convergence plot */}
      {hasRun && steps.length > 0 && (
        <div className="space-y-5 animate-fade-in">
          <IterationTable
            graph={graph}
            steps={steps}
            currentIndex={player.currentIndex}
            source={source}
          />
          <StepTable
            graph={graph}
            steps={steps}
            currentIndex={player.currentIndex}
            source={source}
          />
        </div>
      )}
    </div>
  );
}
