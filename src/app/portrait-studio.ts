import { FAMILIES } from '../data/classes';
import { CREATURES } from '../data/creatures';
import { BASES, type GearBaseDef } from '../data/gear';
import { Camera } from '../rendering/camera';
import { INSTANCE_FLOATS } from '../rendering/passes/entity-pass';
import { pencils } from '../sim/entities';
import type { ArchetypeId, CreatureId, GearBaseId, SlotKind } from '../types/domain';
import type { GameContext, PortraitsLike } from '../types/game-context';
import type { CameraLike, RenderEnv } from '../types/render';

const RAD = Math.PI / 180;
const UP = 15.5 * RAD;
const TURN = 0.012;
const STAGE_LENS = 13 * RAD;
const STAGE_PITCH = 8 * RAD;

interface PackInput {
  y?: number;
  scale?: number;
  yaw?: number;
  action?: number;
  actionT?: number;
  seed?: number;
  colors: number[][];
  move?: number;
  extra?: number;
  kit?: number;
  flags?: number;
}

interface StageSubject extends PackInput {
  archetype: ArchetypeId;
  tall: number;
  wide: number;
  mid: number;
  floor: number;
  ring: number;
  lens?: number;
  pitch?: number;
  heavy?: boolean;
}

interface StageEntry {
  what: string;
  yaw: number;
  spin: number;
  drag: { x: number; t: number } | null;
  tick: number;
  cam: CameraLike;
  box?: HTMLElement;
  canvas?: HTMLCanvasElement | null;
  dirty?: boolean;
}

function pack(o: PackInput): Float32Array {
  const d = new Float32Array(INSTANCE_FLOATS);
  const c = o.colors;
  d[1] = o.y || 0;
  d[3] = o.scale || 1;
  d[4] = o.yaw || 0;
  d[6] = o.action || 0;
  d[7] = o.actionT || 0;
  d[8] = o.seed || 0;
  d[10] = 1;
  d.set(c[0], 12);
  d[15] = o.move || 0;
  d.set(c[1], 16);
  d[19] = o.extra || 0;
  d.set(c[2], 20);
  d[23] = o.kit || 0;
  d[11] = o.flags || 0;
  return d;
}

function stand(
  cam: CameraLike,
  aspect: number,
  tall: number,
  wide: number,
  mid: number,
  lens: number,
  pitch: number,
): number {
  const half = Math.max(tall / 2, wide / 2 / aspect);
  const D = (half / Math.tan(lens / 2)) * 1.03;
  cam.rail = {
    pos: [0, mid + Math.sin(pitch) * D, Math.cos(pitch) * D],
    look: [0, mid, 0],
    lens,
    mix: 1,
  };
  cam.update(0, [0, mid, 0], aspect, null);
  return 2 * D * Math.tan(lens / 2) * aspect;
}

const WORN_AT: Partial<Record<SlotKind, number>> = {
  offhand: 10,
  visor: 13,
  grips: 15,
  greaves: 17,
  boots: 18,
  mod: 20,
};

const PIECE = (b: GearBaseDef): number =>
  b.slot === 'weapon' && b.family
    ? FAMILIES[b.family].kit * 2 + (b.look || 0)
    : b.slot === 'frame'
      ? 6 + (b.look || 0)
      : b.slot === 'unit'
        ? 7 + (b.look || 1)
        : (WORN_AT[b.slot] ?? 0) + (b.look || 0);

const SPAN: Record<GearBaseId, number> = {
  saber: 1.0,
  glaive: 1.06,
  rifle: 0.84,
  carbine: 0.96,
  rod: 1.14,
  prism: 1.3,
  scout: 0.8,
  bulwark: 0.9,
  core: 0.36,
  drive: 0.42,
  ward: 0.46,
  cell: 0.36,
  lens: 0.36,
  visor: 0.5,
  crest: 0.5,
  grip: 0.4,
  gauntlet: 0.46,
  greave: 0.46,
  trail: 0.42,
  mag: 0.46,
  chip: 0.36,
  coil: 0.38,
};

export class Portraits implements PortraitsLike {
  private readonly game: GameContext;
  private due = true;
  private gearDue = false;
  private eldersDue = false;
  private elderDelay = 24;
  private last = 0;
  private readonly stages: Record<string, StageEntry> = {};
  private elderCam: CameraLike | null = null;
  private gearCam: CameraLike | null = null;
  private gearSheet: HTMLCanvasElement | null = null;
  bust = '';
  gear: Record<string, string> = {};
  elders: Record<string, string> = {};

