import { useEffect, useRef } from 'react';

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  alpha: number;
}

export function AmbientCanvas({ intensity = 1, className = '' }: { intensity?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const blobs: Blob[] = [
      { x: width * 0.2, y: height * 0.3, vx: 0.08, vy: 0.05, r: 380, hue: 262, alpha: 0.22 * intensity },
      { x: width * 0.8, y: height * 0.7, vx: -0.06, vy: -0.04, r: 420, hue: 230, alpha: 0.18 * intensity },
      { x: width * 0.5, y: height * 0.5, vx: 0.04, vy: -0.07, r: 320, hue: 195, alpha: 0.14 * intensity },
    ];

    let running = true;
    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const b of blobs) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.r * 0.5 || b.x > width + b.r * 0.5) b.vx *= -1;
        if (b.y < -b.r * 0.5 || b.y > height + b.r * 0.5) b.vy *= -1;

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, `hsla(${b.hue}, 80%, 60%, ${b.alpha})`);
        grad.addColorStop(0.5, `hsla(${b.hue}, 80%, 50%, ${b.alpha * 0.4})`);
        grad.addColorStop(1, `hsla(${b.hue}, 80%, 40%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
