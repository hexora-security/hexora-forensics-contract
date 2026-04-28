import { Container, Graphics } from "pixi.js";
import type { CyberpunkConfig } from "../config";

interface Pulse {
  /** Position along the path, 0..1. */
  t: number;
  /** Direction sign — pulses always travel forward (+1). */
  speed: number;
  /** Cached extra speed pushed by cursor influence. */
  vBoost: number;
  /** Tail color. */
  color: number;
}

interface Path {
  /** Polyline points (world space). */
  points: { x: number; y: number }[];
  /** Cumulative length of each segment for parametric travel. */
  segLengths: number[];
  /** Total length. */
  totalLen: number;
  /** Pulses traveling along this path. */
  pulses: Pulse[];
  /** Time until next trace activation (seconds). */
  nextTrace: number;
  /** Remaining trace flash time (seconds). */
  traceLeft: number;
  /** Trace duration of the current activation. */
  traceDur: number;
  /** Idle line color (palette index). */
  color: number;
}

/**
 * Directed data-flow paths with traveling pulses and trace activation.
 *
 * The "execution" feel comes from:
 *  - faint static path lines (the wire),
 *  - bright pulses that always travel forward (the data),
 *  - periodic full-path "activation" flashes (a code trace executing).
 *
 * Paths can optionally snap to ExecutionNode anchors so they look like
 * they're connecting blocks. Anchors are passed in at update time so
 * paths follow nodes as they drift, with a smoothing factor.
 */
export class DataFlow {
  readonly container: Container;
  private readonly cfg: CyberpunkConfig;
  private readonly lineGfx: Graphics;
  private readonly pulseGfx: Graphics;
  private paths: Path[] = [];
  private width = 0;
  private height = 0;
  private cursorX = -9999;
  private cursorY = -9999;

  constructor(cfg: CyberpunkConfig) {
    this.cfg = cfg;
    this.container = new Container();
    this.lineGfx = new Graphics();
    this.pulseGfx = new Graphics();
    this.container.addChild(this.lineGfx);
    this.container.addChild(this.pulseGfx);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.rebuild();
  }

  setCursor(x: number, y: number): void {
    this.cursorX = x;
    this.cursorY = y;
  }

  /** Rebuild paths to fit the new viewport. */
  private rebuild(): void {
    const { flow, palette } = this.cfg;
    const colors = [palette.primary, palette.secondary, palette.accent];
    this.paths = [];
    for (let i = 0; i < flow.pathCount; i++) {
      const color = colors[i % colors.length]!;
      this.paths.push(this.makePath(color));
    }
  }

  private makePath(color: number): Path {
    const { flow } = this.cfg;
    const pts =
      flow.pointsPerPath[0] +
      Math.floor(
        Math.random() * (flow.pointsPerPath[1] - flow.pointsPerPath[0] + 1),
      );

    // Start outside the viewport on one of the four edges, then walk
    // generally toward the opposite edge — this produces clearly
    // directional flows that feel like execution traces, not random scribble.
    const edge = Math.floor(Math.random() * 4);
    const margin = 80;
    const start =
      edge === 0
        ? { x: -margin, y: Math.random() * this.height }
        : edge === 1
          ? { x: this.width + margin, y: Math.random() * this.height }
          : edge === 2
            ? { x: Math.random() * this.width, y: -margin }
            : { x: Math.random() * this.width, y: this.height + margin };

    const points: { x: number; y: number }[] = [start];
    let cur = { ...start };
    for (let i = 1; i < pts; i++) {
      // Step toward the opposite side with small lateral jitter.
      const tx =
        edge === 0
          ? this.width + margin
          : edge === 1
            ? -margin
            : Math.random() * this.width;
      const ty =
        edge === 2
          ? this.height + margin
          : edge === 3
            ? -margin
            : Math.random() * this.height;
      const f = i / (pts - 1);
      const jitterX = (Math.random() - 0.5) * this.width * 0.12;
      const jitterY = (Math.random() - 0.5) * this.height * 0.12;
      cur = {
        x: start.x + (tx - start.x) * f + jitterX,
        y: start.y + (ty - start.y) * f + jitterY,
      };
      points.push({ ...cur });
    }

    const segLengths: number[] = [];
    let totalLen = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segLengths.push(len);
      totalLen += len;
    }

    const pulseCount =
      flow.pulsesPerPath[0] +
      Math.floor(
        Math.random() * (flow.pulsesPerPath[1] - flow.pulsesPerPath[0] + 1),
      );
    const pulses: Pulse[] = [];
    for (let i = 0; i < pulseCount; i++) {
      pulses.push({
        t: Math.random(),
        speed:
          flow.pulseSpeed[0] +
          Math.random() * (flow.pulseSpeed[1] - flow.pulseSpeed[0]),
        vBoost: 0,
        color,
      });
    }

