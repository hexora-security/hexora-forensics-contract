import { Texture } from "pixi.js";

/**
 * Build a small grayscale noise texture procedurally.
 *
 * Used by:
 * - the grain overlay (TilingSprite + ADD blend mode)
 * - the displacement filter (heatwave / digital-field distortion)
 *
 * The texture is generated once per scene; tiling/UV motion handles animation.
 */
export function createNoiseTexture(size: number, contrast = 1.0): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Fallback: empty texture so callers don't crash.
    return Texture.from(canvas);
  }

  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    // Normal-ish noise via summing two uniforms; biased toward mid-gray
    // so the displacement map doesn't push everything in one direction.
    const n = (Math.random() + Math.random()) * 0.5;
    const v = Math.max(0, Math.min(255, Math.round(((n - 0.5) * contrast + 0.5) * 255)));
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  return Texture.from(canvas);
}
