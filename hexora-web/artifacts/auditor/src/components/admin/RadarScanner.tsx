import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export interface RadarBlip {
  id: string;
  /** angle in radians */
  angle: number;
  /** distance from center, 0..1 */
  radius: number;
  /** "critical" | "high" | "info" — affects color & lifetime */
  severity: "critical" | "high" | "info";
}

export interface RadarScannerProps {
  /** Side length in px. The canvas is square. */
  size?: number;
  /** Static blips to render under the sweep. */
  blips?: RadarBlip[];
  /** Sweep speed in radians per second. */
  speed?: number;
  className?: string;
}

const COLOR_BY_SEVERITY: Record<RadarBlip["severity"], string> = {
  critical: "#f87171",
  high: "#fb923c",
  info: "#22d3ee",
};

/**
 * Lightweight Canvas 2D radar:
 *  - 3 grid rings + crosshair
 *  - rotating sweep with conic gradient tail
 *  - blips ping (ripple) when the sweep passes over them
 *  - pure RAF, no external deps; auto-pauses when offscreen / hidden
 */
export function RadarScanner({
  size = 132,
  blips = [],
  speed = 1.6,
  className,
}: RadarScannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Latest blips kept in a ref so we don't re-init the RAF loop every render.
  const blipsRef = useRef<RadarBlip[]>(blips);
  blipsRef.current = blips;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 2;

    // Track the last sweep angle so we can detect "the sweep just passed blip X".
    // Each blip ping is a numeric timestamp (ms) of last hit, kept in a parallel map.
    const pingMap = new Map<string, number>();

    let raf = 0;
    let last = performance.now();
    let angle = 0;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const prevAngle = angle;
      angle = (angle + speed * dt) % (Math.PI * 2);

      // Detect blips swept across (handle wrap-around).
      const swept = (a: number) => {
        if (prevAngle <= angle) return a > prevAngle && a <= angle;
        return a > prevAngle || a <= angle;
      };
      for (const b of blipsRef.current) {
        if (swept(b.angle)) pingMap.set(b.id, now);
      }

      // ----- background -----
      ctx.clearRect(0, 0, size, size);

      // outer disc
      const grd = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
      grd.addColorStop(0, "rgba(34,211,238,0.10)");
      grd.addColorStop(1, "rgba(34,211,238,0.02)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // grid rings
      ctx.strokeStyle = "rgba(34,211,238,0.18)";
      ctx.lineWidth = 1;
      for (const r of [R * 0.33, R * 0.66, R]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // crosshair
      ctx.beginPath();
      ctx.moveTo(cx - R, cy);
      ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx, cy + R);
      ctx.stroke();

      // ----- blips (under the sweep) -----
      for (const b of blipsRef.current) {
        const x = cx + Math.cos(b.angle) * b.radius * R;
        const y = cy + Math.sin(b.angle) * b.radius * R;
        const color = COLOR_BY_SEVERITY[b.severity];
        const lastHit = pingMap.get(b.id) ?? -Infinity;
        const pingAge = (now - lastHit) / 1000; // seconds since last ping

        // Persistent dot
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = b.severity === "critical" ? 10 : 6;
        ctx.beginPath();
        ctx.arc(x, y, b.severity === "critical" ? 2.5 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ripple while ping is fresh (< 1.2s)
        if (pingAge >= 0 && pingAge < 1.2) {
          const t = pingAge / 1.2;
          ctx.strokeStyle = `rgba(${b.severity === "critical" ? "248,113,113" : b.severity === "high" ? "251,146,60" : "34,211,238"},${(1 - t) * 0.7})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, 3 + t * 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // ----- sweep -----
      const sweepArc = Math.PI / 3; // tail width
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const sweep = ctx.createLinearGradient(0, 0, R, 0);
      sweep.addColorStop(0, "rgba(34,211,238,0.45)");
      sweep.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = sweep;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -sweepArc, 0);
      ctx.closePath();
      ctx.fill();

      // bright leading edge
      ctx.strokeStyle = "rgba(34,211,238,0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R, 0);
      ctx.stroke();
      ctx.restore();

      // center pip
      ctx.fillStyle = "rgba(34,211,238,0.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("rounded-full", className)}
      aria-hidden
    />
  );
}

export default RadarScanner;