  constructor(game: GameContext) {
    this.game = game;
    for (const ev of ['people', 'class', 'equip'] as const) {
      game.bus.on(ev, () => {
        this.due = true;
      });
    }
    for (const ev of ['begin', 'people', 'class'] as const) {
      game.bus.on(ev, () => {
        this.gearDue = true;
      });
    }
    game.bus.on('begin', () => {
      this.eldersDue = true;
    });
  }

  update(): void {
    if (document.hidden) return;
    const g = this.game;
    if (this.due) {
      this.due = false;
      try {
        this.take();
      } catch (err) {
        console.warn('Portrait not taken:', err);
      }
    }
    if (this.gearDue && g.started) {
      this.gearDue = false;
      try {
        this.drawGear();
      } catch (err) {
        console.warn('Gear not drawn:', err);
      }
    }
    if (this.eldersDue && g.started) {
      if (this.elderDelay > 0) {
        this.elderDelay--;
      } else {
        this.eldersDue = false;
        try {
          this.drawElders();
        } catch (err) {
          console.warn('Elders not drawn:', err);
        }
      }
    }

    const now = performance.now() / 1000;
    const dt = Math.min(0.1, now - (this.last || now));
    this.last = now;

    for (const what in this.stages) {
      const st = this.stages[what];
      if (!st.canvas || !st.canvas.isConnected) {
        st.canvas = null;
        continue;
      }
      if (!st.drag && Math.abs(st.spin) > 0.05) {
        st.yaw += st.spin * dt;
        st.spin *= Math.exp(-5 * dt);
        st.dirty = true;
      }
      const tick = g.reducedMotion ? 0 : Math.floor(now * 12);
      if (!st.dirty && tick === st.tick) continue;
      st.tick = tick;
      try {
        this.show(st, g.reducedMotion ? 0 : now);
      } catch (err) {
        console.warn('Stage not drawn:', err);
        st.canvas = null;
      }
    }
  }

  private subject(what: string): StageSubject | null {
    const g = this.game;
    const p = g.player;
    if (what.startsWith('elder:')) {
      const d = CREATURES[what.slice(6) as CreatureId];
      if (!d) return null;
      const [, tall, mid] = d.sit || [0, d.height * 1.4, d.height * 0.5];
      return {
        archetype: d.archetype,
        scale: 1,
        seed: 0.37,
        colors: pencils(d.colors),
        extra: 0,
        kit: 0,
        tall,
        wide: tall * 1.25,
        mid,
        floor: 0,
        ring: d.radius * 1.7,
        lens: 24 * RAD,
        pitch: -6 * RAD,
        heavy: true,
      };
    }
    if (what === 'lumen') {
      const e = g.companion && g.companion.e;
      const l = p.sheet.lumen;
      if (!e) return null;
      return {
        archetype: 'lumen',
        scale: 1,
        seed: e.seed,
        colors: e.colors,
        extra: e.extra,
        kit: 0,
        move: (l.charge || 0) / 100,
        tall: 0.84,
        wide: 0.92,
        mid: 0.02,
        floor: -0.36,
        ring: 0.3,
      };
    }
    const rawKit = p.kit || 0;
    const kit = Math.floor(rawKit + 0.01) + ((rawKit + 0.01) % 1 >= 0.5 ? 0.5 : 0);
    return {
      archetype: p.archetype,
      scale: p.scale,
      seed: p.seed,
      colors: p.colors,
      extra: p.extra,
      kit,
      flags: 4 * (p.wears || 0),
      action: 7,
      tall: 2.06 * p.scale,
      wide: 1.6 * p.scale,
      mid: 0.93 * p.scale,
      floor: 0,
      ring: 0.62 * p.scale,
    };
  }

