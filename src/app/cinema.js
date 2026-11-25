// The director: plays the sequences in content/cinematics.js. A sequence is
// data (shots, what the cast does, cues, lettering); this turns it into a camera
// on a rail, figures posed and moved, events on the bus, and a pace for the
// world to run at. Nothing in the rules knows a cinematic exists: the rules say
// what happened ('boss:arrive'), TRIGGERS says which sequence that starts, and
// while it plays the game loop asks here how fast the world may run and whether
// the hero's controls are held.
//
// What a sequence leaves behind is decided in one place, finish(): every cast
// member is put where its last instruction would have left it, whether the
// sequence ran to its end or was skipped in its first second. So skipping can
// never leave the game in a state watching would not have.
//
// The other job here is the stage: while something huge is alive on the hero's
// island, the play camera stands further back and aims higher (gfx/camera.js).

import { CINEMATICS, TRIGGERS, CLIPS } from '../content/cinematics.js';
import { makeEntity, pencils, yawFromDir } from '../sim/entities.js';
import { angleDelta, clamp, lerp, smoothstep } from '../core/math.js';

const RAD = Math.PI / 180;
const EASE = {
  linear: (k) => k,
  in: (k) => k * k,
  out: (k) => 1 - (1 - k) * (1 - k),
  inOut: (k) => k * k * (3 - 2 * k),
};
const SKIP_KEYS = ['Escape', 'Enter', 'Space'];
const SKIP_AFTER = 0.5;      // seconds before a sequence can be skipped: a key still held from play does not throw it away
const SKIP_FADE = 0.22;

export class Cinema {
  constructor(game) {
    this.game = game;
    this.now = null;          // the sequence playing
    this.queue = [];
    this.seen = {};           // sequences watched on this visit (a repeat plays its `again`)
    this.pace = 1;            // how fast the world runs this frame
    this.blocking = false;    // the hero's controls are held
    this.quiet = /[?&]nocine\b/.test(location.search);       // ?nocine: straight to play (tests, and anyone in a hurry)
    this.asked = false;       // the Skip button was pressed
    for (const t of TRIGGERS) {
      game.bus.on(t.on, (payload) => {
        if (this.quiet || (t.when && !t.when(payload, game))) return;
        this.play(t.play, t.cast ? t.cast(payload, game) : {}, t.key ? t.key(payload) : '');
      });
    }
  }

  get active() { return !!this.now && !this.now.leaving; }

  /** Starts a sequence (or lines it up behind the one playing). ctx: the cast and whatever its lettering names. */
  play(id, ctx = {}, key = '') {
    const tag = id + ':' + key;
    if (this.seen[tag] && CINEMATICS[id].again) id = CINEMATICS[id].again;
    this.seen[tag] = true;
    if (this.now && !this.now.leaving) { this.queue.push([id, ctx]); return; }
    const g = this.game, seq = CINEMATICS[id];
    const n = this.now = { id, seq, ctx: { hero: g.player, ...ctx }, t: 0, end: 0, shot: -1, shots: [], clips: [], cues: [], cards: [], own: [], caption: '', card: null, skipping: -1, leaving: false };
    // figures the sequence brings itself
    for (const c of seq.cast || []) {
      const e = g.entities.add(makeEntity('set', c.archetype, { ...c, colors: pencils(c.colors), far: true, grow: 0 }));
      n.ctx[c.as] = e; n.own.push(e);
    }
    // one timeline from the shots
    for (const s of seq.shots) {
      const shot = { ...s, t0: n.end, t1: n.end + s.for };
      n.shots.push(shot);
      for (const a of s.act || []) {
        const t0 = shot.t0 + (a.at || 0), instant = a.hide || a.show || a.face;
        n.clips.push({ ...a, t0, t1: instant ? t0 : t0 + (a.for ?? s.for - (a.at || 0)), begun: false, over: false });
      }
      for (const c of s.cues || []) n.cues.push({ ...c, t: shot.t0 + c.at, fired: false });
      if (s.card) { const t0 = shot.t0 + (s.card.at || 0); n.cards.push({ ...s.card, t0, t1: t0 + (s.card.for ?? s.for) }); }
      n.end = shot.t1;
    }
    this.blocking = seq.block !== false;
    this.pace = seq.world ?? 0;
    this.asked = false;
    if (this.blocking) {
      const p = g.player;
      p.intent.moveX = p.intent.moveZ = 0; p.moveTo = null; p.pursue = false;
      g.bus.emit('ui:close');
    }
    g.bus.emit('cine:begin', { id, bars: seq.bars !== false, skip: seq.skip !== false && this.blocking, blocking: this.blocking });
    this.advance(0);
  }

