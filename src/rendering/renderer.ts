import { RENDER } from '../config';
import { clamp } from '../core/math';
import { LEAF_PALETTE } from '../data/biomes';
import type { ArchetypeId, RenderQuality } from '../types/domain';
import type {
  CameraLike,
  FigureRequest,
  RenderFrame,
  RendererLike,
  RendererPaper,
  RendererSize,
} from '../types/render';
import type { WorldLike } from '../types/world';
import { ARCHETYPES } from './archetypes/archetype-registry';
import { cameraTan } from './camera';
import { createContext, Target, type Program } from './gl';
import { EntityPass } from './passes/entity-pass';
import { FigurePass } from './passes/figure-pass';
import { FxPass } from './passes/fx-pass';
import { Minimap } from './passes/minimap-pass';
import { PostChain, type RenderTargets } from './passes/post-pass';
import { WorldPass } from './passes/world-pass';
import { WorldTextures } from './world-textures';

const PAPER_TURN = 0.3;

interface RendererOpts {
  lite?: boolean;
}

interface DisjointTimerExt {
  readonly TIME_ELAPSED_EXT: number;
  readonly GPU_DISJOINT_EXT: number;
}

interface PaperBasis {
  right: [number, number, number];
  up: [number, number, number];
  forward: [number, number, number];
}

interface PaperState extends RendererPaper {
  a: PaperBasis | null;
  b: PaperBasis | null;
  mix: number;
  fade: number;
  still: number;
  last: [number, number, number] | null;
}

interface PerfState {
  ema: number;
  gpu: number;
  timer: number;
  calm: number;
  futile: number;
  lastDown: number;
  hold: number;
}

interface FullSize extends RendererSize {
  width: number;
  height: number;
}

type FrameCommon = Pick<
  RenderFrame,
  | 'camera'
  | 'env'
  | 'focus'
  | 'time'
  | 'timeTwos'
  | 'far'
  | 'reveal'
  | 'lightPos'
  | 'lightCol'
  | 'lightCount'
>;

export class Renderer implements RendererLike {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  readonly worldTex: WorldTextures;
  readonly minimap: Minimap;
  private readonly worldPass: WorldPass;
  private readonly entityPass: EntityPass;
  private readonly fxPass: FxPass;
  private readonly post: PostChain;
  private readonly targets: RenderTargets;
  private readonly vao: WebGLVertexArrayObject;
  private readonly leafPal: Float32Array;
  private readonly gpuTimer: DisjointTimerExt | null;
  private readonly frameFn: (p: Program) => void;
  private readonly perf: PerfState = {
    ema: 16.7,
    gpu: 0,
    timer: 0,
    calm: 0,
    futile: 0,
    lastDown: 0,
    hold: 0,
  };
  private toWarm: ArchetypeId[] | null = null;
  private pencil = new Float32Array(4);
  private paperAnchor = new Float32Array(3);
  private query: WebGLQuery | null = null;
  private timing = false;
  private lastTime: number | null = null;
  private frame: FrameCommon | null = null;
  private figurePass: FigurePass | null = null;
  private noLights: { pos: Float32Array; col: Float32Array } | null = null;

  quality: RenderQuality;
  scale: number;
  autoAdapt = true;
  paper: PaperState = { a: null, b: null, mix: 0, fade: 0, still: 0, last: null };
  size: FullSize = { cssW: 1, cssH: 1, dpr: 1, width: 1, height: 1 };

