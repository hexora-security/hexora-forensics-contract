import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Database,
  GitBranch,
  Globe,
  KeyRound,
  Layers,
  Lock,
  MoreHorizontal,
  RefreshCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  TrendingUp,
  UserCog,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import { AnimatedCounter } from "@/components/admin/AnimatedCounter";
import { GlowBar } from "@/components/admin/GlowBar";
import { RadarScanner, type RadarBlip } from "@/components/admin/RadarScanner";

/* ----------------------------------------------------------------------
 *  Types & mock data
 * -------------------------------------------------------------------- */

type Severity = "critical" | "high" | "medium" | "low" | "info";
type EngineState = "online" | "degraded" | "offline";
type AuditStatus = "running" | "queued" | "completed" | "failed";
type Role = "owner" | "auditor" | "viewer";

export interface EngineStatus {
  state: EngineState;
  uptimeHours: number;
  region: string;
  version: string;
  cpu: number;
  memory: number;
  rpcLatencyMs: number;
}

export interface AuditEntry {
  id: string;
  contract: string;
  network: string;
  status: AuditStatus;
  severity: Severity;
  confidence: number;
  ageSec: number;
  auditor: string;
  kind?: string;
  proxyType?: string;
  implementation?: string;
  admin?: string;
  beacon?: string;
  isAccessControlled?: boolean;
  exploitability?: "confirmed" | "not-confirmed";
}

export interface ThreatIntelEntry {
  id: string;
  name: string;
  hits24h: number;
  trend: "up" | "down" | "flat";
  severity: Severity;
}

export interface OperatorEntry {
  id: string;
  handle: string;
  email: string;
  role: Role;
  audits: number;
  lastSeen: string;
  status: "active" | "idle" | "revoked";
}

export interface ScannerToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  hot?: boolean;
}

export interface SystemEvent {
  id: string;
  level: "info" | "warning" | "critical";
  message: string;
  source: string;
  ms: number;
}

export interface AdminData {
  engine: EngineStatus;
  metrics: {
    auditsToday: number;
    auditsTrendPct: number;
    criticalsOpen: number;
    queueDepth: number;
    forksActive: number;
    forksCapacity: number;
  };
  audits: AuditEntry[];
  threats: ThreatIntelEntry[];
  operators: OperatorEntry[];
  toggles: ScannerToggle[];
  events: SystemEvent[];
}

