import type { DropEntity, Entity, MonsterEntity, NpcEntity } from '../../types/entity';
import type { GameContext } from '../../types/game-context';
import { boxOf } from '../settings';

const GAP = 4;
const RISE = 44;

const SIZES: Readonly<Record<string, readonly [number, number]>> = {
  '': [27, 22],
  hurt: [27, 22],
  crit: [38, 30],
  heal: [22, 18],
  xp: [20, 18],
  miss: [20, 18],
  rot: [19, 16],
};

interface PlateBox {
  l: number;
  r: number;
  t: number;
  b: number;
  hud?: boolean;
}

interface PlateNode {
  el: HTMLDivElement;
  fill: HTMLElement | null;
  hp: number;
  w: number;
  h: number;
  lift: number;
  shown: boolean;
  goal: boolean;
}

interface FloaterEntry {
  e: Entity | null;
  x: number;
  y: number;
  z: number;
  dx: number;
  ph: number;
  el: HTMLDivElement;
  t: number;
  life: number;
  w: number;
  h: number;
  up: number;
}

function isDropRare(d: DropEntity): boolean {
  if (d.gear) return d.gear.rarity >= 2;
  return d.item === 'core';
}

export class PlatesOverlay {
  private readonly game: GameContext;
  private readonly root: HTMLElement;
  private readonly floatRoot: HTMLElement;
  private readonly nodes = new Map<number, PlateNode>();
  private readonly floaters: FloaterEntry[] = [];
  private readonly pool: HTMLDivElement[] = [];
  private readonly hud: PlateBox[] = [];
  private hudAge = 99;
  private hudSig = -1;
  private readonly unsubs: (() => void)[] = [];

  constructor(game: GameContext, root: HTMLElement, floatRoot: HTMLElement) {
    this.game = game;
    this.root = root;
    this.floatRoot = floatRoot;

    const bus = game.bus;
    this.unsubs.push(
      bus.on('damage', (d) =>
        this.float(
          d.target,
          String(d.amount),
          d.target.kind === 'player' ? 'hurt' : d.soft ? 'rot' : d.crit ? 'crit' : '',
        ),
      ),
      bus.on('miss', (d) => this.float(d.target, d.text, 'miss')),
      bus.on('xp', (d) => {
        const p = game.player;
        this.floatAt(p.x, p.y + 2.5, p.z, `+${d.amount} xp`, 'xp');
      }),
      bus.on('heal', (d) => {
        if (!d.focus) this.floatAt(d.entity.x, d.entity.y + 2.1, d.entity.z, 'Mended', 'heal');
      }),
    );
  }

  float(e: Entity, text: string, cls: string): void {
    let slot = 0;
    for (const o of this.floaters) if (o.e === e && o.t < 0.5) slot++;
    const dx = slot ? (slot % 2 ? 1 : -1) * Math.ceil(slot / 2) * 36 : 0;
    this.push(e, 0, 0, 0, text, cls, dx);
  }

  floatAt(x: number, y: number, z: number, text: string, cls: string): void {
    this.push(null, x, y, z, text, cls, 0);
  }

  private push(e: Entity | null, x: number, y: number, z: number, text: string, cls: string, dx: number): void {
    const el = this.pool.pop() || this.floatRoot.appendChild(document.createElement('div'));
    el.className = cls ? `fl ${cls}` : 'fl';
    el.textContent = text;
    el.style.display = '';
    const size = (SIZES[cls] || SIZES[''])[this.game.touch ? 1 : 0];
    this.floaters.push({
      e,
      x,
      y,
      z,
      dx,
      ph: 0,
      el,
      t: 0,
      life: cls === 'crit' ? 1.1 : 0.9,
      w: text.length * size * 0.58 + 8,
      h: size + 2,
      up: 0,
    });
  }

  readHud(): void {
    const hud = this.hud;
    hud.length = 0;
    const nodes = document.querySelectorAll(
      '#ui > section:not(#log), #hero > section, #hero > nav, #log p, #toast.show, #place, body.touch #hotbar .slot',
    );
    for (const el of nodes) {
      if ((el as HTMLElement).hidden) continue;
      const r = boxOf(el);
      if (r.width > 2 && r.height > 2) {
        hud.push({ l: r.left, t: r.top, r: r.right, b: r.bottom, hud: true });
      }
    }
  }

