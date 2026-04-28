import { useEffect, useRef } from 'react';

export function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Setup canvas size
    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    setSize();
    window.addEventListener('resize', setSize);

    // Grid properties
    const gridSize = 60;
    let offset = 0;
    const perspective = 0.5;

    // Particle system
    const maxParticles = 80;
    const particles = Array.from({ length: maxParticles }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.3 + 0.1,
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.6 + 0.1,
      color: ['270, 100%, 65%', '180, 100%, 55%', '320, 100%, 60%'][Math.floor(Math.random() * 3)]
    }));

    // Streaks
    const streaks: { x: number; y: number; speed: number; length: number; opacity: number }[] = [];

    let lastStreak = 0;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Horizon line
      const horizonY = height * 0.3;

      // Draw cyber grid
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizonY, width, height - horizonY);
      ctx.clip();

      offset = (offset + 1) % gridSize;

      ctx.lineWidth = 1;
      
      // Vertical lines with perspective
      for (let x = -width; x <= width * 2; x += gridSize) {
        ctx.beginPath();
        const startX = x;
        const endX = width / 2 + (x - width / 2) * (1 / perspective);
        
        const grad = ctx.createLinearGradient(0, horizonY, 0, height);
        grad.addColorStop(0, 'rgba(180, 100, 255, 0.0)');
        grad.addColorStop(0.5, 'rgba(124, 92, 255, 0.1)');
        grad.addColorStop(1, 'rgba(124, 92, 255, 0.3)');
        
        ctx.strokeStyle = grad;
        ctx.moveTo(width / 2 + (startX - width / 2) * 0.1, horizonY);
        ctx.lineTo(endX, height);
        ctx.stroke();
      }

      // Horizontal lines with perspective
      for (let y = offset; y < height; y += gridSize) {
        const scaledY = horizonY + Math.pow(y / height, 3) * (height - horizonY);
        if (scaledY > horizonY) {
          ctx.beginPath();
          
          const alpha = Math.min(0.3, Math.pow((scaledY - horizonY) / (height - horizonY), 2) * 0.5);
          ctx.strokeStyle = `rgba(124, 92, 255, ${alpha})`;
          
          ctx.moveTo(0, scaledY);
          ctx.lineTo(width, scaledY);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Draw particles
      particles.forEach(p => {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, `hsla(${p.color}, ${p.opacity})`);
        gradient.addColorStop(1, `hsla(${p.color}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        p.y -= p.speedY;
        p.x += p.speedX;
        
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
      });

      // Handle Streaks
      if (time - lastStreak > 3000 + Math.random() * 5000) {
        streaks.push({
          x: -200,
          y: Math.random() * height,
          speed: Math.random() * 15 + 10,
          length: Math.random() * 100 + 50,
          opacity: 0.8
        });
        lastStreak = time;
      }

      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        const grad = ctx.createLinearGradient(s.x, s.y, s.x + s.length, s.y);
        grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
        grad.addColorStop(0.8, `rgba(0, 255, 255, ${s.opacity})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 1)');

        ctx.fillStyle = grad;
        ctx.fillRect(s.x, s.y - 1, s.length, 2);

        s.x += s.speed;
        if (s.x > width) {
          streaks.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', setSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1]"
      style={{ opacity: 0.12 }}
    />
  );
}