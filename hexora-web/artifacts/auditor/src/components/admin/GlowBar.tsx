import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface GlowBarProps {
  /** 0..100 */
  value: number;
  /** Visual tone derived automatically from value if omitted. */
  tone?: "ok" | "warn" | "critical";
  className?: string;
}

const TONE_CLS: Record<NonNullable<GlowBarProps["tone"]>, string> = {
  ok:       "from-violet-400 via-cyan-300 to-cyan-400 shadow-[0_0_10px_-2px_rgba(34,211,238,0.6)]",
  warn:     "from-amber-400 via-yellow-300 to-amber-400 shadow-[0_0_10px_-2px_rgba(251,191,36,0.6)]",
  critical: "from-red-500 via-orange-400 to-red-500 shadow-[0_0_10px_-2px_rgba(248,113,113,0.7)]",
};

function autoTone(v: number): NonNullable<GlowBarProps["tone"]> {
  if (v >= 85) return "critical";
  if (v >= 65) return "warn";
  return "ok";
}

export function GlowBar({ value, tone, className }: GlowBarProps) {
  const v = Math.max(0, Math.min(100, value));
  const t = tone ?? autoTone(v);

  return (
    <div
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-border/40",
        className,
      )}
    >
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r",
          TONE_CLS[t],
        )}
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* subtle moving sheen */}
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "300%" }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 0.6,
        }}
        style={{ mixBlendMode: "screen" }}
      />
    </div>
  );
}

export default GlowBar;