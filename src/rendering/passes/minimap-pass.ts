import { RENDER } from '../../config';
import type { MinimapLike, RenderFrame } from '../../types/render';
import type { Program } from '../gl';
import type { WorldTextures } from '../world-textures';

export class Minimap implements MinimapLike {
  private readonly worldTex: WorldTextures;
  private readonly blips = new Float32Array(RENDER.MAX_BLIPS * 4);
  private readonly scaled = new Float32Array(RENDER.MAX_BLIPS * 4);
  private count = 0;
  rect: [number, number, number, number] = [0, 0, 0, 0.6];
  player: [number, number, number] = [0, 0, 0];

  constructor(worldTex: WorldTextures) {
    this.worldTex = worldTex;
  }

  clear(): void {
    this.count = 0;
  }

  add(x: number, z: number, kind: number, size = 2.4): void {
    if (this.count >= RENDER.MAX_BLIPS) return;
    this.blips.set([x, z, kind, size], this.count++ * 4);
  }

  bind(p: Program, frame: RenderFrame, _width: number, height: number): void {
    const dpr = frame.dpr;
    const [cx, cy, r, upp] = this.rect;
    p.tex('uHeightTex', this.worldTex.height)
      .tex('uColorTex', this.worldTex.color)
      .tex('uPropTexA', this.worldTex.propsA);
    p.set('uMapRect', [cx * dpr, height - cy * dpr, r * dpr, upp / dpr]).set(
      'uMapPlayer',
      this.player,
    );
    const scaled = this.scaled;
    scaled.set(this.blips);
    for (let i = 0; i < this.count; i++) scaled[i * 4 + 3] *= dpr;
    p.set('uBlips', scaled).set('uBlipCount', this.count);
  }
}