  constructor(canvas: HTMLCanvasElement, world: WorldLike, opts: RendererOpts = {}) {
    this.canvas = canvas;
    const gl = createContext(canvas);
    this.gl = gl;
    this.worldTex = new WorldTextures(gl, world);
    this.minimap = new Minimap(this.worldTex);
    this.worldPass = new WorldPass(gl);
    this.quality = opts.lite ? 'low' : 'high';
    this.worldPass.program(this.quality);
    this.entityPass = new EntityPass(gl);
    this.fxPass = new FxPass(gl);
    this.post = new PostChain(gl);
    this.targets = {
      scene: new Target(gl, [
        {},
        { filter: 'nearest', precise: true },
        {},
        { filter: 'nearest', precise: true },
      ]),
      edge: new Target(gl, [{}]),
      ent: new Target(gl, [{}, { filter: 'nearest' }], true),
    };
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Unable to create fullscreen vertex array.');
    this.vao = vao;
    this.leafPal = new Float32Array(LEAF_PALETTE.flat());
    this.scale = opts.lite ? RENDER.SCALE_LITE : RENDER.SCALE_START;
    this.gpuTimer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as DisjointTimerExt | null;
    this.frameFn = (p) => this.applyFrame(p);
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    const s = this.size;
    s.cssW = cssW;
    s.cssH = cssH;
    s.dpr = dpr;
    s.width = Math.round(cssW * dpr);
    s.height = Math.round(cssH * dpr);
    if (this.canvas.width !== s.width || this.canvas.height !== s.height) {
      this.canvas.width = s.width;
      this.canvas.height = s.height;
    }
    const iw = Math.round(cssW * this.scale);
    const ih = Math.round(cssH * this.scale);
    this.targets.scene.resize(iw, ih);
    this.targets.edge.resize(iw, ih);
    const edpr = Math.min(dpr, RENDER.ENTITY_DPR_MAX);
    this.targets.ent.resize(Math.round(cssW * edpr), Math.round(cssH * edpr));
  }

  setWorld(world: WorldLike): void {
    this.worldTex.setWorld(world);
  }

  adapt(dtMs: number): void {
    if (!this.autoAdapt) return;
    const p = this.perf;
    if (dtMs > 100) return;
    p.ema += (dtMs - p.ema) * 0.08;
    p.timer += dtMs;
    if (p.timer < 700) return;
    p.timer = 0;
    let next = this.scale;
    if (this.gpuTimer) {
      if (p.gpu > 19 && this.scale <= RENDER.SCALE_MIN + 0.001) this.quality = 'low';
      if (p.gpu > 13) next -= p.gpu > 20 ? 0.12 : 0.05;
      else if (p.gpu > 0 && p.gpu < 8.5) next += 0.05;
    } else if (p.ema > 21.5) {
      if (p.ema > 30 && this.scale <= RENDER.SCALE_MIN + 0.001) this.quality = 'low';
      if (p.lastDown && p.lastDown - p.ema < 1) {
        if (++p.futile >= 2) {
          next = RENDER.SCALE_START;
          p.hold = 30;
        }
      } else {
        p.futile = 0;
        next -= 0.06;
      }
      p.lastDown = p.ema;
    } else if (p.ema < 17.6 && ++p.calm >= 5) {
      next += 0.05;
      p.calm = 0;
      p.lastDown = 0;
    }
    if (p.hold > 0) {
      p.hold--;
      next = this.scale;
    }
    next = clamp(next, RENDER.SCALE_MIN, RENDER.SCALE_MAX);
    if (Math.abs(next - this.scale) > 0.001) {
      this.scale = next;
      this.resize(this.size.cssW, this.size.cssH, this.size.dpr);
    }
  }

  warm(): boolean {
    if (!this.toWarm) this.toWarm = [...ARCHETYPES.keys()];
    const id = this.toWarm.pop();
    if (id) this.entityPass.program(id);
    else this.fxPass.program();
    return !this.toWarm.length && !id;
  }