  mount(box: HTMLElement, what: string): void {
    const st =
      this.stages[what] ||
      (this.stages[what] = {
        what,
        yaw: what === 'lumen' ? 0.3 : what === 'hero' ? -0.5 : -0.45,
        spin: 0,
        drag: null,
        tick: -1,
        cam: new Camera(),
      });
    if (st.box === box) return;
    st.box = box;
    st.canvas = box.querySelector('canvas');
    st.drag = null;
    st.dirty = true;

    box.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      st.drag = { x: e.clientX, t: performance.now() };
      st.spin = 0;
      box.setPointerCapture(e.pointerId);
      box.classList.add('held');
    });
    box.addEventListener('pointermove', (e) => {
      if (!st.drag) return;
      const dx = e.clientX - st.drag.x;
      const now = performance.now();
      const dt = Math.max(8, now - st.drag.t) / 1000;
      st.drag.x = e.clientX;
      st.drag.t = now;
      st.yaw -= dx * TURN;
      st.spin = ((-dx * TURN) / dt) * 0.6;
      st.dirty = true;
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      box.addEventListener(ev, () => {
        st.drag = null;
        box.classList.remove('held');
      });
    }
    try {
      this.show(st, this.game.reducedMotion ? 0 : performance.now() / 1000);
    } catch (err) {
      console.warn('Stage not drawn:', err);
    }
  }

  turn(box: HTMLElement, by: number): void {
    for (const what in this.stages) {
      if (this.stages[what].box === box) {
        this.stages[what].yaw -= by;
        this.stages[what].spin = 0;
        this.stages[what].dirty = true;
      }
    }
  }

  private show(st: StageEntry, time: number): void {
    const g = this.game;
    const cv = st.canvas;
    const sub = this.subject(st.what);
    if (!cv || !sub) return;
    const box = cv.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      g.renderer.quality === 'low' ? (sub.heavy ? 1 : 1.5) : sub.heavy ? 1.5 : 2,
    );
    const w = Math.round(box.width * dpr);
    const h = Math.round(box.height * dpr);
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    const across = stand(
      st.cam,
      w / h,
      sub.tall,
      sub.wide,
      sub.mid,
      sub.lens || STAGE_LENS,
      sub.pitch ?? STAGE_PITCH,
    );
    const bytes = g.renderer.figure({
      width: w,
      height: h,
      dpr,
      camera: st.cam,
      env: this.daylight(),
      time,
      batches: new Map([[sub.archetype, { data: pack({ ...sub, yaw: st.yaw }), count: 1 }]]),
    });
    const ctx = cv.getContext('2d');
    if (ctx) {
      const clamped = new Uint8ClampedArray(w * h * 4);
      clamped.set(bytes.subarray(0, w * h * 4));
      ctx.putImageData(new ImageData(clamped, w, h), 0, 0);
    }
    st.dirty = false;
    const feet = st.cam.project(0, sub.floor, 0);
    const wide = st.box?.getBoundingClientRect().width || box.width;
    if (feet && st.box) {
      st.box.style.setProperty('--feet', (feet.y * 100).toFixed(1) + '%');
      st.box.style.setProperty('--floor', (((sub.ring * 2) / across) * (box.width / wide) * 100).toFixed(1) + '%');
    }
  }

  private daylight(): RenderEnv {
    return { ...this.game.env, night: 0, gold: 0, realm: 0 };
  }

  private drawElders(): void {
    const g = this.game;
    const W = 520;
    const H = 400;
    const cam = this.elderCam || (this.elderCam = new Camera());
    const sheet = Object.assign(document.createElement('canvas'), { width: W, height: H });
    const ctx = sheet.getContext('2d');
    if (!ctx) return;
    const env = this.daylight();

    for (const id of Object.keys(CREATURES) as CreatureId[]) {
      const d = CREATURES[id];
      if (!d.boss || !d.giant) continue;
      const [action, tall, mid] = d.sit || [0, d.height * 1.4, d.height * 0.5];
      stand(cam, W / H, tall, (tall * W) / H, mid, 24 * RAD, -9 * RAD);
      const fig: PackInput = {
        scale: 1,
        seed: 0.37,
        colors: pencils(d.colors),
        yaw: -0.5,
        action,
        actionT: 0.5,
      };
      const bytes = g.renderer.figure({
        width: W,
        height: H,
        dpr: 1.4,
        camera: cam,
        env,
        time: 0.4,
        batches: new Map([[d.archetype, { data: pack(fig), count: 1 }]]),
      });
      const clamped = new Uint8ClampedArray(W * H * 4);
      clamped.set(bytes.subarray(0, W * H * 4));
      ctx.putImageData(new ImageData(clamped, W, H), 0, 0);
      this.elders[id] = sheet.toDataURL('image/png');
    }
    g.bus.emit('portrait', { bust: this.bust, elders: this.elders });
  }

  private drawGear(): void {
    const g = this.game;
    const p = g.player;
    const size = 144;
    const cam = this.gearCam || (this.gearCam = new Camera());
    const sheet =
      this.gearSheet || (this.gearSheet = Object.assign(document.createElement('canvas'), { width: size, height: size }));
    const ctx = sheet.getContext('2d');
    if (!ctx) return;
    const env = this.daylight();
    const people = p.build ?? Math.round(p.extra);

    for (const id of Object.keys(BASES) as GearBaseId[]) {
      const b = BASES[id];
      const span = SPAN[id] || 1;
      stand(cam, 1, span, span, 0, 12 * RAD, 0);
      const fig: PackInput = {
        scale: 1,
        seed: 0.37,
        colors: p.colors,
        extra: PIECE(b),
        kit: people,
        yaw:
          b.slot === 'weapon'
            ? 0
            : b.slot === 'frame'
              ? 0.5
              : b.slot === 'boots'
                ? 1.1
                : b.slot === 'visor'
                  ? 0.55
                  : 0.45,
      };
      const bytes = g.renderer.figure({
        width: size,
        height: size,
        dpr: 1.2,
        camera: cam,
        env,
        time: 0,
        batches: new Map([['gear', { data: pack(fig), count: 1 }]]),
      });
      const clamped = new Uint8ClampedArray(size * size * 4);
      clamped.set(bytes.subarray(0, size * size * 4));
      ctx.putImageData(new ImageData(clamped, size, size), 0, 0);
      this.gear[id] = sheet.toDataURL('image/png');
    }
    g.bus.emit('portrait', { bust: this.bust, gear: this.gear });
  }

  private take(): void {
    const g = this.game;
    const r = g.renderer;
    const cam = g.camera;
    const p = g.player;
    const view = g.view;
    const size = { ...r.size };
    const scale = r.scale;
    const paper = { ...r.paper };
    const map: [number, number, number, number] = [...r.minimap.rect];
    const keep = {
      y: p.y,
      yaw: p.yaw,
      lift: p.lift,
      action: p.action,
      actionT: p.actionT,
      move: p.move,
      walk: p.walk,
      grow: p.grow,
      pose: p.pose,
      flash: p.flash,
      shade: p.shade,
    };
    const was = {
      rail: cam.rail,
      shake: cam.shake,
      cloud: g.env.cloud,
      fade: g.look.fade,
      veil: g.look.veil,
      hurt: g.look.hurt,
    };

    Object.assign(p, {
      y: p.y + 70,
      yaw: Math.PI,
      lift: 0,
      action: 0,
      actionT: 0,
      move: 0,
      walk: 0,
      grow: 1,
      pose: undefined,
      flash: 0,
      shade: 1,
    });
    view.only = p;
    g.env.cloud = 1.7;
    g.look.fade = 1;
    g.look.veil = 0;
    g.look.hurt = 0;
    cam.shake = 0;
    r.scale = 1.4;
    r.minimap.rect = [0, 0, 0, 0];

    const tall = ((p.height * 1.02) / 1.6) * 1.95;
    const shot = (w: number, h: number, fit: number, mid: number, lens: number, turn: number) => {
      const D = (fit / 2 / Math.tan((lens * RAD) / 2)) * 1.04;
      const t = turn + Math.PI;
      const cy = p.y + tall * mid;
      r.resize(w, h, 2);
      r.paper.a = null;
      r.paper.b = null;
      r.paper.mix = 0;
      cam.rail = {
        pos: [p.x + Math.sin(t) * Math.cos(UP) * D, cy - Math.sin(UP) * D, p.z + Math.cos(t) * Math.cos(UP) * D],
        look: [p.x, cy, p.z],
        lens: lens * RAD,
        mix: 1,
      };
      cam.update(0, [p.x, p.y + 1, p.z], w / h, null);
      r.render(view.build(g.time));
      return g.canvas.toDataURL('image/webp', 0.9);
    };
    this.bust = shot(176, 176, tall * 0.5, 0.62, 9, 0.4);

    Object.assign(p, keep);
    view.only = null;
    cam.rail = was.rail;
    cam.shake = was.shake;
    g.env.cloud = was.cloud;
    g.look.fade = was.fade;
    g.look.veil = was.veil;
    g.look.hurt = was.hurt;
    r.scale = scale;
    Object.assign(r.paper, paper);
    r.minimap.rect = map;
    r.resize(size.cssW, size.cssH, size.dpr);
    g.bus.emit('portrait', { bust: this.bust });
  }
}
