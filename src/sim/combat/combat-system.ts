import type { Entity, MonsterEntity, PlayerEntity } from '../../types/entity';
import type { CombatLike, GameContext } from '../../types/game-context';
import { POINTS_PER_LEVEL, derive, xpFactor, xpToNext } from '../character/stats';
import { rank, rollOffer } from '../character/talents';
import { rand } from '../sim-rng';
import { applyKnockback, getMonsterExtras, provokeMonster } from './monster-specials';

const HOLD = { hit: 0.03, crit: 0.06, kill: 0.07, elder: 0.13, taken: 0.05 } as const;

export class Combat implements CombatLike {
  private readonly game: GameContext;

  constructor(game: GameContext) {
    this.game = game;
  }

  strike(target: Entity, mult = 1, flat = 0, canCrit = true, indirect = false): number {
    const g = this.game;
    const p = g.player;
    if (!target || target.dead) return 0;
    const crit = canCrit && rand() < p.crit;
    const more = target.kind === 'monster' ? g.relics.more(target as MonsterEntity) : 1;
    const amount =
      (p.attack * mult + flat) *
      (0.9 + rand() * 0.2) *
      (crit ? p.critDamage || 1.65 : 1) *
      more;
    const dealt = this.damage(target, Math.max(1, Math.round(amount)), p, crit, false, indirect);
    if (!indirect && target.kind === 'monster') g.relics.landedOn(target as MonsterEntity);
    return dealt;
  }

  maul(monster: MonsterEntity): void {
    const g = this.game;
    const p = g.player;
    if (p.dead || p.invuln > 0) return;
    if (Math.hypot(p.x - monster.x, p.z - monster.z) > monster.def.range + monster.radius + 0.55) {
      g.bus.emit('miss', { target: p, text: 'Dodged' });
      return;
    }
    this.hurt(monster, 1);
  }

  hurt(monster: MonsterEntity, mult = 1, quiet = false, ground = false): void {
    const g = this.game;
    const p = g.player;
    if (p.dead) return;
    if (ground && (p.air || 0) > 0.45) {
      g.bus.emit('miss', { target: p, text: 'Jumped' });
      return;
    }
    if (p.invuln > 0 || rand() < p.dodge) {
      if (!quiet) g.bus.emit('miss', { target: p, text: 'Dodged' });
      return;
    }
    const raw = monster.atk * mult * (0.85 + rand() * 0.3) * (p.ward ?? 1);
    this.damage(p, Math.max(1, Math.round((raw * 30) / (30 + p.defense))), monster, false);
  }

  damage(
    target: Entity,
    amount: number,
    source: Entity | null,
    crit: boolean,
    soft = false,
    indirect = false,
  ): number {
    const g = this.game;
    if (target.dead) return 0;
    let finalAmount = amount;
    if (target.kind === 'monster' && (target as MonsterEntity).guard) {
      finalAmount = Math.max(1, Math.round(finalAmount * 0.2));
    }
    if (target.kind === 'player' && finalAmount >= target.hp && g.relics.vigil()) return 0;
    target.hp = Math.max(0, target.hp - finalAmount);
    target.flash = soft ? Math.max(target.flash || 0, 0.4) : 1;
    const inSpecial = target.kind === 'monster' && (target as MonsterEntity).ai.state === 'special';
    if (!soft && target.action !== 1 && target.action !== 5 && !inSpecial) {
      target.action = 3;
      target.actionT = 0;
      target.actionDur = 0.22;
    }
    g.bus.emit('damage', { target, amount: finalAmount, crit, source, soft, indirect });

    if (target.kind === 'monster') {
      const m = target as MonsterEntity;
      provokeMonster(m);
      const fell = m.hp <= 0;
      const big = m.elite || m.boss;
      if (!soft && source) {
        const dx = m.x - source.x;
        const dz = m.z - source.z;
        const d = Math.hypot(dx, dz) || 1;
        const shove = m.guard || m.ai.state === 'special' || m.def.giant ? 0 : crit ? 3.2 : 1.8;
        applyKnockback(m, (dx / d) * shove, (dz / d) * shove);
      }
      if (!soft || fell) {
        g.bus.emit('feel', {
          hold: m.guard
            ? 0
            : fell
              ? big
                ? HOLD.elder
                : HOLD.kill
              : crit
                ? HOLD.crit
                : HOLD.hit,
          shake: fell && big ? 0.7 : crit ? 0.32 : 0,
        });
      }
      if (fell) this.slay(m);
    } else if (target.kind === 'player') {
      const p = target as PlayerEntity;
      p.calm = 0;
      const heavy = finalAmount >= p.maxHp * 0.08;
      g.bus.emit('feel', { hold: heavy ? HOLD.taken : 0, shake: heavy ? 0.5 : 0.25, hurt: 1 });
      if (p.hp <= 0) this.fall(p);
      else if (source && source.kind === 'monster') g.relics.struck(source as MonsterEntity);
    }
    return finalAmount;
  }

  slay(m: MonsterEntity): void {
    const g = this.game;
    const p = g.player;
    m.dead = true;
    m.deathT = 0;
    if (p.target === m) p.target = null;
    const gained = Math.max(1, Math.round(m.xp * xpFactor(p.level, m.level)));
    g.bus.emit('monster:died', m);
    p.focus = Math.min(p.maxFocus, p.focus + 5 * rank(p.sheet, 'second'));
    if (p.lifeOnKill) p.hp = Math.min(p.maxHp, p.hp + p.lifeOnKill);
    if (m.def.fall) {
      p.invuln = Math.max(p.invuln, m.def.fall + 1.5);
      m.ai.state = 'idle';
      m.ai.sp = null;
      getMonsterExtras(m).spState = null;
      m.guard = false;
      m.lift = 0;
      for (const o of g.monsters) {
        if (o !== m && !o.dead && (o.called || (m.boss && o.room === m.room))) {
          o.dead = true;
          o.deathT = 0;
          g.bus.emit('monster:died', o);
        }
      }
      g.hazards.clear();
      g.bus.emit('boss:fell', m);
    } else {
      g.loot.dropFrom(m);
      if (m.burst) g.hazards.burst(m, m.burst[0], m.burst[1], m.burst[2]);
    }
    g.relics.felled(m);
    this.grantXp(gained);
    g.missions.onKill();
  }

  grantXp(n: number): void {
    const g = this.game;
    const s = g.player.sheet;
    s.xp += n;
    g.bus.emit('xp', { amount: n });
    while (s.xp >= xpToNext(s.level)) {
      s.xp -= xpToNext(s.level);
      s.level++;
      s.points += POINTS_PER_LEVEL;
      s.picks = (s.picks || 0) + 1;
      if (!s.offer) s.offer = rollOffer(s);
      if (!s.offer) s.picks = 0;
      derive(g.player);
      g.player.hp = g.player.maxHp;
      g.player.focus = g.player.maxFocus;
      g.bus.emit('levelup', { level: s.level });
    }
  }

  fall(p: PlayerEntity): void {
    p.dead = true;
    p.respawnT = 3.2;
    p.target = null;
    p.moveTo = null;
    this.game.bus.emit('player:died');
  }
}
