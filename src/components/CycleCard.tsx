"use client";

import { ArrowRight, Copy, Check, TrendingUp, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { CycleResult } from "@/types/graph";
import { CURRENCY_MAP } from "@/lib/currencies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  cycle: CycleResult;
  variant?: "compact" | "expanded";
  isSelected?: boolean;
  onClick?: () => void;
  showSimulation?: boolean;
}

export function CycleCard({
  cycle,
  variant = "compact",
  isSelected,
  onClick,
  showSimulation = true,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [showSimDetails, setShowSimDetails] = useState(false);
  const { path, profitPct, grossProfitPct, rates, fee, simulation } = cycle;
  const loop = path.slice(0, -1);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    const text = `${path.join(" -> ")} | Net: +${profitPct.toFixed(3)}%`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (variant === "compact") {
    return (
      <div
        onClick={onClick}
        className={cn(
          "w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer group space-y-2",
          isSelected
            ? "border-amber-500/50 bg-amber-500/8 shadow-sm"
            : "border-border hover:border-amber-500/25 hover:bg-muted/30 hover:shadow-sm"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            {loop.map((code, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 font-medium">
                  <span className="text-xs">{CURRENCY_MAP[code]?.flag ?? "🪙"}</span>
                  <span style={{ color: CURRENCY_MAP[code]?.color ?? "#94a3b8" }}>{code}</span>
                </span>
                {i < loop.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-xs transition-colors",
                profitPct > 0
                  ? "text-green-400 border-green-500/25 bg-green-500/8"
                  : "text-muted-foreground"
              )}
            >
              {profitPct > 0 ? "+" : ""}{profitPct.toFixed(3)}%
            </Badge>
          </div>
        </div>

        {/* Secondary info: gross vs fee or simulation */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          {fee && fee > 0 ? (
            <span>
              Fee: {(fee * 100).toFixed(2)}% | Gross: +{(grossProfitPct ?? profitPct).toFixed(3)}%
            </span>
          ) : (
            <span>Gross: +{(grossProfitPct ?? profitPct).toFixed(3)}% (0% fee)</span>
          )}
          {simulation && (
            <span className="font-mono text-foreground/80">
              10k → {simulation.finalAmount.toFixed(1)} {simulation.startCurrency}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Expanded variant
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 animate-scale-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Arbitrage Cycle Analysis</h3>
            {fee && fee > 0 ? (
              <p className="text-xs text-muted-foreground">
                Fee-Adjusted: {(fee * 100).toFixed(2)}% per conversion hop
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500/15 text-green-400 border-green-500/25 font-mono text-sm py-1 px-2.5">
            {profitPct > 0 ? "+" : ""}{profitPct.toFixed(4)}% Net
          </Badge>
          {grossProfitPct != null && grossProfitPct !== profitPct && (
            <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
              +{grossProfitPct.toFixed(4)}% Gross
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Path chain */}
      <div className="flex items-center gap-2 flex-wrap">
        {loop.map((code, i) => {
          const currency = CURRENCY_MAP[code];
          return (
            <span key={i} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-1.5 text-sm font-medium shadow-sm">
                <span className="text-base">{currency?.flag ?? "🪙"}</span>
                <span style={{ color: currency?.color ?? "#94a3b8" }}>{code}</span>
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                <span>{rates[i] != null ? rates[i].toFixed(4) : ""}</span>
              </span>
            </span>
          );
        })}
        <span className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-1.5 text-sm font-medium shadow-sm">
          <span className="text-base">{CURRENCY_MAP[path[0]]?.flag ?? "🪙"}</span>
          <span style={{ color: CURRENCY_MAP[path[0]]?.color ?? "#94a3b8" }}>{path[0]}</span>
        </span>
      </div>

      {/* Simulation Breakdown */}
      {showSimulation && simulation && (
        <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground/90">
                Capital Execution Simulator ($10,000 Base)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSimDetails(!showSimDetails)}
              className="h-7 text-xs gap-1 text-muted-foreground"
            >
              {showSimDetails ? "Hide breakdown" : "View cash flow"}
              {showSimDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-card border border-border/50 rounded-lg p-2.5">
              <p className="text-muted-foreground text-[10px]">Initial Capital</p>
              <p className="font-mono font-semibold text-foreground mt-0.5">
                {simulation.startAmount.toLocaleString()} {simulation.startCurrency}
              </p>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-2.5">
              <p className="text-muted-foreground text-[10px]">Final Capital</p>
              <p className="font-mono font-semibold text-foreground mt-0.5">
                {simulation.finalAmount.toFixed(2)} {simulation.startCurrency}
              </p>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-2.5">
              <p className="text-muted-foreground text-[10px]">Net PnL</p>
              <p className={cn("font-mono font-semibold mt-0.5", simulation.netProfitAmount >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {simulation.netProfitAmount >= 0 ? "+" : ""}{simulation.netProfitAmount.toFixed(2)} {simulation.startCurrency} ({simulation.netProfitPct.toFixed(3)}%)
              </p>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-2.5">
              <p className="text-muted-foreground text-[10px]">Total Fees</p>
              <p className="font-mono font-semibold text-amber-400 mt-0.5">
                {simulation.totalFeesPaid.toFixed(2)} {simulation.startCurrency}
              </p>
            </div>
          </div>

          {showSimDetails && (
            <div className="mt-3 border-t border-border/40 pt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-muted-foreground uppercase border-b border-border/40">
                    <th className="text-left py-1.5">Hop</th>
                    <th className="text-left py-1.5">Trade</th>
                    <th className="text-right py-1.5">Rate</th>
                    <th className="text-right py-1.5">Fee Paid</th>
                    <th className="text-right py-1.5">Resulting Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono text-[11px]">
                  {simulation.steps.map((st) => (
                    <tr key={st.hop}>
                      <td className="py-1.5 text-muted-foreground">{st.hop}</td>
                      <td className="py-1.5 text-foreground">{st.from} → {st.to}</td>
                      <td className="py-1.5 text-right">{st.rate.toFixed(4)}</td>
                      <td className="py-1.5 text-right text-amber-400/80">{st.feeAmount.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-medium text-foreground">{st.netBalance.toFixed(2)} {st.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
