// The hero's own likeness, drawn by the game: three kinds of picture.
//
//   the bust     head and shoulders, for the plate in the corner. Whenever who the hero is, or what is in their
//                hand, changes, one frame is taken of the hero alone on a clean sheet. The clean sheet is the
//                sky: the hero is stood high in overcast (cloud is bare paper) straight above where they are,
//                and seen from a little below, so no ground and no horizon is in the frame. Everything touched
//                is put back before the frame the player sees is drawn.
//   a stage      a figure alive on nothing, in the menu: the hero, or their lumen. It breathes, it turns when
//                dragged, and where it is not, the picture is clear, so it stands on the menu itself. The page
//                gives a <canvas>; `mount` takes it, and from then on it is drawn afresh twelve times a second.
//   gear         a drawing of every piece of gear for the interface's tiles, made from the very shapes the hero
//                carries and wears (gfx/archetypes/gear.js), in the hero's own colours.

import { Camera } from '../gfx/camera.js';
import { INSTANCE_FLOATS } from '../gfx/passes/entities.js';
import { BASES } from '../content/gear.js';
import { FAMILIES } from '../content/classes.js';

const RAD = Math.PI / 180;
const UP = 15.5 * RAD;          // how far below the figure the camera stands

const TURN = 0.012;            // radians a figure turns for each pixel it is dragged
const STAGE_LENS = 13 * RAD, STAGE_PITCH = 8 * RAD;       // a long lens, from a little above

/** One figure, packed the way the entity pass reads it (as app/view.js packs them). */
function pack(o) {
  const d = new Float32Array(INSTANCE_FLOATS), c = o.colors;
  d[1] = o.y || 0; d[3] = o.scale || 1;
  d[4] = o.yaw || 0; d[6] = o.action || 0; d[7] = o.actionT || 0;
  d[8] = o.seed || 0; d[10] = 1;
  d.set(c[0], 12); d[15] = o.move || 0;
  d.set(c[1], 16); d[19] = o.extra || 0;
  d.set(c[2], 20); d[23] = o.kit || 0;
  return d;
}

/** Stands a camera off a figure at the origin so that `tall` by `wide` of it is in the picture. Returns how wide the picture is, in the world. */
function stand(cam, aspect, tall, wide, mid, lens, pitch) {
  const half = Math.max(tall / 2, wide / 2 / aspect), D = half / Math.tan(lens / 2) * 1.03;
  cam.rail = { pos: [0, mid + Math.sin(pitch) * D, Math.cos(pitch) * D], look: [0, mid, 0], lens, mix: 1 };
  cam.update(0, [0, mid, 0], aspect, null);
  return 2 * D * Math.tan(lens / 2) * aspect;
}

// The gear tiles: [base, the piece's number in gfx/archetypes/gear.js, how much of the world its tile shows, how it is turned]
const kitOf = (b) => FAMILIES[b.family].kit;
const PIECE = (b) => (b.slot === 'weapon' ? kitOf(b) * 2 + (b.look || 0) : b.slot === 'frame' ? 6 + (b.look || 0) : 7 + (b.look || 1));
const SPAN = { saber: 1.0, glaive: 1.06, rifle: 0.84, carbine: 0.96, rod: 1.14, prism: 1.3, scout: 0.8, bulwark: 0.9, core: 0.36, drive: 0.42 };

export class Portraits {
  constructor(game) {
    this.game = game;
    this.due = true;
    this.bust = '';
    this.stages = {};            // by what stands on them: 'hero', 'lumen'
    this.gear = {};              // base id -> a picture of it (a data URL)
    this.gearDue = false;
    this.last = 0;
    for (const ev of ['people', 'class', 'equip']) game.bus.on(ev, () => { this.due = true; });
    for (const ev of ['begin', 'people', 'class']) game.bus.on(ev, () => { this.gearDue = true; });
  }

