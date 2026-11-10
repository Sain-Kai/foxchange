"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, AlertTriangle, Cpu } from "lucide-react";
import type { BFStep, CycleResult, Graph } from "@/types/graph";
import { useAnimationPlayer } from "@/hooks/useAnimationPlayer";
import { CurrencyGraph } from "./CurrencyGraph";
import { CycleCard } from "./CycleCard";
import { IterationTable } from "./IterationTable";
import { ConvergencePlot } from "./ConvergencePlot";
import { GraphControls } from "./GraphControls";
import { StepNarrator } from "./StepNarrator";
import { Button } from "@/components/ui/button";

interface CycleData {
  cycle: CycleResult;
  steps: BFStep[];
  graph: Graph;
  source: string;
  timestamp: string;
}

interface Props {
  cycleId: string;
}

export function CycleDetailView({ cycleId }: Props) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const url = `/api/scan/${encodeURIComponent(cycleId)}${query ? `?${query}` : ""}`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [cycleId, searchParams]);

  const player = useAnimationPlayer(data?.steps ?? []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        <div className="h-8 w-52 bg-muted/50 rounded-lg shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-[440px] bg-muted/30 rounded-2xl shimmer" />
            <div className="h-28 bg-muted/30 rounded-2xl shimmer" />
          </div>
          <div className="space-y-4">
            {[200, 260, 220].map((h, i) => (
              <div key={i} className="bg-muted/30 rounded-2xl shimmer" style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="flex items-center gap-3 text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl px-5 py-4 animate-scale-in">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Cycle not found</p>
            <p className="text-sm text-destructive/70 mt-0.5">{error}</p>
          </div>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Bellman-Ford Cycle Analysis</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              Source node: {data.source} | Detected cycle: {data.cycle.path.join(" → ")}
            </p>
          </div>
        </div>
      </div>

      {/* Explainer banner */}
      <div className="rounded-xl bg-muted/30 border border-border/60 px-5 py-3.5 text-sm text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">What you&apos;re seeing:</span>{" "}
        Bellman-Ford relaxes every edge |V|-1 times, updating shortest distances. On the V-th pass,
        an edge that <em>still relaxes</em> reveals a negative weight cycle — signifying an arbitrage loop.
        Step through with playback controls to watch distances evolve.
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: graph + controls */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border overflow-hidden graph-container dot-grid min-h-[440px] relative">
            <CurrencyGraph
              graph={data.graph}
              cycles={[data.cycle]}
              highlightCycleId={data.cycle.id}
              width={580}
              height={440}
              currentStep={data.steps[player.currentIndex] ?? null}
            />
          </div>
          <StepNarrator
            step={data.steps[player.currentIndex] ?? null}
            currentIndex={player.currentIndex}
            totalSteps={player.totalSteps}
            source={data.source}
            cycles={[data.cycle]}
            numNodes={data.graph.nodes.length}
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

        {/* Right: cycle card + tables */}
        <div className="space-y-4">
          <CycleCard cycle={data.cycle} variant="expanded" />

          <div className="rounded-xl bg-muted/20 border border-border/50 px-4 py-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Iteration Table</span> — Each row shows the distances from the source after processing one edge. Green cells indicate a successful relaxation. The convergence plot below tracks distance trajectories.
            </p>
          </div>

          <IterationTable
            graph={data.graph}
            steps={data.steps}
            currentIndex={player.currentIndex}
            source={data.source}
          />
          <ConvergencePlot
            graph={data.graph}
            steps={data.steps}
            currentIndex={player.currentIndex}
          />
        </div>
      </div>
    </div>
  );
}
