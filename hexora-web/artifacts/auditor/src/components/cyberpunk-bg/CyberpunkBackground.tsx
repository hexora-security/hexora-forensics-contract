import { useEffect, useRef } from "react";
import { CyberpunkScene } from "./CyberpunkScene";
import type { CyberpunkConfig } from "./config";

export interface CyberpunkBackgroundProps {
  /** Optional config overrides for colors, density, speed. */
  config?: Partial<CyberpunkConfig>;
  /** Foreground overlay opacity (0-1). 0 = no overlay, 1 = solid background color. */
  overlayOpacity?: number;
  className?: string;
}

/**
 * React mount point for the PixiJS cyberpunk background.
 *
 * Renders a fixed, full-viewport canvas behind the UI content
 * (z-index: 0, pointer-events: none). Use `overlayOpacity` to dim the
 * scene further if your UI needs more contrast.
 */
export function CyberpunkBackground({
  config,
  overlayOpacity = 0.0,
  className,
}: CyberpunkBackgroundProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Stash the latest config in a ref to avoid re-creating the scene on
  // every parent re-render.
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let scene: CyberpunkScene | null = new CyberpunkScene({
      container: host,
      config: configRef.current,
    });
    let cancelled = false;

    scene.init().catch((err) => {
      // Initialization can fail if WebGL is unavailable. Fail visibly
      // rather than silently — the host page will still render its content
      // because this canvas sits behind the UI.
      // eslint-disable-next-line no-console
      console.error("CyberpunkBackground failed to initialize:", err);
    });

    return () => {
      cancelled = true;
      if (scene) {
        scene.destroy();
        scene = null;
      }
      void cancelled;
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        ref={hostRef}
        style={{ position: "absolute", inset: 0 }}
      />
      {overlayOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "hsl(230 35% 4%)",
            opacity: overlayOpacity,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