  /** Once a frame, before the frame the player sees is drawn. */
  update() {
    if (document.hidden) return;
    const g = this.game;
    if (this.due) {
      this.due = false;
      try { this.take(); } catch (err) { console.warn('Portrait not taken:', err); }
    }
    if (this.gearDue && g.started) {
      this.gearDue = false;
      try { this.drawGear(); } catch (err) { console.warn('Gear not drawn:', err); }
    }
    const now = performance.now() / 1000, dt = Math.min(0.1, now - (this.last || now));
    this.last = now;
    for (const what in this.stages) {
      const st = this.stages[what];
      if (!st.canvas || !st.canvas.isConnected) { st.canvas = null; continue; }
      // let go while turning, it runs on a little
      if (!st.drag && Math.abs(st.spin) > 0.05) { st.yaw += st.spin * dt; st.spin *= Math.exp(-5 * dt); st.dirty = true; }
      const tick = g.reducedMotion ? 0 : Math.floor(now * 12);       // posed on twos, like every figure
      if (!st.dirty && tick === st.tick) continue;
      st.tick = tick;
      try { this.show(st, g.reducedMotion ? 0 : now); } catch (err) { console.warn('Stage not drawn:', err); st.canvas = null; }
    }
  }

  // ---------------------------------------------------------------- a stage: a figure alive on nothing
  /** Who stands on a stage, as the entity pass needs them, and how much room they take. */
  subject(what) {
    const g = this.game, p = g.player;
    if (what === 'lumen') {
      const e = g.companion && g.companion.e, l = p.sheet.lumen;
      if (!e) return null;
      return { archetype: 'lumen', scale: 1, seed: e.seed, colors: e.colors, extra: e.extra, kit: 0, move: (l.charge || 0) / 100, tall: 0.84, wide: 0.92, mid: 0.02, floor: -0.36, ring: 0.3 };
    }
    // the hero, at ease (the people's own sitting pose), holding and wearing what is equipped
    const kit = Math.floor(p.kit + 0.01) + (((p.kit + 0.01) % 1) >= 0.5 ? 0.5 : 0);
    return { archetype: p.archetype, scale: p.scale, seed: p.seed, colors: p.colors, extra: p.extra, kit, action: 7, tall: 2.06 * p.scale, wide: 1.6 * p.scale, mid: 0.93 * p.scale, floor: 0, ring: 0.62 * p.scale };
  }

