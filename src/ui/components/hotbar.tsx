import type { ComponentChildren } from '../dom';
import { useEffect, useRef, useState } from '../dom';
import { ITEMS } from '../../data/items';
import type { ClassId, ItemId } from '../../types/domain';
import type { GameContext } from '../../types/game-context';
import { ACT_ICONS, itemIcon, SKILL_ICONS } from '../icons';
import { getSkillList, type RichSkillEntry } from '../ui-helpers';

export interface HotbarSnapshot {
  cls: ClassId;
  skillLocked: readonly [boolean, boolean, boolean, boolean];
  skillDry: readonly [boolean, boolean, boolean, boolean];
  skillCdPct: readonly [number, number, number, number];
  tonicCount: number;
  draughtCount: number;
  actMode: 'attack' | 'talk' | 'idle';
}

interface HotbarProps {
  game: GameContext;
  hud: HotbarSnapshot;
}

const DRINKS: readonly (readonly [ItemId, string])[] = [
  ['tonic', 'R'],
  ['draught', 'T'],
];

interface SlotButtonProps {
  className: string;
  keyLabel: string;
  title: string;
  ariaLabel: string;
  coolPct?: number;
  count?: number;
  onTrigger: () => void;
  onActDown?: (e: PointerEvent) => void;
  onActUp?: () => void;
  children: ComponentChildren;
}

function SlotButton({
  className,
  keyLabel,
  title,
  ariaLabel,
  coolPct = 0,
  count,
  onTrigger,
  onActDown,
  onActUp,
  children,
}: SlotButtonProps) {
  const touchedRef = useRef(-1e9);

  return (
    <button
      type="button"
      class={className}
      title={title}
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        if (onActDown) onActDown(e);
        if (e.pointerType !== 'touch') return;
        touchedRef.current = performance.now();
        onTrigger();
      }}
      onPointerUp={onActUp}
      onPointerCancel={onActUp}
      onLostPointerCapture={onActUp}
      onClick={(e) => {
        if (performance.now() - touchedRef.current < 800) return;
        onTrigger();
        if (e.detail) e.currentTarget.blur();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
      <span class="cool" style={coolPct > 0 ? { '--left': `${coolPct}%` } : { '--left': '0%' }} />
      <span class="key">{keyLabel}</span>
      {count !== undefined && <span class="count">{count}</span>}
    </button>
  );
}

export function Hotbar({ game, hud }: HotbarProps) {
  const [skills, setSkills] = useState<RichSkillEntry[]>(() => getSkillList(game));
  const [fired, setFired] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setSkills(getSkillList(game));
  }, [game, hud.cls]);

  useEffect(() => {
    const flash = (key: string): void => {
      setFired((prev) => ({ ...prev, [key]: true }));
      clearTimeout(timersRef.current[key]);
      timersRef.current[key] = window.setTimeout(() => {
        setFired((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 130);
    };

    const unsubs = [
      game.bus.on('class', () => setSkills(getSkillList(game))),
      game.bus.on('skill', (d) => {
        const list = getSkillList(game);
        const idx = list.findIndex((s) => s.id === d.id);
        if (idx >= 0) flash(`s${idx}`);
      }),
      game.bus.on('drink', (d) => {
        const idx = DRINKS.findIndex(([itemId]) => itemId === d.id);
        if (idx >= 0) flash(`d${idx}`);
      }),
    ];

    return () => {
      for (const off of unsubs) off();
      for (const k in timersRef.current) clearTimeout(timersRef.current[k]);
    };
  }, [game]);

  const isTalk = hud.actMode === 'talk';
  const actCls = `slot act touch-only${isTalk ? ' talk' : hud.actMode === 'idle' ? ' idle' : ''}`;

  return (
    <section id="hotbar" aria-label="Skills and potions">
      {skills.map((k, i) => {
        const locked = hud.skillLocked[i];
        const dry = !locked && hud.skillDry[i];
        const cls = `slot s${i}${locked ? ' locked' : dry ? ' dry' : ''}${fired[`s${i}`] ? ' fired' : ''}`;
        const iconFn = SKILL_ICONS[k.icon];
        return (
          <SlotButton
            key={i}
            className={cls}
            keyLabel={k.key}
            title={`${k.name} (${k.key})`}
            ariaLabel={`${k.name}, key ${k.key}`}
            coolPct={hud.skillCdPct[i]}
            onTrigger={() => game.skills.cast(i)}
          >
            {iconFn ? iconFn() : null}
          </SlotButton>
        );
      })}
      <div class="sep" />
      {DRINKS.map(([id, keyLabel], i) => {
        const count = i === 0 ? hud.tonicCount : hud.draughtCount;
        const item = ITEMS[id];
        const cls = `slot d${i}${count ? '' : ' empty'}${fired[`d${i}`] ? ' fired' : ''}`;
        return (
          <SlotButton
            key={id}
            className={cls}
            keyLabel={keyLabel}
            title={`${item.name} (${keyLabel})`}
            ariaLabel={`${item.name}, key ${keyLabel}`}
            count={count}
            onTrigger={() => game.loot.use(id)}
          >
            {itemIcon(item)}
          </SlotButton>
        );
      })}
      <SlotButton
        className={actCls}
        keyLabel="F"
        title={isTalk ? 'Talk' : 'Attack'}
        ariaLabel={isTalk ? 'Talk' : 'Attack the nearest creature'}
        onTrigger={() => game.controls.act()}
        onActDown={(e) => {
          game.input.acting = true;
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
          }
        }}
        onActUp={() => {
          game.input.acting = false;
        }}
      >
        {ACT_ICONS.attack()}
        {ACT_ICONS.talk()}
      </SlotButton>
      <SlotButton
        className="slot jump touch-only"
        keyLabel="Space"
        title="Jump (Space)"
        ariaLabel="Jump, key Space"
        onTrigger={() => game.controls.jump()}
      >
        {ACT_ICONS.jump()}
      </SlotButton>
      <SlotButton
        className="slot next touch-only"
        keyLabel="Tab"
        title="Next target (Tab)"
        ariaLabel="Next target, key Tab"
        onTrigger={() => game.controls.cycleTarget()}
      >
        {ACT_ICONS.next()}
      </SlotButton>
    </section>
  );
}
