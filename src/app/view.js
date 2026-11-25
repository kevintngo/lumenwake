// View: translates simulation state into the frame description the renderer
// draws. This is the only place where game objects meet GPU buffers.

import { RENDER, WORLD } from '../config.js';
import { INSTANCE_FLOATS } from '../gfx/passes/entities.js';

const DRAW_RANGE = 78;

export class View {
  constructor(game) {
    this.game = game;
    this.batches = new Map();
    this.frame = {
      camera: game.camera, env: game.env, focus: [0, 0, 0], time: 0, timeTwos: 0, far: 600, dpr: 1,
      look: game.look,
      casters: new Float32Array(RENDER.MAX_CASTERS * 4), casterCount: 0,
      lightPos: new Float32Array(RENDER.MAX_LIGHTS * 4), lightCol: new Float32Array(RENDER.MAX_LIGHTS * 3), lightCount: 0,
      batches: this.batches, fx: game.fx,
      reveal: [0, 0, 0, 0],
    };
    this.lights = [];
    this.mark = null;
  }

  batch(id) {
    let b = this.batches.get(id);
    if (!b) this.batches.set(id, (b = { data: new Float32Array(INSTANCE_FLOATS * 16), count: 0 }));
    return b;
  }

  build(time) {
    const g = this.game, p = g.player, f = this.frame, cam = g.camera;
    cam.shakeScale = g.settings && g.settings.shake !== undefined ? g.settings.shake : 1;       // (the player's own setting for how much the picture shakes)
    for (const b of this.batches.values()) b.count = 0;
    const ents = g.entities.list;
    const casters = [];
    // figures are posed on twos: twelve drawings a second, like hand animation
    const tick = Math.floor(time * 12);
    const newDrawing = tick !== this.tick;
    this.tick = tick;
    f.timeTwos = tick / 12;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      const dist = Math.hypot(e.x - p.x, e.z - p.z);
      if ((dist > DRAW_RANGE && !e.far) || e.grow <= 0.01 || (this.only && e !== this.only)) continue;        // (only: a portrait is being taken of one figure)
      // dappled shade from whatever stands over this spot
      const occ = g.world.chunk(Math.floor(e.x / WORLD.CHUNK), Math.floor(e.z / WORLD.CHUNK))
        .height[((Math.floor(e.z) & (WORLD.CHUNK - 1)) * WORLD.CHUNK + (Math.floor(e.x) & (WORLD.CHUNK - 1))) * 4 + 1];
      e.shade += ((1 - occ * 0.75) - e.shade) * 0.12;

      const b = this.batch(e.archetype);
      if ((b.count + 1) * INSTANCE_FLOATS > b.data.length) {
        const bigger = new Float32Array(b.data.length * 2);
        bigger.set(b.data);
        b.data = bigger;
      }
      const d = b.data, o = b.count++ * INSTANCE_FLOATS, c = e.colors, s = e.scale * e.grow;
      d[o] = e.x; d[o + 1] = e.y + e.lift; d[o + 2] = e.z; d[o + 3] = s;
      if (newDrawing || e.pose === undefined) e.pose = [e.yaw, e.walk, e.action, e.actionT];
      d[o + 4] = e.pose[0]; d[o + 5] = e.pose[1]; d[o + 6] = e.pose[2]; d[o + 7] = e.pose[3];
      d[o + 8] = e.seed; d[o + 9] = e.flash; d[o + 10] = e.shade; d[o + 11] = (e.ghost ? 1 : 0) + ((e.hover || e === p.target) && !e.hitY ? 2 : 0);        // (a colossus is not redrawn in red for being the target: its bar says so)
      d[o + 12] = c[0][0]; d[o + 13] = c[0][1]; d[o + 14] = c[0][2]; d[o + 15] = e.kind === 'drop' ? 0 : e.move;
      d[o + 16] = c[1][0]; d[o + 17] = c[1][1]; d[o + 18] = c[1][2]; d[o + 19] = e.extra;
      d[o + 20] = c[2][0]; d[o + 21] = c[2][1]; d[o + 22] = c[2][2]; d[o + 23] = e.kit || 0;
      if (e.kind !== 'drop' && dist < 45) casters.push({ e, dist });
    }

    // nearest entities cast analytic shadows
    casters.sort((a, b) => a.dist - b.dist);
    f.casterCount = Math.min(casters.length, RENDER.MAX_CASTERS);
    for (let i = 0; i < f.casterCount; i++) {
      const e = casters[i].e, r = Math.max(e.radius, e.height * 0.33) * e.scale * e.grow;
      f.casters.set([e.x, e.y + r * 1.05 + e.lift + (e.archetype === 'wisp' ? 0.6 : 0), e.z, r], i * 4);
    }

