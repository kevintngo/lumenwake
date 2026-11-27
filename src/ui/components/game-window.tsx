import { useEffect, useRef, useState } from '../dom';
import type { MenuTabId, WindowKind } from '../../types/domain';
import type { NpcEntity } from '../../types/entity';
import type { GuideStepPayload } from '../../types/events';
import type { GameContext } from '../../types/game-context';
import { MENU_ICONS } from '../icons';
import { art } from '../ui-helpers';
import { BountyView } from './bounty-view';
import { CharacterTab } from './character-tab';
import { ContractTab } from './contract-tab';
import { GearTab } from './gear-tab';
import { GuideTab } from './guide-tab';
import type { PickContext } from './item-detail';
import { LumenTab } from './lumen-tab';
import { ShopView } from './shop-view';

interface WindowTabDef {
  readonly id: MenuTabId;
  readonly name: string;
  readonly key: string;
  readonly icon: keyof typeof MENU_ICONS;
}

export const WINDOW_TABS: readonly WindowTabDef[] = [
  { id: 'character', name: 'Character', key: 'C', icon: 'character' },
  { id: 'gear', name: 'Gear', key: 'B', icon: 'gear' },
  { id: 'lumen', name: 'Lumen', key: 'L', icon: 'lumen' },
  { id: 'contract', name: 'Contract', key: 'J', icon: 'contract' },
  { id: 'guide', name: 'Guide', key: 'H', icon: 'guide' },
];

export const TAB_OF: Readonly<Record<string, MenuTabId>> = {
  character: 'character',
  bag: 'gear',
  gear: 'gear',
  lumen: 'lumen',
  contract: 'contract',
  help: 'guide',
  guide: 'guide',
};

const TAB_KEYS: Readonly<Record<string, MenuTabId>> = {
  KeyC: 'character',
  KeyB: 'gear',
  KeyI: 'gear',
  KeyL: 'lumen',
  KeyJ: 'contract',
  KeyH: 'guide',
};

const TITLES: Readonly<Record<WindowKind, string>> = {
  menu: 'Menu',
  shop: 'Trade',
  bounty: 'Contracts',
};

const DEFAULT_TIPS: Readonly<Record<MenuTabId | 'shop' | 'bounty', string>> = {
  character: 'Point at anything to see what it does.',
  gear: 'Select a piece to see it. Double-click to put it on.',
  lumen: 'What it eats decides what it becomes.',
  contract: '',
  guide: '',
  shop: 'Select a piece to see it. Double-click to buy or sell.',
  bounty: 'Take one, then step onto the pad at the south gate.',
};

interface WindowKeyHandlers {
  onClose: () => void;
  onToggleTab: (tab: MenuTabId) => void;
  onSelectTab: (tab: MenuTabId) => void;
  onStepTab: (dir: number) => void;
}

export function handleWindowKey(
  e: KeyboardEvent,
  winEl: HTMLElement | null,
  kind: WindowKind | null,
  tab: MenuTabId,
  game: GameContext,
  handlers: WindowKeyHandlers,
): boolean {
  if (!kind || !winEl) return false;
  const code = e.code;
  const t = e.target instanceof Element ? e.target : null;
  if (code === 'Escape') {
    handlers.onClose();
    return true;
  }
  if (e.metaKey || e.ctrlKey || e.altKey || (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName))) {
    return false;
  }
  if (kind === 'menu') {
    const mapped = TAB_KEYS[code];
    if (mapped) {
      handlers.onToggleTab(mapped);
      return true;
    }
    if (code === 'KeyQ' || code === 'KeyE') {
      handlers.onStepTab(code === 'KeyE' ? 1 : -1);
      return true;
    }
  }
  const dirMap: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const dir = dirMap[code];
  if (t instanceof HTMLElement && dir && dir[0] && t.matches('.figure.live')) {
    game.portraits.turn(t, dir[0] * 0.35);
    return true;
  }
  if (!t || (!dir && code !== 'Home' && code !== 'End')) return false;
  if (t.matches('[role="tab"]')) {
    if (dir && dir[1]) return false;
    const i = WINDOW_TABS.findIndex((x) => x.id === tab);
    const nextIdx =
      code === 'Home'
        ? 0
        : code === 'End'
          ? WINDOW_TABS.length - 1
          : (i + (dir ? dir[0] : 0) + WINDOW_TABS.length) % WINDOW_TABS.length;
    handlers.onSelectTab(WINDOW_TABS[nextIdx].id);
    return true;
  }
  if (dir && t.matches('.tile, .worn-tile')) {
    const from = t.getBoundingClientRect();
    const fx = from.left + from.width / 2;
    const fy = from.top + from.height / 2;
    let best: HTMLElement | null = null;
    let score = 1e9;
    for (const o of winEl.querySelectorAll<HTMLElement>('button.tile, button.worn-tile')) {
      if (o === t) continue;
      const r = o.getBoundingClientRect();
      const dx = r.left + r.width / 2 - fx;
      const dy = r.top + r.height / 2 - fy;
      const along = dx * dir[0] + dy * dir[1];
      const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      if (along < 4 || across > along * 1.5 + 24) continue;
      if (along + across * 2 < score) {
        score = along + across * 2;
        best = o;
      }
    }
    if (best) best.focus();
    return true;
  }
  return false;
}

