import type { ArchetypeId, RgbTuple } from '../types/domain';
import type { Entity, EntityKind } from '../types/entity';

export const yawFromDir = (dx: number, dz: number): number => Math.atan2(-dx, dz);

export const dirFromYaw = (yaw: number): [number, number] => [-Math.sin(yaw), Math.cos(yaw)];

export function makeEntity<T extends Entity = Entity>(
  kind: EntityKind,
  archetype: ArchetypeId,
  props?: Partial<T> & Record<string, unknown>,
): T {
  const base: Entity = {
    id: 0,
    kind,
    archetype,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    scale: 1,
    grow: 1,
    radius: 0.4,
    height: 1.4,
    move: 0,
    walk: 0,
    action: 0,
    actionT: 0,
    actionDur: 0.4,
    flash: 0,
    shade: 1,
    seed: Math.random(),
    colors: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    extra: 0,
    lift: 0,
    ghost: false,
    hover: false,
    dead: false,
    gone: false,
    name: '',
    level: 1,
    hp: 1,
    maxHp: 1,
  };
  return Object.assign(base, props) as T;
}

export const pencils = (list: readonly RgbTuple[]): number[][] =>
  list.map((c) => [c[0] / 255, c[1] / 255, c[2] / 255]);

export class Entities {
  readonly list: Entity[] = [];
  private readonly byId = new Map<number, Entity>();
  private nextId = 1;

  add<T extends Entity>(e: T): T {
    e.id = this.nextId++;
    this.list.push(e);
    this.byId.set(e.id, e);
    return e;
  }

  sweep(): void {
    const list = this.list;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.gone) this.byId.delete(e.id);
      else list[w++] = e;
    }
    list.length = w;
  }

  nearest<T extends Entity = Entity>(
    kind: EntityKind,
    x: number,
    z: number,
    range: number,
    filter?: (e: T) => boolean,
  ): T | null {
    let best: T | null = null;
    let bd = range;
    for (const e of this.list) {
      if (e.kind !== kind || e.dead) continue;
      const typed = e as T;
      if (filter && !filter(typed)) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bd) {
        bd = d;
        best = typed;
      }
    }
    return best;
  }
}
