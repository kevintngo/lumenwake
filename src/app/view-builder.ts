import { RENDER, WORLD } from '../config';
import { INSTANCE_FLOATS } from '../rendering/passes/entity-pass';
import type { ArchetypeId } from '../types/domain';
import type { Entity, MonsterEntity } from '../types/entity';
import type { FxParticleLike, GameContext, ViewLike } from '../types/game-context';
import type { EntityBatch, RenderFrame } from '../types/render';

const DRAW_RANGE = 78;

interface CollectedLight {
  x: number;
  y: number;
  z: number;
  r: number;
  k: number;
  d: number;
}

export class View implements ViewLike {
  private readonly game: GameContext;
  private readonly batches = new Map<ArchetypeId, EntityBatch>();
  private readonly frame: RenderFrame;
  private readonly lights: CollectedLight[] = [];
  private mark: FxParticleLike | null = null;
  private tick = -1;
  only: Entity | null = null;

  constructor(game: GameContext) {
    this.game = game;
    this.frame = {
      camera: game.camera,
      env: game.env,
      focus: [0, 0, 0],
      time: 0,
      timeTwos: 0,
      far: 600,
      dpr: 1,
      look: game.look,
      casters: new Float32Array(RENDER.MAX_CASTERS * 4),
      casterCount: 0,
      lightPos: new Float32Array(RENDER.MAX_LIGHTS * 4),
      lightCol: new Float32Array(RENDER.MAX_LIGHTS * 3),
      lightCount: 0,
      batches: this.batches,
      fx: game.fx,
      reveal: [0, 0, 0, 0],
    };
  }

  private batch(id: ArchetypeId): EntityBatch {
    let b = this.batches.get(id);
    if (!b) {
      b = { data: new Float32Array(INSTANCE_FLOATS * 16), count: 0 };
      this.batches.set(id, b);
    }
    return b;
  }

  build(time: number): RenderFrame {
    const g = this.game;
    const p = g.player;
    const f = this.frame;
    const cam = g.camera;
    cam.shakeScale = g.settings && g.settings.shake !== undefined ? g.settings.shake : 1;

    for (const b of this.batches.values()) b.count = 0;

    const ents = g.entities.list;
    const casters: { e: Entity; dist: number }[] = [];
    const tick = Math.floor(time * 12);
    const newDrawing = tick !== this.tick;
    this.tick = tick;
    f.timeTwos = tick / 12;

    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      const dist = Math.hypot(e.x - p.x, e.z - p.z);
      if ((dist > DRAW_RANGE && !e.far) || e.grow <= 0.01 || (this.only && e !== this.only)) continue;

      const occ = g.world.chunk(Math.floor(e.x / WORLD.CHUNK), Math.floor(e.z / WORLD.CHUNK)).height[
        ((Math.floor(e.z) & (WORLD.CHUNK - 1)) * WORLD.CHUNK + (Math.floor(e.x) & (WORLD.CHUNK - 1))) * 4 + 1
      ];
      e.shade += (1 - occ * 0.75 - e.shade) * 0.12;

      const b = this.batch(e.archetype);
      if ((b.count + 1) * INSTANCE_FLOATS > b.data.length) {
        const bigger = new Float32Array(b.data.length * 2);
        bigger.set(b.data);
        b.data = bigger;
      }

      const d = b.data;
      const o = b.count++ * INSTANCE_FLOATS;
      const c = e.colors;
      const s = e.scale * e.grow;
      d[o] = e.x;
      d[o + 1] = e.y + e.lift;
      d[o + 2] = e.z;
      d[o + 3] = s;
      if (newDrawing || e.pose === undefined) e.pose = [e.yaw, e.walk, e.action, e.actionT];
      d[o + 4] = e.pose[0];
      d[o + 5] = e.pose[1];
      d[o + 6] = e.pose[2];
      d[o + 7] = e.pose[3];
      d[o + 8] = e.seed;
      d[o + 9] = e.flash;
      d[o + 10] = e.shade;
      d[o + 11] =
        (e.ghost ? 1 : 0) + ((e.hover || e === p.target) && !e.hitY ? 2 : 0) + 4 * (e.wears || 0);
      d[o + 12] = c[0][0];
      d[o + 13] = c[0][1];
      d[o + 14] = c[0][2];
      d[o + 15] = e.kind === 'drop' ? 0 : e.move;
      d[o + 16] = c[1][0];
      d[o + 17] = c[1][1];
      d[o + 18] = c[1][2];
      d[o + 19] = e.extra;
      d[o + 20] = c[2][0];
      d[o + 21] = c[2][1];
      d[o + 22] = c[2][2];
      d[o + 23] = e.kit || 0;
      if (e.kind !== 'drop' && dist < 45) casters.push({ e, dist });
    }

    casters.sort((a, b) => a.dist - b.dist);
    f.casterCount = Math.min(casters.length, RENDER.MAX_CASTERS);
    for (let i = 0; i < f.casterCount; i++) {
      const e = casters[i].e;
      const r = Math.max(e.radius, e.height * 0.33) * e.scale * e.grow;
      f.casters.set(
        [e.x, e.y + r * 1.05 + e.lift + (e.archetype === 'wisp' ? 0.6 : 0), e.z, r],
        i * 4,
      );
    }