  /** The Skip button. */
  askSkip() { this.asked = true; }

  /** Once a frame, after the rules have run and before the camera is placed. */
  update(dt) {
    const g = this.game, look = g.look, n = this.now;
    this.frameStage();
    if (!n) { look.veil = Math.max(0, (look.veil || 0) - dt * 3.5); return; }
    if (n.leaving) {
      // the camera swings from where the last shot left it back to play
      n.out -= dt;
      look.veil = Math.max(0, (look.veil || 0) - dt * 3.5);
      if (n.out <= 0) { g.camera.rail = null; this.now = null; this.next(); }
      else g.camera.rail.mix = EASE.inOut(n.out / n.outFor);
      return;
    }
    if (n.skipping >= 0) {
      n.skipping += dt;
      look.veil = Math.min(1, n.skipping / SKIP_FADE);
      if (n.skipping >= SKIP_FADE) this.finish(true);
      return;
    }
    const can = n.seq.skip !== false && this.blocking && n.t > SKIP_AFTER;
    if (can && (this.asked || SKIP_KEYS.some((k) => g.input.hit(k)))) { n.skipping = 0; this.asked = false; return; }
    if (n.seq.skip === false || !this.blocking) this.asked = false;       // (a press too early is kept until it can count)
    this.advance(dt);
    if (n.t >= n.end) this.finish(false);
  }

  advance(dt) {
    const g = this.game, n = this.now, cam = g.camera;
    n.t += dt;
    const t = n.t;
    let i = n.shot < 0 ? 0 : n.shot;
    while (i < n.shots.length - 1 && t >= n.shots[i].t1) i++;
    const shot = n.shots[i], cut = i !== n.shot;
    n.shot = i;
    this.pace = shot.world ?? n.seq.world ?? 0;

    // ---- the cast
    for (const c of n.clips) {
      if (c.over || t < c.t0) continue;
      const e = this.who(c.who);
      if (!e) { c.over = true; continue; }
      if (!c.begun) { c.begun = true; this.begin(c, e); }
      const k = c.t1 > c.t0 ? clamp((t - c.t0) / (c.t1 - c.t0), 0, 1) : 1;
      this.pose(c, e, k, dt);
      if (t >= c.t1) { c.over = true; this.settle(c, e); }
    }
    // ---- cues
    for (const c of n.cues) {
      if (c.fired || t < c.t) continue;
      c.fired = true;
      if (c.shake) cam.shake = Math.min(1, cam.shake + c.shake);
      if (c.emit) { const a = c.on ? this.anchor(c.on) : null; g.bus.emit(c.emit, { ...c, ...(a ? { x: a.x, y: a.y, z: a.z, entity: a.entity } : null) }); }
    }
    // ---- lettering
    const card = n.cards.find((c) => t >= c.t0 && t < c.t1) || null;
    if (card !== n.card) { n.card = card; g.bus.emit('cine:card', card ? { kind: card.kind, title: this.words(card.title), sub: this.words(card.sub || '') } : null); }
    const caption = shot.caption || '';
    if (caption !== n.caption) { n.caption = caption; g.bus.emit('cine:caption', this.words(caption)); }

    // ---- the camera
    if (shot.cam) {
      const k = g.reducedMotion ? 1 : (EASE[shot.cam.ease] || EASE.inOut)(clamp((t - shot.t0) / shot.for, 0, 1));
      cam.rail = this.rail(shot.cam, k);
      if (cut) this.cut(cam.rail);
    } else if (cut) cam.rail = null;

    // ---- fades: in at the very start, and a dip to bare paper where a shot asks for one
    let veil = n.shot === 0 && n.seq.fadeIn ? 1 - clamp(t / n.seq.fadeIn, 0, 1) : 0;
    if (shot.dip) veil = Math.max(veil, smoothstep(shot.t1 - shot.dip, shot.t1, t));
    const before = n.shots[i - 1];
    if (before && before.dip) veil = Math.max(veil, 1 - smoothstep(shot.t0, shot.t0 + before.dip, t));
    g.look.veil = veil;
  }

  /** A cut: the page is laid afresh, and the ground round the new view is made ready. */
  cut(rail) {
    const g = this.game, r = g.renderer;
    if (r.paper) { r.paper.a = null; r.paper.b = null; r.paper.mix = 0; }
    const p = g.player;
    // the world's window follows the hero; a shot far from him looks from wherever the two are both in it
    const fx = clamp(rail.look[0], p.x - 70, p.x + 70), fz = clamp(rail.look[2], p.z - 70, p.z + 70);
    this.focus = [fx, fz];
    while (r.worldTex.update(fx, fz, 16) > 0);
  }