const defaultData: AdminData = {
  engine: {
    state: "online",
    uptimeHours: 72.4,
    region: "eu-west-1",
    version: "v3.4.2",
    cpu: 42,
    memory: 61,
    rpcLatencyMs: 138,
  },
  metrics: {
    auditsToday: 1284,
    auditsTrendPct: 12.4,
    criticalsOpen: 7,
    queueDepth: 3,
    forksActive: 4,
    forksCapacity: 8,
  },
  audits: [
    { id: "ax-9821", contract: "0x7a2…f01c", network: "Ethereum", status: "running",   severity: "critical", confidence: 78, ageSec: 12,  auditor: "@neo" },
    { id: "ax-9820", contract: "0x4b9…aa12", network: "Polygon",  status: "queued",    severity: "info",     confidence: 0,  ageSec: 28,  auditor: "—" },
    { id: "ax-9819", contract: "0x12c…9d8e", network: "Arbitrum", status: "completed", severity: "high",     confidence: 82, ageSec: 184, auditor: "@trinity" },
    { id: "ax-9818", contract: "0xab3…44fe", network: "Base",     status: "completed", severity: "low",      confidence: 64, ageSec: 412, auditor: "@morpheus" },
    { id: "ax-9817", contract: "0x91d…07a3", network: "Ethereum", status: "failed",    severity: "info",     confidence: 0,  ageSec: 902, auditor: "@cipher" },
  ],
  threats: [
    { id: "t1", name: "Reentrancy (ERC-20)",        hits24h: 42, trend: "up",   severity: "critical" },
    { id: "t2", name: "Unrestricted delegatecall",  hits24h: 18, trend: "up",   severity: "high" },
    { id: "t3", name: "Selector collision",         hits24h: 11, trend: "flat", severity: "medium" },
    { id: "t4", name: "tx.origin auth",             hits24h: 9,  trend: "down", severity: "medium" },
    { id: "t5", name: "Selfdestruct exposure",      hits24h: 4,  trend: "down", severity: "low" },
  ],
  operators: [
    { id: "u1", handle: "@neo",      email: "neo@sentinel.chain",      role: "owner",   audits: 412, lastSeen: "2m",  status: "active"  },
    { id: "u2", handle: "@trinity",  email: "trinity@sentinel.chain",  role: "auditor", audits: 287, lastSeen: "14m", status: "active"  },
    { id: "u3", handle: "@morpheus", email: "morpheus@sentinel.chain", role: "auditor", audits: 198, lastSeen: "1h",  status: "idle"    },
    { id: "u4", handle: "@cipher",   email: "cipher@sentinel.chain",   role: "viewer",  audits: 24,  lastSeen: "3d",  status: "revoked" },
  ],
  toggles: [
    { id: "sim",  label: "On-chain simulation",   description: "eth_call replay against latest block",        enabled: true,  hot: true },
    { id: "fork", label: "Anvil fork validation", description: "Spawn ephemeral fork for confidence ≥ 60",    enabled: true },
    { id: "intel",label: "Threat intel sync",     description: "Pull signatures from federated feed every 15m", enabled: true },
    { id: "auto", label: "Auto-quarantine",       description: "Lock contracts scoring CRITICAL until reviewed", enabled: false },
  ],
  events: [
    { id: "e1", level: "info",     message: "Signature DB synced (4-byte +124 entries)", source: "intel",  ms: 12  },
    { id: "e2", level: "warning",  message: "RPC pool latency spike on eth-mainnet",      source: "rpc",    ms: 28  },
    { id: "e3", level: "critical", message: "Audit ax-9821: reentrancy confirmed",        source: "engine", ms: 45  },
    { id: "e4", level: "info",     message: "Operator @cipher access revoked by @neo",    source: "iam",    ms: 61  },
    { id: "e5", level: "info",     message: "Fork worker #7 reclaimed (idle 5m)",         source: "forks",  ms: 188 },
  ],
};

defaultData.audits = [
  {
    id: "ax-9821",
    contract: "0x7a2...f01c",
    network: "Ethereum",
    status: "running",
    severity: "info",
    confidence: 91,
    ageSec: 12,
    auditor: "@neo",
    kind: "UPGRADEABLE_PROXY",
    proxyType: "EIP-1967",
    implementation: "0x1234...5678",
    admin: "0xabcd...ef12",
    beacon: "not detected",
    isAccessControlled: true,
    exploitability: "not-confirmed",
  },
  {
    id: "ax-9820",
    contract: "0x4b9...aa12",
    network: "BNB",
    status: "queued",
    severity: "info",
    confidence: 0,
    ageSec: 28,
    auditor: "--",
    kind: "UPGRADEABLE_PROXY",
    proxyType: "EIP-1967",
    implementation: "pending",
    admin: "pending",
    beacon: "pending",
    isAccessControlled: true,
    exploitability: "not-confirmed",
  },
  {
    id: "ax-9819",
    contract: "0x12c...9d8e",
    network: "Arbitrum",
    status: "completed",
    severity: "high",
    confidence: 82,
    ageSec: 184,
    auditor: "@trinity",
    kind: "REENTRANCY_RISK",
    exploitability: "confirmed",
  },
  {
    id: "ax-9818",
    contract: "0xab3...44fe",
    network: "Base",
    status: "completed",
    severity: "low",
    confidence: 64,
    ageSec: 412,
    auditor: "@morpheus",
    kind: "SUSPICIOUS_BYTECODE",
    exploitability: "not-confirmed",
  },
  {
    id: "ax-9817",
    contract: "0x91d...07a3",
    network: "Ethereum",
    status: "failed",
    severity: "info",
    confidence: 0,
    ageSec: 902,
    auditor: "@cipher",
    kind: "SCAN_ABORTED",
    exploitability: "not-confirmed",
  },
];

