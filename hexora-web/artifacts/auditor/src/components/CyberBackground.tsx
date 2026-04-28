import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, BlurFilter, Ticker } from 'pixi.js';

interface BlockNode {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  pulse: number;
  pulseSpeed: number;
  hue: number;
  graphics: Graphics;
  vx: number;
  vy: number;
}

interface DataParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  graphics: Graphics;
}

const NEON_CYAN = 0x00f0ff;
const NEON_MAGENTA = 0xff2bd6;
const NEON_VIOLET = 0x8b5cf6;
const NEON_BLUE = 0x4d9fff;
const NEON_GREEN = 0x00ffa3;

export function CyberBackground({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    let mounted = true;
    const app = new Application();

    (async () => {
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        powerPreference: 'high-performance',
        preference: 'webgl',
      });
      if (!mounted) {
        app.destroy(true, { children: true });
        return;
      }
      host.appendChild(app.canvas);
      appRef.current = app;
      buildScene(app);
    })();

    return () => {
      mounted = false;
      const a = appRef.current;
      if (a) {
        try { a.destroy(true, { children: true }); } catch {}
      }
      appRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}

function buildScene(app: Application) {
  const W = () => app.screen.width;
  const H = () => app.screen.height;

  // Layer 1: Perspective grid floor
  const gridContainer = new Container();
  app.stage.addChild(gridContainer);

  const gridGfx = new Graphics();
  gridContainer.addChild(gridGfx);

  // Layer 2: Glow orbs (background ambient) — soft via concentric rings
  const orbsContainer = new Container();
  // Pixi v8 Canvas2D fallback does NOT support BlurFilter; check renderer type
  const rendererType = (app.renderer as { type?: number }).type;
  // RendererType.WEBGL = 1, WEBGPU = 2, CANVAS = 4 (we treat anything other than canvas as filter-capable)
  const blurAvailable = rendererType !== undefined && rendererType !== 4;
  if (blurAvailable) {
    try {
      orbsContainer.filters = [new BlurFilter({ strength: 80, quality: 4 })];
    } catch {
      /* noop */
    }
  }
  app.stage.addChild(orbsContainer);

  const orbs: { gfx: Graphics; x: number; y: number; vx: number; vy: number; r: number; color: number; pulse: number }[] = [];
  const orbColors = [NEON_VIOLET, NEON_CYAN, NEON_MAGENTA, NEON_BLUE];
  for (let i = 0; i < 4; i++) {
    const gfx = new Graphics();
    orbsContainer.addChild(gfx);
    orbs.push({
      gfx,
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 180 + Math.random() * 120,
      color: orbColors[i % orbColors.length],
      pulse: Math.random() * Math.PI * 2,
    });
  }

  // Layer 3: Connection mesh (lines between blocks)
  const meshGfx = new Graphics();
  app.stage.addChild(meshGfx);

  // Layer 4: Hex blockchain blocks
  const blocksContainer = new Container();
  app.stage.addChild(blocksContainer);

  const blocks: BlockNode[] = [];
  const BLOCK_COUNT = 14;
  const blockColors = [NEON_CYAN, NEON_VIOLET, NEON_MAGENTA, NEON_BLUE, NEON_GREEN];
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const g = new Graphics();
    blocksContainer.addChild(g);
    blocks.push({
      x: Math.random() * W(),
      y: Math.random() * H(),
      size: 14 + Math.random() * 22,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.008,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.015 + Math.random() * 0.025,
      hue: blockColors[Math.floor(Math.random() * blockColors.length)],
      graphics: g,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    });
  }

  // Layer 5: Data particles (binary stream)
  const particlesContainer = new Container();
  app.stage.addChild(particlesContainer);
  const particles: DataParticle[] = [];

  function spawnParticle() {
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0, vx = 0, vy = 0;
    const speed = 0.6 + Math.random() * 1.2;
    if (edge === 0) { x = Math.random() * W(); y = -10; vx = (Math.random() - 0.5) * 0.5; vy = speed; }
    else if (edge === 1) { x = W() + 10; y = Math.random() * H(); vx = -speed; vy = (Math.random() - 0.5) * 0.5; }
    else if (edge === 2) { x = Math.random() * W(); y = H() + 10; vx = (Math.random() - 0.5) * 0.5; vy = -speed; }
    else { x = -10; y = Math.random() * H(); vx = speed; vy = (Math.random() - 0.5) * 0.5; }

    const g = new Graphics();
    particlesContainer.addChild(g);
    const colors = [NEON_CYAN, NEON_VIOLET, NEON_GREEN];
    particles.push({
      x, y, vx, vy,
      life: 0,
      maxLife: 200 + Math.random() * 200,
      size: 1 + Math.random() * 1.5,
      hue: colors[Math.floor(Math.random() * colors.length)],
      graphics: g,
    });
  }

  // Layer 6: Scanning beam (sweeping radial pulse)
  const beamGfx = new Graphics();
  beamGfx.alpha = 0.5;
  app.stage.addChild(beamGfx);

  let beamAngle = 0;
  let frame = 0;
  let gridOffset = 0;

  function drawGrid() {
    gridGfx.clear();
    const w = W(), h = H();
    const horizon = h * 0.55;
    const spacing = 80;
    const lineColor = 0x4d3a8c;

    // Horizontal lines (perspective floor)
    gridOffset = (gridOffset + 0.6) % spacing;
    for (let i = 0; i < 16; i++) {
      const t = i / 16;
      const y = horizon + (h - horizon) * Math.pow(t + gridOffset / spacing / 16, 1.6);
      if (y > h + 20) continue;
      const alpha = 0.06 + (1 - t) * 0.16;
      gridGfx.moveTo(0, y).lineTo(w, y).stroke({ color: lineColor, width: 1, alpha });
    }
    // Vertical perspective lines
    const vanishX = w / 2;
    for (let i = -10; i <= 10; i++) {
      const startX = vanishX + i * 80;
      const endX = vanishX + i * (w * 1.5);
      gridGfx.moveTo(startX, horizon).lineTo(endX, h).stroke({ color: lineColor, width: 1, alpha: 0.12 });
    }
  }

  function drawBlock(b: BlockNode) {
    const g = b.graphics;
    g.clear();
    const sides = 6;
    const points: number[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + b.rotation;
      points.push(b.x + Math.cos(a) * b.size, b.y + Math.sin(a) * b.size);
    }
    // Outer glow (filled with low alpha)
    const pulseScale = 1 + Math.sin(b.pulse) * 0.15;
    const innerSize = b.size * 0.5 * pulseScale;
    g.poly(points).stroke({ color: b.hue, width: 1.2, alpha: 0.7 });

    // Inner hex
    const inner: number[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + b.rotation;
      inner.push(b.x + Math.cos(a) * innerSize, b.y + Math.sin(a) * innerSize);
    }
    g.poly(inner).fill({ color: b.hue, alpha: 0.25 + Math.sin(b.pulse) * 0.15 });

    // Center dot
    g.circle(b.x, b.y, 1.5).fill({ color: b.hue, alpha: 1 });
  }

  function drawMesh() {
    meshGfx.clear();
    const maxDist = 220;
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i], b = blocks[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < maxDist) {
          const alpha = (1 - d / maxDist) * 0.3;
          // pulsing line by combining the two pulses
          const pulse = (Math.sin(a.pulse) + Math.sin(b.pulse)) * 0.5;
          meshGfx.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({
            color: a.hue,
            width: 0.6 + pulse * 0.3,
            alpha: alpha * (0.6 + pulse * 0.4),
          });
        }
      }
    }
  }

  function drawBeam() {
    beamGfx.clear();
    const cx = W() * 0.5;
    const cy = H() * 0.5;
    const radius = Math.max(W(), H()) * 0.7;
    // sweeping triangle wedge
    const wedgeWidth = 0.35;
    const x1 = cx + Math.cos(beamAngle) * radius;
    const y1 = cy + Math.sin(beamAngle) * radius;
    const x2 = cx + Math.cos(beamAngle + wedgeWidth) * radius;
    const y2 = cy + Math.sin(beamAngle + wedgeWidth) * radius;
    beamGfx.moveTo(cx, cy).lineTo(x1, y1).lineTo(x2, y2).closePath().fill({ color: NEON_CYAN, alpha: 0.025 });
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.sin(lifeRatio * Math.PI) * 0.9;

      p.graphics.clear();
      p.graphics.circle(p.x, p.y, p.size).fill({ color: p.hue, alpha });
      // small trail
      p.graphics.circle(p.x - p.vx * 6, p.y - p.vy * 6, p.size * 0.6).fill({ color: p.hue, alpha: alpha * 0.4 });

      if (p.life > p.maxLife || p.x < -30 || p.x > W() + 30 || p.y < -30 || p.y > H() + 30) {
        particlesContainer.removeChild(p.graphics);
        p.graphics.destroy();
        particles.splice(i, 1);
      }
    }
  }

  function drawOrbs() {
    for (const o of orbs) {
      o.x += o.vx;
      o.y += o.vy;
      o.pulse += 0.01;
      if (o.x < -o.r || o.x > W() + o.r) o.vx *= -1;
      if (o.y < -o.r || o.y > H() + o.r) o.vy *= -1;
      const a = 0.18 + Math.sin(o.pulse) * 0.08;
      o.gfx.clear();
      if (blurAvailable) {
        o.gfx.circle(o.x, o.y, o.r).fill({ color: o.color, alpha: a });
      } else {
        // Fallback: layered concentric circles to fake a soft radial gradient
        const layers = 8;
        for (let k = layers; k >= 1; k--) {
          const t = k / layers;
          const radius = o.r * t;
          const alpha = a * (1 - t) * 0.55;
          o.gfx.circle(o.x, o.y, radius).fill({ color: o.color, alpha });
        }
      }
    }
  }

  // Ticker
  const ticker = (delta: Ticker) => {
    const dt = delta.deltaTime;
    frame++;
    beamAngle += 0.005 * dt;

    // Move blocks slowly
    for (const b of blocks) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rotation += b.rotSpeed * dt;
      b.pulse += b.pulseSpeed * dt;

      if (b.x < -50) b.x = W() + 50;
      if (b.x > W() + 50) b.x = -50;
      if (b.y < -50) b.y = H() + 50;
      if (b.y > H() + 50) b.y = -50;
    }

    drawGrid();
    drawOrbs();
    drawMesh();
    for (const b of blocks) drawBlock(b);
    drawBeam();

    // Spawn new particles
    if (frame % 4 === 0 && particles.length < 80) spawnParticle();
    drawParticles();
  };

  app.ticker.add(ticker);
}
