import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Copy, ExternalLink, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { AnimatedCounter } from "@/components/admin/AnimatedCounter";

export interface WalletTx {
  id: string;
  kind: "in" | "out";
  amount: number;
  label: string;
  ageSec: number;
}

export interface WalletBalanceProps {
  address?: string;
  network?: string;
  balanceEth?: number;
  ethUsd?: number;
  delta24hPct?: number;
  scansPaid24h?: number;
  txs?: WalletTx[];
  className?: string;
}

const defaultTxs: WalletTx[] = [
  { id: "tx-1", kind: "in",  amount: 0.025, label: "scan ax-9821",  ageSec: 12  },
  { id: "tx-2", kind: "in",  amount: 0.018, label: "scan ax-9820",  ageSec: 96  },
  { id: "tx-3", kind: "out", amount: 0.004, label: "gas · fork-7",  ageSec: 240 },
  { id: "tx-4", kind: "in",  amount: 0.025, label: "scan ax-9819",  ageSec: 612 },
];

function shortAddr(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatAge(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}

export function WalletBalance({
  address = "0x9F2c4a7Bd3c1E5fA88d2e6F4b1c0aE73D5B8c9Ff",
  network = "Ethereum",
  balanceEth = 4.218,
  ethUsd = 3420,
  delta24hPct = 8.2,
  scansPaid24h = 27,
  txs = defaultTxs,
  className,
}: WalletBalanceProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const usd = balanceEth * ethUsd;
  const positive = delta24hPct >= 0;

  function copyAddr(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-background/60 px-3 py-2 text-left",
          "shadow-[0_0_24px_-12px_rgba(16,185,129,0.6)] backdrop-blur-md transition-colors",
          "hover:border-emerald-400/60 hover:bg-background/80",
        )}
      >
        {/* Icon */}
        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
          <Wallet className="h-4 w-4" />
          <motion.span
            className="absolute inset-0 rounded-lg ring-1 ring-emerald-400/40"
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        </span>

        {/* Balance */}
        <div className="flex flex-col leading-none">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Treasury · {network}
          </span>
          <span className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-base font-semibold text-emerald-300 text-glow-cyan">
              <AnimatedCounter value={balanceEth} decimals={3} />
            </span>
            <span className="text-[10px] font-mono uppercase text-emerald-300/60">eth</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-muted-foreground">
              ≈ $<AnimatedCounter value={usd} decimals={0} />
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5",
                positive ? "text-emerald-300" : "text-red-300",
              )}
            >
              {positive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
              {positive ? "+" : ""}{delta24hPct.toFixed(1)}%
            </span>
          </span>
        </div>

        <ChevronDown
          className={cn(
            "ml-1 h-3.5 w-3.5 text-emerald-300/70 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute right-0 top-[calc(100%+8px)] z-30 w-[320px] origin-top-right",
              "rounded-2xl border border-emerald-500/30 bg-card/95 p-4 shadow-2xl backdrop-blur-xl",
            )}
          >
            {/* Header row: address + chain */}
            <div className="flex items-center justify-between gap-2">
              <Badge className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]" />
                {network}
              </Badge>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={copyAddr}
                  className="flex items-center gap-1 rounded-md border border-border/50 bg-background/60 px-2 py-1 font-mono text-[10px] text-foreground/80 transition-colors hover:border-emerald-400/50 hover:text-emerald-300"
                >
                  {shortAddr(address)}
                  <Copy className="h-2.5 w-2.5" />
                </button>
                <a
                  href={`https://etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border/50 bg-background/60 text-muted-foreground transition-colors hover:border-emerald-400/50 hover:text-emerald-300"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>

            {copied && (
              <div className="mt-1.5 text-[10px] font-mono text-emerald-300">
                · address copied
              </div>
            )}

            {/* Big balance */}
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                Total balance
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold text-emerald-300 text-glow-cyan">
                  <AnimatedCounter value={balanceEth} decimals={4} />
                </span>
                <span className="text-xs font-mono uppercase text-emerald-300/70">eth</span>
              </div>
              <div className="mt-1 text-xs font-mono text-muted-foreground">
                ≈ $<AnimatedCounter value={usd} decimals={2} /> usd
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/40 bg-background/50 px-2.5 py-2">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    24h change
                  </div>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1 font-mono text-sm",
                      positive ? "text-emerald-300" : "text-red-300",
                    )}
                  >
                    {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {positive ? "+" : ""}{delta24hPct.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/50 px-2.5 py-2">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    Paid scans 24h
                  </div>
                  <div className="mt-1 font-mono text-sm text-cyan-300">
                    <AnimatedCounter value={scansPaid24h} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent activity */}
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                  Recent flow
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {txs.length} txs
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {txs.map((tx) => {
                  const isIn = tx.kind === "in";
                  return (
                    <li
                      key={tx.id}
                      className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/40 px-2.5 py-1.5"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md",
                          isIn
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300",
                        )}
                      >
                        {isIn ? (
                          <ArrowDownRight className="h-2.5 w-2.5" />
                        ) : (
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        )}
                      </span>
                      <span className="flex-1 truncate font-mono text-[11px] text-foreground/80">
                        {tx.label}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[11px]",
                          isIn ? "text-emerald-300" : "text-amber-300",
                        )}
                      >
                        {isIn ? "+" : "−"}
                        {tx.amount.toFixed(3)}
                      </span>
                      <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">
                        {formatAge(tx.ageSec)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}