  private beginTiming(): void {
    const gl = this.gl;
    const ext = this.gpuTimer;
    if (!ext) return;
    if (this.query) {
      if (!gl.getQueryParameter(this.query, gl.QUERY_RESULT_AVAILABLE)) return;
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) {
        const ms = (gl.getQueryParameter(this.query, gl.QUERY_RESULT) as number) / 1e6;
        this.perf.gpu += (ms - this.perf.gpu) * (this.perf.gpu ? 0.15 : 1);
      }
      gl.deleteQuery(this.query);
      this.query = null;
    }
    this.query = gl.createQuery();
    if (!this.query) return;
    gl.beginQuery(ext.TIME_ELAPSED_EXT, this.query);
    this.timing = true;
  }

  private endTiming(): void {
    if (!this.timing || !this.gpuTimer) return;
    this.gl.endQuery(this.gpuTimer.TIME_ELAPSED_EXT);
    this.timing = false;
  }

  private applyFrame(p: Program): void {
    const f = this.frame;
    const pa = this.paper.a;
    if (!f || !pa) return;
    const c = f.camera;
    const e = f.env;
    const pb = this.paper.b || pa;
    p.set('uCamPos', c.pos)
      .set('uCamRight', c.right)
      .set('uCamUp', c.up)
      .set('uCamFwd', c.forward)
      .set('uTanFov', cameraTan(c));
    p.set('uFocus', f.focus).set('uTime', f.time).set('uReveal', f.reveal);
    p.set('uSunDir', e.keyDir).set('uSunDisk', e.sunDir).set('uMoonDisk', e.moonDir);
    p.set('uNight', e.night)
      .set('uGold', e.gold)
      .set('uCloud', e.cloud)
      .set('uWind', e.wind)
      .set('uRealm', e.realm || 0)
      .set('uWall', e.wall || 0)
      .set('uSky', e.sky || [0, 0])
      .set('uSkyTop', e.skyTop || [0.59, 0.7, 0.47]);
    p.set('uRockCol', e.rockCol).set('uLeafPal', this.leafPal).set('uPave', e.pave || 0);
    p.set('uLightPos', f.lightPos).set('uLightCol', f.lightCol).set('uLightCount', f.lightCount);
    p.set('uPencil', this.pencil).set('uPaperAnchor', this.paperAnchor);
    p.set('uPaperRight', pa.right).set('uPaperUp', pa.up).set('uPaperFwd', pa.forward);
    p.set('uPaperRightB', pb.right)
      .set('uPaperUpB', pb.up)
      .set('uPaperFwdB', pb.forward)
      .set('uPaperMix', this.paper.mix);
  }

  private holdPaper(cam: CameraLike, dt: number): void {
    const P = this.paper;
    const copy = (c: CameraLike): PaperBasis => ({
      right: [c.right[0], c.right[1], c.right[2]],
      up: [c.up[0], c.up[1], c.up[2]],
      forward: [c.forward[0], c.forward[1], c.forward[2]],
    });
    if (!P.a || !P.last) {
      P.a = copy(cam);
      P.last = [cam.forward[0], cam.forward[1], cam.forward[2]];
      return;
    }
    const dot = (u: readonly number[], v: readonly number[]): number =>
      u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const turn = (u: readonly number[], v: readonly number[]): number =>
      Math.acos(Math.min(1, Math.max(-1, dot(u, v))));
    const speed = turn(cam.forward, P.last) / Math.max(dt, 1e-4);
    P.last = [cam.forward[0], cam.forward[1], cam.forward[2]];
    P.still = speed < 0.03 ? P.still + dt : 0;
    if (P.b) {
      P.mix += dt / P.fade;
      if (P.mix >= 1) {
        P.a = P.b;
        P.b = null;
        P.mix = 0;
      }
      return;
    }
    const off = Math.max(turn(cam.forward, P.a.forward), turn(cam.right, P.a.right));
    if (off > PAPER_TURN) {
      const lead = Math.min(PAPER_TURN * 0.6, speed * 0.3);
      const k = off > 1e-4 ? lead / off : 0;
      const ahead: PaperBasis = {
        right: [0, 0, 0],
        up: [0, 0, 0],
        forward: [0, 0, 0],
      };
      for (const axis of ['right', 'forward'] as const) {
        let n = 0;
        for (let i = 0; i < 3; i++) {
          ahead[axis][i] = cam[axis][i] + (cam[axis][i] - P.a[axis][i]) * k;
          n += ahead[axis][i] ** 2;
        }
        n = Math.sqrt(n);
        for (let i = 0; i < 3; i++) ahead[axis][i] /= n;
      }
      const r = ahead.right;
      const f = ahead.forward;
      const d = dot(r, f);
      let n = 0;
      for (let i = 0; i < 3; i++) {
        r[i] -= f[i] * d;
        n += r[i] ** 2;
      }
      n = Math.sqrt(n);
      for (let i = 0; i < 3; i++) r[i] /= n;
      ahead.up = [
        r[1] * f[2] - r[2] * f[1],
        r[2] * f[0] - r[0] * f[2],
        r[0] * f[1] - r[1] * f[0],
      ];
      P.b = ahead;
      P.mix = 0;
      P.fade = 0.2;
    } else if (off > 0.012 && P.still > 0.3) {
      P.b = copy(cam);
      P.mix = 0;
      P.fade = 0.45;
    }
  }

  figure(spec: FigureRequest): Uint8Array {
    if (!this.figurePass || !this.noLights) {
      this.figurePass = new FigurePass(this.gl);
      this.noLights = {
        pos: new Float32Array(RENDER.MAX_LIGHTS * 4),
        col: new Float32Array(RENDER.MAX_LIGHTS * 3),
      };
    }
    const fp = this.figurePass;
    const c = spec.camera;
    const tan = cameraTan(c);
    const keepFrame = this.frame;
    const keepPencil = this.pencil;
    const keepAnchor = this.paperAnchor;
    const keepPaper = this.paper;
    fp.size(spec.width, spec.height);
    this.frame = {
      camera: c,
      env: spec.env,
      focus: [0, 0, 0],
      time: spec.time,
      timeTwos: Math.floor(spec.time * 12) / 12,
      far: 600,
      reveal: [0, 0, 0, 0],
      lightPos: this.noLights.pos,
      lightCol: this.noLights.col,
      lightCount: 0,
    };
    this.pencil = new Float32Array([
      (2 * tan[1]) / spec.height,
      4.6 * spec.dpr,
      Math.floor(spec.time * 6),
      spec.dpr,
    ]);
    this.paperAnchor = new Float32Array(3);
    this.paper = {
      a: { right: c.right, up: c.up, forward: c.forward },
      b: null,
      mix: 0,
      fade: 0,
      still: 0,
      last: null,
    };
    try {
      return fp.render(this.entityPass, this.frame, spec.batches, this.frameFn, this.vao);
    } finally {
      this.frame = keepFrame;
      this.pencil = keepPencil;
      this.paperAnchor = keepAnchor;
      this.paper = keepPaper;
    }
  }

  render(frame: RenderFrame): void {
    const gl = this.gl;
    const t = this.targets;
    const s = this.size;
    this.holdPaper(frame.camera, Math.max(0, frame.time - (this.lastTime ?? frame.time)));
    this.lastTime = frame.time;
    this.frame = frame;
    frame.dpr = s.dpr;
    const tan = cameraTan(frame.camera);
    this.pencil[0] = (2 * tan[1]) / s.height;
    this.pencil[1] = 4.6 * s.dpr;
    this.pencil[2] = Math.floor(frame.time * 6);
    this.pencil[3] = s.dpr;
    this.paperAnchor[0] = Math.floor(frame.focus[0] / 64) * 64;
    this.paperAnchor[2] = Math.floor(frame.focus[2] / 64) * 64;
    this.beginTiming();
    gl.bindVertexArray(this.vao);
    this.worldPass.render(t.scene, frame, this.worldTex, this.frameFn, this.quality);
    this.post.runInk(t, this.frameFn);
    this.entityPass.render(t.ent, frame, frame.batches, this.frameFn);
    this.fxPass.render(t.ent, frame, frame.fx.data, frame.fx.count, t.scene.textures[1]);
    gl.bindVertexArray(this.vao);
    this.post.runFinal(t, frame, s.width, s.height, this.minimap, this.frameFn);
    this.endTiming();
  }
}
