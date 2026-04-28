import { Container, Graphics } from "pixi.js";
import type { CyberpunkConfig } from "../config";

interface Stack {
  gfx: Graphics;
  x: number;
  y: number;
  cycle: number; // seconds
  phase: number;
  color: number;
  parallaxDepth: number;
}

/**
 * Foreground accent: abstract call-stack columns.
 *
 * Each "stack" is a vertical pile of indented frames suggesting nested
 * function calls. They fade in/out on long sinusoidal cycles to add a
 * symbolic structural element without ever drawing letters.
 */
export class CallStacks {
  readonly container: Container;
  private readonly cfg: CyberpunkConfig;
  private stacks: Stack[] = [];
  private width = 0;
  private height = 0;
  private time = 0;

  constructor(cfg: CyberpunkConfig) {
    this.cfg = cfg;
    this.container = new Container();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (!this.stacks.length) this.build();
    else this.repositionAll();
  }

  private build(): void {
    const { callStacks: cs, palette } = this.cfg;
    const colors = [palette.primary, palette.secondary, palette.accent];

    for (let i = 0; i < cs.count; i++) {
      const frames =
        cs.framesPerStack[0] +
        Math.floor(
          Math.random() * (cs.framesPerStack[1] - cs.framesPerStack[0] + 1),
        );
      const baseW =
        cs.baseWidth[0] + Math.random() * (cs.baseWidth[1] - cs.baseWidth[0]);
      const frameH =
        cs.frameHeight[0] +
        Math.random() * (cs.frameHeight[1] - cs.frameHeight[0]);
      const color = colors[Math.floor(Math.random() * colors.length)]!;

      const g = new Graphics();
      this.drawStack(g, frames, baseW, frameH, color);

      g.alpha = 0;
      this.container.addChild(g);
      this.stacks.push({
        gfx: g,
        x: 0,
        y: 0,
        cycle:
          cs.cycle[0] + Math.random() * (cs.cycle[1] - cs.cycle[0]),
        phase: Math.random() * Math.PI * 2,
        color,
        parallaxDepth: 0.4 + Math.random() * 0.6,
      });
    }
    this.repositionAll();
  }

  private repositionAll(): void {
    // Distribute around the canvas, biased away from the very center
    // so they sit in the periphery and don't fight the UI.
    for (let i = 0; i < this.stacks.length; i++) {
      const s = this.stacks[i]!;
      const angle = (i / this.stacks.length) * Math.PI * 2 + Math.random() * 0.4;
      const r = 0.35 + Math.random() * 0.15;
      s.x = this.width / 2 + Math.cos(angle) * this.width * r;
      s.y = this.height / 2 + Math.sin(angle) * this.height * r * 0.9;
    }
  }

  private drawStack(
    g: Graphics,
    frames: number,
    baseW: number,
    frameH: number,
    color: number,
  ): void {
    g.clear();
    const indent = 14;
    const gap = 2;
    for (let i = 0; i < frames; i++) {
      const w = baseW - i * indent;
      if (w <= 24) break;
      const y = i * (frameH + gap);

      // Frame body
      g.rect(i * indent, y, w, frameH).fill({ color, alpha: 0.12 });
      g.rect(i * indent, y, w, frameH).stroke({
        width: 0.8,
        color,
        alpha: 0.7,
      });

      // "Address" tick on the right
      g.rect(i * indent + w - 16, y + 3, 8, 1).fill({ color, alpha: 0.6 });
      g.rect(i * indent + w - 6, y + 3, 2, 1).fill({ color, alpha: 0.8 });

      // Connecting line down to the next frame (call arrow look)
      if (i < frames - 1 && w - indent > 24) {
        g.moveTo(i * indent + 4, y + frameH)
          .lineTo(i * indent + 4, y + frameH + gap + 2)
          .stroke({ width: 0.6, color, alpha: 0.5 });
      }
    }
  }

  update(dt: number, parallaxX: number, parallaxY: number): void {
    this.time += dt;
    const max = this.cfg.callStacks.alpha;

    for (const s of this.stacks) {
      // Long sinusoidal fade.
      const tSec = (this.time / 60) * (1 / s.cycle) * Math.PI * 2 + s.phase;
      const env = Math.max(0, Math.sin(tSec));
      s.gfx.alpha = env * max;

      s.gfx.x = s.x + parallaxX * s.parallaxDepth;
      s.gfx.y = s.y + parallaxY * s.parallaxDepth;
    }
  }

  destroy(): void {
    this.stacks = [];
    this.container.destroy({ children: true });
  }
}
