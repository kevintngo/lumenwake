import type { FxTypeId } from '../../types/domain';
import type { RenderFrame } from '../../types/render';
import { Program, type Target } from '../gl';
import effectsGlsl from '../shaders/fx/effects.glsl?raw';
import fxFrag from '../shaders/passes/fx.frag?raw';
import fxVert from '../shaders/passes/fx.vert?raw';

export const FX_FLOATS = 16;

const FX_ORDER: readonly FxTypeId[] = [
  'mote',
  'leaf',
  'spark',
  'burst',
  'slash',
  'ring',
  'halo',
  'orb',
  'puff',
  'heal',
  'mark',
  'click',
  'beam',
  'zone',
  'lane',
  'cloud',
  'ripple',
];

const FX_INDEX = new Map<FxTypeId, number>(FX_ORDER.map((id, index) => [id, index]));

export function fxType(id: FxTypeId): number {
  const index = FX_INDEX.get(id);
  if (index === undefined) throw new Error(`Unknown fx type "${id}"`);
  return index;
}

export class FxPass {
  private readonly gl: WebGL2RenderingContext;
  private compiled: Program | null = null;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private capacity = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) throw new Error('Unable to create fx vertex buffers.');
    this.vao = vao;
    this.vbo = vbo;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    for (let i = 0; i < 4; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, FX_FLOATS * 4, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
  }

  program(): Program {
    if (!this.compiled) {
      this.compiled = new Program(this.gl, 'fx', fxVert, fxFrag, undefined, {
        'fx-effects': effectsGlsl,
      });
    }
    return this.compiled;
  }

  render(
    target: Target,
    frame: RenderFrame,
    data: Float32Array,
    count: number,
    sceneGbuf: WebGLTexture,
  ): void {
    if (!count) return;
    const gl = this.gl;
    const p = this.program().use();
    target.bind(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const cam = frame.camera;
    p.set('uViewProj', cam.viewProj)
      .set('uCamPos', cam.pos)
      .set('uCamRight', cam.right)
      .set('uCamUp', cam.up);
    p.set('uFar', frame.far)
      .set('uTime', frame.time)
      .set('uInvRes', [1 / target.width, 1 / target.height])
      .set('uDpr', frame.dpr);
    p.tex('uGbuf', sceneGbuf);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const bytes = count * FX_FLOATS * 4;
    if (bytes > this.capacity) {
      this.capacity = bytes * 2;
      gl.bufferData(gl.ARRAY_BUFFER, this.capacity, gl.DYNAMIC_DRAW);
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * FX_FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }
}
