import {
  Application,
  BlurFilter,
  Container,
  DisplacementFilter,
  Sprite,
} from "pixi.js";
import { defaultConfig, type CyberpunkConfig } from "./config";
import { BackdropLayer } from "./layers/BackdropLayer";
import { ExecutionNodes } from "./layers/ExecutionNodes";
import { DataFlow } from "./layers/DataFlow";
import { CallStacks } from "./layers/CallStacks";
import { GrainOverlay } from "./layers/GrainOverlay";
import { createNoiseTexture } from "./utils/noiseTexture";

export interface SceneOptions {
  /** The DOM element that will host the canvas. */
  container: HTMLElement;
  /** Optional config overrides. */
  config?: Partial<CyberpunkConfig>;
}

/**
 * Owns the PixiJS Application and orchestrates all background layers.
 *
 * Composition (back → front):
 *   farLayer  ── parallax 0.25, BlurFilter         backdrop blobs
 *   midLayer  ── parallax 0.7,  small BlurFilter   execution nodes + flow paths
 *   nearLayer ── parallax 1.25, sharp              call stacks
 *   sceneRoot ── DisplacementFilter (heatwave)
 *   grainLayer ── ADD-blended noise sprite, full screen
 */
export class CyberpunkScene {
  private readonly hostEl: HTMLElement;
  private readonly cfg: CyberpunkConfig;
  private app: Application | null = null;

  private sceneRoot: Container | null = null;
  private farLayer: Container | null = null;
  private midLayer: Container | null = null;
  private nearLayer: Container | null = null;
  private grainContainer: Container | null = null;
  private displaceSprite: Sprite | null = null;

  private backdrop!: BackdropLayer;
  private nodes!: ExecutionNodes;
  private flow!: DataFlow;
  private stacks!: CallStacks;
  private grain!: GrainOverlay;

  private targetParallaxX = 0;
  private targetParallaxY = 0;
  private parallaxX = 0;
  private parallaxY = 0;

  private resizeObserver: ResizeObserver | null = null;
  private onPointerMove?: (e: PointerEvent) => void;
  private onPointerLeave?: () => void;
  private onVisibility?: () => void;
  private destroyed = false;

  constructor(opts: SceneOptions) {
    this.hostEl = opts.container;
    this.cfg = mergeConfig(defaultConfig, opts.config);
  }

