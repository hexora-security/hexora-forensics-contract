import { Container, Graphics } from "pixi.js";
import type { CyberpunkConfig } from "../config";

interface Blob {
  gfx: Graphics;
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  speed: number;
  phase: number;
  color: number;
}

/**
 * Layer 0: deep void backdrop with slowly orbiting neon glow blobs.
 *
 * This sets the lighting of the whole scene. The blobs are stacked
 * translucent circles (a cheap radial gradient) and drift across the
 * canvas to vary the ambient color over time without any harsh flashes.
 */
export class BackdropLayer {
  readonly container: Container;
  private readonly cfg: CyberpunkConfig;
  private readonly base: Graphics;
  private blobs: Blob[] = [];
  private width = 0;
  private height = 0;
  private time = 0;

  constructor(cfg: CyberpunkConfig) {
    this.cfg = cfg;
    this.container = new Container();
    this.base = new Graphics();
    this.container.addChild(this.base);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.base.clear().rect(0, 0, width, height).fill({ color: this.cfg.background });

    if (!this.blobs.length) this.build();
    else this.repositionBlobs();
  }

  private build(): void {
    const { backdrop, palette } = this.cfg;
    const colors = [palette.primary, palette.secondary, palette.accent];

    for (let i = 0; i < backdrop.blobs; i++) {
      const g = new Graphics();
      const color = colors[i % colors.length]!;
      this.drawBlob(g, color);
      this.container.addChild(g);
      this.blobs.push({
        gfx: g,
        baseX: 0,
        baseY: 0,
        ampX: 0,
        ampY: 0,
        speed: 0.0008 + Math.random() * 0.0008,
        phase: Math.random() * Math.PI * 2,
        color,
      });
    }
    this.repositionBlobs();
  }

  private repositionBlobs(): void {
    for (let i = 0; i < this.blobs.length; i++) {
      const b = this.blobs[i]!;
      // Spread across the canvas, alternating quadrants.
      b.baseX = this.width * (0.2 + (i / this.blobs.length) * 0.6);
      b.baseY = this.height * (i % 2 === 0 ? 0.35 : 0.65);
      b.ampX = this.width * 0.12;
      b.ampY = this.height * 0.1;
    }
  }

  private drawBlob(g: Graphics, color: number): void {
    g.clear();
    const { backdrop } = this.cfg;
    const diag = Math.hypot(this.width || 1280, this.height || 720);
    const maxR = diag * backdrop.radiusFactor;
    const steps = 14;
    for (let i = steps; i > 0; i--) {
      const t = i / steps;
      g.circle(0, 0, maxR * t).fill({
        color,
        alpha: (1 - t) * 0.045 * backdrop.intensity,
      });
    }
  }

  update(dt: number): void {
    this.time += dt;
    for (let i = 0; i < this.blobs.length; i++) {
      const b = this.blobs[i]!;
      b.gfx.x = b.baseX + Math.cos(this.time * b.speed + b.phase) * b.ampX;
      b.gfx.y = b.baseY + Math.sin(this.time * b.speed * 0.8 + b.phase) * b.ampY;
    }
  }

  destroy(): void {
    this.blobs = [];
    this.container.destroy({ children: true });
  }
}