  // ---------------------------------------------------------------- the cast
  who(name) { return name === 'hero' ? this.game.player : this.now.ctx[name]; }

  begin(c, e) {
    const g = this.game;
    if (c.hide) { e.hidden = true; e.grow = 0; }
    if (c.show) { e.hidden = false; e.grow = 1; }
    if (c.face) { const a = this.anchor(c.face); e.yaw = yawFromDir(a.x - e.x, a.z - e.z); }
    if (c.walk) { e.x = c.walk.from[0]; e.z = c.walk.from[1]; e.y = g.world.surface(e.x, e.z); e.yaw = yawFromDir(c.walk.to[0] - e.x, c.walk.to[1] - e.z); }
    if (c.fly) { c.last = c.fly[0]; e.move = 1; }
  }

  /** k: how far through the instruction, 0..1. */
  pose(c, e, k, dt) {
    const g = this.game;
    if (c.clip) { e.action = CLIPS[c.clip]; e.actionT = k; e.actionDur = 1e3; }
    if (c.walk) {
      const { from, to } = c.walk, len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      // a walk starts and stops over half a second, in step all the way
      const span = c.t1 - c.t0, s = k * span, ramp = Math.min(0.5, span / 3);
      const u = (s < ramp ? s * s / (2 * ramp) : s > span - ramp ? span - ramp - (span - s) * (span - s) / (2 * ramp) : s - ramp / 2) / (span - ramp);
      const x = lerp(from[0], to[0], u), z = lerp(from[1], to[1], u);
      const moved = Math.hypot(x - e.x, z - e.z), pace = moved / Math.max(dt, 1e-4);
      e.x = x; e.z = z; e.y = g.world.surface(x, z);
      e.walk += moved * clamp(10.4 / Math.max(pace, 0.1), 1.9, 4.5);
      e.move = Math.min(1, (len / (span - ramp)) / 4.3) * Math.min(1, pace / 0.6 + 0.2);
    }
    if (c.fly) {
      const pt = spline(c.fly, EASE.inOut(k));
      const dx = pt[0] - c.last[0], dy = pt[1] - c.last[1], dz = pt[2] - c.last[2], run = Math.hypot(dx, dz);
      if (run > 1e-3) {
        const yaw = yawFromDir(dx, dz), turn = angleDelta(e.yaw, yaw);
        e.yaw += turn * Math.min(1, dt * 6 + (dt === 0 ? 1 : 0));
        e.walk = lerp(e.walk || 0, clamp(-turn * 2.2, -0.6, 0.6), Math.min(1, dt * 4));       // banks into its turns
        e.actionT = lerp(e.actionT || 0, clamp(Math.atan2(dy, run) * 0.4, -0.2, 0.2), Math.min(1, dt * 4));      // noses up and down with its path
      } else { e.walk = lerp(e.walk || 0, 0, Math.min(1, dt * 5)); e.actionT = lerp(e.actionT || 0, 0, Math.min(1, dt * 5)); }
      e.x = pt[0]; e.y = pt[1]; e.z = pt[2];
      e.move = c.land ? 1 - smoothstep(0.8, 1.0, k) : smoothstep(0, 0.12, k);        // skids down as it settles, up as it leaves
      c.last = pt;
    }
  }

  /** An instruction has run its length (or been skipped past): leave the figure as it would be left. */
  settle(c, e) {
    const g = this.game;
    if (c.clip) e.action = 0;
    if (c.walk) { e.x = c.walk.to[0]; e.z = c.walk.to[1]; e.y = g.world.surface(e.x, e.z); e.move = 0; }
    if (c.fly) { const pt = c.fly[c.fly.length - 1]; e.x = pt[0]; e.y = pt[1]; e.z = pt[2]; e.walk = 0; e.actionT = 0; if (c.land) e.move = 0; }
  }

  // ---------------------------------------------------------------- the camera
  /** Something to stand a camera on: { x, y (its feet), z, height, entity? } */
  anchor(a) {
    const g = this.game, w = g.world;
    if (Array.isArray(a)) return { x: a[0], y: a.length > 2 ? a[1] : w.surface(a[0], a[1]), z: a[a.length - 1], height: 1 };
    if (typeof a === 'string' && a.startsWith('room:')) {
      const want = a.slice(5), r = /^\d+$/.test(want) ? w.rooms[+want] : w.rooms.find((q) => q.kind === want);
      const room = r || w.rooms[w.rooms.length - 1];
      return { x: room.x, y: w.surface(room.x, room.z), z: room.z, height: 1 };
    }
    const e = this.who(a);
    return e ? { x: e.x, y: e.y, z: e.z, height: e.height * (e.scale || 1), entity: e } : { x: g.player.x, y: g.player.y, z: g.player.z, height: 1 };
  }

