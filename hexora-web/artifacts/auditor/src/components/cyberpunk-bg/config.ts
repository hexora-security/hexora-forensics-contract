/**
 * EVM execution background configuration.
 *
 * Tweak colors, density, and speed here without touching scene code.
 * The whole scene is a 3-layer composition (far / mid / near) with a
 * grain overlay; each layer references this config.
 */

export interface CyberpunkConfig {
  /** Base background color (deep void). */
  background: number;

  /** Neon palette. */
  palette: {
    primary: number;   // electric purple
    secondary: number; // cyan
    accent: number;    // electric blue
    soft: number;      // dim violet, used for distant layers
  };

  /** Backdrop ambient glow blobs. */
  backdrop: {
    /** Number of slowly orbiting glow blobs. */
    blobs: number;
    /** Per-blob max radius as fraction of viewport diagonal. */
    radiusFactor: number;
    /** Overall glow intensity. */
    intensity: number;
  };

  /** Translucent execution-node blocks. */
  nodes: {
    /** Density of nodes per 100,000 px^2. Auto-scaled by viewport area. */
    densityPer100kPx2: number;
    /** Hard min/max counts so very small or very large viewports stay sane. */
    minCount: number;
    maxCount: number;
    /** Block size range. */
    width: [number, number];
    height: [number, number];
    /** Node lifecycle (seconds): fadeIn, hold, fadeOut. */
    fadeIn: [number, number];
    hold: [number, number];
    fadeOut: [number, number];
    /** Per-frame drift velocity at 60fps. */
    drift: [number, number];
    /** Peak alpha (translucent). */
    alpha: number;
    /** Edge glow strength multiplier. */
    glow: number;
  };

  /** Directed execution paths between nodes. */
  flow: {
    /** Number of execution paths. */
    pathCount: number;
    /** How many control points per path (segments = points - 1). */
    pointsPerPath: [number, number];
    /** Pulses per path traveling along its line. */
    pulsesPerPath: [number, number];
    /** Pulse travel speed in path-units per second (path is parameterized 0..1). */
    pulseSpeed: [number, number];
    /** Pulse "comet" tail length in segments. */
    pulseTail: number;
    /** Idle line alpha (faint dotted "code path" in the dark). */
    pathAlpha: number;
    /** Trace-activation interval per path (seconds). */
    traceInterval: [number, number];
    /** Trace-activation flash duration (seconds). */
    traceDuration: [number, number];
    /** Trace flash alpha. */
    traceAlpha: number;
    /** How much cursor proximity nudges pulses (0 = none). */
    cursorInfluence: number;
  };

  /** Abstract call-stack columns (foreground accents). */
  callStacks: {
    /** Number of stacks scattered around the canvas. */
    count: number;
    /** Frames per stack. */
    framesPerStack: [number, number];
    /** Width of the widest frame. */
    baseWidth: [number, number];
    /** Vertical spacing between frames. */
    frameHeight: [number, number];
    /** Cycle time (seconds) for fade in/out. */
    cycle: [number, number];
    alpha: number;
  };

  /** 3-layer depth system. */
  depth: {
    /** Parallax weights — far drifts least, near drifts most. */
    far: number;
    mid: number;
    near: number;
    /** Far-layer blur (px). */
    farBlur: number;
    /** Mid-layer blur (px). */
    midBlur: number;
  };

  /** Mouse parallax. */
  parallax: {
    /** Max base offset (px) before per-layer multiplier is applied. */
    maxOffset: number;
    /** Smoothing toward target (0..1). */
    smoothing: number;
  };

  /** Animated noise/grain overlay. */
  grain: {
    /** Texture pixel size (square, power-of-two recommended). */
    size: number;
    /** Tile alpha (0..1). Keep low; this is a subtle film grain. */
    alpha: number;
    /** Scroll velocity (px/sec) of the noise tiling. */
    scrollSpeed: [number, number];
  };

  /** Subtle heatwave / digital-field distortion via DisplacementFilter. */
  distortion: {
    enabled: boolean;
    /** Strength of the displacement effect (px). */
    strength: number;
    /** Speed at which the displacement map drifts (px/sec). */
    driftSpeed: number;
  };

  /** Performance / rendering. */
  perf: {
    /** Cap device pixel ratio so 4K/Retina screens stay smooth. */
    maxResolution: number;
  };
}

export const defaultConfig: CyberpunkConfig = {
  background: 0x05060f,
  palette: {
    primary: 0xa855f7,
    secondary: 0x22d3ee,
    accent: 0x3b82f6,
    soft: 0x6d28d9,
  },
  backdrop: {
    blobs: 3,
    radiusFactor: 0.45,
    intensity: 0.55,
  },
  nodes: {
    densityPer100kPx2: 0.9,
    minCount: 8,
    maxCount: 36,
    width: [70, 200],
    height: [22, 60],
    fadeIn: [0.6, 1.4],
    hold: [3.5, 7.0],
    fadeOut: [1.0, 2.2],
    drift: [0.02, 0.08],
    alpha: 0.32,
    glow: 1.0,
  },
  flow: {
    pathCount: 14,
    pointsPerPath: [3, 5],
    pulsesPerPath: [1, 3],
    pulseSpeed: [0.06, 0.18],
    pulseTail: 18,
    pathAlpha: 0.12,
    traceInterval: [3.5, 8.0],
    traceDuration: [0.45, 0.9],
    traceAlpha: 0.7,
    cursorInfluence: 0.12,
  },
  callStacks: {
    count: 5,
    framesPerStack: [3, 6],
    baseWidth: [110, 180],
    frameHeight: [12, 18],
    cycle: [7, 14],
    alpha: 0.3,
  },
  depth: {
    far: 0.25,
    mid: 0.7,
    near: 1.25,
    farBlur: 2.5,
    midBlur: 0.6,
  },
  parallax: {
    maxOffset: 22,
    smoothing: 0.07,
  },
  grain: {
    size: 256,
    alpha: 0.06,
    scrollSpeed: [12, -7],
  },
  distortion: {
    enabled: true,
    strength: 6,
    driftSpeed: 8,
  },
  perf: {
    maxResolution: 1.5,
  },
};