  async init(): Promise<void> {
    if (this.destroyed) return;

    const app = new Application();
    await app.init({
      background: this.cfg.background,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, this.cfg.perf.maxResolution),
      resizeTo: this.hostEl,
      backgroundAlpha: 1,
      // Filters (BlurFilter, DisplacementFilter) require a real GPU context.
      // Prefer WebGL — it is universally supported and skips WebGPU's
      // unstable provider, which can fall back all the way to Canvas2D
      // (where filters are silently dropped).
      preference: "webgl",
    });

    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }

    this.app = app;

    // Mount the canvas behind the UI.
    const canvas = app.canvas;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    this.hostEl.appendChild(canvas);

    // Build the scene graph.
    this.sceneRoot = new Container();
    this.farLayer = new Container();
    this.midLayer = new Container();
    this.nearLayer = new Container();
    this.grainContainer = new Container();

    this.sceneRoot.addChild(this.farLayer);
    this.sceneRoot.addChild(this.midLayer);
    this.sceneRoot.addChild(this.nearLayer);
    app.stage.addChild(this.sceneRoot);
    app.stage.addChild(this.grainContainer);

    // Layers.
    this.backdrop = new BackdropLayer(this.cfg);
    this.nodes = new ExecutionNodes(this.cfg);
    this.flow = new DataFlow(this.cfg);
    this.stacks = new CallStacks(this.cfg);

    this.farLayer.addChild(this.backdrop.container);
    this.midLayer.addChild(this.nodes.container);
    this.midLayer.addChild(this.flow.container);
    this.nearLayer.addChild(this.stacks.container);

    // Per-layer blur for depth.
    if (this.cfg.depth.farBlur > 0) {
      this.farLayer.filters = [new BlurFilter({ strength: this.cfg.depth.farBlur })];
    }
    if (this.cfg.depth.midBlur > 0) {
      this.midLayer.filters = [new BlurFilter({ strength: this.cfg.depth.midBlur })];
    }

    // Grain overlay (procedural noise texture, ADD blend).
    const grainTex = createNoiseTexture(this.cfg.grain.size, 1.4);
    this.grain = new GrainOverlay(this.cfg, grainTex);
    this.grainContainer.addChild(this.grain.container);

    // Heatwave / digital-field displacement.
    if (this.cfg.distortion.enabled) {
      const distortTex = createNoiseTexture(256, 0.9);
      // Make the displacement source repeat so motion doesn't reveal edges.
      try {
        const src = distortTex.source as unknown as {
          addressMode?: string;
          style?: { addressMode?: string };
        };
        if (src.style) src.style.addressMode = "repeat";
        else src.addressMode = "repeat";
      } catch {
        // ignore — displacement still works with default wrap.
      }
      this.displaceSprite = new Sprite(distortTex);
      this.displaceSprite.scale.set(2);
      // The sprite must be on stage for its texture coords to update;
      // keep it invisible and offscreen.
      this.displaceSprite.alpha = 0;
      app.stage.addChild(this.displaceSprite);

      const displaceFilter = new DisplacementFilter({
        sprite: this.displaceSprite,
        scale: this.cfg.distortion.strength,
      });
      // Apply to the entire scene root (everything except the grain overlay).
      this.sceneRoot.filters = [displaceFilter];
    }

    this.handleResize();
    this.attachListeners();

    app.ticker.add((tick) => this.tick(tick.deltaTime));
  }

  private attachListeners(): void {
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.hostEl);

    this.onPointerMove = (e: PointerEvent) => {
      const rect = this.hostEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nx = x / rect.width - 0.5;
      const ny = y / rect.height - 0.5;
      const max = this.cfg.parallax.maxOffset;
      this.targetParallaxX = -nx * max * 2;
      this.targetParallaxY = -ny * max * 2;
      this.flow.setCursor(x, y);
    };

    this.onPointerLeave = () => {
      this.targetParallaxX = 0;
      this.targetParallaxY = 0;
      this.flow.setCursor(-9999, -9999);
    };

    // Pause rendering while the tab is hidden.
    this.onVisibility = () => {
      if (!this.app) return;
      if (document.hidden) this.app.ticker.stop();
      else this.app.ticker.start();
    };

    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerleave", this.onPointerLeave);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private handleResize(): void {
    if (!this.app) return;
    const w = this.hostEl.clientWidth;
    const h = this.hostEl.clientHeight;
    if (w === 0 || h === 0) return;

    this.app.renderer.resize(w, h);
    this.backdrop.resize(w, h);
    this.nodes.resize(w, h);
    this.flow.resize(w, h);
    this.stacks.resize(w, h);
    this.grain.resize(w, h);
  }

  private tick(dt: number): void {
    // Smooth parallax interpolation.
    const s = this.cfg.parallax.smoothing;
    this.parallaxX += (this.targetParallaxX - this.parallaxX) * s;
    this.parallaxY += (this.targetParallaxY - this.parallaxY) * s;

    const d = this.cfg.depth;
    if (this.farLayer) this.farLayer.position.set(this.parallaxX * d.far, this.parallaxY * d.far);
    if (this.midLayer) this.midLayer.position.set(this.parallaxX * d.mid, this.parallaxY * d.mid);
    if (this.nearLayer) this.nearLayer.position.set(this.parallaxX * d.near, this.parallaxY * d.near);

    this.backdrop.update(dt);
    this.nodes.update(dt);
    this.flow.update(dt);
    this.stacks.update(dt, this.parallaxX * d.near, this.parallaxY * d.near);
    this.grain.update(dt);

    // Drift the displacement sprite to animate the heatwave field.
    if (this.displaceSprite) {
      const dtSec = dt / 60;
      this.displaceSprite.x += this.cfg.distortion.driftSpeed * dtSec * 0.6;
      this.displaceSprite.y += this.cfg.distortion.driftSpeed * dtSec * 0.4;
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.onPointerMove) window.removeEventListener("pointermove", this.onPointerMove);
    if (this.onPointerLeave) window.removeEventListener("pointerleave", this.onPointerLeave);
    if (this.onVisibility) document.removeEventListener("visibilitychange", this.onVisibility);

    if (this.grain) this.grain.destroy();
    if (this.stacks) this.stacks.destroy();
    if (this.flow) this.flow.destroy();
    if (this.nodes) this.nodes.destroy();
    if (this.backdrop) this.backdrop.destroy();

    if (this.displaceSprite) {
      this.displaceSprite.destroy();
      this.displaceSprite = null;
    }

    if (this.app) {
      const canvas = this.app.canvas;
      if (canvas.parentElement === this.hostEl) {
        this.hostEl.removeChild(canvas);
      }
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}

function mergeConfig(
  base: CyberpunkConfig,
  override?: Partial<CyberpunkConfig>,
): CyberpunkConfig {
  if (!override) return base;
  return {
    ...base,
    ...override,
    palette: { ...base.palette, ...(override.palette ?? {}) },
    backdrop: { ...base.backdrop, ...(override.backdrop ?? {}) },
    nodes: { ...base.nodes, ...(override.nodes ?? {}) },
    flow: { ...base.flow, ...(override.flow ?? {}) },
    callStacks: { ...base.callStacks, ...(override.callStacks ?? {}) },
    depth: { ...base.depth, ...(override.depth ?? {}) },
    parallax: { ...base.parallax, ...(override.parallax ?? {}) },
    grain: { ...base.grain, ...(override.grain ?? {}) },
    distortion: { ...base.distortion, ...(override.distortion ?? {}) },
    perf: { ...base.perf, ...(override.perf ?? {}) },
  };
}
