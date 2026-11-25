import { assemble, type ShaderDefines } from './shader-lib';

interface GlCaps {
  floatTargets: boolean;
  halfFloatTargets: boolean;
}

type UniformValue = number | Float32Array | Int32Array | readonly number[];

interface TextureSpec {
  width: number;
  height: number;
  internal: number;
  format: number;
  type: number;
  filter?: number;
  wrap?: number;
  data?: ArrayBufferView | null;
}

interface AttachmentSpec {
  filter?: 'nearest' | 'linear';
  precise?: boolean;
}

interface UniformInfo {
  loc: WebGLUniformLocation;
  type: number;
}

type UniformSetter = (
  gl: WebGL2RenderingContext,
  loc: WebGLUniformLocation,
  val: UniformValue,
) => void;

const CAPS = new WeakMap<WebGL2RenderingContext, GlCaps>();

export function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  if (!gl) throw new Error('This game needs WebGL2, which this browser does not provide.');
  const caps: GlCaps = {
    floatTargets: Boolean(gl.getExtension('EXT_color_buffer_float')),
    halfFloatTargets: Boolean(gl.getExtension('EXT_color_buffer_half_float')),
  };
  if (!caps.floatTargets && !caps.halfFloatTargets) {
    throw new Error('This GPU cannot render to float textures.');
  }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  CAPS.set(gl, caps);
  return gl;
}

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error(`Unable to create shader "${label}".`);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || '';
    const lines = source.split('\n');
    const around = [...log.matchAll(/ERROR: \d+:(\d+)/g)]
      .slice(0, 4)
      .map((m) => {
        const n = Number(m[1]);
        return lines
          .slice(Math.max(0, n - 3), n + 1)
          .map((l, i) => `${Math.max(1, n - 2) + i}: ${l}`)
          .join('\n');
      })
      .join('\n---\n');
    throw new Error(`Shader "${label}" failed to compile:\n${log}\n${around}`);
  }
  return sh;
}

const SETTERS: Record<number, UniformSetter> = {
  0x1406: (gl, l, v) =>
    typeof v === 'number' ? gl.uniform1f(l, v) : gl.uniform1fv(l, v as Float32List),
  0x8b50: (gl, l, v) => gl.uniform2fv(l, v as Float32List),
  0x8b51: (gl, l, v) => gl.uniform3fv(l, v as Float32List),
  0x8b52: (gl, l, v) => gl.uniform4fv(l, v as Float32List),
  0x1404: (gl, l, v) =>
    typeof v === 'number' ? gl.uniform1i(l, v) : gl.uniform1iv(l, v as Int32List),
  0x8b5c: (gl, l, v) => gl.uniformMatrix4fv(l, false, v as Float32List),
  0x8b5b: (gl, l, v) => gl.uniformMatrix3fv(l, false, v as Float32List),
};

export class Program {
  readonly gl: WebGL2RenderingContext;
  readonly handle: WebGLProgram;
  private readonly uniforms: Record<string, UniformInfo> = {};
  private unit = 0;

  constructor(
    gl: WebGL2RenderingContext,
    name: string,
    vs: string,
    fs: string,
    defines?: ShaderDefines,
    localChunks?: Record<string, string>,
  ) {
    this.gl = gl;
    const p = gl.createProgram();
    if (!p) throw new Error(`Unable to create program "${name}".`);
    this.handle = p;
    const v = compile(gl, gl.VERTEX_SHADER, assemble(vs, defines, localChunks), `${name} (vertex)`);
    const f = compile(gl, gl.FRAGMENT_SHADER, assemble(fs, defines, localChunks), `${name} (fragment)`);
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(`Program "${name}" failed to link: ${gl.getProgramInfoLog(p) || ''}`);
    }
    gl.deleteShader(v);
    gl.deleteShader(f);
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(p, i);
      if (!info) continue;
      const loc = gl.getUniformLocation(p, info.name);
      if (!loc) continue;
      const key = info.name.replace(/\[0\]$/, '');
      this.uniforms[key] = { loc, type: info.type };
    }
  }

  use(): this {
    this.gl.useProgram(this.handle);
    this.unit = 0;
    return this;
  }

  set(name: string, value: UniformValue): this {
    const u = this.uniforms[name];
    if (u) {
      const setter = SETTERS[u.type];
      if (setter) setter(this.gl, u.loc, value);
    }
    return this;
  }

  tex(name: string, texture: WebGLTexture | null): this {
    const u = this.uniforms[name];
    if (!u) return this;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + this.unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u.loc, this.unit++);
    return this;
  }
}

export function createTexture(gl: WebGL2RenderingContext, spec: TextureSpec): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error('Unable to create WebGL texture.');
  const filter = spec.filter ?? gl.NEAREST;
  const wrap = spec.wrap ?? gl.CLAMP_TO_EDGE;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    spec.internal,
    spec.width,
    spec.height,
    0,
    spec.format,
    spec.type,
    spec.data ?? null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  return tex;
}

export class Target {
  readonly gl: WebGL2RenderingContext;
  private readonly spec: readonly AttachmentSpec[];
  private readonly useDepth: boolean;
  width = 0;
  height = 0;
  textures: WebGLTexture[] = [];
  fbo: WebGLFramebuffer | null = null;
  depth: WebGLRenderbuffer | null = null;

  constructor(gl: WebGL2RenderingContext, attachments: readonly AttachmentSpec[], depth = false) {
    this.gl = gl;
    this.spec = attachments;
    this.useDepth = depth;
  }

  resize(width: number, height: number): boolean {
    const gl = this.gl;
    const w = Math.max(1, width | 0);
    const h = Math.max(1, height | 0);
    if (w === this.width && h === this.height) return false;
    this.dispose();
    this.width = w;
    this.height = h;
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Unable to create framebuffer.');
    this.fbo = fbo;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const caps = CAPS.get(gl);
    this.textures = this.spec.map((a, i) => {
      const precise = Boolean(a.precise && caps?.floatTargets);
      const tex = createTexture(gl, {
        width: w,
        height: h,
        internal: precise ? gl.RGBA32F : gl.RGBA16F,
        format: gl.RGBA,
        type: precise ? gl.FLOAT : gl.HALF_FLOAT,
        filter: a.filter === 'nearest' || precise ? gl.NEAREST : gl.LINEAR,
      });
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0);
      return tex;
    });
    if (this.useDepth) {
      const rb = gl.createRenderbuffer();
      if (!rb) throw new Error('Unable to create depth renderbuffer.');
      this.depth = rb;
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    }
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Render target incomplete: 0x' + status.toString(16));
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  bind(count = this.textures.length): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.drawBuffers(this.textures.map((_, i) => (i < count ? gl.COLOR_ATTACHMENT0 + i : gl.NONE)));
  }

  dispose(): void {
    const gl = this.gl;
    for (const t of this.textures) gl.deleteTexture(t);
    if (this.depth) gl.deleteRenderbuffer(this.depth);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    this.textures = [];
    this.depth = null;
    this.fbo = null;
  }
}

export function bindScreen(gl: WebGL2RenderingContext, width: number, height: number): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, width, height);
}

export function drawFullscreen(gl: WebGL2RenderingContext): void {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
