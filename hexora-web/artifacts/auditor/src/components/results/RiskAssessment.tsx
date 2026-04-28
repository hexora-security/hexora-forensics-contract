import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Crosshair,
  FileCode2,
  Flame,
  GitBranch,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------
 *  Types & mock data
 * -------------------------------------------------------------------- */

type Severity = "critical" | "high" | "medium" | "low" | "info";
type Verification = "Simulation" | "Fork" | "Partial";

export interface AttackVector {
  id: string;
  title: string;
  impact: string;
  verified: Verification;
  location: string;
  steps: string[];
  /** Per-vector severity used for visual emphasis (e.g. critical = red glow). */
  severity: Severity;
}

export interface ConfidenceBreakdown {
  static: number;
  simulation: number;
  fork: number;
}

export interface ScoreContribution {
  label: string;
  delta: number;
}

export interface TechnicalTraceEntry {
  status: "success" | "warning" | "critical";
  message: string;
  /** Optional latency in ms; rendered as "— 12ms". */
  ms?: number;
}

export interface SuggestedFix {
  title: string;
  detail?: string;
}

export interface ProxyMetadata {
  proxyType: string;
  implementation: string;
  admin: string;
  beacon?: string;
  isAccessControlled: boolean;
}

export interface RiskAssessmentData {
  riskScore: number;
  severity: Severity;
  /** Short, emotional sentence for the Risk Summary card. */
  headline: string;
  confidence: number;
  mode: string;
  simulation: {
    exploitable: boolean;
    /** Estimated loss in ETH if the exploit is executed. */
    lossEth: number;
    gas: number;
  };
  attackVectors: AttackVector[];
  confidenceBreakdown: ConfidenceBreakdown;
  scoreBreakdown: ScoreContribution[];
  technicalTrace: TechnicalTraceEntry[];
  suggestedFixes: SuggestedFix[];
  proxy?: ProxyMetadata;
  recommendation?: string;
}

const defaultData: RiskAssessmentData = {
  riskScore: 42,
  severity: "critical",
  headline: "Funds are at risk — contract can be drained via reentrancy in withdraw().",
  confidence: 78,
  mode: "Full (Static + Simulation + Fork)",
  simulation: {
    exploitable: true,
    lossEth: 12.4,
    gas: 182_000,
  },
  attackVectors: [
    {
      id: "reentrancy-withdraw",
      title: "Reentrancy in withdraw()",
      impact: "Attacker can drain ~12.4 ETH in a single tx",
      verified: "Simulation",
      location: "Vault.sol:184",
      severity: "critical",
      steps: [
        "Deploy malicious receiver contract",
        "Deposit minimum required collateral",
        "Call withdraw() — receiver fallback re-enters before balance update",
        "Repeat re-entry until pool drained",
        "Withdraw stolen funds to EOA",
      ],
    },
    {
      id: "delegatecall-proxy",
      title: "Unrestricted delegatecall in proxy",
      impact: "Full storage takeover — attacker becomes admin",
      verified: "Fork",
      location: "Proxy.sol:71",
      severity: "high",
      steps: [
        "Send crafted calldata to proxy.fallback()",
        "Delegatecall executes attacker bytecode in proxy storage",
        "Overwrite admin slot with attacker EOA",
        "Upgrade implementation to malicious logic",
      ],
    },
    {
      id: "selector-collision",
      title: "Suspicious selector overlap",
      impact: "Function shadowing — admin route reachable by fallback",
      verified: "Partial",
      location: "Router.sol:42",
      severity: "medium",
      steps: [
        "Identify colliding 4-byte selector",
        "Forge calldata matching the unintended function",
        "Trigger admin path via the public route",
      ],
    },
  ],
  confidenceBreakdown: {
    static: 65,
    simulation: 90,
    fork: 100,
  },
  scoreBreakdown: [
    { label: "Simulation success", delta: +30 },
    { label: "Delegatecall detected", delta: +15 },
    { label: "Reentrancy pattern", delta: +15 },
    { label: "Suspicious selector", delta: +10 },
    { label: "No selfdestruct", delta: -28 },
  ],
  technicalTrace: [
    { status: "success", message: "Bytecode decoded", ms: 12 },
    { status: "success", message: "Control flow graph built", ms: 28 },
    { status: "warning", message: "External call before state update", ms: 34 },
    { status: "critical", message: "Reentrancy confirmed (Vault.withdraw)", ms: 45 },
    { status: "critical", message: "Delegatecall exploit path found", ms: 61 },
    { status: "success", message: "Fork validation completed", ms: 188 },
  ],
  suggestedFixes: [
    {
      title: "Apply checks-effects-interactions in withdraw()",
      detail: "Update internal balance before the external transfer call.",
    },
    {
      title: "Add reentrancy guard (nonReentrant) on payable entry points",
      detail: "Use OpenZeppelin's ReentrancyGuard or an equivalent mutex.",
    },
    {
      title: "Restrict delegatecall to a hardcoded trusted implementation",
      detail: "Validate the target address against an allow-list before the delegatecall.",
    },
  ],
};