  update(dt: number): void {
    const g = this.game;
    const cam = g.camera;
    const p = g.player;
    const W = g.renderer.size.cssW;
    const H = g.renderer.size.cssH;

    const toast = document.getElementById('toast');
    const log = document.getElementById('log');
    const target = document.getElementById('target');
    const tracker = document.getElementById('tracker');
    const sig =
      (toast && toast.classList.contains('show') ? 1 + (toast.textContent?.length || 0) * 64 : 0) +
      (target && !target.hidden ? 2 : 0) +
      (tracker && !tracker.hidden ? 4 : 0) +
      (log ? log.childElementCount * 8 : 0);
    if (sig !== this.hudSig || (this.hudAge += dt) > 0.5) {
      this.hudSig = sig;
      this.hudAge = 0;
      this.readHud();
    }

    const placed: PlateBox[] = [];
    const blocked = (l: number, r: number, lift: number, y: number, h: number): PlateBox | null => {
      const b = y - lift;
      const t = b - h;
      for (const o of this.hud) {
        if (l < o.r + GAP && r > o.l - GAP && t < o.b + GAP && b > o.t - GAP) return o;
      }
      for (const o of placed) {
        if (l < o.r + GAP && r > o.l - GAP && t < o.b + GAP && b > o.t - GAP) return o;
      }
      return null;
    };

    const goal = g.tutorial.goal;
    const want: { e: Entity; x: number; y: number; rank: number; marked: boolean }[] = [];
    for (const e of g.entities.list) {
      if (e.kind === 'player' || e.dead || e.grow < 0.6) continue;
      const dist = Math.hypot(e.x - p.x, e.z - p.z);
      const marked = goal === e;
      let show = false;
      if (e.kind === 'npc') {
        show = dist < 30;
      } else if (e.kind === 'monster') {
        const m = e as MonsterEntity;
        show =
          !m.boss &&
          dist < 40 &&
          (marked ||
            m.hover ||
            m === p.target ||
            m.hp < m.maxHp ||
            m.elite ||
            m.ai.state === 'chase' ||
            m.ai.state === 'attack');
      } else if (e.kind === 'drop') {
        const d = e as DropEntity;
        show = dist < 9 && d.age > 0.4;
      } else if (e.kind === 'site') {
        show = dist < 16;
      }
      if (!show) continue;
      const s = cam.project(e.x, e.y + e.height + 0.25 + e.lift, e.z);
      if (!s || s.x < -0.1 || s.x > 1.1 || s.y < -0.1 || s.y > 1.1) continue;
      const isElite = e.kind === 'monster' && (e as MonsterEntity).elite;
      const rank =
        e === p.target
          ? 0
          : marked
            ? 0.5
            : e.hover
              ? 1
              : e.kind === 'npc'
                ? 2 + dist * 0.01
                : e.kind === 'drop'
                  ? 200 + dist
                  : (isElite ? 5 : 10) + dist;
      want.push({ e, x: s.x * W, y: s.y * H, rank, marked });
    }
    want.sort((a, b) => a.rank - b.rank);

    const seen = new Set<number>();
    for (const it of want) {
      const e = it.e;
      seen.add(e.id);
      let n = this.nodes.get(e.id);
      if (!n) {
        const el = this.root.appendChild(document.createElement('div'));
        let cls = 'np';
        if (e.kind === 'npc') cls += ' npc';
        else if (e.kind === 'drop') cls += isDropRare(e as DropEntity) ? ' loot rare' : ' loot';
        else if (e.kind === 'site') cls += ' site';
        else if (e.kind === 'monster' && (e as MonsterEntity).elite) cls += ' elite';
        el.className = cls;

        let fill: HTMLElement | null = null;
        if (e.kind === 'monster') {
          el.appendChild(document.createTextNode(e.name));
          const sm = document.createElement('small');
          sm.textContent = `Lv ${e.level}`;
          el.appendChild(sm);
          const mini = document.createElement('span');
          mini.className = 'mini';
          fill = document.createElement('i');
          mini.appendChild(fill);
          el.appendChild(mini);
        } else if (e.kind === 'npc') {
          el.appendChild(document.createTextNode(e.name));
          const sm = document.createElement('small');
          sm.textContent = (e as NpcEntity).title || '';
          el.appendChild(sm);
        } else {
          el.textContent = e.name;
        }
        n = { el, fill, hp: -1, w: el.offsetWidth, h: el.offsetHeight, lift: 0, shown: true, goal: false };
        this.nodes.set(e.id, n);
      }

      if (n.goal !== it.marked) {
        n.goal = it.marked;
        n.el.classList.toggle('goal', n.goal);
      }

      const l = it.x - n.w / 2;
      const r = it.x + n.w / 2;
      let need = 0;
      let room = false;
      for (let tries = 0; tries < 6 && !room; tries++) {
        const hit = blocked(l, r, need, it.y, n.h);
        if (!hit) room = true;
        else if (hit.hud || need > 90) break;
        else need = it.y - hit.t + GAP;
      }

      if (room !== n.shown) {
        n.shown = room;
        n.el.style.visibility = room ? '' : 'hidden';
        if (!room) n.lift = 0;
      }
      if (!room) continue;

      let lift = need;
      if (n.lift > need) {
        lift = Math.max(need, n.lift - 120 * dt);
        if (blocked(l, r, lift, it.y, n.h)) lift = need;
      }
      n.lift = lift;
      placed.push({ l, r, t: it.y - lift - n.h, b: it.y - lift });
      n.el.style.transform = `translate(${it.x.toFixed(1)}px, ${(it.y - n.lift).toFixed(1)}px) translate(-50%, -100%)`;
      if (n.fill && n.hp !== e.hp) {
        n.hp = e.hp;
        n.fill.style.transform = `scaleX(${Math.max(0, e.hp / e.maxHp).toFixed(3)})`;
      }
    }

    for (const [id, n] of this.nodes) {
      if (!seen.has(id)) {
        n.el.remove();
        this.nodes.delete(id);
      }
    }

    let w = 0;
    for (const f of this.floaters) {
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) {
        f.el.style.display = 'none';
        this.pool.push(f.el);
        continue;
      }
      let x = 0;
      let y = 0;
      let s = null;
      if (f.e) {
        const e = f.e;
        const n = this.nodes.get(e.id);
        if (n) f.ph = n.shown ? n.h + n.lift : 0;
        const top = e.hitY ? e.hitY + 1.2 : e.height + 0.25 + (e.lift || 0);
        s = e.hitY
          ? cam.project(e.x + (p.x - e.x) * 0.5, e.y + top, e.z + (p.z - e.z) * 0.5)
          : cam.project(e.x, e.y + top, e.z);
        if (s) {
          x = s.x * W + f.dx;
          y = s.y * H - f.ph - 3 - k * RISE;
        }
      } else {
        s = cam.project(f.x, f.y + k * 1.1, f.z);
        if (s) {
          x = s.x * W;
          y = s.y * H + f.h / 2;
        }
      }
      if (s) {
        const l = x - f.w / 2;
        const r = x + f.w / 2;
        for (let tries = 0; tries < 6; tries++) {
          const b = y - f.up;
          const t = b - f.h;
          let hit: PlateBox | null = null;
          for (const o of placed) {
            if (l < o.r + 2 && r > o.l - 2 && t < o.b + 2 && b > o.t - 2) {
              hit = o;
              break;
            }
          }
          if (!hit) break;
          f.up = y - hit.t + 3;
        }
        placed.push({ l, r, t: y - f.up - f.h, b: y - f.up });
        f.el.style.transform = `translate(${x.toFixed(1)}px, ${(y - f.up).toFixed(1)}px) translate(-50%, -100%)`;
        f.el.style.opacity = k < 0.6 ? '1' : (1 - (k - 0.6) / 0.4).toFixed(2);
      } else {
        f.el.style.opacity = '0';
      }
      this.floaters[w++] = f;
    }
    this.floaters.length = w;
  }

  destroy(): void {
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
    for (const n of this.nodes.values()) n.el.remove();
    this.nodes.clear();
    for (const f of this.floaters) f.el.remove();
    this.floaters.length = 0;
    for (const el of this.pool) el.remove();
    this.pool.length = 0;
  }
}
