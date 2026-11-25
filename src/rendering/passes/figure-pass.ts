import type { ArchetypeId } from '../../types/domain';
import type { EntityBatch } from '../../types/render';
import { createTexture, drawFullscreen, Program, Target } from '../gl';
import figureFrag from '../shaders/passes/figure.frag?raw';
import fullscreenVert from '../shaders/passes/fullscreen.vert?raw';
import type { EntityFrame, EntityPass } from './entity-pass';

export class FigurePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly layer: Target;
  private fbo: WebGLFramebuffer | null = null;
  private tex: WebGLTexture | null = null;
  private width = 0;
  private height = 0;
  private program: Program | null = null;
  private bytes = new Uint8Array(0);

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.layer = new Target(gl, [{}, { filter: 'nearest' }], true);
  }

  size(width: number, height: number): void {
    const gl = this.gl;
    this.layer.resize(width, height);
    if (width === this.width && height === this.height) return;
    if (this.tex) gl.deleteTexture(this.tex);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    this.width = width;
    this.height = height;
    this.tex = createTexture(gl, {
      width,
      height,
      internal: gl.RGBA8,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
    });
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Unable to create figure framebuffer.');
    this.fbo = fbo;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.bytes = new Uint8Array(width * height * 4);
  }

  render(
    entityPass: EntityPass,
    frame: EntityFrame,
    batches: Map<ArchetypeId, EntityBatch>,
    applyFrame: (p: Program) => void,
    vao: WebGLVertexArrayObject,
  ): Uint8Array {
    const gl = this.gl;
    entityPass.render(this.layer, frame, batches, applyFrame);
    if (!this.program) {
      this.program = new Program(gl, 'figure', fullscreenVert, figureFrag);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.bindVertexArray(vao);
    this.program.use().tex('uEnt', this.layer.textures[0]);
    drawFullscreen(gl);
    gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.bytes);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return this.bytes;
  }
}
