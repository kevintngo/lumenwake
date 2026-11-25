import { CHAPTERS, STEPS, TIPS, type TutorialStepDef, type TutorialTipDef } from '../data/tutorial';
import type { Entity, NpcEntity, SiteEntity } from '../types/entity';
import type { GameEventMap } from '../types/events';
import type { GameContext, TutorialLike } from '../types/game-context';
import type { CameraGoal } from '../types/render';

const KEY = 'lumenwake.firststeps';
const LOOKAHEAD = 3;

export class Tutorial implements TutorialLike {
  private readonly game: GameContext;
  private i = -1;
  time = 0;
  goal: Entity | { x: number; y?: number; z: number } | null = null;
  count: Record<string, number> = {};
  private hidden = false;
  private tip: { def: TutorialTipDef; left: number } | null = null;
  private tipped: Record<string, boolean> = {};
  private from: CameraGoal | null = null;
  private pulse = 0;
  private look = 0;

  constructor(game: GameContext) {
    this.game = game;
    const bus = game.bus;
    bus.on('begin', () => this.begin());
    bus.on('guide:skip', (d) => this.finish(true, Boolean(d && d.quiet)));
    bus.on('guide:restart', () => this.restart());

    const events = new Set<keyof GameEventMap>();
    for (const s of STEPS) if (s.on) events.add(s.on);
    for (const t of TIPS) {
      if (t.on) events.add(t.on);
      if (t.until) events.add(t.until);
    }
    for (const ev of events) {
      bus.onDynamic(ev, (payload) => this.heard(ev, payload));
    }
    bus.on('mission:report', (r) => {
      if (this.running && !r.won) this.go(STEPS.findIndex((s) => s.id === 'talk'));
    });
  }

  get running(): boolean {
    return this.i >= 0;
  }

  private get step(): TutorialStepDef | null {
    return this.i >= 0 ? STEPS[this.i] : null;
  }

  private seen(): boolean {
    try {
      return localStorage.getItem(KEY) === 'done' && !/[?&]firststeps\b/.test(location.search);
    } catch {
      return false;
    }
  }

  private remember(): void {
    try {
      localStorage.setItem(KEY, 'done');
    } catch {
    }
  }

  private begin(): void {
    if (this.seen() || this.game.player.sheet.missions > 0) return;
    this.start();
  }

  private start(): void {
    const g = this.game;
    g.player.sheet.first = true;
    if (!g.missions.active && !g.missions.pending) g.missions.refresh();
    this.go(0);
  }

  private restart(): void {
    if (this.game.missions.active) return;
    this.tipped = {};
    this.start();
  }

  private go(i: number): void {
    const g = this.game;
    while (i < STEPS.length && STEPS[i].skip && STEPS[i].skip!(g, this)) i++;
    if (i >= STEPS.length) {
      this.finish(false);
      return;
    }
    const before = this.step;
    this.i = i;
    this.time = 0;
    this.count = {};
    this.goal = null;
    this.pulse = 0;
    this.from = { ...g.camera.goal };
    const s = STEPS[i];
    if (!before || before.chapter !== s.chapter) {
      g.bus.emit('guide:chapter', { id: s.chapter, title: CHAPTERS[s.chapter] });
    }
    if (s.enter) s.enter(g, this);
    this.announce();
  }

  private next(): void {
    if (this.step) this.game.bus.emit('guide:step', { id: this.step.id });
    this.go(this.i + 1);
  }

  private finish(skipped: boolean, quiet = false): void {
    const g = this.game;
    const was = this.running;
    this.i = -1;
    this.goal = null;
    if (
      skipped &&
      g.player.sheet.first &&
      !g.missions.active &&
      !(g.missions.pending && g.missions.pending.first)
    ) {
      g.player.sheet.first = false;
      g.missions.refresh();
    }
    if (!quiet) this.remember();
    g.bus.emit('guide', null);
    g.bus.emit('guide:goal', null);
    if (was || skipped) g.bus.emit('guide:done', { skipped, quiet });
  }

  private announce(): void {
    const g = this.game;
    const s = this.step;
    if (!s || this.hidden) return;
    const mates = STEPS.filter((o) => o.chapter === s.chapter);
    g.bus.emit('guide', {
      title: CHAPTERS[s.chapter],
      index: mates.indexOf(s),
      total: mates.length,
      text: s.text,
      touch: s.touch,
      keys: s.keys,
      spot: s.spot,
      touchSpot: s.touchSpot,
    });
    this.aim(true);
  }