defaultData.threats = [
  { id: "t1", name: "Reentrancy (ERC-20)", hits24h: 42, trend: "up", severity: "critical" },
  { id: "t2", name: "Upgradeable proxy admin risk", hits24h: 18, trend: "up", severity: "medium" },
  { id: "t3", name: "Selector collision", hits24h: 11, trend: "flat", severity: "medium" },
  { id: "t4", name: "tx.origin auth", hits24h: 9, trend: "down", severity: "medium" },
  { id: "t5", name: "Selfdestruct exposure", hits24h: 4, trend: "down", severity: "low" },
];

defaultData.toggles = [
  { id: "sim", label: "On-chain simulation", description: "eth_call replay against latest block", enabled: true, hot: true },
  { id: "fork", label: "Anvil fork validation", description: "Spawn ephemeral fork for confidence >= 60", enabled: true },
  { id: "intel", label: "Threat intel sync", description: "Pull signatures from federated feed every 15m", enabled: true },
  { id: "auto", label: "Chain mismatch guard", description: "Abort scan when RPC chain id does not match target chain", enabled: true },
];

defaultData.events = [
  { id: "e1", level: "info", message: "Signature DB synced (4-byte +124 entries)", source: "intel", ms: 12 },
  { id: "e2", level: "warning", message: "Blocked scan: configured chain bnb but live RPC returned chain id 1", source: "rpc", ms: 28 },
  { id: "e3", level: "info", message: "Audit ax-9821 classified as upgradeable proxy; no exploit path confirmed", source: "engine", ms: 45 },
  { id: "e4", level: "info", message: "Operator @cipher access revoked by @neo", source: "iam", ms: 61 },
  { id: "e5", level: "info", message: "Fork worker #7 reclaimed (idle 5m)", source: "forks", ms: 188 },
];

/* ----------------------------------------------------------------------
 *  Style maps (mirrors RiskAssessment for visual consistency)
 * -------------------------------------------------------------------- */

const severityStyles: Record<
  Severity,
  { label: string; className: string; ring: string; text: string; dotBg: string }