  /** The page hands over a box (with a canvas in it) for a figure to stand in. The figure keeps the way it was last turned. */
  mount(box, what) {
    const st = this.stages[what] || (this.stages[what] = { what, yaw: what === 'lumen' ? 0.3 : -0.5, spin: 0, drag: null, tick: -1, cam: new Camera() });
    if (st.box === box) return;
    st.box = box; st.canvas = box.querySelector('canvas'); st.drag = null; st.dirty = true;
    box.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      st.drag = { x: e.clientX, t: performance.now() }; st.spin = 0;
      box.setPointerCapture(e.pointerId);
      box.classList.add('held');
    });
    box.addEventListener('pointermove', (e) => {
      if (!st.drag) return;
      const dx = e.clientX - st.drag.x, now = performance.now(), dt = Math.max(8, now - st.drag.t) / 1000;
      st.drag.x = e.clientX; st.drag.t = now;
      st.yaw -= dx * TURN; st.spin = -dx * TURN / dt * 0.6; st.dirty = true;          // (dragged right, its front comes round to the right)
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) box.addEventListener(ev, () => { st.drag = null; box.classList.remove('held'); });
    try { this.show(st, this.game.reducedMotion ? 0 : performance.now() / 1000); } catch (err) { console.warn('Stage not drawn:', err); }
  }

  /** Turns whoever stands in this box (the keys, for those who do not drag). */
  turn(box, by) {
    for (const what in this.stages) if (this.stages[what].box === box) { this.stages[what].yaw -= by; this.stages[what].spin = 0; this.stages[what].dirty = true; }
  }

  show(st, time) {
    const g = this.game, cv = st.canvas, sub = this.subject(st.what);
    const box = cv.getBoundingClientRect();
    if (!sub || box.width < 8 || box.height < 8) return;
    const dpr = Math.min(window.devicePixelRatio || 1, g.renderer.quality === 'low' ? 1.5 : 2);
    const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const across = stand(st.cam, w / h, sub.tall, sub.wide, sub.mid, STAGE_LENS, STAGE_PITCH);
    const bytes = g.renderer.figure({
      width: w, height: h, dpr, camera: st.cam, env: this.daylight(), time,
      batches: new Map([[sub.archetype, { data: pack({ ...sub, yaw: st.yaw }), count: 1 }]]),
    });
    cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, w * h * 4), w, h), 0, 0);
    st.dirty = false;
    // where its feet are and how wide a ring round them is: the page draws the floor it stands on
    // (the canvas is wider than the box: the ring's width is given as a share of the box)
    const feet = st.cam.project(0, sub.floor, 0), wide = st.box.getBoundingClientRect().width || box.width;
    if (feet) {
      st.box.style.setProperty('--feet', (feet.y * 100).toFixed(1) + '%');
      st.box.style.setProperty('--floor', (sub.ring * 2 / across * box.width / wide * 100).toFixed(1) + '%');
    }
  }

  /** The light figures are drawn by when they stand alone: plain day, whatever the hour is outside. */
  daylight() { return { ...this.game.env, night: 0, gold: 0 }; }

  // ---------------------------------------------------------------- the gear tiles
  drawGear() {
    const g = this.game, p = g.player, size = 144;
    const cam = this.gearCam || (this.gearCam = new Camera());
    const sheet = this.gearSheet || (this.gearSheet = Object.assign(document.createElement('canvas'), { width: size, height: size }));
    const ctx = sheet.getContext('2d'), env = this.daylight(), people = p.build ?? Math.round(p.extra);
    for (const id in BASES) {
      const b = BASES[id];
      stand(cam, 1, SPAN[id] || 1, SPAN[id] || 1, 0, 12 * RAD, 0);
      const fig = { archetype: 'gear', scale: 1, seed: 0.37, colors: p.colors, extra: PIECE(b), kit: people, yaw: b.slot === 'weapon' ? 0 : b.slot === 'frame' ? 0.5 : 0.45 };
      const bytes = g.renderer.figure({ width: size, height: size, dpr: 1.2, camera: cam, env, time: 0, batches: new Map([['gear', { data: pack(fig), count: 1 }]]) });
      ctx.putImageData(new ImageData(new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, size * size * 4), size, size), 0, 0);
      this.gear[id] = sheet.toDataURL('image/png');
    }
    g.bus.emit('portrait', { bust: this.bust, gear: this.gear });
  }

  take() {
    const g = this.game, r = g.renderer, cam = g.camera, p = g.player, view = g.view;
    const size = { ...r.size }, scale = r.scale, paper = { ...r.paper }, map = [...r.minimap.rect];
    const keep = { y: p.y, yaw: p.yaw, lift: p.lift, action: p.action, actionT: p.actionT, move: p.move, walk: p.walk, grow: p.grow, pose: p.pose, flash: p.flash, shade: p.shade };
    const was = { rail: cam.rail, shake: cam.shake, cloud: g.env.cloud, fade: g.look.fade, veil: g.look.veil, hurt: g.look.hurt };
    // the sitter: at ease, facing north (the ringed world hangs in the north-west, so the camera looks the other way)
    Object.assign(p, { y: p.y + 70, yaw: Math.PI, lift: 0, action: 0, actionT: 0, move: 0, walk: 0, grow: 1, pose: undefined, flash: 0, shade: 1 });
    view.only = p;
    g.env.cloud = 1.7; g.look.fade = 1; g.look.veil = 0; g.look.hurt = 0; cam.shake = 0;
    r.scale = 1.4;
    r.minimap.rect = [0, 0, 0, 0];
    const tall = p.height * 1.02 / 1.6 * 1.95;         // a little more than head to foot
    const shot = (w, h, fit, mid, lens, turn) => {
      const D = (fit / 2) / Math.tan(lens * RAD / 2) * 1.04, t = turn + Math.PI, cy = p.y + tall * mid;
      r.resize(w, h, 2);
      r.paper.a = null; r.paper.b = null; r.paper.mix = 0;
      cam.rail = { pos: [p.x + Math.sin(t) * Math.cos(UP) * D, cy - Math.sin(UP) * D, p.z + Math.cos(t) * Math.cos(UP) * D], look: [p.x, cy, p.z], lens: lens * RAD, mix: 1 };
      cam.update(0, [p.x, p.y + 1, p.z], w / h, null);
      r.render(view.build(g.time));
      return g.canvas.toDataURL('image/webp', 0.9);
    };
    this.bust = shot(176, 176, tall * 0.5, 0.62, 9, 0.4);
    // ... and everything back as it was
    Object.assign(p, keep);
    view.only = null;
    Object.assign(cam, { rail: was.rail, shake: was.shake });
    g.env.cloud = was.cloud; g.look.fade = was.fade; g.look.veil = was.veil; g.look.hurt = was.hurt;
    r.scale = scale;
    Object.assign(r.paper, paper);
    r.minimap.rect = map;
    r.resize(size.cssW, size.cssH, size.dpr);
    g.bus.emit('portrait', { bust: this.bust });
  }
}