  target(name: string): Entity | { x: number; y?: number; z: number } | null {
    const g = this.game;
    const p = g.player;
    const w = g.world;
    if (!name) return null;
    const nearest = <T extends { x: number; z: number }>(list: readonly T[]): T | null =>
      list.reduce<T | null>(
        (best, e) => (!best || Math.hypot(e.x - p.x, e.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? e : best),
        null,
      );

    if (name === 'npc:bounty') {
      return g.entities.list.find((e) => e.kind === 'npc' && (e as NpcEntity).role === 'bounty') || null;
    }
    if (name === 'pad') {
      const s = w.structures.find((o) => o.role === 'deploy');
      return s ? { x: s.x, y: w.surface(s.x, s.z), z: s.z } : null;
    }
    if (name === 'foe') return nearest(g.monsters.filter((m) => !m.dead && !m.boss));
    if (name === 'boss') return g.monsters.find((m) => m.boss && !m.dead) || null;
    if (name === 'drop') return nearest(g.loot.drops.filter((d) => !d.gone));
    if (name === 'pod') {
      const a = g.missions.active;
      const s = nearest(
        w.structures.filter(
          (o) => o.role === 'pod' && !o.pal && !o.terrace && (!a || a.rooms[o.room].state === 'clear'),
        ),
      );
      return s ? { x: s.x, y: w.surface(s.x, s.z), z: s.z } : null;
    }
    if (name === 'gap') {
      const l = w.nav.links.find((k) => k.gap && k.part !== 2);
      if (!l) return null;
      const along = (p.x - l.ax) * l.ux + (p.z - l.az) * l.uz;
      const t = l.tmax - 0.7;
      const far = w.rooms[l.b];
      return along > l.tmax + 0.4
        ? { x: far.x, y: w.surface(far.x, far.z), z: far.z }
        : { x: l.ax + l.ux * t, y: w.surface(l.ax + l.ux * t, l.az + l.uz * t), z: l.az + l.uz * t };
    }
    if (name.startsWith('site:')) {
      const siteId = name.slice(5);
      return g.entities.list.find((e) => e.kind === 'site' && (e as SiteEntity).site === siteId && !e.gone) || null;
    }
    if (name.startsWith('room:')) {
      const want = name.slice(5);
      const r = /^\d+$/.test(want) ? w.rooms[+want] : w.rooms.find((q) => q.kind === want);
      return r ? { x: r.x, y: w.surface(r.x, r.z), z: r.z } : null;
    }
    return null;
  }

  private aim(force = false): void {
    const s = this.step;
    const goal = s && s.point ? this.target(s.point) : null;
    const same =
      goal === this.goal ||
      (goal !== null &&
        this.goal !== null &&
        !('kind' in goal) &&
        !('kind' in this.goal) &&
        goal.x === this.goal.x &&
        goal.z === this.goal.z);
    if (same && !force) return;
    this.goal = goal;
    this.game.bus.emit('guide:goal', goal);
  }

  near(d: number): boolean {
    const p = this.game.player;
    const t = this.goal;
    return Boolean(t) && Math.hypot(t!.x - p.x, t!.z - p.z) < d;
  }

  turned(): boolean {
    const c = this.game.camera.goal;
    const f = this.from;
    return (
      Boolean(f) &&
      (Math.abs(c.yaw - f!.yaw) > 0.45 ||
        Math.abs(c.pitch - f!.pitch) > 0.18 ||
        Math.abs(c.distance / f!.distance - 1) > 0.14)
    );
  }

  private heard(ev: keyof GameEventMap, payload: unknown): void {
    const g = this.game;
    if (this.tip && this.tip.def.until === ev) this.endTip();
    for (const t of TIPS) {
      if (t.on === ev && !this.tipped[t.id]) this.showTip(t);
    }
    if (!this.running) return;
    this.count[ev] = (this.count[ev] || 0) + 1;
    const current = this.step;
    for (let k = this.i; k <= Math.min(this.i + LOOKAHEAD, STEPS.length - 1); k++) {
      const s = STEPS[k];
      if (s.on !== ev || (s.if && !s.if(payload, g, this))) continue;
      if (k !== this.i && current && s.chapter !== current.chapter) break;
      this.i = k;
      this.next();
      return;
    }
  }

  private showTip(def: TutorialTipDef): void {
    this.tipped[def.id] = true;
    this.tip = { def, left: def.seconds };
    this.game.bus.emit('guide:tip', {
      text: def.text,
      touch: def.touch,
      keys: def.keys,
      spot: def.spot,
      touchSpot: def.touchSpot,
    });
  }

  private endTip(): void {
    this.tip = null;
    this.game.bus.emit('guide:tip', null);
  }

  update(dt: number): void {
    const g = this.game;
    if (g.paused) return;
    const hide = g.cinema.blocking;
    if (hide !== this.hidden) {
      this.hidden = hide;
      if (hide) {
        g.bus.emit('guide', null);
        g.bus.emit('guide:goal', null);
      } else {
        this.announce();
      }
    }

    if (this.tip) {
      this.tip.left -= dt;
      if (this.tip.left <= 0 || (this.tip.def.when && !this.tip.def.when(g, this))) this.endTip();
    } else if (!hide) {
      for (const t of TIPS) {
        if (t.when && !this.tipped[t.id] && t.when(g, this)) {
          this.showTip(t);
          break;
        }
      }
    }

    const s = this.step;
    if (!s || hide) return;
    this.time += dt;
    if ((this.look -= dt) <= 0) {
      this.look = 0.3;
      this.aim();
    }
    const t = this.goal;
    if (t && (!('kind' in t) || t.kind === 'drop') && (this.pulse -= dt) <= 0) {
      this.pulse = 0.9;
      g.fx.click(t.x, t.y ?? g.world.surface(t.x, t.z), t.z);
    }
    if ((s.when && s.when(g, this)) || (s.auto && this.time > s.auto)) this.next();
  }
}