defaultData.riskScore = 18;
defaultData.severity = "info";
defaultData.headline =
  "Upgradeable proxy pattern detected. No exploitable execution path was confirmed.";
defaultData.confidence = 91;
defaultData.simulation = {
  exploitable: false,
  lossEth: 0,
  gas: 128_400,
};
defaultData.attackVectors = [
  {
    id: "upgradeable-proxy",
    title: "Upgradeable Proxy Pattern Detected",
    impact: "Admin can upgrade implementation",
    verified: "Simulation",
    location: "EIP-1967 slots",
    severity: "info",
    steps: [
      "Proxy bytecode exposes delegatecall-based forwarding",
      "Upgrade selectors were identified in runtime metadata",
      "EIP-1967 implementation and admin slots were resolved",
      "eth_call replay reverted across privileged entry points",
      "No unauthorized fork path or exploit path was confirmed",
    ],
  },
  {
    id: "admin-key-risk",
    title: "Admin key compromise",
    impact: "Privileged actor could upgrade to malicious logic",
    verified: "Partial",
    location: "Admin-controlled upgrade path",
    severity: "low",
    steps: [
      "Attacker compromises the proxy admin key",
      "Admin calls upgrade function with malicious implementation",
      "Proxy delegates future calls into attacker logic",
    ],
  },
];
defaultData.confidenceBreakdown = {
  static: 74,
  simulation: 93,
  fork: 88,
};
defaultData.scoreBreakdown = [
  { label: "Delegatecall detected", delta: +15 },
  { label: "Upgrade selectors detected", delta: +10 },
  { label: "Proxy metadata resolved", delta: +8 },
  { label: "Simulation reverted", delta: -9 },
  { label: "No exploit path confirmed", delta: -12 },
  { label: "No fork state change", delta: -10 },
];
defaultData.technicalTrace = [
  { status: "success", message: "Bytecode decoded", ms: 12 },
  { status: "success", message: "Delegatecall forwarding path identified", ms: 28 },
  { status: "success", message: "EIP-1967 implementation slot resolved", ms: 34 },
  { status: "success", message: "EIP-1967 admin slot resolved", ms: 41 },
  { status: "warning", message: "Upgrade selectors reverted during simulation", ms: 58 },
  { status: "success", message: "Fork validation completed without exploitable state change", ms: 188 },
];
defaultData.suggestedFixes = [
  {
    title: "Protect proxy admin keys with multisig and timelock",
    detail: "Residual risk is concentrated in privileged upgrade control, not in a public exploit path.",
  },
  {
    title: "Monitor upgrade events and implementation changes",
    detail: "Alert on admin rotation, beacon changes, and implementation upgrades.",
  },
  {
    title: "Re-run deep validation after every upgrade",
    detail: "A benign proxy can become unsafe immediately after a privileged implementation change.",
  },
];
defaultData.proxy = {
  proxyType: "EIP-1967",
  implementation: "0x1234567890abcdef1234567890abcdef12345678",
  admin: "0xabcdef1234567890abcdef1234567890abcdef12",
  beacon: "not detected",
  isAccessControlled: true,
};
defaultData.recommendation =
  "This contract behaves as an upgradeable proxy (EIP-1967). Privileged upgrade functions are present but protected by access control. No exploitable execution path was identified. Risk is primarily associated with admin key compromise.";

/* ----------------------------------------------------------------------
 *  Helpers
 * -------------------------------------------------------------------- */

const severityStyles: Record<
  Severity,
  { label: string; className: string; ring: string; text: string }