  rail(spec, k) {
    const on = this.anchor(spec.on), look = spec.look ? this.anchor(spec.look) : on;
    let base = 0;
    if (spec.axis === 'facing') base = on.entity ? -on.entity.yaw : 0;
    else if (spec.axis) { const ax = this.anchor(spec.axis); base = Math.atan2(ax.x - on.x, ax.z - on.z); }
    const u = spec.by ? this.anchor(spec.by).height : 1;
    const a = spec.from, b = spec.to || spec.from;
    const yaw = base + lerp(a.yaw, b.yaw, k), pitch = lerp(a.pitch, b.pitch, k), dist = lerp(a.dist, b.dist, k) * u;
    const up = lerp(a.up || 0, b.up || 0, k) * u, aim = lerp(a.aim ?? a.up ?? 0, b.aim ?? b.up ?? 0, k) * u;
    const cp = Math.cos(pitch);
    return {
      pos: [on.x + Math.sin(yaw) * cp * dist, on.y + up + Math.sin(pitch) * dist, on.z + Math.cos(yaw) * cp * dist],
      look: [look.x, look.y + aim, look.z],
      lens: lerp(a.lens || 34, b.lens || a.lens || 34, k) * RAD,
      mix: 1,
    };
  }

  /** '{boss.name}' -> the boss's name. */
  words(text) {
    const ctx = this.now.ctx;
    return String(text).replace(/\{([\w.]+)\}/g, (_, path) => {
      let v = ctx;
      for (const key of path.split('.')) v = v == null ? v : v[key];
      return v == null ? '' : v;
    });
  }

  // ---------------------------------------------------------------- the end
  finish(skipped) {
    const g = this.game, n = this.now, cam = g.camera, seq = n.seq, p = g.player;
    // everyone is left where their instructions lead, in order, whether or not they were seen
    for (const c of n.clips) {
      const e = this.who(c.who);
      if (!e || c.over) continue;
      if (!c.begun) this.begin(c, e);
      this.settle(c, e);
      c.over = true;
    }
    for (const e of n.own) e.gone = true;
    for (const e of g.entities.list) if (e.hidden) { e.hidden = false; e.grow = 1; }
    // where play picks up from
    if (seq.exit) {
      let yaw = null;
      if (seq.exit.behind) yaw = Math.PI - this.who(seq.exit.behind).yaw;
      else if (seq.exit.facing) { const a = this.anchor(seq.exit.facing); if (Math.hypot(a.x - p.x, a.z - p.z) > 0.5) yaw = Math.atan2(p.x - a.x, p.z - a.z); }
      if (yaw !== null) { cam.goal.yaw = cam.yaw = yaw; p.yaw = Math.PI - yaw; }
      if (seq.exit.pitch) cam.goal.pitch = cam.pitch = seq.exit.pitch;
    }
    cam.target = [p.x, p.y + 1, p.z];
    this.frameStage(true);
    this.blocking = false; this.pace = 1; this.focus = null;
    if (n.card) g.bus.emit('cine:card', null);
    if (n.caption) g.bus.emit('cine:caption', '');
    g.bus.emit('cine:end', { id: n.id, skipped });
    const out = skipped || g.reducedMotion || this.queue.length ? 0 : seq.out ?? 0.9;       // (no swing back to play if another sequence is waiting)
    if (out > 0 && cam.rail) { n.leaving = true; n.out = n.outFor = out; }
    else { cam.rail = null; this.now = null; this.next(); }
  }

  next() {
    const q = this.queue.shift();
    if (q) this.play(q[0], q[1]);
  }

  // ---------------------------------------------------------------- the stage
  /** Something huge alive on the hero's island: the play camera stands back and looks up. */
  frameStage(now = false) {
    const g = this.game, cam = g.camera, p = g.player;
    let lift = 0, pull = 1, wide = 0;
    for (const m of g.monsters) {
      if (!m.def.giant || m.dead || Math.hypot(m.x - p.x, m.z - p.z) > 60) continue;
      // far enough back to see the ground it is about to hit, a wider lens to get more of it in,
      // and the hero kept clear of the bottom of the picture
      lift = 1.1; pull = 2.3; wide = 10 * RAD;
    }
    cam.stage.lift = lift; cam.stage.pull = pull; cam.stage.wide = wide;
    if (now) { cam.lift = lift; cam.pull = pull; cam.wide = wide; }
  }
}

/** A point on the smooth path through `pts`, u in 0..1 (Catmull-Rom, evenly timed between points). */
function spline(pts, u) {
  const n = pts.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    out[k] = 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t);
  }
  return out;
}
