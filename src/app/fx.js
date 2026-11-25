// Effects: a pooled particle system plus the recipes that turn game events
// into bursts of particles. Gameplay never spawns particles itself; it emits an
// event ("damage", "levelup") and the recipes here decide what that looks like.

import { fxType, FX_FLOATS } from '../gfx/passes/fx.js';

const MAX = 700;
// pencils (0..1), from the same box as everything else
const C = (r, g, b) => [r / 255, g / 255, b / 255];
const GOLD = C(244, 190, 62), WHITE = C(232, 226, 212), DUST = C(226, 188, 130), SKY = C(136, 180, 216);
const LEAFY = C(116, 168, 90), RED = C(214, 70, 52), FLAME = C(240, 158, 74), MUSTARD = C(226, 176, 52);

export class Fx {
  constructor(game) {
    this.game = game;
    this.data = new Float32Array(MAX * FX_FLOATS);
    this.count = 0;
    this.pool = [];
    this.live = [];
    this.lights = [];      // short-lived point lights { x, y, z, r, color, life }
    this.ambientTimer = 0;
    this.emitters = [];    // things that keep throwing off particles for a while: { left, every, next, fn }
    this.T = Object.fromEntries(['mote', 'leaf', 'spark', 'burst', 'slash', 'ring', 'halo', 'orb', 'puff', 'heal', 'mark', 'click', 'beam', 'ripple', 'zone', 'lane', 'cloud'].map((id) => [id, fxType(id)]));
    this.wire(game.bus);
  }

  /** Low-level spawn. o: { size, life, color, alpha, vx, vy, vz, grow, gravity, drag, rot, spin, ground (laid on the ground), flat (level, in the air), aspect, follow, dy } */
  spawn(type, x, y, z, o = {}) {
    if (this.live.length >= MAX) return null;
    const p = this.pool.pop() || {};
    p.type = this.T[type]; p.x = x; p.y = y; p.z = z;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.size = o.size ?? 0.3; p.grow = o.grow || 0;
    p.life = 0; p.max = o.life ?? 0.5;
    p.color = o.color || WHITE; p.alpha = o.alpha ?? 1;
    p.gravity = o.gravity || 0; p.drag = o.drag || 0;
    p.rot = o.rot || 0; p.spin = o.spin || 0;
    p.ground = o.flat ? 2 : o.ground ? 1 : 0; p.aspect = o.aspect || 1;
    p.follow = o.follow || null; p.dy = o.dy || 0; p.hold = o.hold || false; p.trail = !!o.trail;
    p.seed = Math.random(); p.sway = o.sway || 0;
    this.live.push(p);
    return p;
  }

  /** Everything goes at once: the hero has left for another place. */
  clear() { for (const p of this.live) this.pool.push(p); this.live.length = 0; this.lights.length = 0; this.emitters.length = 0; }

  /** Calls fn every `every` seconds for `seconds`. */
  emit(seconds, every, fn) { this.emitters.push({ left: seconds, every, next: 0, fn }); }

  /** Shakes the camera by how near the hero is to (x, z): all of `amount` beside it, none beyond `range`. */
  shakeNear(x, z, amount, range = 45) {
    const g = this.game, p = g.player, k = Math.max(0, 1 - Math.hypot(p.x - x, p.z - z) / range);
    g.camera.shake = Math.min(1, g.camera.shake + amount * k);
  }

