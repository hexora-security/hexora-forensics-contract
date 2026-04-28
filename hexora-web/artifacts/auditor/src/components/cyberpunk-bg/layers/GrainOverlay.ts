import { Container, TilingSprite, Texture } from "pixi.js";
import type { CyberpunkConfig } from "../config";

/**
 * Animated film-grain / digital-static overlay rendered as a TilingSprite
 * with the source noise texture and an additive blend mode.
 *
 * The sprite tiles to fill the viewport. We animate by shifting the
 * tilePosition each frame — this is essentially free (one quad, GPU does
 * the rest) and produces the "flowing static" feel of a digital field.
 */
export class GrainOverlay {
  readonly container: Container;
  private readonly cfg: CyberpunkConfig;
  private readonly sprite: TilingSprite;
  private dx = 0;
  private dy = 0;

  constructor(cfg: CyberpunkConfig, texture: Texture) {
    this.cfg = cfg;
    this.container = new Container();

    this.sprite = new TilingSprite({
      texture,
      width: 1,
      height: 1,
    });
    this.sprite.alpha = cfg.grain.alpha;
    this.sprite.blendMode = "add";
    this.container.addChild(this.sprite);

    this.dx = cfg.grain.scrollSpeed[0];
    this.dy = cfg.grain.scrollSpeed[1];
  }

  resize(width: number, height: number): void {
    this.sprite.width = width;
    this.sprite.height = height;
  }

  update(dt: number): void {
    const dtSec = dt / 60;
    this.sprite.tilePosition.x += this.dx * dtSec;
    this.sprite.tilePosition.y += this.dy * dtSec;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