> = {
  critical: { label: "Critical", className: "bg-red-500/15 text-red-300 border border-red-500/40",         ring: "ring-red-500/40",     text: "text-red-300",     dotBg: "bg-red-300" },
  high:     { label: "High",     className: "bg-orange-500/15 text-orange-300 border border-orange-500/40", ring: "ring-orange-500/40", text: "text-orange-300", dotBg: "bg-orange-300" },
  medium:   { label: "Medium",   className: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/40", ring: "ring-yellow-500/40", text: "text-yellow-300", dotBg: "bg-yellow-300" },
  low:      { label: "Low",      className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40", ring: "ring-emerald-500/40", text: "text-emerald-300", dotBg: "bg-emerald-300" },
  info:     { label: "Info",     className: "bg-sky-500/15 text-sky-300 border border-sky-500/40",          ring: "ring-sky-500/40",     text: "text-sky-300",     dotBg: "bg-sky-300" },
};

const auditStatusStyles: Record<AuditStatus, { label: string; className: string; dot: string }> = {
  running:   { label: "Running",   className: "bg-violet-500/15 text-violet-300 border border-violet-500/40",   dot: "bg-violet-400" },
  queued:    { label: "Queued",    className: "bg-amber-500/15 text-amber-300 border border-amber-500/40",     dot: "bg-amber-400" },
  completed: { label: "Completed", className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40", dot: "bg-emerald-400" },
  failed:    { label: "Failed",    className: "bg-red-500/15 text-red-300 border border-red-500/40",           dot: "bg-red-400" },
};

const roleStyles: Record<Role, string> = {
  owner:   "bg-violet-500/15 text-violet-300 border border-violet-500/40",
  auditor: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40",
  viewer:  "bg-slate-500/15 text-slate-300 border border-slate-500/40",
};

const operatorStatusDot: Record<OperatorEntry["status"], string> = {
  active:  "bg-emerald-400",
  idle:    "bg-amber-400",
  revoked: "bg-red-400",
};

const engineStateStyles: Record<EngineState, { label: string; text: string; ring: string; dot: string; box: string }> = {
  online:   { label: "Online",   text: "text-emerald-300", ring: "ring-emerald-500/30", dot: "bg-emerald-400", box: "border-emerald-500/30 bg-emerald-500/[0.06]" },
  degraded: { label: "Degraded", text: "text-amber-300",   ring: "ring-amber-500/30",   dot: "bg-amber-400",   box: "border-amber-500/30 bg-amber-500/[0.06]" },
  offline:  { label: "Offline",  text: "text-red-300",     ring: "ring-red-500/30",     dot: "bg-red-400",     box: "border-red-500/30 bg-red-500/[0.06]" },
};

/* ----------------------------------------------------------------------
 *  Helpers
 * -------------------------------------------------------------------- */

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

function formatNumShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function exploitabilityLabel(value?: AuditEntry["exploitability"]): string {
  return value === "confirmed" ? "YES / Confirmed" : "NO / Not confirmed";
}

function accessControlLabel(value?: boolean): string {
  if (value === true) return "Protected";
  if (value === false) return "Unprotected";
  return "Unknown";
}

/** Map an audit row to a deterministic blip on the radar. */
function auditToBlip(a: AuditEntry, i: number): RadarBlip {
  // angle: spread by id hash; radius: 0.4..0.9 scaled by status
  const seed = i * 137.508 * (Math.PI / 180);
  const radius = a.status === "running" ? 0.55 : a.status === "queued" ? 0.4 : 0.85;
  const sev: RadarBlip["severity"] =
    a.severity === "critical" ? "critical" : a.severity === "high" ? "high" : "info";
  return { id: a.id, angle: seed % (Math.PI * 2), radius, severity: sev };
}

/* ----------------------------------------------------------------------
 *  Motion presets
 * -------------------------------------------------------------------- */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ----------------------------------------------------------------------
 *  Component
 * -------------------------------------------------------------------- */

export interface AdminDashboardProps {
  data?: AdminData;
  className?: string;
}

export function AdminDashboard({ data = defaultData, className }: AdminDashboardProps) {
  const [eventsOpen, setEventsOpen] = useState(false);
  const [toggles, setToggles] = useState(data.toggles);
  const [openAuditId, setOpenAuditId] = useState<string | null>(null);

  const engine = engineStateStyles[data.engine.state];
  const blips = useMemo(() => data.audits.map(auditToBlip), [data.audits]);

  return (
    <motion.div
      className={cn("flex flex-col gap-4", className)}
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* 1. Engine Status -------------------------------------------- */}
      <motion.div variants={item}>
        <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <EngineDial cpu={data.engine.cpu} state={data.engine.state} />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                    Engine
                  </span>
                  <Badge className={cn("rounded-md px-2 py-0 text-[10px] font-semibold uppercase tracking-wider", engine.text, "bg-background/40 border border-current/30")}>
                    <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]", engine.dot)} />
                    {engine.label}
                  </Badge>
                </div>
                <div className="mt-0.5 font-mono text-2xl font-semibold text-foreground">
                  Sentinel<span className="text-secondary">.</span>core
                  <span className="ml-2 text-sm text-muted-foreground">{data.engine.version}</span>
                </div>
              </div>
            </div>

            {/* Right side: stats + radar */}
            <div className="flex items-center gap-5">
              <div className="flex flex-col gap-1.5 text-sm">
                <Stat icon={<Globe    className="h-3.5 w-3.5" />} label="Region"  value={data.engine.region} mono={false} />
                <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="Uptime"  value={`${data.engine.uptimeHours.toFixed(1)}h`} />
                <Stat icon={<Zap      className="h-3.5 w-3.5" />} label="RPC"     value={`${data.engine.rpcLatencyMs}ms`} />
              </div>
              <div className="relative shrink-0">
                <RadarScanner size={120} blips={blips} />
                <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-300/70">
                  scan ·{blips.length}
                </span>
              </div>
            </div>
          </div>

          {/* Resource bars */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ResourceBar icon={<Cpu className="h-3.5 w-3.5" />}    label="CPU"    value={data.engine.cpu}    />
            <ResourceBar icon={<Server className="h-3.5 w-3.5" />} label="Memory" value={data.engine.memory} />
          </div>
        </Card>
      </motion.div>

      {/* 2. Metrics row ---------------------------------------------- */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Audits / 24h"
          accent="cyan"
          value={
            <AnimatedCounter
              value={data.metrics.auditsToday}
              format={(n) => formatNumShort(n)}
            />
          }
          trail={
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
              <TrendingUp className="h-3 w-3" />
              +<AnimatedCounter value={data.metrics.auditsTrendPct} decimals={1} />%
            </span>
          }
        />
        <MetricCard
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          label="Criticals open"
          accent="red"
          value={<AnimatedCounter value={data.metrics.criticalsOpen} />}
        />
        <MetricCard
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Queue"
          accent="amber"
          value={<AnimatedCounter value={data.metrics.queueDepth} />}
        />
        <MetricCard
          icon={<GitBranch className="h-3.5 w-3.5" />}
          label="Forks"
          accent="violet"
          value={
            <span>
              <AnimatedCounter value={data.metrics.forksActive} />
              <span className="text-muted-foreground">/{data.metrics.forksCapacity}</span>
            </span>
          }
        />
      </motion.div>

      {/* 3. Live Audits queue ---------------------------------------- */}
      <motion.div variants={item}>
        <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-300" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Live audits
            </span>
            <Badge variant="outline" className="ml-auto rounded-md border-border/60 bg-background/40 text-[10px] font-mono">
              {data.audits.length} recent
            </Badge>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/40 bg-background/40">
            <div className="grid grid-cols-12 gap-2 border-b border-border/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="col-span-2">ID</span>
              <span className="col-span-3">Contract</span>
              <span className="col-span-2">Network</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-1 text-right">Conf.</span>
              <span className="col-span-2 text-right">Auditor</span>
            </div>
            <div className="divide-y divide-border/40">
              {data.audits.map((row) => {
                const st = auditStatusStyles[row.status];
                const sev = severityStyles[row.severity];
                const isCritical = row.severity === "critical" && row.status !== "queued";
                const open = openAuditId === row.id;
                return (
                  <div key={row.id}>
                    <button
                      type="button"
                      onClick={() => setOpenAuditId(open ? null : row.id)}
                      className={cn(
                        "grid w-full grid-cols-12 items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-background/60",
                        isCritical && "bg-red-500/[0.04]",
                      )}
                    >
                      <span className="col-span-2 font-mono text-foreground/85">
                        {row.id}
                      </span>
                      <span className="col-span-3 flex items-center gap-1.5">
                        {isCritical && (
                          <motion.span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400 shadow-[0_0_8px_currentColor]"
                            animate={{ opacity: [1, 0.35, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                          />
                        )}
                        <span className={cn("font-mono", isCritical ? sev.text : "text-foreground/85")}>
                          {row.contract}
                        </span>
                      </span>
                      <span className="col-span-2 text-muted-foreground">{row.network}</span>
                      <span className="col-span-2">
                        <Badge className={cn("rounded-md px-2 py-0 text-[10px] font-medium uppercase tracking-wider", st.className)}>
                          <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", st.dot, row.status === "running" && "shadow-[0_0_8px_currentColor]")} />
                          {st.label}
                        </Badge>
                      </span>
                      <span className={cn("col-span-1 text-right font-mono", row.confidence === 0 ? "text-muted-foreground" : sev.text)}>
                        {row.confidence > 0 ? `${row.confidence}%` : "—"}
                      </span>
                      <span className="col-span-2 flex items-center justify-end gap-2 text-right">
                        <span className="text-[10px] tabular-nums text-muted-foreground">{formatAge(row.ageSec)}</span>
                        <span className="font-mono text-foreground/80">{row.auditor}</span>
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden border-t border-border/40 bg-background/60"
                        >
                          <AuditDetailRich row={row} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 4. Threat intel + Scanner toggles --------------------------- */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Threat intel */}
        <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Threat intel — 24h
            </span>
            <Badge variant="outline" className="ml-auto rounded-md border-border/60 bg-background/40 text-[10px] font-mono">
              live
            </Badge>
          </div>

          <ul className="flex flex-col gap-2">
            {data.threats.map((t) => {
              const sev = severityStyles[t.severity];
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2"
                >
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", sev.dotBg)} />
                  <span className="flex-1 text-sm text-foreground/85">{t.name}</span>
                  <Badge className={cn("rounded-md px-2 py-0 text-[10px] font-medium uppercase tracking-wider", sev.className)}>
                    {sev.label}
                  </Badge>
                  <span className="w-16 text-right font-mono text-xs">
                    <span className={cn("inline-flex items-center gap-1", sev.text)}>
                      <TrendIcon trend={t.trend} />
                      <AnimatedCounter value={t.hits24h} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Scanner toggles */}
        <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-violet-300" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Engine pipeline
            </span>
            <Badge variant="outline" className="ml-auto rounded-md border-border/60 bg-background/40 text-[10px] font-mono">
              hot reload
            </Badge>
          </div>

          <ul className="flex flex-col gap-2">
            {toggles.map((tog) => (
              <li
                key={tog.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-background/40 px-3 py-2.5",
                  tog.enabled
                    ? "border-violet-500/30 ring-1 ring-violet-500/15"
                    : "border-border/40",
                )}
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{tog.label}</span>
                    {tog.hot && (
                      <Badge className="rounded-md border border-violet-500/40 bg-violet-500/15 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider text-violet-300">
                        live
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{tog.description}</span>
                </div>
                <Switch
                  checked={tog.enabled}
                  onCheckedChange={(v) =>
                    setToggles((cur) =>
                      cur.map((t) => (t.id === tog.id ? { ...t, enabled: Boolean(v) } : t)),
                    )
                  }
                  className="mt-0.5 data-[state=checked]:bg-violet-500"
                />
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>

      {/* 5. Operators (IAM) ------------------------------------------ */}
      <motion.div variants={item}>
        <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-300" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Operators
            </span>
            <Badge variant="outline" className="ml-auto rounded-md border-border/60 bg-background/40 text-[10px] font-mono">
              {data.operators.length} accounts
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-md border-border/60 bg-background/40 px-2.5 text-[11px] font-medium"
            >
              <UserCog className="mr-1.5 h-3 w-3" />
              Invite
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/40 bg-background/40">
            <div className="grid grid-cols-12 gap-2 border-b border-border/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="col-span-3">Operator</span>
              <span className="col-span-3">Email</span>
              <span className="col-span-2">Role</span>
              <span className="col-span-1 text-right">Audits</span>
              <span className="col-span-2 text-right">Last seen</span>
              <span className="col-span-1 text-right">·</span>
            </div>
            <div className="divide-y divide-border/40">
              {data.operators.map((op) => (
                <div
                  key={op.id}
                  className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-background/60"
                >
                  <span className="col-span-3 flex items-center gap-2">
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]", operatorStatusDot[op.status])} />
                    <span className="font-mono text-foreground/90">{op.handle}</span>
                  </span>
                  <span className="col-span-3 truncate text-muted-foreground">{op.email}</span>
                  <span className="col-span-2">
                    <Badge className={cn("rounded-md px-2 py-0 text-[10px] font-medium uppercase tracking-wider", roleStyles[op.role])}>
                      {op.role === "owner" && <KeyRound className="mr-1 h-3 w-3" />}
                      {op.role === "auditor" && <ShieldCheck className="mr-1 h-3 w-3" />}
                      {op.role === "viewer" && <Lock className="mr-1 h-3 w-3" />}
                      {op.role}
                    </Badge>
                  </span>
                  <span className="col-span-1 text-right font-mono text-foreground/85">
                    <AnimatedCounter value={op.audits} />
                  </span>
                  <span className="col-span-2 text-right font-mono text-muted-foreground">{op.lastSeen}</span>
                  <span className="col-span-1 flex justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 6. System events trace -------------------------------------- */}
      <motion.div variants={item}>
        <Card className="rounded-2xl border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur-md">
          <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                System events
              </span>
              <Badge variant="outline" className="ml-auto rounded-md border-border/60 bg-background/40 text-[10px] font-mono">
                tail / {data.events.length}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                <RefreshCcw className="mr-1.5 h-3 w-3" />
                Refresh
              </Button>
              <CollapsibleTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {eventsOpen ? "Hide" : "Show"}
                  <ChevronDown
                    className={cn(
                      "ml-1 h-3 w-3 transition-transform",
                      eventsOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="mt-3 flex flex-col divide-y divide-border/40 rounded-xl border border-border/40 bg-background/60 font-mono text-xs">
                {data.events.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-3 py-2">
                    <EventIcon level={entry.level} />
                    <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {entry.source}
                    </span>
                    <span className="flex-1 text-foreground/85">{entry.message}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      — {entry.ms}ms
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ----------------------------------------------------------------------
 *  Sub-components
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
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-foreground", mono ? "font-mono text-sm" : "text-sm")}>
        {value}
      </span>
    </div>
  );
}

function EngineDial({ cpu, state }: { cpu: number; state: EngineState }) {
  const styles = engineStateStyles[state];
  const pct = Math.max(0, Math.min(100, cpu));
  const stroke =
    state === "online" ? "#34d399" : state === "degraded" ? "#facc15" : "#f87171";
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className={cn("relative h-12 w-12 shrink-0 rounded-full ring-1", styles.ring)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-border/60" />
        <motion.circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className={cn("absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold", styles.text)}>
        <AnimatedCounter value={pct} />
      </div>
    </div>
  );
}

function ResourceBar({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-background/40 px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-mono text-foreground">
          <AnimatedCounter value={v} />%
        </span>
      </div>
      <GlowBar value={v} />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
  trail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: "cyan" | "violet" | "amber" | "red";
  trail?: React.ReactNode;
}) {
  const tones: Record<string, { ring: string; iconCls: string; valueCls: string }> = {
    cyan:   { ring: "ring-cyan-500/15",   iconCls: "text-cyan-300",   valueCls: "text-foreground" },
    violet: { ring: "ring-violet-500/15", iconCls: "text-violet-300", valueCls: "text-foreground" },
    amber:  { ring: "ring-amber-500/15",  iconCls: "text-amber-300",  valueCls: "text-foreground" },
    red:    { ring: "ring-red-500/15",    iconCls: "text-red-300",    valueCls: "text-red-300" },
  };
  const t = tones[accent];
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card className={cn("rounded-2xl border-border/60 bg-card/70 px-4 py-3 shadow-lg ring-1 backdrop-blur-md", t.ring)}>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className={t.iconCls}>{icon}</span>
          {label}
        </div>
        <div className="flex items-baseline justify-between">
          <span className={cn("font-mono text-xl font-semibold", t.valueCls)}>{value}</span>
          {trail}
        </div>
      </Card>
    </motion.div>
  );
}

function TrendIcon({ trend }: { trend: ThreatIntelEntry["trend"] }) {
  if (trend === "up") return <span className="text-red-300">▲</span>;
  if (trend === "down") return <span className="text-emerald-300">▼</span>;
  return <span className="text-muted-foreground">·</span>;
}

function EventIcon({ level }: { level: SystemEvent["level"] }) {
  if (level === "info")
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />;
  if (level === "warning")
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" />;
  return <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-400" />;
}

/** Inline detail pane shown when a live-audits row is expanded. */
function AuditDetail({ row }: { row: AuditEntry }) {
  const sev = severityStyles[row.severity];
  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-3">
      <DetailCell label="Pipeline">
        <div className="flex flex-wrap gap-1.5">
          <PipelineChip label="Static"     state={row.status === "queued" ? "idle" : "ok"} />
          <PipelineChip label="Simulation" state={row.status === "queued" ? "idle" : row.confidence >= 60 ? "ok" : row.status === "failed" ? "fail" : "pending"} />
          <PipelineChip label="Fork"       state={row.confidence >= 80 ? "ok" : row.status === "completed" ? "skip" : row.status === "failed" ? "fail" : "pending"} />
        </div>
      </DetailCell>
      <DetailCell label="Confidence">
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-sm", sev.text)}>
            {row.confidence > 0 ? <AnimatedCounter value={row.confidence} /> : "—"}
            {row.confidence > 0 && "%"}
          </span>
          <div className="flex-1">
            <GlowBar
              value={row.confidence}
              tone={
                row.severity === "critical" ? "critical"
                : row.severity === "high" || row.severity === "medium" ? "warn"
                : "ok"
              }
            />
          </div>
        </div>
      </DetailCell>
      <DetailCell label="Audit window">
        <span className="font-mono text-sm text-foreground/85">
          age {formatAge(row.ageSec)} · {row.network}
        </span>
      </DetailCell>
    </div>
  );
}

function DetailCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function PipelineChip({
  label,
  state,
}: {
  label: string;
  state: "ok" | "pending" | "fail" | "skip" | "idle";
}) {
  const map: Record<typeof state, string> = {
    ok:      "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    pending: "border-violet-500/40 bg-violet-500/10 text-violet-300",
    fail:    "border-red-500/40 bg-red-500/10 text-red-300",
    skip:    "border-border/60 bg-background/40 text-muted-foreground",
    idle:    "border-border/60 bg-background/40 text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        map[state],
      )}
    >
      <span
        className={cn(
          "h-1 w-1 rounded-full bg-current",
          state === "pending" && "animate-pulse",
        )}
      />
      {label}
    </span>
  );
}

function AuditDetailRich({ row }: { row: AuditEntry }) {
  const sev = severityStyles[row.severity];

  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-3">
      <DetailCell label="Pipeline">
        <div className="flex flex-wrap gap-1.5">
          <PipelineChip label="Static" state={row.status === "queued" ? "idle" : "ok"} />
          <PipelineChip
            label="Simulation"
            state={row.status === "queued" ? "idle" : row.confidence >= 60 ? "ok" : row.status === "failed" ? "fail" : "pending"}
          />
          <PipelineChip
            label="Fork"
            state={row.confidence >= 80 ? "ok" : row.status === "completed" ? "skip" : row.status === "failed" ? "fail" : "pending"}
          />
        </div>
      </DetailCell>
      <DetailCell label="Confidence">
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-sm", sev.text)}>
            {row.confidence > 0 ? <AnimatedCounter value={row.confidence} /> : "--"}
            {row.confidence > 0 && "%"}
          </span>
          <div className="flex-1">
            <GlowBar
              value={row.confidence}
              tone={
                row.severity === "critical"
                  ? "critical"
                  : row.severity === "high" || row.severity === "medium"
                    ? "warn"
                    : "ok"
              }
            />
          </div>
        </div>
      </DetailCell>
      <DetailCell label="Audit window">
        <span className="font-mono text-sm text-foreground/85">
          age {formatAge(row.ageSec)} / {row.network}
        </span>
      </DetailCell>
      <DetailCell label="Attack surface">
        <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm text-foreground/85">
          <div className="font-medium text-foreground">
            {row.kind === "UPGRADEABLE_PROXY"
              ? "Upgradeable Proxy Pattern Detected"
              : row.kind ?? "Behavior under review"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {row.kind === "UPGRADEABLE_PROXY"
              ? `Impact: Admin can upgrade implementation. Status: ${accessControlLabel(row.isAccessControlled)}.`
              : `Exploitability: ${exploitabilityLabel(row.exploitability)}.`}
          </div>
        </div>
      </DetailCell>
      <DetailCell label="Proxy metadata">
        <div className="space-y-1 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Proxy Type</span>
            <span className="font-mono text-foreground/90">{row.proxyType ?? "n/a"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Implementation</span>
            <span className="font-mono text-foreground/90">{row.implementation ?? "n/a"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Admin</span>
            <span className="font-mono text-foreground/90">{row.admin ?? "n/a"}</span>
          </div>
        </div>
      </DetailCell>
      <DetailCell label="Exploitability">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "rounded-md px-2 py-0 text-[10px] font-medium uppercase tracking-wider",
              row.exploitability === "confirmed"
                ? "border-red-500/40 bg-red-500/10 text-red-300"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
            )}
          >
            {exploitabilityLabel(row.exploitability)}
          </Badge>
          {row.isAccessControlled !== undefined && (
            <span className="text-xs text-muted-foreground">
              Access control: {accessControlLabel(row.isAccessControlled)}
            </span>
          )}
        </div>
      </DetailCell>
    </div>
  );
}

export default AdminDashboard;