> = {
  critical: {
    label: "Critical",
    className: "bg-red-500/15 text-red-300 border border-red-500/40",
    ring: "ring-red-500/40",
    text: "text-red-300",
  },
  high: {
    label: "High",
    className: "bg-orange-500/15 text-orange-300 border border-orange-500/40",
    ring: "ring-orange-500/40",
    text: "text-orange-300",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/40",
    ring: "ring-yellow-500/40",
    text: "text-yellow-300",
  },
  low: {
    label: "Low",
    className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
    ring: "ring-emerald-500/40",
    text: "text-emerald-300",
  },
  info: {
    label: "Info",
    className: "bg-sky-500/15 text-sky-300 border border-sky-500/40",
    ring: "ring-sky-500/40",
    text: "text-sky-300",
  },
};

const verificationStyles: Record<Verification, string> = {
  Simulation: "bg-violet-500/15 text-violet-300 border border-violet-500/40",
  Fork: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40",
  Partial: "bg-amber-500/15 text-amber-300 border border-amber-500/40",
};

/** Background tint + border for the headline impact box, by severity. */
const impactBoxStyles: Record<Severity, string> = {
  critical: "border-red-500/30 bg-red-500/[0.06]",
  high: "border-orange-500/30 bg-orange-500/[0.06]",
  medium: "border-yellow-500/30 bg-yellow-500/[0.06]",
  low: "border-emerald-500/30 bg-emerald-500/[0.06]",
  info: "border-sky-500/30 bg-sky-500/[0.06]",
};

function formatEth(eth: number): string {
  return `${eth.toFixed(2)} ETH`;
}

function formatGas(gas: number): string {
  if (gas >= 1_000_000) return `${(gas / 1_000_000).toFixed(2)}M`;
  if (gas >= 1_000) return `${Math.round(gas / 1_000)}k`;
  return `${gas}`;
}

/* ----------------------------------------------------------------------
 *  Component
 * -------------------------------------------------------------------- */

export interface RiskAssessmentProps {
  data?: RiskAssessmentData;
  className?: string;
}