    return {
      points,
      segLengths,
      totalLen,
      pulses,
      nextTrace:
        flow.traceInterval[0] +
        Math.random() * (flow.traceInterval[1] - flow.traceInterval[0]),
      traceLeft: 0,
      traceDur: 0,
      color,
    };
  }

  /** Convert path-parameter t (0..1) to a world position. */
  private posAt(p: Path, t: number): { x: number; y: number } {
    if (p.totalLen === 0) return { ...p.points[0]! };
    const target = t * p.totalLen;
    let acc = 0;
    for (let i = 0; i < p.segLengths.length; i++) {
      const len = p.segLengths[i]!;
      if (acc + len >= target) {
        const localT = (target - acc) / len;
        const a = p.points[i]!;
        const b = p.points[i + 1]!;
        return {
          x: a.x + (b.x - a.x) * localT,
          y: a.y + (b.y - a.y) * localT,
        };
      }
      acc += len;
    }
    return { ...p.points[p.points.length - 1]! };
  }

  update(dt: number): void {
    const dtSec = dt / 60;
    const { flow } = this.cfg;

    this.lineGfx.clear();
    this.pulseGfx.clear();

    for (const p of this.paths) {
      // Trace activation timer.
      p.nextTrace -= dtSec;
      if (p.nextTrace <= 0 && p.traceLeft <= 0) {
        p.traceDur =
          flow.traceDuration[0] +
          Math.random() * (flow.traceDuration[1] - flow.traceDuration[0]);
        p.traceLeft = p.traceDur;
        p.nextTrace =
          flow.traceInterval[0] +
          Math.random() * (flow.traceInterval[1] - flow.traceInterval[0]);
      }
      if (p.traceLeft > 0) p.traceLeft = Math.max(0, p.traceLeft - dtSec);

      // Idle line + trace flash drawn together.
      const traceMix = p.traceDur > 0 ? p.traceLeft / p.traceDur : 0;
      const lineAlpha =
        flow.pathAlpha + traceMix * (flow.traceAlpha - flow.pathAlpha);
      const lineWidth = 0.8 + traceMix * 1.6;

      const pts = p.points;
      this.lineGfx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) {
        this.lineGfx.lineTo(pts[i]!.x, pts[i]!.y);
      }
      this.lineGfx.stroke({
        width: lineWidth,
        color: p.color,
        alpha: lineAlpha,
      });

      // Pulses: travel forward, optionally nudged by cursor proximity.
      for (const pulse of p.pulses) {
        const pos = this.posAt(p, pulse.t);

        // Cursor influence: speed up briefly when near the cursor.
        const dx = pos.x - this.cursorX;
        const dy = pos.y - this.cursorY;
        const distSq = dx * dx + dy * dy;
        const r = 200;
        if (distSq < r * r) {
          const k = 1 - Math.sqrt(distSq) / r;
          pulse.vBoost = Math.max(pulse.vBoost, k * flow.cursorInfluence);
        }
        pulse.vBoost *= 0.94;

        pulse.t += (pulse.speed + pulse.vBoost) * dtSec;
        if (pulse.t > 1) pulse.t -= 1;

        this.drawPulseTail(p, pulse);
      }
    }
  }

  /**
   * Render a "comet" pulse: a chain of dimming circles trailing behind the
   * head along the path. Tail follows the path geometry exactly so motion
   * looks like data riding the wire.
   */
  private drawPulseTail(p: Path, pulse: Pulse): void {
    const tailCount = this.cfg.flow.pulseTail;
    const headBoost = 1 + pulse.vBoost * 4;
    const tailLen = 0.04 + pulse.speed * 0.5;

    for (let i = 0; i < tailCount; i++) {
      const k = i / (tailCount - 1);
      let t = pulse.t - k * tailLen;
      if (t < 0) t += 1; // wrap so the tail trails behind smoothly
      const pos = this.posAt(p, t);

      const fade = Math.pow(1 - k, 1.6);
      const radius = (i === 0 ? 2.4 : 1.2 * fade + 0.2) * headBoost;
      const alpha = (i === 0 ? 0.95 : 0.55 * fade) * Math.min(1, headBoost);

      this.pulseGfx.circle(pos.x, pos.y, radius).fill({
        color: pulse.color,
        alpha,
      });
      // Soft glow on the head.
      if (i === 0) {
        this.pulseGfx.circle(pos.x, pos.y, radius * 4).fill({
          color: pulse.color,
          alpha: 0.08 * headBoost,
        });
      }
    }
  }

  destroy(): void {
    this.paths = [];
    this.container.destroy({ children: true });
  }
}