    this.collectLights();
    this.markTarget();

    const hs = cam.project(p.x, p.y + 0.8, p.z);
    if (hs && !g.paused && !p.dead && !g.cinema.active) {
      f.reveal[0] = hs.x * 2 - 1;
      f.reveal[1] = 1 - hs.y * 2;
      f.reveal[2] = 0.3;
      f.reveal[3] = Math.hypot(cam.pos[0] - p.x, cam.pos[1] - p.y - 0.8, cam.pos[2] - p.z);
    } else {
      f.reveal[2] = 0;
    }

    f.time = time;
    f.focus = cam.target;
    g.fx.write();

    const mm = g.renderer.minimap;
    mm.clear();
    mm.player = [p.x, p.z, p.yaw];
    const reach = Math.max(8, mm.rect[2] * mm.rect[3] - 7);
    const mark = (x: number, z: number, kind: number, size: number) => {
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.hypot(dx, dz);
      const k = d > reach ? reach / d : 1;
      mm.add(p.x + dx * k, p.z + dz * k, kind, size);
    };

    for (const st of g.world.structures) {
      if (st.role === 'leave' || st.role === 'deploy') {
        mark(st.x, st.z, 5, 3.2);
      } else if (st.role === 'pod' && !st.pal) {
        if (Math.hypot(st.x - p.x, st.z - p.z) < reach) mm.add(st.x, st.z, 3, 2.2);
        else if (g.missions.active && g.missions.active.revealed) mark(st.x, st.z, 3, 1.8);
      }
    }

    for (const e of ents) {
      if (e.kind === 'npc') {
        mm.add(e.x, e.z, 1, 2.6);
      } else if (e.kind === 'monster' && !e.dead) {
        const m = e as MonsterEntity;
        mm.add(m.x, m.z, m.boss ? 4 : 0, m.elite ? 3 : 2);
      } else if (e.kind === 'drop') {
        mm.add(e.x, e.z, 3, 1.4);
      } else if (e.kind === 'site') {
        const a = g.missions.active;
        const near = Math.hypot(e.x - p.x, e.z - p.z) < 26;
        if (near) mm.add(e.x, e.z, 5, 2.4);
        else if (a && a.revealed) mark(e.x, e.z, 5, 2.2);
      }
    }

    return f;
  }

  private collectLights(): void {
    const g = this.game;
    const p = g.player;
    const f = this.frame;
    const night = g.env.night;
    const L = this.lights;
    L.length = 0;

    g.world.forEachProp(p.x, p.z, 44, (pr) => {
      const l = pr.def.light;
      if (!l) return;
      const k = l.always ? 0.3 + 0.7 * night : night;
      if (k < 0.05) return;
      const fwdX = -Math.sin(pr.rot);
      const fwdZ = Math.cos(pr.rot);
      const o = l.forward || 0;
      L.push({
        x: pr.x + fwdX * o,
        y: pr.y + l.y * pr.scale,
        z: pr.z + fwdZ * o,
        r: l.radius,
        k: k * (l.always ? 0.55 : 1),
        d: 0,
      });
    });

    for (const m of g.monsters) {
      if (m.def.glow && !m.dead && night > 0.05) {
        L.push({ x: m.x, y: m.y + 1, z: m.z, r: 4.5, k: night * 0.7, d: 0 });
      }
    }

    const lu = g.companion && g.companion.e;
    if (g.biome.realm === 1 && lu && !lu.gone && lu.grow > 0.5) {
      L.push({ x: lu.x, y: lu.y, z: lu.z, r: 9, k: 1, d: 0 });
    }

    for (const m of g.monsters) {
      if (m.def.lamp && !m.dead && night > 0.05) {
        L.push({ x: m.x, y: m.y + m.def.lamp[0], z: m.z, r: m.def.lamp[1], k: night, d: 0 });
      }
    }

    for (const l of g.fx.lights) {
      L.push({ x: l.x, y: l.y, z: l.z, r: l.r, k: (l.life / l.max) * (0.25 + 0.75 * night), d: 0 });
    }

    for (const l of L) l.d = Math.hypot(l.x - p.x, l.z - p.z);
    L.sort((a, b) => a.d - b.d);
    f.lightCount = Math.min(L.length, RENDER.MAX_LIGHTS);
    for (let i = 0; i < f.lightCount; i++) {
      const l = L[i];
      f.lightPos.set([l.x, l.y, l.z, l.r], i * 4);
      f.lightCol.set([l.k, 0, 0], i * 3);
    }
  }

  private markTarget(): void {
    const g = this.game;
    const t = g.player.target;
    if (this.mark && (!t || this.mark.follow !== t)) {
      this.mark.hold = false;
      this.mark.life = 1;
      this.mark = null;
    }
    if (t && !this.mark && t.kind !== 'drop') {
      const col: readonly [number, number, number] =
        t.kind === 'monster' ? [0.84, 0.28, 0.2] : [0.33, 0.42, 0.61];
      this.mark = g.fx.spawn('mark', t.x, t.y, t.z, {
        size: t.radius * 2.1 + 0.25,
        color: col,
        ground: true,
        hold: true,
        follow: t,
        dy: 0.1,
        alpha: 1.2,
      });
    }
  }
}