  /** Dust thrown up round a patch of ground `r` across: what something huge does when it moves. */
  heave(x, y, z, r, n = 10, color = DUST) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, d = r * (0.55 + Math.random() * 0.55), s = 0.6 + Math.random() * 1.6;
      this.spawn('puff', x + Math.cos(a) * d, y + 0.2 + Math.random() * 0.6, z + Math.sin(a) * d, {
        size: 0.5 + Math.random() * 0.7, grow: 1.3, life: 0.9 + Math.random() * 0.6, color, alpha: 0.7,
        vx: Math.cos(a) * s, vy: 0.8 + Math.random() * 1.8, vz: Math.sin(a) * s, drag: 1.6,
      });
    }
  }

  /** A brief pool of light: by night, paper showing through the dark lay. */
  light(x, y, z, r, life = 0.25) {
    this.lights.push({ x, y, z, r, life, max: life });
  }

  update(dt) {
    const live = this.live;
    let w = 0;
    for (let i = 0; i < live.length; i++) {
      const p = live[i];
      if (!p.hold) p.life += dt / p.max;
      if (p.life >= 1 || (p.follow && p.follow.gone)) { this.pool.push(p); continue; }
      if (p.follow) {
        p.x = p.follow.x; p.y = p.follow.y + p.dy; p.z = p.follow.z;
        // a shot in flight sheds sparks and carries its own light
        if (p.trail) { if (Math.random() < 0.7) this.spawn('spark', p.x, p.y, p.z, { size: 0.16, life: 0.25, color: p.color, vy: 0.8 }); this.light(p.x, p.y, p.z, 5, 0.05); }
      }
      else {
        p.vy -= p.gravity * dt;
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
        p.x += (p.vx + Math.sin(p.life * 9 + p.seed * 30) * p.sway) * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
      p.size += p.grow * dt; p.rot += p.spin * dt;
      live[w++] = p;
    }
    live.length = w;
    if (this.emitters.length) {
      for (const e of this.emitters) { e.left -= dt; e.next -= dt; if (e.next <= 0) { e.next = e.every; e.fn(); } }
      this.emitters = this.emitters.filter((e) => e.left > 0);
    }
    let lw = 0;
    for (const l of this.lights) { l.life -= dt; if (l.life > 0) this.lights[lw++] = l; }
    this.lights.length = lw;
    this.ambient(dt);
    this.pads(dt);
  }

  /** Packs live particles for the FX pass. */
  write() {
    const d = this.data, live = this.live;
    for (let i = 0; i < live.length; i++) {
      const p = live[i], o = i * FX_FLOATS;
      d[o] = p.x; d[o + 1] = p.y; d[o + 2] = p.z; d[o + 3] = p.size;
      d[o + 4] = p.type; d[o + 5] = p.life; d[o + 6] = p.seed; d[o + 7] = p.rot;
      d[o + 8] = p.color[0]; d[o + 9] = p.color[1]; d[o + 10] = p.color[2]; d[o + 11] = p.alpha;
      d[o + 12] = p.ground; d[o + 13] = p.aspect; d[o + 14] = p.hold ? 0 : p.max; d[o + 15] = 0;
    }
    this.count = live.length;
  }

  // ---------------------------------------------------------------- recipes
  hit(x, y, z, color = WHITE, big = false) {
    this.spawn('burst', x, y, z, { size: big ? 1.1 : 0.7, life: 0.22, color, rot: Math.random() * 6 });
    const n = big ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = 2.5 + Math.random() * 3.5;
      this.spawn('spark', x, y, z, { size: 0.16 + Math.random() * 0.14, life: 0.25 + Math.random() * 0.2, color, vx: Math.cos(a) * s, vy: 1 + Math.random() * 3, vz: Math.sin(a) * s, gravity: 9, drag: 2, rot: a });
    }
    this.light(x, y, z, big ? 5 : 3.5, 0.14);
  }
  slash(e, radius, color = WHITE) {
    // ground-aligned quad whose +y is the entity's facing
    this.spawn('slash', e.x, e.y + 0.8 * e.scale, e.z, { size: radius, life: 0.3, color, ground: true, rot: -e.yaw, follow: null });
  }
  dust(x, y, z, n = 2, color = DUST) {
    for (let i = 0; i < n; i++) {
      this.spawn('puff', x + (Math.random() - 0.5) * 0.3, y + 0.1, z + (Math.random() - 0.5) * 0.3, {
        size: 0.14 + Math.random() * 0.1, grow: 0.5, life: 0.45, color, alpha: 0.55,
        vx: (Math.random() - 0.5) * 0.6, vy: 0.5 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.6, drag: 2,
      });
    }
  }
  poof(e, color = WHITE) {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * 6.283, s = 1 + Math.random() * 1.6;
      this.spawn('puff', e.x, e.y + e.height * 0.4, e.z, { size: 0.3 + Math.random() * 0.25, grow: 0.8, life: 0.55, color, alpha: 0.85, vx: Math.cos(a) * s, vy: 0.6 + Math.random() * 1.6, vz: Math.sin(a) * s, drag: 2.5 });
    }
    this.spawn('ring', e.x, e.y + 0.08, e.z, { size: 1.5, life: 0.4, color, ground: true });
  }
  levelUp(e) {
    this.spawn('beam', e.x, e.y + 2.4, e.z, { size: 0.42, aspect: 5.5, life: 1.0, color: GOLD, alpha: 1.3, follow: e, dy: 2.4 });    // a slim ray, not a wall of light
    for (let k = 0; k < 3; k++) setTimeout(() => this.spawn('ring', e.x, e.y + 0.08, e.z, { size: 2.6, life: 0.7, color: GOLD, ground: true }), k * 160);
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.283, r = 0.3 + Math.random() * 0.8;
      this.spawn('spark', e.x + Math.cos(a) * r, e.y + Math.random() * 0.5, e.z + Math.sin(a) * r, { size: 0.2, life: 0.8 + Math.random() * 0.7, color: GOLD, vy: 1.5 + Math.random() * 2.5, drag: 0.6 });
    }
    this.light(e.x, e.y + 1.5, e.z, 9, 0.9);
  }
  heal(e, color = LEAFY) {
    for (let i = 0; i < 7; i++) {
      this.spawn('heal', e.x + (Math.random() - 0.5) * 0.9, e.y + 0.3 + Math.random() * 0.8, e.z + (Math.random() - 0.5) * 0.9, { size: 0.16, life: 0.8 + Math.random() * 0.4, color, vy: 0.9 + Math.random() * 0.6 });
    }
    this.spawn('ring', e.x, e.y + 0.08, e.z, { size: 1.6, life: 0.5, color, ground: true });
  }
  sparkle(x, y, z, color = GOLD, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      this.spawn('spark', x, y, z, { size: 0.14 + Math.random() * 0.1, life: 0.4 + Math.random() * 0.3, color, vx: Math.cos(a) * 1.4, vy: 1.5 + Math.random() * 1.5, vz: Math.sin(a) * 1.4, gravity: 3, drag: 1.5 });
    }
  }
  click(x, y, z) {
    this.spawn('click', x, y + 0.1, z, { size: 0.75, life: 0.5, color: WHITE, ground: true });
  }
  splash(x, z) {
    this.spawn('ripple', x, 0.04, z, { size: 0.9, life: 0.7, color: SKY, alpha: 1, ground: true });
  }

  /** Drifting pollen, petals, leaves, snow or fireflies around the player, by biome and hour. */
  ambient(dt) {
    const g = this.game, p = g.player;
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0 || this.live.length > MAX - 80) return;
    this.ambientTimer = 0.09;
    const kind = g.env.night > 0.6 ? 'fireflies' : g.biome.particles;
    const a = Math.random() * 6.283, r = 3 + Math.random() * 22;
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    const y = g.world.surface(x, z);
    const wx = g.env.wind[0], wz = g.env.wind[1];
    if (kind === 'fireflies') {
      this.spawn('mote', x, y + 0.4 + Math.random() * 1.6, z, { size: 0.09, life: 3 + Math.random() * 2, color: WHITE, alpha: 1, vx: (Math.random() - 0.5) * 0.5, vz: (Math.random() - 0.5) * 0.5, sway: 0.5 });
    } else if (kind === 'petals' || kind === 'leaves') {
      const col = kind === 'petals' ? C(232, 150, 150) : (Math.random() < 0.5 ? C(232, 164, 48) : C(224, 92, 70));
      this.spawn('leaf', x, y + 3 + Math.random() * 3, z, { size: 0.09, life: 5, color: col, vx: wx * 0.9, vy: -0.75, vz: wz * 0.9, sway: 0.7, rot: Math.random() * 6, spin: 1.5 });
    } else if (kind === 'snow') {
      this.spawn('mote', x, y + 2 + Math.random() * 5, z, { size: 0.06, life: 5, color: WHITE, alpha: 1, vx: wx * 0.6, vy: -0.9, vz: wz * 0.6, sway: 0.4 });
    } else if (Math.random() < 0.6) {
      this.spawn('mote', x, y + 0.3 + Math.random() * 2.2, z, { size: 0.045, life: 4, color: DUST, alpha: 0.7, vx: wx * 0.35, vy: 0.08, vz: wz * 0.35, sway: 0.3 });
    }
  }

  /**
   * A pad that takes the hero somewhere (down to a contract, or home from one) keeps lifting rings of light off
   * itself, so it reads from across the square as the place to go: slow and faint while it is cold, quick and
   * bright, with a ring closing on its middle and sparks going up, once it will take them.
   */
  pads(dt) {
    const g = this.game, p = g.player, ms = g.missions;
    if (dt <= 0 || this.live.length > MAX - 60) return;
    for (const s of g.world.structures) {
      if (s.role !== 'deploy' && s.role !== 'leave') continue;
      if (Math.hypot(s.x - p.x, s.z - p.z) > 75) continue;
      s.fxT = (s.fxT || 0) - dt;
      if (s.fxT > 0) continue;
      const ready = s.role === 'deploy' ? !!ms.pending : !!(ms.active && ms.met());
      const color = s.role === 'leave' ? FLAME : SKY, y = g.world.surface(s.x, s.z) + 0.3;
      s.fxT = ready ? 0.5 : 1.4;
      s.fxN = (s.fxN || 0) + 1;
      this.spawn('halo', s.x, y, s.z, { size: 1.9, grow: ready ? -0.2 : -0.12, life: ready ? 2.0 : 2.6, color, alpha: ready ? 1 : 0.6, vy: ready ? 1.3 : 0.6, flat: true });
      if (!ready) continue;
      if (s.fxN % 2 === 0) this.spawn('halo', s.x, y - 0.05, s.z, { size: 3.4, grow: -1.2, life: 1.2, color, ground: true });
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * 6.283, r = 0.4 + Math.random() * 1.3;
        this.spawn('spark', s.x + Math.cos(a) * r, y + 0.1, s.z + Math.sin(a) * r, { size: 0.15, life: 0.9 + Math.random() * 0.5, color, vy: 1.6 + Math.random() * 1.2, drag: 0.4 });
      }
    }
  }

  // ---------------------------------------------------------------- events
  wire(bus) {
    bus.on('damage', (d) => {
      const t = d.target;
      const col = t.kind === 'player' ? RED : d.crit ? GOLD : WHITE;
      if (t.hitY && d.source) {
        // a blow on a colossus lands on the side of it the blow came from, at the height a hero can reach
        const dx = d.source.x - t.x, dz = d.source.z - t.z, l = Math.hypot(dx, dz) || 1;
        this.hit(t.x + dx / l * t.radius * 0.85, t.y + t.hitY * (0.55 + Math.random() * 0.5), t.z + dz / l * t.radius * 0.85, col, true);
      } else this.hit(t.x, t.y + t.height * 0.5, t.z, col, d.crit);
    });
    bus.on('swing', (d) => this.slash(d.entity, d.radius, d.color || WHITE));
    bus.on('monster:died', (m) => { if (!m.def.fall) this.poof(m, linear(m.colors[0])); });
    // ---- the elders: every step, their waking, their voice and their fall move the ground
    bus.on('boss:step', (d) => {
      const m = d.entity, side = Math.sin(m.walk) > 0 ? 1 : -1, c = Math.cos(m.yaw), s = Math.sin(m.yaw);
      const x = m.x + c * side * m.radius * 0.55, z = m.z + s * side * m.radius * 0.55;
      this.spawn('ring', x, m.y + 0.08, z, { size: m.radius * 0.9, grow: 5, life: 0.45, color: WHITE, ground: true });
      this.heave(x, m.y, z, m.radius * 0.5, 5);
      this.shakeNear(m.x, m.z, 0.3, 40);
    });
    bus.on('cine:rumble', (d) => { this.heave(d.x, d.y, d.z, 3 + 4 * (d.power || 0.5), Math.round(8 + 10 * (d.power || 0.5))); this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 3, grow: 9, life: 0.6, color: DUST, ground: true }); });
    bus.on('boss:rise', (d) => {
      const m = d.entity, r = m ? m.radius : 3.5;
      this.spawn('ring', d.x, d.y + 0.08, d.z, { size: r, grow: 12, life: 0.8, color: WHITE, ground: true });
      this.emit(3.3, 0.09, () => this.heave(d.x, d.y, d.z, r * 1.1, 3));
      this.light(d.x, d.y + 2, d.z, 16, 0.6);
    });
    bus.on('boss:stand', (d) => { this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 5, grow: 20, life: 0.7, color: WHITE, ground: true }); this.heave(d.x, d.y, d.z, 5.5, 22); });
    bus.on('boss:roar', (d) => {
      const m = d.entity, h = m ? m.height * 0.75 : 8;
      for (let k = 0; k < 3; k++) setTimeout(() => this.spawn('ring', d.x, d.y + 0.1, d.z, { size: 4, grow: 26, life: 0.85, color: k === 1 ? MUSTARD : WHITE, ground: true }), k * 170);
      this.heave(d.x, d.y, d.z, 6, 14);
      this.light(d.x, d.y + h, d.z, 22, 0.8);
      this.shakeNear(d.x, d.z, 0.8, 60);
    });
    bus.on('boss:fell', (m) => {
      // all the way down: dust off every part of it, sparks of its own colour
      this.emit(m.def.fall * 0.75, 0.07, () => {
        const a = Math.random() * 6.283, d = Math.random() * m.radius, y = m.y + Math.random() * m.height * 0.7 * (1 - m.actionT * 0.8);
        this.spawn('puff', m.x + Math.cos(a) * d, y, m.z + Math.sin(a) * d, { size: 0.6 + Math.random() * 0.8, grow: 1.4, life: 1.1, color: DUST, alpha: 0.7, vx: Math.cos(a) * 1.5, vy: 0.4, vz: Math.sin(a) * 1.5, drag: 1.5 });
        if (Math.random() < 0.5) this.spawn('spark', m.x + Math.cos(a) * d, y, m.z + Math.sin(a) * d, { size: 0.3, life: 0.7, color: linear(m.colors[1]), vx: Math.cos(a) * 4, vy: 2 + Math.random() * 3, vz: Math.sin(a) * 4, gravity: 9, drag: 1 });
      });
      this.shakeNear(m.x, m.z, 0.6, 60);
    });
    bus.on('boss:down', (m) => {
      this.spawn('ring', m.x, m.y + 0.1, m.z, { size: 5, grow: 30, life: 0.9, color: WHITE, ground: true });
      this.spawn('ring', m.x, m.y + 0.1, m.z, { size: 3, grow: 18, life: 1.1, color: linear(m.colors[1]), ground: true });
      this.heave(m.x, m.y, m.z, m.radius * 1.6, 36);
      this.light(m.x, m.y + 3, m.z, 26, 1.0);
      this.shakeNear(m.x, m.z, 1, 70);
    });
    bus.on('gate:shut', (d) => { this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 2.6, life: 0.5, color: WHITE, ground: true }); this.dust(d.x, d.y, d.z, 6); });
    // ---- arrivals
    bus.on('craft:land', (d) => { this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 2.5, grow: 9, life: 0.7, color: WHITE, ground: true }); this.heave(d.x, d.y, d.z, 3.2, 16, WHITE); });
    bus.on('arrive:beam', (d) => {
      this.spawn('beam', d.x, d.y + 3.2, d.z, { size: 0.5, aspect: 7, life: 1.3, color: SKY, alpha: 1.2 });
      for (let k = 0; k < 2; k++) setTimeout(() => this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 2.4, grow: 3, life: 0.7, color: SKY, ground: true }), k * 200);
      this.sparkle(d.x, d.y + 1, d.z, SKY, 12);
      this.light(d.x, d.y + 1.5, d.z, 10, 0.9);
    });
    // a strider's lance: the line it warned of, lit for an instant, and sparks along it
    bus.on('lance:fire', (d) => {
      this.spawn('lane', d.x + d.dirx * d.len / 2, d.y + 0.14, d.z + d.dirz * d.len / 2, { size: d.w / 2.6, aspect: d.len / (d.w / 1.3), rot: Math.atan2(d.dirx, d.dirz), life: 0.22, color: WHITE, ground: true });
      for (let k = 0; k < 9; k++) { const t = (k + Math.random()) / 9 * d.len; this.spawn('spark', d.x + d.dirx * t, d.y + 0.8 + Math.random() * 0.6, d.z + d.dirz * t, { size: 0.2, life: 0.3 + Math.random() * 0.2, color: MUSTARD, vy: 1.5 + Math.random() * 2, drag: 1.5 }); }
      this.light(d.x + d.dirx * 3, d.y + 1.6, d.z + d.dirz * 3, 9, 0.2);
      this.shakeNear(d.x, d.z, 0.3, 20);
    });
    // ---- the lumen: its bolt, its burst, and the moment it becomes something else
    bus.on('lumen:ready', () => { const e = this.game.companion.e; if (e) this.sparkle(e.x, e.y, e.z, e.colors[1], 10); });
    bus.on('lumen:fed', () => { const e = this.game.companion.e; if (e) this.sparkle(e.x, e.y, e.z, e.colors[1], 5); });
    bus.on('lumen:burst', (d) => {
      const b = d.burst, r = b.r || 3;
      this.spawn('ring', d.x, d.y + 0.1, d.z, { size: 1, grow: r * 2.4, life: 0.5, color: d.color, ground: true });
      if (b.seconds) this.spawn('mark', d.x, d.y + 0.1, d.z, { size: 1.5, life: b.seconds, color: d.color, ground: true, follow: this.game.player, dy: 0.1 });
      this.sparkle(d.x, d.y + 1.2, d.z, d.color, 16);
      this.light(d.x, d.y + 1.5, d.z, 10 + r, 0.5);
    });
    bus.on('lumen:changed', (d) => {
      this.spawn('beam', d.x, d.y + 1.6, d.z, { size: 0.4, aspect: 6, life: 1.4, color: d.color, alpha: 1.2 });
      this.sparkle(d.x, d.y, d.z, d.color, 18);
      this.light(d.x, d.y, d.z, 9, 0.9);
    });
    // a site answers: a ray and a ring in its own colour
    bus.on('site:used', (d) => {
      this.spawn('beam', d.x, d.y + 3, d.z, { size: 0.45, aspect: 7, life: 1.4, color: d.color, alpha: 1.2 });
      for (let k = 0; k < 2; k++) setTimeout(() => this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 1.6, grow: 5, life: 0.7, color: d.color, ground: true }), k * 180);
      this.sparkle(d.x, d.y + 1.2, d.z, d.color, 14);
      this.light(d.x, d.y + 1.5, d.z, 9, 0.8);
    });
    bus.on('site:guard', (d) => this.spawn('ring', d.guard.x, d.guard.y + 0.08, d.guard.z, { size: 2.4, grow: 6, life: 0.6, color: RED, ground: true }));
    // a rare piece of gear stands in a ray of its rarity's colour when it lands
    bus.on('drop:rare', (d) => {
      const col = d.rarity >= 3 ? FLAME : GOLD;
      this.spawn('beam', d.x, d.y + 2.6, d.z, { size: 0.34, aspect: 7.5, life: 1.6, color: col, alpha: 1.2 });
      this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 1.6, life: 0.7, color: col, ground: true });
      this.sparkle(d.x, d.y + 0.6, d.z, col, 10);
    });
    bus.on('levelup', () => this.levelUp(this.game.player));
    bus.on('heal', (d) => this.heal(d.entity, d.focus ? SKY : undefined));
    bus.on('pickup', (d) => this.sparkle(d.x, d.y + 0.4, d.z, d.rare ? SKY : GOLD, d.rare ? 12 : 5));
    bus.on('step', (d) => {
      if (d.water) this.splash(d.entity.x, d.entity.z);
      else if (d.entity.kind === 'player') this.dust(d.entity.x, d.entity.y, d.entity.z, 1);
    });
    bus.on('moveclick', (d) => this.click(d.x, d.y, d.z));
    bus.on('jump', (d) => this.dust(d.x, d.y, d.z, 3));
    bus.on('landed', (d) => { this.dust(d.x, d.y, d.z, 5); this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 0.5, grow: 2.2, life: 0.3, color: WHITE, ground: true }); });
    bus.on('attune', (d) => { this.heal(this.game.player, SKY); this.spawn('beam', d.x, d.y + 3, d.z, { size: 0.5, aspect: 6, life: 1.2, color: SKY }); });
    bus.on('dash', (d) => { this.dust(d.x, d.y, d.z, 5, LEAFY); this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 1.4, life: 0.35, color: WHITE, ground: true }); });
    bus.on('bolt:hit', (d) => { this.hit(d.x, d.y, d.z, FLAME, true); this.spawn('ring', d.x, d.y, d.z, { size: 1.6, life: 0.35, color: FLAME }); });
    // A beast warns before it strikes, in its own colour of danger: a ring for an ordinary blow,
    // a patch that fills in for a special one, a lane for a charge.
    bus.on('telegraph', (d) => {
      if (d.lane) this.spawn('lane', d.x, d.y + 0.1, d.z, { size: d.w / 2, aspect: d.len / d.w, rot: Math.atan2(d.dirx, d.dirz), life: d.t, color: MUSTARD, ground: true });
      else this.spawn(d.fill ? 'zone' : 'ring', d.x, d.y + 0.08, d.z, { size: d.r, life: d.t, color: MUSTARD, alpha: 1, ground: true });
    });
    bus.on('hazard:cloud', (d) => this.spawn('cloud', d.x, d.y + 0.12, d.z, { size: d.r, life: d.life, color: MUSTARD, ground: true }));
    bus.on('slam', (d) => {
      this.spawn('ring', d.x, d.y + 0.08, d.z, { size: d.r, life: 0.4, color: WHITE, ground: true });
      this.dust(d.x, d.y, d.z, d.heavy ? 9 : 4);
      if (d.heavy) this.game.camera.shake = Math.min(1, this.game.camera.shake + 0.45);
    });
    bus.on('shot:hit', (d) => { this.hit(d.x, d.y, d.z, MUSTARD, false); });
    bus.on('found', (d) => { if (d.x !== undefined) this.sparkle(d.x, d.y + 0.6, d.z, GOLD, 10); });
    bus.on('boon', (d) => this.heal(d.entity, SKY));
    bus.on('travel:arrive', (d) => { this.spawn('ring', d.x, d.y + 0.08, d.z, { size: 2.2, life: 0.6, color: SKY, ground: true }); this.sparkle(d.x, d.y + 1, d.z, SKY, 8); });
    bus.on('charge:dust', (d) => this.dust(d.x, d.y, d.z, 2));
    bus.on('shot:launch', (s) => this.spawn('orb', s.x, s.y, s.z, { size: s.size || 0.55, color: s.color, hold: true, follow: s, trail: true }));
    bus.on('guard', (d) => this.spawn('mark', d.entity.x, d.entity.y + 0.1, d.entity.z, { size: d.entity.radius * 2.8, life: d.t, color: SKY, ground: true, follow: d.entity, dy: 0.1 }));
  }
}

const linear = (c) => [c[0], c[1], c[2]];
export const FX_COLORS = { GOLD, WHITE, DUST, SKY, LEAFY, RED, FLAME, MUSTARD };
