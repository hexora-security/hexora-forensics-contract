import { Container, Graphics } from "pixi.js";
import type { CyberpunkConfig } from "../config";

interface NodeBlock {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: number;
  age: number;
  fadeIn: number;
  hold: number;
  fadeOut: number;
  totalLife: number;
  alpha: number;
}

/**
 * Execution-node blocks: translucent rectangles representing
 * smart-contract logic blocks executing in the EVM.
 *
 * Each block fades in, holds, then fades out on its own clock
 * (fadeIn → hold → fadeOut). When it dies it respawns elsewhere.
 * Slight drift gives the layer a subtle "circulating" feel.
 */
export class ExecutionNodes {
  readonly container: Container;
  readonly anchors: { x: number; y: number; alpha: number }[] = [];
  private readonly cfg: CyberpunkConfig;
  private nodes: NodeBlock[] = [];
  private width = 0;
  private height = 0;

  constructor(cfg: CyberpunkConfig) {
    this.cfg = cfg;
    this.container = new Container();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.rebuild();
  }

  /** Allocate nodes based on viewport area, clamped by min/max. */
  private rebuild(): void {
    const { nodes: nc } = this.cfg;
    const area = this.width * this.height;
    const target = Math.round((area / 100_000) * nc.densityPer100kPx2);
    const count = Math.max(nc.minCount, Math.min(nc.maxCount, target));

    // Clear existing.
    for (const n of this.nodes) n.gfx.destroy();
    this.nodes = [];
    this.anchors.length = 0;

    for (let i = 0; i < count; i++) {
      this.nodes.push(this.spawn(true));
    }
    this.syncAnchors();
  }

  private spawn(stagger: boolean): NodeBlock {
    const { nodes: nc, palette } = this.cfg;
    const colors = [palette.primary, palette.secondary, palette.accent];

    const w = nc.width[0] + Math.random() * (nc.width[1] - nc.width[0]);
    const h = nc.height[0] + Math.random() * (nc.height[1] - nc.height[0]);
    const angle = Math.random() * Math.PI * 2;
    const speed = nc.drift[0] + Math.random() * (nc.drift[1] - nc.drift[0]);
    const color = colors[Math.floor(Math.random() * colors.length)]!;
    const fadeIn = nc.fadeIn[0] + Math.random() * (nc.fadeIn[1] - nc.fadeIn[0]);
    const hold = nc.hold[0] + Math.random() * (nc.hold[1] - nc.hold[0]);
    const fadeOut = nc.fadeOut[0] + Math.random() * (nc.fadeOut[1] - nc.fadeOut[0]);
    const totalLife = fadeIn + hold + fadeOut;

    const gfx = new Graphics();
    this.drawBlock(gfx, w, h, color);
    gfx.x = Math.random() * this.width;
    gfx.y = Math.random() * this.height;
    gfx.alpha = 0;
    this.container.addChild(gfx);

    return {
      gfx,
      x: gfx.x,
      y: gfx.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      width: w,
      height: h,
      color,
      // Stagger initial age so nodes don't all fade at once on load.
      age: stagger ? Math.random() * totalLife : 0,
      fadeIn,
      hold,
      fadeOut,
      totalLife,
      alpha: 0,
    };
  }

  private drawBlock(g: Graphics, w: number, h: number, color: number): void {
    g.clear();
    const { nodes: nc } = this.cfg;
    const r = 4;
    const glow = nc.glow;

    // Glow halo (multi-step "blur" approximation).
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 3;
      g.roundRect(-w / 2 - t * 6, -h / 2 - t * 6, w + t * 12, h + t * 12, r + t * 4)
        .fill({ color, alpha: 0.04 * (1 - t) * glow });
    }

    // Translucent fill.
    g.roundRect(-w / 2, -h / 2, w, h, r).fill({ color, alpha: 0.18 });
    // Sharp neon edge.
    g.roundRect(-w / 2, -h / 2, w, h, r).stroke({ width: 1, color, alpha: 0.95 });
    // Header bar (suggests a code block).
    g.rect(-w / 2 + 1, -h / 2 + 1, w - 2, 4).fill({ color, alpha: 0.45 });
    // Two "code lines"
    g.rect(-w / 2 + 8, h / 2 - 9, w * 0.45, 1.5).fill({ color, alpha: 0.55 });
    g.rect(-w / 2 + 8, h / 2 - 5, w * 0.3, 1.5).fill({ color, alpha: 0.4 });
  }

  update(dt: number): void {
    const dtSec = dt / 60;
    const { nodes: nc } = this.cfg;
    const margin = 60;

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]!;
      n.age += dtSec;

      // Lifecycle alpha envelope.
      let env: number;
      if (n.age < n.fadeIn) env = n.age / n.fadeIn;
      else if (n.age < n.fadeIn + n.hold) env = 1;
      else if (n.age < n.totalLife) env = 1 - (n.age - n.fadeIn - n.hold) / n.fadeOut;
      else env = 0;

      n.alpha = Math.max(0, Math.min(1, env)) * nc.alpha;
      n.gfx.alpha = n.alpha;

      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < -margin) n.x = this.width + margin;
      else if (n.x > this.width + margin) n.x = -margin;
      if (n.y < -margin) n.y = this.height + margin;
      else if (n.y > this.height + margin) n.y = -margin;
      n.gfx.x = n.x;
      n.gfx.y = n.y;

      if (n.age >= n.totalLife) {
        // Respawn in place of the dead one to keep stable count.
        n.gfx.destroy();
        this.nodes[i] = this.spawn(false);
      }
    }
    this.syncAnchors();
  }

  /** Update the public anchor list used by data-flow paths. */
  private syncAnchors(): void {
    this.anchors.length = 0;
    for (const n of this.nodes) {
      this.anchors.push({ x: n.x, y: n.y, alpha: n.alpha });
    }
  }

  destroy(): void {
    this.nodes = [];
    this.anchors.length = 0;
    this.container.destroy({ children: true });
  }
}
