import Link from "next/link";
import {
  ArrowRight,
  FlaskConical,
  BookOpen,
  Code,
  HelpCircle,
  Calculator,
  GitBranch,
  Check,
  X,
  Timer,
  ShieldCheck,
  Percent,
  Coins,
} from "lucide-react";
import { LogTransformDemo } from "@/components/LogTransformDemo";
import { PseudocodeBlock } from "@/components/PseudocodeBlock";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function SectionIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mr-3 shrink-0">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {title && (
        <div className="border-b border-border px-4 py-2 flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">{title}</span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed text-foreground">
        {children}
      </pre>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Hero */}
      <section className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold tracking-tight">How FoxChange Works</h1>
        </div>

        <div className="text-muted-foreground space-y-3 leading-relaxed">
          <p>
            Exchange rates form a directed graph — each currency or token is a node, and each exchange rate is a directed edge.
            <strong className="text-foreground"> Arbitrage</strong> exists when converting through a closed chain of currencies yields more than you started with (cycle rate product &gt; 1.0).
          </p>
          <p>
            For example: start with 10,000 GBP, convert to USD at 1.24837, USD to EUR at 0.950, and EUR back to GBP at 0.860.
            You end with 1.24837 × 0.950 × 0.860 = <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">1.01992</code> (a +1.992% net profit).
            Through a logarithmic transformation, finding this profitable loop is mathematically identical to finding a <strong className="text-foreground">negative weight cycle</strong> in a graph.
          </p>
        </div>
      </section>

      {/* Section 1: Log Transform & Fee Formulation */}
      <section className="space-y-6">
        <div className="flex items-center">
          <SectionIcon icon={Calculator} />
          <div>
            <h2 className="text-xl font-bold">Step 1: The Logarithmic Transform & Fee Weighting</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Turn multiplicative profits into additive shortest-path sums</p>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          Bellman-Ford minimizes <em className="text-foreground">sums</em> of edge weights, but financial arbitrage is a <em className="text-foreground">product</em> of rates.
          Furthermore, in real trading, every conversion incurs a transaction fee <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">fee</code>.
          We transform each edge with:
        </p>

        <div className="rounded-xl border border-border bg-card p-4 font-mono text-center text-sm font-semibold text-amber-400">
          w = -log( rate × (1 - fee) ) = -log(rate) - log(1 - fee)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-semibold">Raw Market Condition (Product)</p>
            <p className="font-mono text-sm bg-muted/50 rounded-lg px-4 py-3 border border-border/50">
              ∏ [ rate<sub>i</sub> × (1 - fee) ] &gt; 1.0
            </p>
            <p className="text-xs text-muted-foreground">
              A trader ends with more capital than they started with, even after deducting fees.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-semibold">Graph Formulation (Negative Sum)</p>
            <p className="font-mono text-sm bg-muted/50 rounded-lg px-4 py-3 border border-border/50">
              ∑ [ -log(rate<sub>i</sub> × (1 - fee)) ] &lt; 0
            </p>
            <p className="text-xs text-muted-foreground">
              Sum of edge weights is strictly negative — exactly what Bellman-Ford detects.
            </p>
          </div>
        </div>

        <CodeBlock title="src/lib/graph.ts — Fee-Aware buildGraph()">
{`export function buildGraph(rates: RateMatrix, fee: number = 0): Graph {
  const nodes = Object.keys(rates);
  const edges: Edge[] = [];
  const feeFactor = 1 - fee;

  for (const from of nodes) {
    for (const [to, rate] of Object.entries(rates[from])) {
      if (from !== to && rate > 0) {
        edges.push({
          from,
          to,
          weight: -Math.log(rate * feeFactor), // Fee-adjusted logarithmic weight
          rawRate: rate,
          fee,
        });
      }
    }
  }
  return { nodes, edges, fee };
}`}
        </CodeBlock>

        <LogTransformDemo />
      </section>

      {/* Section 2: Why BF */}
      <section className="space-y-6">
        <div className="flex items-center">
          <SectionIcon icon={GitBranch} />
          <div>
            <h2 className="text-xl font-bold">Step 2: Why Bellman-Ford?</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Negative edge weights require dynamic relaxation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-red-400" />
              <p className="text-sm font-semibold text-red-400">Dijkstra cannot be used</p>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>• Greedy assumption breaks with negative edge weights</li>
              <li>• Permanently settles nodes and cannot reconsider shorter routes</li>
              <li>• Cannot detect or trace negative weight cycles</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <p className="text-sm font-semibold text-green-400">Bellman-Ford solves this</p>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>• Iteratively relaxes all edges |V|-1 times</li>
              <li>• Correctly propagates negative distance updates</li>
              <li>• The V-th pass identifies edges that continue relaxing</li>
              <li>• Walking the predecessor pointer reconstructs the exact arbitrage cycle</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3: Numerical Stability & Epsilon Guard */}
      <section className="space-y-6">
        <div className="flex items-center">
          <SectionIcon icon={ShieldCheck} />
          <div>
            <h2 className="text-xl font-bold">Step 3: Numerical Precision & Epsilon Guard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Preventing floating-point arithmetic phantom cycles</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3 leading-relaxed text-sm text-muted-foreground">
          <p>
            In standard 64-bit IEEE 754 floating-point arithmetic, taking logarithms of reciprocal rates:
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded ml-1">-log(r) + -log(1/r)</code> can evaluate to <code className="font-mono text-xs text-rose-400">-2.22 × 10⁻¹⁶</code> instead of zero.
          </p>
          <p>
            Without an epsilon tolerance guard, standard Bellman-Ford flags these infinitesimal rounding errors as &quot;arbitrage&quot;.
            FoxChange applies an <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">EPSILON = 1e-9</code> guard on relaxation checks and requires minimum 3-hop cycles, completely eliminating false positives.
          </p>
        </div>
      </section>

      {/* Section 4: Real Markets: Fiat vs Crypto */}
      <section className="space-y-6">
        <div className="flex items-center">
          <SectionIcon icon={Coins} />
          <div>
            <h2 className="text-xl font-bold">Step 4: Market Dynamics (Fiat vs Crypto)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Why crypto order books yield real triangular arbitrage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h3 className="font-semibold text-sm">Fiat Reference Rates (ECB)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Central banks publish official benchmark rates. Because cross-rates are derived mathematically from a base quote, round-trip cycles are triangularly consistent at parity (1.0). Real forex retail brokers charge spreads (0.05-0.2%) which eliminate retail arbitrage.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h3 className="font-semibold text-sm">Crypto Order Books (Binance Live)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cryptocurrency pairs (e.g. BTC/USDT, ETH/USDT, ETH/BTC) trade on separate, independent order books with independent limit orders. High-frequency triangular arbitrage exists transiently until bot trades realign the book.
            </p>
          </div>
        </div>
      </section>

      {/* Pseudocode */}
      <section className="space-y-6">
        <div className="flex items-center">
          <SectionIcon icon={Code} />
          <div>
            <h2 className="text-xl font-bold">Bellman-Ford Arbitrage Pseudocode</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Algorithm implementation with cycle tracing</p>
          </div>
        </div>

        <PseudocodeBlock />
      </section>

      {/* FAQ */}
      <section className="space-y-6">
        <div className="flex items-center">
          <SectionIcon icon={HelpCircle} />
          <div>
            <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Common questions about currency arbitrage and Bellman-Ford</p>
          </div>
        </div>

        <Accordion className="space-y-3">
          <AccordionItem value="real-money" className="border border-border rounded-xl px-5 data-[state=open]:bg-card">
            <AccordionTrigger className="text-sm font-medium py-4">
              Can I make real money running this?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              In live fiat markets, high-frequency trading firms co-located with exchange servers execute arbitrage in microseconds. In crypto, triangular arbitrage exists but must overcome exchange taker fees (0.075-0.1%). FoxChange includes a per-hop fee slider and trade cash flow simulator so you can test realistic profitability after fees.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="multi-source" className="border border-border rounded-xl px-5 data-[state=open]:bg-card">
            <AccordionTrigger className="text-sm font-medium py-4">
              What data providers does FoxChange support?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              FoxChange supports live European Central Bank reference rates via Frankfurter v1, Open Exchange Rates, historical ECB rates back to 1999, and live crypto order book quotes directly from Binance Public Market Data.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="complexity" className="border border-border rounded-xl px-5 data-[state=open]:bg-card">
            <AccordionTrigger className="text-sm font-medium py-4">
              What is the runtime complexity?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              Single-source Bellman-Ford runs in O(|V| × |E|). Running from all nodes to ensure complete coverage is O(|V|² × |E|). For an 8-currency graph with 56 directed edges, this completes in under 1 millisecond on modern hardware.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* CTA */}
      <section className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <FlaskConical className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold">Try the Sandbox</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Test the VIT research paper benchmark (1.992%), experiment with the fee-breakeven trap, or import live order book rates.
        </p>
        <Link href="/sandbox" className="inline-block">
          <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            Open Sandbox <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
