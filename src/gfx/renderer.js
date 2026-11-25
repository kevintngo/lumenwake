// Frame orchestration. The renderer owns the GL context, the render targets and
// the passes, and turns one "frame description" from the game into a picture:
//
//   world (raymarch, internal res)  what is where: pencil, lay, shade, pen marks
//   ink                            the contours
//   entities + effects (device res, own layer, already drawn)
//   final                          draws it all on the paper in pencil and pen
//
// It knows nothing about gameplay; the game knows nothing about GL.

import { RENDER } from '../config.js';
import { clamp } from '../core/math.js';

const PAPER_TURN = 0.3;      // radians the view may turn before the hatching is laid afresh (about 17 degrees)
import { LEAF_PALETTE } from '../content/themes.js';
import { createContext, Target } from './gl.js';
import './glsl/common.js';
import { WorldTextures } from './worldTextures.js';
import { WorldPass } from './passes/world.js';
import { EntityPass, ARCHETYPES } from './passes/entities.js';
import { FxPass } from './passes/fx.js';
import { PostChain } from './passes/post.js';
import { Minimap } from './passes/minimap.js';
import { FigurePass } from './passes/figure.js';
import './archetypes/humanoid.js';
import './archetypes/critters.js';
import './archetypes/craft.js';
import './archetypes/colossi.js';
import './archetypes/elders.js';
import './archetypes/wilds.js';
import './archetypes/lumen.js';
import './archetypes/gear.js';

export class Renderer {
  /** opts.lite: start on the lighter settings (phones and tablets). */
  constructor(canvas, world, opts = {}) {
    this.canvas = canvas;
    const { gl } = createContext(canvas);
    this.gl = gl;
    this.worldTex = new WorldTextures(gl, world);
    this.minimap = new Minimap(this.worldTex);
    this.worldPass = new WorldPass(gl);
    this.quality = opts.lite ? 'low' : 'high';
    this.worldPass.program(this.quality);
    this.toWarm = null;
    this.entityPass = new EntityPass(gl);
    this.fxPass = new FxPass(gl);
    this.post = new PostChain(gl);
    this.targets = {
      scene: new Target(gl, [{}, { filter: 'nearest', precise: true }, {}, { filter: 'nearest', precise: true }]),   // lay, gbuf, mark, sheet
      edge: new Target(gl, [{}]),
      ent: new Target(gl, [{}, { filter: 'nearest' }], true),
    };
    this.vao = gl.createVertexArray(); // attribute-less; full-screen passes use gl_VertexID
    this.leafPal = new Float32Array(LEAF_PALETTE.flat());
    this.pencil = new Float32Array(4);
    this.paperAnchor = new Float32Array(3);
    // The paper direction: the view direction the hatching is laid against. It is held while
    // the camera turns and replaced, through a short fade, by a fresh one (see holdPaper).
    this.paper = { a: null, b: null, mix: 0, fade: 0, still: 0, last: null };
    this.scale = opts.lite ? RENDER.SCALE_LITE : RENDER.SCALE_START;
    this.perf = { ema: 16.7, gpu: 0, timer: 0, calm: 0, futile: 0, lastDown: 0, hold: 0 };
    this.gpuTimer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.query = null;
    this.timing = false;
    this.size = { cssW: 1, cssH: 1, dpr: 1, width: 1, height: 1 };
    this.frameFn = (p) => this.applyFrame(p);
  }

  resize(cssW, cssH, dpr) {
    const s = this.size;
    s.cssW = cssW; s.cssH = cssH; s.dpr = dpr;
    s.width = Math.round(cssW * dpr); s.height = Math.round(cssH * dpr);
    if (this.canvas.width !== s.width || this.canvas.height !== s.height) {
      this.canvas.width = s.width; this.canvas.height = s.height;
    }
    const iw = Math.round(cssW * this.scale), ih = Math.round(cssH * this.scale);
    this.targets.scene.resize(iw, ih);
    this.targets.edge.resize(iw, ih);
    const edpr = Math.min(dpr, RENDER.ENTITY_DPR_MAX);
    this.targets.ent.resize(Math.round(cssW * edpr), Math.round(cssH * edpr));
  }

  setWorld(world) { this.worldTex.setWorld(world); }