interface GameWindowProps {
  game: GameContext;
  kind: WindowKind | null;
  tab: MenuTabId;
  trader: NpcEntity | null;
  touch: boolean;
  tutorialStep: GuideStepPayload | null;
  openSeq: number;
  rev: number;
  picked: Record<PickContext, string>;
  onPick: (ctx: PickContext, key: string) => void;
  onSelectTab: (tab: MenuTabId) => void;
  onClose: () => void;
  onMutate: () => void;
  winRef: { current: HTMLElement | null };
}

export function GameWindow({
  game,
  kind,
  tab,
  trader,
  touch,
  tutorialStep,
  openSeq,
  rev,
  picked,
  onPick,
  onSelectTab,
  onClose,
  onMutate,
  winRef,
}: GameWindowProps) {
  const defaultTip = kind === 'menu' ? DEFAULT_TIPS[tab] : kind ? DEFAULT_TIPS[kind] : '';
  const [tip, setTip] = useState(defaultTip);
  const lastFocusSeqRef = useRef(0);

  useEffect(() => {
    setTip(defaultTip);
  }, [defaultTip, openSeq]);

  useEffect(() => {
    const el = winRef.current;
    if (!kind || !el) return;
    if (lastFocusSeqRef.current === openSeq) return;
    lastFocusSeqRef.current = openSeq;
    const to =
      el.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ||
      el.querySelector<HTMLElement>('.btn.primary:not(:disabled)');
    (to || el).focus({ preventScroll: true });
  }, [kind, tab, openSeq, winRef]);

  if (!kind) return <div id="panels" />;

  const s = game.player.sheet;
  const alert = s.picks > 0 || s.points > 0;
  const taken = game.missions.pending;
  const speakerSays =
    kind === 'shop'
      ? 'Flasks, and whatever came up on the last lift.'
      : taken
        ? 'The pad is warm. South gate.'
        : s.first
          ? 'Your first job: First Light. Take it.'
          : 'Three places want a surveyor. Pick one.';

  const updateTipFromTarget = (target: EventTarget | null): void => {
    const t = target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null;
    if (t && t.dataset.tip !== undefined) setTip(t.dataset.tip);
  };

  const handlePickWithCompactScroll = (ctx: PickContext, key: string): void => {
    onPick(ctx, key);
    if (document.body.classList.contains('compact') && winRef.current) {
      const pane = winRef.current.querySelector<HTMLElement>(`.detail[data-for="${ctx}"]`);
      if (pane && pane.scrollIntoView) pane.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div id="panels" data-rev={rev}>
      <div class="scrim" data-act="close" onClick={onClose} />
      <section
        ref={winRef}
        class={`win plate win-${kind}`}
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[kind]}
        tabIndex={-1}
        onDblClick={(e) => {
          const target = e.target instanceof Element ? e.target : null;
          const tile = target?.closest('.tile[data-key], .worn-tile[data-key]');
          if (!tile || !winRef.current) return;
          const go = winRef.current.querySelector<HTMLButtonElement>('.detail .btn.primary:not(:disabled)');
          if (go) go.click();
        }}
        onPointerOver={(e) => updateTipFromTarget(e.target)}
        onFocusIn={(e) => {
          updateTipFromTarget(e.target);
          const target = e.target instanceof Element ? e.target : null;
          const tile = target?.closest<HTMLElement>('.tile[data-key], .worn-tile[data-key]');
          if (tile && tile.getAttribute('aria-pressed') !== 'true') {
            const ctx = tile.dataset.ctx as PickContext | undefined;
            const key = tile.dataset.key;
            if (ctx && key) handlePickWithCompactScroll(ctx, key);
          }
        }}
      >
        <header class="win-head">
          {kind === 'menu' ? (
            <div class="tabs" role="tablist" aria-label="Menu">
              {WINDOW_TABS.map((t) => {
                const selected = t.id === tab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    class="tab"
                    id={`tab-${t.id}`}
                    data-act="tab"
                    data-arg={t.id}
                    aria-selected={selected ? 'true' : 'false'}
                    aria-controls="win-pane"
                    tabIndex={selected ? 0 : -1}
                    title={`${t.name}${touch ? '' : ` (${t.key})`}`}
                    onClick={() => onSelectTab(t.id)}
                  >
                    {MENU_ICONS[t.icon]()}
                    <span>{t.name}</span>
                    {!touch && <kbd aria-hidden="true">{t.key}</kbd>}
                    {t.id === 'character' && alert && (
                      <i class="pip" aria-label="Something to choose" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div class="speaker">
              {trader && <img src={art(`crew-${trader.name.toLowerCase()}`)} alt="" />}
              <div>
                <strong class="c-name">{trader ? trader.name : TITLES[kind]}</strong>
                <small>{trader ? trader.title || '' : ''}</small>
                <p>“{speakerSays}”</p>
              </div>
            </div>
          )}
          <span class="coin purse" title="Glint">
            {s.glint}
          </span>
          <button
            type="button"
            class="x"
            data-act="close"
            aria-label="Close"
            title="Close (Esc)"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div
          class={kind === 'menu' ? `win-body tab-${tab}` : `win-body win-${kind}-body`}
          id={kind === 'menu' ? 'win-pane' : undefined}
          role={kind === 'menu' ? 'tabpanel' : undefined}
          aria-labelledby={kind === 'menu' ? `tab-${tab}` : undefined}
        >
          {kind === 'menu' && tab === 'character' && (
            <CharacterTab game={game} touch={touch} onMutate={onMutate} />
          )}
          {kind === 'menu' && tab === 'gear' && (
            <GearTab
              game={game}
              pickedKey={picked.gear}
              onPick={handlePickWithCompactScroll}
              onMutate={onMutate}
            />
          )}
          {kind === 'menu' && tab === 'lumen' && (
            <LumenTab
              game={game}
              touch={touch}
              pickedKey={picked.food}
              onPick={handlePickWithCompactScroll}
              onMutate={onMutate}
            />
          )}
          {kind === 'menu' && tab === 'contract' && <ContractTab game={game} onMutate={onMutate} />}
          {kind === 'menu' && tab === 'guide' && <GuideTab touch={touch} />}
          {kind === 'shop' && (
            <ShopView
              game={game}
              pickedKey={picked.shop}
              onPick={handlePickWithCompactScroll}
              onMutate={onMutate}
            />
          )}
          {kind === 'bounty' && <BountyView game={game} onMutate={onMutate} />}
        </div>

        <footer class="win-foot">
          {tutorialStep ? (
            <span class="win-step">
              <b>First steps</b>
              <span>{touch && tutorialStep.touch ? tutorialStep.touch : tutorialStep.text}</span>
            </span>
          ) : (
            <span class="win-keys">
              {!touch &&
                (kind === 'menu' ? (
                  <>
                    <kbd>Q</kbd>
                    <kbd>E</kbd> Switch tab <i /> <kbd>Esc</kbd> Close
                  </>
                ) : (
                  <>
                    <kbd>Esc</kbd> Close
                  </>
                ))}
            </span>
          )}
          <span class="win-tip" aria-live="polite">
            {tip}
          </span>
        </footer>
      </section>
    </div>
  );
}
