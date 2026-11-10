"use client";

import { useState } from "react";
import { Beaker, RotateCcw, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAPER_BENCHMARK = [
  { from: "GBP", to: "USD", rate: 1.24837 },
  { from: "USD", to: "EUR", rate: 0.95 },
  { from: "EUR", to: "GBP", rate: 0.86 },
];

export function LogTransformDemo() {
  const [rows, setRows] = useState(PAPER_BENCHMARK);
  const [feePct, setFeePct] = useState(0.0);
  const [loadingLive, setLoadingLive] = useState(false);

  function update(i: number, rate: number) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, rate } : r)));
  }

  const feeFraction = feePct / 100;
  const productGross = rows.reduce((p, r) => p * r.rate, 1);
  const productNet = rows.reduce((p, r) => p * (r.rate * (1 - feeFraction)), 1);
  const weightSum = rows.reduce((s, r) => s + -Math.log(r.rate * (1 - feeFraction)), 0);
  const isArbitrage = productNet > 1;

  async function loadLiveFX() {
    setLoadingLive(true);
    try {
      const res = await fetch("/api/rates?market=fiat");
      const data = await res.json();
      const r = data.rates;
      if (r.USD?.EUR && r.EUR?.GBP && r.GBP?.USD) {
        setRows([
          { from: "USD", to: "EUR", rate: parseFloat(r.USD.EUR.toFixed(4)) },
          { from: "EUR", to: "GBP", rate: parseFloat(r.EUR.GBP.toFixed(4)) },
          { from: "GBP", to: "USD", rate: parseFloat(r.GBP.USD.toFixed(4)) },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLive(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Beaker className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Interactive Log Transform & Fee Simulator</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Watch multiplication of exchange rates convert to sum of additive weights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRows(PAPER_BENCHMARK)}
            className="h-7 text-xs gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Paper Benchmark (1.992%)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLiveFX}
            disabled={loadingLive}
            className="h-7 text-xs gap-1"
          >
            <Download className="w-3 h-3" /> {loadingLive ? "Loading..." : "Live Rates"}
          </Button>
        </div>
      </div>

      {/* Fee row */}
      <div className="px-5 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between text-xs flex-wrap gap-2">
        <span className="text-muted-foreground">Apply per-hop transaction fee:</span>
        <div className="flex items-center gap-1.5 font-mono">
          {[0, 0.05, 0.1, 0.2].map((f) => (
            <button
              key={f}
              onClick={() => setFeePct(f)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                feePct === f
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}%
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-muted-foreground uppercase tracking-widest">
              <th className="pb-3 text-left font-medium">Conversion Hop</th>
              <th className="pb-3 text-right font-medium">Raw Rate</th>
              {feePct > 0 && <th className="pb-3 text-right font-medium">Net Rate (-{feePct}%)</th>}
              <th className="pb-3 text-right font-medium pr-1">-log(net_rate)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const netR = row.rate * (1 - feeFraction);
              const weight = -Math.log(netR);
              return (
                <tr key={i} className="border-t border-border/40">
                  <td className="py-3 font-mono text-muted-foreground text-xs">
                    {row.from} → {row.to}
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="number"
                      min={0.001}
                      step={0.001}
                      value={row.rate}
                      onChange={(e) => update(i, parseFloat(e.target.value) || 0.001)}
                      className="w-28 text-right bg-muted/50 border border-border rounded-lg px-2.5 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </td>
                  {feePct > 0 && (
                    <td className="py-3 text-right font-mono text-xs text-muted-foreground">
                      {netR.toFixed(5)}
                    </td>
                  )}
                  <td
                    className={`py-3 text-right pr-1 font-mono text-sm tabular-nums ${
                      weight < 0 ? "text-amber-400 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {weight.toFixed(6)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-mono">
              <td className="pt-3.5 text-[10px] text-muted-foreground uppercase tracking-wider font-sans font-medium">
                Cycle Product / Sum
              </td>
              <td
                className={`pt-3.5 text-right font-bold text-sm tabular-nums ${
                  productGross > 1 ? "text-green-400" : "text-foreground"
                }`}
              >
                ×{productGross.toFixed(6)}
              </td>
              {feePct > 0 && (
                <td
                  className={`pt-3.5 text-right font-bold text-sm tabular-nums ${
                    productNet > 1 ? "text-green-400" : "text-foreground"
                  }`}
                >
                  ×{productNet.toFixed(6)}
                </td>
              )}
              <td
                className={`pt-3.5 text-right pr-1 font-bold text-sm tabular-nums ${
                  weightSum < 0 ? "text-amber-400" : "text-foreground"
                }`}
              >
                {weightSum.toFixed(6)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div
        className={`mx-5 mb-5 rounded-xl px-5 py-4 text-sm leading-relaxed transition-all duration-300 ${
          isArbitrage
            ? "bg-green-500/10 border border-green-500/25 text-green-300"
            : "bg-muted/30 border border-border text-muted-foreground"
        }`}
      >
        {isArbitrage ? (
          <div>
            <span className="font-semibold text-green-400">Arbitrage Opportunity Detected! </span>
            The product of net rates is <span className="font-mono">{productNet.toFixed(5)} &gt; 1.0</span>,
            which mathematically guarantees the sum of weights is negative (<span className="font-mono">{weightSum.toFixed(5)} &lt; 0</span>).
            Net profit: <span className="font-mono font-bold text-green-400">+{( (productNet - 1) * 100 ).toFixed(3)}%</span>.
          </div>
        ) : (
          <div>
            <span className="font-medium text-foreground">No Arbitrage. </span>
            The cycle product is ≤ 1.0, and the sum of weights is non-negative (≥ 0).
            Bellman-Ford will not detect a negative weight cycle here.
          </div>
        )}
      </div>
    </div>
  );
}
