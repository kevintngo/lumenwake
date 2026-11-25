import type { RenderQuality } from '../../types/domain';
import type { RenderFrame } from '../../types/render';
import { cameraTan } from '../camera';
import { drawFullscreen, Program, type Target } from '../gl';
import '../props/prop-shaders';
import type { ShaderDefines } from '../shader-lib';
import fullscreenVert from '../shaders/passes/fullscreen.vert?raw';
import worldFrag from '../shaders/passes/world.frag?raw';
import type { WorldTextures } from '../world-textures';

const QUALITY: Record<RenderQuality, ShaderDefines> = {
  high: { MARCH_STEPS: 120, SHADOW_STEPS: 28 },
  low: { MARCH_STEPS: 84, SHADOW_STEPS: 12 },
};

export class WorldPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly programs: Partial<Record<RenderQuality, Program>> = {};

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  program(quality: RenderQuality): Program {
    let p = this.programs[quality];
    if (!p) {
      p = new Program(this.gl, `world:${quality}`, fullscreenVert, worldFrag, QUALITY[quality]);
      this.programs[quality] = p;
    }
    return p;
  }

  render(
    target: Target,
    frame: RenderFrame,
    worldTex: WorldTextures,
    applyFrame: (p: Program) => void,
    quality: RenderQuality,
  ): void {
    const gl = this.gl;
    const p = this.program(quality).use();
    target.bind();
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    applyFrame(p);
    worldTex.bind(p);
    p.set('uCasters', frame.casters).set('uCasterCount', frame.casterCount);
    p.set('uPen', ((2 * cameraTan(frame.camera)[1]) / target.height) * 1.3);
    drawFullscreen(gl);
  }
}