    this.collectLights();
    this.markTarget();

    // where the see-through window in the foliage sits
    const hs = cam.project(p.x, p.y + 0.8, p.z);
    if (hs && !g.paused && !p.dead && !g.cinema.active) {
      f.reveal[0] = hs.x * 2 - 1; f.reveal[1] = 1 - hs.y * 2; f.reveal[2] = 0.3;
      f.reveal[3] = Math.hypot(cam.pos[0] - p.x, cam.pos[1] - p.y - 0.8, cam.pos[2] - p.z);
    } else f.reveal[2] = 0;

    f.time = time;
    f.focus = cam.target;
    g.fx.write();

    const mm = g.renderer.minimap;
    mm.clear();
    mm.player = [p.x, p.z, p.yaw];
    // the map marks what the mission is about: the way out, pods not yet opened, and on the ship the pad
    const reach = Math.max(8, mm.rect[2] * mm.rect[3] - 7);
    const mark = (x, z, kind, size) => {
      const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), k = d > reach ? reach / d : 1;
      mm.add(p.x + dx * k, p.z + dz * k, kind, size);
    };
    for (const st of g.world.structures) {
      if (st.role === 'leave' || st.role === 'deploy') mark(st.x, st.z, 5, 3.2);
      else if (st.role === 'pod' && !st.pal) { if (Math.hypot(st.x - p.x, st.z - p.z) < reach) mm.add(st.x, st.z, 3, 2.2); else if (g.missions.active && g.missions.active.revealed) mark(st.x, st.z, 3, 1.8); }
    }
    for (const e of ents) {
      if (e.kind === 'npc') mm.add(e.x, e.z, 1, 2.6);
      else if (e.kind === 'monster' && !e.dead) mm.add(e.x, e.z, e.boss ? 4 : 0, e.elite ? 3 : 2);
      else if (e.kind === 'drop') mm.add(e.x, e.z, 3, 1.4);
      else if (e.kind === 'site') { const a = g.missions.active, near = Math.hypot(e.x - p.x, e.z - p.z) < 26; if (near) mm.add(e.x, e.z, 5, 2.4); else if (a && a.revealed) mark(e.x, e.z, 5, 2.2); }
    }
    return f;
  }

  /** Lamps at night, crystals and waystones always, plus spell flashes: nearest eight. */
  collectLights() {
    const g = this.game, p = g.player, f = this.frame, night = g.env.night;
    const L = this.lights;
    L.length = 0;
    g.world.forEachProp(p.x, p.z, 44, (pr) => {
      const l = pr.def.light;
      if (!l) return;
      const k = l.always ? 0.3 + 0.7 * night : night;
      if (k < 0.05) return;
      const fwdX = -Math.sin(pr.rot), fwdZ = Math.cos(pr.rot), o = l.forward || 0;
      L.push({ x: pr.x + fwdX * o, y: pr.y + l.y * pr.scale, z: pr.z + fwdZ * o, r: l.radius, k: k * (l.always ? 0.55 : 1) });
    });
    for (const m of g.monsters) if (m.def.glow && !m.dead && night > 0.05) L.push({ x: m.x, y: m.y + 1, z: m.z, r: 4.5, k: night * 0.7 });
    for (const l of g.fx.lights) L.push({ x: l.x, y: l.y, z: l.z, r: l.r, k: (l.life / l.max) * (0.25 + 0.75 * night) });
    for (const l of L) l.d = Math.hypot(l.x - p.x, l.z - p.z);
    L.sort((a, b) => a.d - b.d);
    f.lightCount = Math.min(L.length, RENDER.MAX_LIGHTS);
    for (let i = 0; i < f.lightCount; i++) {
      const l = L[i];
      f.lightPos.set([l.x, l.y, l.z, l.r], i * 4);
      f.lightCol.set([l.k, 0, 0], i * 3);     // light has no colour here: it is how much paper shows
    }
  }

  /** A turning ring under the current target. */
  markTarget() {
    const g = this.game, t = g.player.target;
    if (this.mark && (!t || this.mark.follow !== t)) { this.mark.hold = false; this.mark.life = 1; this.mark = null; }
    if (t && !this.mark && t.kind !== 'drop') {
      const col = t.kind === 'monster' ? [0.84, 0.28, 0.2] : [0.33, 0.42, 0.61];   // vermilion for a quarry, slate for townsfolk
      this.mark = g.fx.spawn('mark', t.x, t.y, t.z, { size: t.radius * 2.1 + 0.25, color: col, ground: true, hold: true, follow: t, dy: 0.1, alpha: 1.2 });
    }
  }
}