  /**
   * Nudges the world pass's resolution to hold the frame rate; the pencil
   * strokes are drawn afterwards at full resolution, so the change barely shows. Uses measured GPU time when the browser exposes it, so a
   * throttled or hidden tab (slow frames, idle GPU) never drags quality down.
   */
  adapt(dtMs) {
    const p = this.perf;
    if (dtMs > 100) return; // tab was hidden or a chunk hitch: not a GPU signal
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
      // No GPU timer: fall back to frame intervals, but stop if lowering resolution
      // is not what speeds things up (a 30 Hz display, a throttled tab).
      if (p.lastDown && p.lastDown - p.ema < 1) { if (++p.futile >= 2) { next = RENDER.SCALE_START; p.hold = 30; } }
      else { p.futile = 0; next -= 0.06; }
      p.lastDown = p.ema;
    } else if (p.ema < 17.6 && ++p.calm >= 5) { next += 0.05; p.calm = 0; p.lastDown = 0; }
    if (p.hold > 0) { p.hold--; next = this.scale; }
    next = clamp(next, RENDER.SCALE_MIN, RENDER.SCALE_MAX);
    if (Math.abs(next - this.scale) > 0.001) {
      this.scale = next;
      this.resize(this.size.cssW, this.size.cssH, this.size.dpr);
    }
  }

  /** Compiles one not-yet-built program per call, so first sightings never hitch. True when done. */
  warm() {
    if (!this.toWarm) this.toWarm = [...ARCHETYPES.keys()];
    const id = this.toWarm.pop();
    if (id) this.entityPass.program(id);
    else this.fxPass.program();
    return !this.toWarm.length && !id;
  }

  /** Wraps a frame in a GPU timer query; results arrive a few frames later. */
  beginTiming() {
    const gl = this.gl, ext = this.gpuTimer;
    if (!ext) return;
    if (this.query) {
      if (!gl.getQueryParameter(this.query, gl.QUERY_RESULT_AVAILABLE)) return;
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) {
        const ms = gl.getQueryParameter(this.query, gl.QUERY_RESULT) / 1e6;
        this.perf.gpu += (ms - this.perf.gpu) * (this.perf.gpu ? 0.15 : 1);
      }
      gl.deleteQuery(this.query);
      this.query = null;
    }
    this.query = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, this.query);
    this.timing = true;
  }
  endTiming() {
    if (!this.timing) return;
    this.gl.endQuery(this.gpuTimer.TIME_ELAPSED_EXT);
    this.timing = false;
  }

  applyFrame(p) {
    const f = this.frame, c = f.camera, e = f.env;
    p.set('uCamPos', c.pos).set('uCamRight', c.right).set('uCamUp', c.up).set('uCamFwd', c.fwd).set('uTanFov', c.tan);
    p.set('uFocus', f.focus).set('uTime', f.time).set('uReveal', f.reveal);
    p.set('uSunDir', e.keyDir).set('uSunDisk', e.sunDir).set('uMoonDisk', e.moonDir);
    p.set('uNight', e.night).set('uGold', e.gold).set('uCloud', e.cloud).set('uWind', e.wind).set('uRealm', e.realm || 0).set('uWall', e.wall || 0);
    p.set('uRockCol', e.rockCol).set('uLeafPal', this.leafPal).set('uPave', e.pave || 0);
    p.set('uLightPos', f.lightPos).set('uLightCol', f.lightCol).set('uLightCount', f.lightCount);
    p.set('uPencil', this.pencil).set('uPaperAnchor', this.paperAnchor);
    const pa = this.paper.a, pb = this.paper.b || this.paper.a;
    p.set('uPaperRight', pa.right).set('uPaperUp', pa.up).set('uPaperFwd', pa.fwd);
    p.set('uPaperRightB', pb.right).set('uPaperUpB', pb.up).set('uPaperFwdB', pb.fwd).set('uPaperMix', this.paper.mix);
  }

  /**
   * Keeps the hatching still on the world while the view turns. Strokes are laid against a
   * held copy of the camera's axes; turning the camera leaves that copy alone, so nothing
   * swims. Once the view has turned PAPER_TURN away from it, or has rested a moment a little
   * off it, a fresh copy fades in over a fraction of a second. While turning, the fresh copy
   * is taken a little ahead of the camera, so the view passes through it rather than leaving
   * it behind at once.
   */
  holdPaper(cam, dt) {
    const P = this.paper;
    const copy = (c) => ({ right: [...c.right], up: [...c.up], fwd: [...c.fwd] });
    if (!P.a) { P.a = copy(cam); P.last = [...cam.fwd]; return; }
    const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const turn = (u, v) => Math.acos(Math.min(1, Math.max(-1, dot(u, v))));
    const speed = turn(cam.fwd, P.last) / Math.max(dt, 1e-4);        // radians a second
    P.last = [...cam.fwd];
    P.still = speed < 0.03 ? P.still + dt : 0;
    if (P.b) {
      P.mix += dt / P.fade;
      if (P.mix >= 1) { P.a = P.b; P.b = null; P.mix = 0; }
      return;
    }
    const off = Math.max(turn(cam.fwd, P.a.fwd), turn(cam.right, P.a.right));
    if (off > PAPER_TURN) {
      // ahead of the turn: where the camera will be a little after the fade
      const lead = Math.min(PAPER_TURN * 0.6, speed * 0.3);
      const k = off > 1e-4 ? lead / off : 0;
      const ahead = { right: [0, 0, 0], up: [0, 0, 0], fwd: [0, 0, 0] };
      for (const axis of ['right', 'fwd']) {
        let n = 0;
        for (let i = 0; i < 3; i++) { ahead[axis][i] = cam[axis][i] + (cam[axis][i] - P.a[axis][i]) * k; n += ahead[axis][i] ** 2; }
        n = Math.sqrt(n);
        for (let i = 0; i < 3; i++) ahead[axis][i] /= n;
      }
      // square the three axes up again
      const r = ahead.right, f = ahead.fwd, d = dot(r, f);
      let n = 0;
      for (let i = 0; i < 3; i++) { r[i] -= f[i] * d; n += r[i] ** 2; }
      n = Math.sqrt(n);
      for (let i = 0; i < 3; i++) r[i] /= n;
      ahead.up = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      P.b = ahead; P.mix = 0; P.fade = 0.2;
    } else if (off > 0.012 && P.still > 0.3) {
      P.b = copy(cam); P.mix = 0; P.fade = 0.45;                   // at rest: settle onto the page's exact slant
    }
  }

  /**
   * Figures alone on nothing, seen by a camera of their own: the hero turning in the menu, a lumen, the
   * drawing on a gear tile. Nothing of the frame the player sees is disturbed.
   * spec: { width, height (pixels), dpr, camera, env, time, batches }. Returns the picture's bytes
   * (RGBA, straight alpha, top row first), which are this pass's own: copy them before the next call.
   */
  figure(spec) {
    if (!this.figurePass) {
      this.figurePass = new FigurePass(this.gl);
      this.noLights = { pos: new Float32Array(RENDER.MAX_LIGHTS * 4), col: new Float32Array(RENDER.MAX_LIGHTS * 3) };
    }
    const fp = this.figurePass, c = spec.camera;
    const keep = { frame: this.frame, pencil: this.pencil, paperAnchor: this.paperAnchor, paper: this.paper };
    fp.size(spec.width, spec.height);
    this.frame = {
      camera: c, env: spec.env, focus: [0, 0, 0], time: spec.time, timeTwos: Math.floor(spec.time * 12) / 12, far: 600,
      reveal: [0, 0, 0, 0], lightPos: this.noLights.pos, lightCol: this.noLights.col, lightCount: 0,
    };
    this.pencil = new Float32Array([2 * c.tan[1] / spec.height, 4.6 * spec.dpr, Math.floor(spec.time * 6), spec.dpr]);
    this.paperAnchor = new Float32Array(3);
    this.paper = { a: { right: c.right, up: c.up, fwd: c.fwd }, b: null, mix: 0 };
    try { return fp.render(this.entityPass, this.frame, spec.batches, this.frameFn, this.vao); }
    finally { Object.assign(this, keep); }
  }

  /**
   * frame: { camera, env, focus[3], time, timeTwos, dpr, far, look{}, reveal, casters, casterCount,
   *          lightPos, lightCol, lightCount, batches: Map, fx: { data, count } }
   */
  render(frame) {
    const gl = this.gl, t = this.targets, s = this.size;
    this.holdPaper(frame.camera, Math.max(0, frame.time - (this.lastTime ?? frame.time)));
    this.lastTime = frame.time;
    this.frame = frame;
    frame.dpr = s.dpr;
    // the pencil: a pixel's world size per unit of depth, stroke pitch in pixels, boil seed, device pixel ratio
    this.pencil[0] = 2 * frame.camera.tan[1] / s.height;
    this.pencil[1] = 4.6 * s.dpr;
    this.pencil[2] = Math.floor(frame.time * 6);
    this.pencil[3] = s.dpr;
    // paper coordinates are measured from a point near the player, so the numbers stay small
    this.paperAnchor[0] = Math.floor(frame.focus[0] / 64) * 64;
    this.paperAnchor[2] = Math.floor(frame.focus[2] / 64) * 64;
    this.beginTiming();
    gl.bindVertexArray(this.vao);
    this.worldPass.render(t.scene, frame, this.worldTex, this.frameFn, this.quality);
    this.post.runInk(t, frame, this.frameFn);
    this.entityPass.render(t.ent, frame, frame.batches, this.frameFn);
    this.fxPass.render(t.ent, frame, frame.fx.data, frame.fx.count, t.scene.textures[1]);
    gl.bindVertexArray(this.vao);
    this.post.runFinal(t, frame, s.width, s.height, this.minimap, this.frameFn);
    this.endTiming();
  }
}