export function RiskAssessment({
  data = defaultData,
  className,
}: RiskAssessmentProps) {
  const [scoreOpen, setScoreOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);

  const sev = severityStyles[data.severity];
  // The first attack vector is the dominant one — surface it in the
  // Risk Summary so users immediately see "where" the risk lives.
  const topVector = data.attackVectors[0];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* 1. Risk Summary ---------------------------------------------- */}
      <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <RiskScoreDial score={data.riskScore} severity={data.severity} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                  Risk Score
                </span>
                <Badge className={cn("rounded-md px-2 py-0 text-[10px] font-semibold uppercase tracking-wider", sev.className)}>
                  {sev.label}
                </Badge>
              </div>
              <div className="mt-0.5 font-mono text-2xl font-semibold text-foreground">
                {data.riskScore}
                <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="Confidence" value={`${data.confidence}%`} />
            <Stat icon={<Layers className="h-3.5 w-3.5" />} label="Mode" value={data.mode} mono={false} />
          </div>
        </div>

        {/* Headline: emotional impact line — turns "metric" into "warning". */}
        <div className={cn("mt-3 flex items-start gap-2 rounded-lg border px-3 py-2", impactBoxStyles[data.severity])}>
          <Flame className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", sev.text)} />
          <p className={cn("text-xs leading-relaxed", sev.text)}>
            {data.headline}
          </p>
        </div>

        {/* Secondary line: where the dominant vulnerability lives. */}
        {topVector && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/40 pt-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Crosshair className="h-3 w-3" />
              Top issue
            </span>
            <span className={cn("font-medium", sev.text)}>{topVector.title}</span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <FileCode2 className="h-3 w-3" />
              {topVector.location}
            </span>
            <Badge
              className={cn(
                "ml-auto rounded-md px-2 py-0 text-[10px] font-medium uppercase tracking-wider",
                verificationStyles[topVector.verified],
              )}
            >
              {topVector.verified}
            </Badge>
          </div>
        )}
      </Card>

      {/* 2. Simulation Proof ------------------------------------------ */}
      <Card
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card/80 to-card/40 px-5 py-4 shadow-lg ring-1 backdrop-blur-md",
          data.simulation.exploitable
            ? "border-red-500/30 ring-red-500/20"
            : "border-emerald-500/30 ring-emerald-500/20",
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-foreground/70" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Simulation Proof
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            on-chain replay
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ProofRow
            label="Status"
            value={
              <span className={cn("inline-flex items-center gap-1.5 font-semibold", data.simulation.exploitable ? "text-red-300" : "text-emerald-300")}>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                    data.simulation.exploitable ? "bg-red-400" : "bg-emerald-400",
                  )}
                />
                {data.simulation.exploitable ? "Exploitable" : "Safe"}
              </span>
            }
          />
          <ProofRow
            label="Estimated Loss"
            value={
              <span
                className={cn(
                  "font-mono",
                  data.simulation.exploitable ? "text-red-300" : "text-foreground",
                )}
              >
                {formatEth(data.simulation.lossEth)}
              </span>
            }
          />
          <ProofRow
            label="Gas"
            value={
              <span className="font-mono text-foreground">
                {formatGas(data.simulation.gas)}
              </span>
            }
          />
        </div>
      </Card>

      {data.proxy && (
        <Card className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.05] to-card/40 px-5 py-4 shadow-lg ring-1 ring-sky-500/10 backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-300" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Proxy Metadata
            </span>
            <Badge className="ml-auto rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0 text-[10px] font-medium uppercase tracking-wider text-sky-300">
              {data.proxy.proxyType}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ProofRow label="Implementation" value={<span className="font-mono text-xs text-foreground">{data.proxy.implementation}</span>} />
            <ProofRow label="Admin" value={<span className="font-mono text-xs text-foreground">{data.proxy.admin}</span>} />
            <ProofRow
              label="Access Control"
              value={
                <span className={cn("font-medium", data.proxy.isAccessControlled ? "text-emerald-300" : "text-red-300")}>
                  {data.proxy.isAccessControlled ? "Protected" : "Unprotected"}
                </span>
              }
            />
          </div>
          {data.recommendation && (
            <div className="mt-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-xs leading-relaxed text-foreground/85">
              {data.recommendation}
            </div>
          )}
        </Card>
      )}

      {/* 3. Attack Surface -------------------------------------------- */}
      <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Attack Surface
          </span>
          <Badge variant="outline" className="ml-auto rounded-md border-border/60 bg-background/40 text-[10px] font-mono">
            top {data.attackVectors.length}
          </Badge>
        </div>

        <Accordion type="single" collapsible className="flex flex-col gap-2">
          {data.attackVectors.map((vec) => {
            const vSev = severityStyles[vec.severity];
            const isCritical = vec.severity === "critical";
            return (
            <AccordionItem
              key={vec.id}
              value={vec.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-background/40 transition-colors",
                isCritical
                  ? "border-red-500/50 bg-red-500/[0.04] shadow-[0_0_22px_-12px_rgba(248,113,113,0.6)]"
                  : "border-border/60",
              )}
            >
              <AccordionTrigger className="px-4 py-3 text-left hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                <div className="flex w-full flex-col gap-1.5 pr-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {isCritical && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400 shadow-[0_0_8px_currentColor]" />
                      )}
                      {vec.title}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge
                        className={cn(
                          "rounded-md px-2 py-0 text-[10px] font-semibold uppercase tracking-wider",
                          vSev.className,
                        )}
                      >
                        {vSev.label}
                      </Badge>
                      <Badge
                        className={cn(
                          "rounded-md px-2 py-0 text-[10px] font-medium uppercase tracking-wider",
                          verificationStyles[vec.verified],
                        )}
                      >
                        {vec.verified}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{vec.impact}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground/80">
                      {vec.location}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  Attack flow
                </div>
                <ol className="flex flex-col gap-1.5">
                  {vec.steps.map((step, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2 text-xs text-foreground/85"
                    >
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
            );
          })}
        </Accordion>
      </Card>

      {/* 4. Confidence Breakdown -------------------------------------- */}
      <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-foreground/70" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Confidence Breakdown
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Overall
            </span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {data.confidence}%
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <ConfidenceBar label="Static Analysis" value={data.confidenceBreakdown.static} />
          <ConfidenceBar label="Simulation" value={data.confidenceBreakdown.simulation} />
          <ConfidenceBar label="Fork Validation" value={data.confidenceBreakdown.fork} />
        </div>
      </Card>

      {/* 5. Score drivers (collapsible) ------------------------------- */}
      <Collapsible open={scoreOpen} onOpenChange={setScoreOpen}>
        <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-3 shadow-lg backdrop-blur-md">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 py-1 text-left"
            >
              <span className="text-sm font-medium text-foreground">
                Score drivers
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  scoreOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="mt-3 flex flex-col divide-y divide-border/40 rounded-xl border border-border/40 bg-background/40">
              {/* Sort: positives (risk-increasing) first, negatives (risk-reducing) last. */}
              {[...data.scoreBreakdown]
                .sort((a, b) => b.delta - a.delta)
                .map((row) => {
                  const positive = row.delta >= 0;
                  return (
                    <div
                      key={row.label}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 text-foreground/85">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            positive ? "bg-red-400/80" : "bg-emerald-400/80",
                          )}
                        />
                        {row.label}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-xs font-semibold",
                          positive ? "text-red-300" : "text-emerald-300",
                        )}
                      >
                        {positive ? "+" : ""}
                        {row.delta}
                      </span>
                    </div>
                  );
                })}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 6. Technical Trace (collapsible) ----------------------------- */}
      <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-foreground/70" />
            <span className="text-sm font-medium text-foreground">
              Technical trace
            </span>
            <Badge
              variant="outline"
              className="rounded-md border-border/60 bg-background/40 text-[10px] font-mono"
            >
              {data.technicalTrace.length} events
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setTraceOpen((v) => !v)}
          >
            {traceOpen ? "Hide" : "View technical trace"}
            <ChevronDown
              className={cn(
                "ml-1 h-3.5 w-3.5 transition-transform",
                traceOpen && "rotate-180",
              )}
            />
          </Button>
        </div>

        {traceOpen && (
          <div className="mt-3 flex flex-col divide-y divide-border/40 rounded-xl border border-border/40 bg-background/60 font-mono text-xs">
            {data.technicalTrace.map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2"
              >
                <TraceIcon status={entry.status} />
                <span className="flex-1 text-foreground/85">{entry.message}</span>
                {typeof entry.ms === "number" && (
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    — {entry.ms}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 7. Suggested Fix --------------------------------------------- */}
      {data.suggestedFixes.length > 0 && (
        <Card className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.05] to-card/40 px-5 py-4 shadow-lg ring-1 ring-emerald-500/15 backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-200/90">
              Suggested fix
            </span>
            <Badge
              variant="outline"
              className="ml-auto rounded-md border-emerald-500/30 bg-background/40 text-[10px] font-mono text-emerald-200/90"
            >
              {data.suggestedFixes.length} actions
            </Badge>
          </div>
          <ol className="flex flex-col gap-2">
            {data.suggestedFixes.map((fix, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-background/40 px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[10px] font-mono font-semibold text-emerald-300">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {fix.title}
                  </span>
                  {fix.detail && (
                    <span className="text-xs text-muted-foreground">
                      {fix.detail}
                    </span>
                  )}
                </div>
                <ShieldCheck className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/70" />
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------
 *  Sub-components (kept local; this whole file is the deliverable)
 * -------------------------------------------------------------------- */

function Stat({
  icon,
  label,
  value,
  mono = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-foreground",
          mono ? "font-mono text-sm" : "text-sm",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RiskScoreDial({
  score,
  severity,
}: {
  score: number;
  severity: Severity;
}) {
  const sev = severityStyles[severity];
  const pct = Math.max(0, Math.min(100, score));
  const stroke =
    severity === "critical"
      ? "#f87171"
      : severity === "high"
        ? "#fb923c"
        : severity === "medium"
          ? "#facc15"
          : severity === "low"
            ? "#34d399"
            : "#38bdf8";
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className={cn("relative h-12 w-12 shrink-0 rounded-full ring-1", sev.ring)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-border/60"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold",
          sev.text,
        )}
      >
        {score}
      </div>
    </div>
  );
}

function ProofRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-background/40 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function ConfidenceBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{v}%</span>
      </div>
      <Progress
        value={v}
        className="h-1.5 bg-border/40 [&>div]:bg-gradient-to-r [&>div]:from-violet-400 [&>div]:to-cyan-300"
      />
    </div>
  );
}

function TraceIcon({ status }: { status: TechnicalTraceEntry["status"] }) {
  if (status === "success")
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />;
  if (status === "warning")
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" />;
  return <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />;
}

export default RiskAssessment;
