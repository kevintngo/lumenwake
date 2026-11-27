import { useCallback, useEffect, useMemo, useRef, useState } from '../dom';
import { ITEMS } from '../../data/items';
import { LUMENS } from '../../data/lumens';
import { SITES } from '../../data/sites';
import { xpToNext } from '../../sim/character/stats';
import { lumenLevel } from '../../sim/companion/lumen-math';
import { describe } from '../../sim/inventory/gear-service';
import { GOALS } from '../../sim/missions/missions-system';
import type { MenuTabId, WindowKind } from '../../types/domain';
import type { MonsterEntity, NpcEntity } from '../../types/entity';
import type { GuideStepPayload } from '../../types/events';
import type { GameContext } from '../../types/game-context';
import type { MissionReport } from '../../types/mission';
import { setElderArt, setGearArt } from '../icons';
import { PlatesOverlay } from '../overlays/plates-overlay';
import { mountTouchStick, watchTouch } from '../overlays/touch-stick';
import { mountTutorMarkers } from '../overlays/tutor-markers';
import { boxOf, createSettings } from '../settings';
import { getSkillList, highlightNumbers, parseLogText, type LogSegment } from '../ui-helpers';
import { CinemaOverlay } from './cinema-overlay';
import { handleWindowKey, TAB_OF, WINDOW_TABS } from './game-window';
import { type DepthChoiceState, readDepthChoice } from './depth-choice';
import { Hud, type HudSnapshot, type LogEntry, type TalkState, type ToastState } from './hud';
import type { PickContext } from './item-detail';
import type { PauseState } from './pause-modal';
import type { SettingsSectionId } from './settings-modal';
import { TitleScreen } from './title-screen';

interface UiRootProps {
  game: GameContext;
}

function quantRatio(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 200) / 200;
}

function readHudSnapshot(game: GameContext): HudSnapshot {
  const p = game.player;
  const s = p.sheet;
  const maxHp = Math.max(1, p.maxHp);
  const maxFocus = Math.max(1, p.maxFocus);
  const xpNeed = Math.max(1, xpToNext(s.level));
  const l = s.lumen;
  const target =
    p.target && p.target.kind === 'monster' && !p.target.dead && !(p.target as MonsterEntity).boss
      ? (p.target as MonsterEntity)
      : null;
  const boss = game.monsters.find((m) => m.boss && !m.dead) || null;
  const ms = game.missions;
  const skills = getSkillList(game);

  const skillLocked: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  const skillDry: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  const skillCdPct: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const k = skills[i];
    if (!k) continue;
    skillLocked[i] = s.level < k.unlock;
    skillDry[i] = p.focus < k.focus;
    skillCdPct[i] = Math.round(((game.skills.cooldowns[i] || 0) / Math.max(0.001, k.cooldown)) * 100);
  }

  let actMode: 'attack' | 'talk' | 'idle' = 'idle';
  if (game.touch) {
    const e = game.controls.actTarget();
    actMode = e ? (e.kind === 'npc' ? 'talk' : 'attack') : 'idle';
  }

  return {
    name: p.name || 'Surveyor',
    people: s.people || 'unit',
    cls: s.cls,
    level: s.level,
    glint: s.glint,
    hp: Math.ceil(p.hp),
    maxHp: p.maxHp,
    hpRatio: quantRatio(p.hp / maxHp),
    low: Boolean(game.low),
    focus: Math.floor(p.focus),
    maxFocus: p.maxFocus,
    focusRatio: quantRatio(p.focus / maxFocus),
    xpPct: Math.round((s.xp / xpNeed) * 100),
    xpRatio: quantRatio(s.xp / xpNeed),
    boon: s.boon,
    due: s.picks > 0 || s.points > 0,
    lumenKind: l.kind,
    lumenLevel: lumenLevel(l),
    lumenCharge: Math.round(l.charge),
    lumenFull: l.charge >= 100,
    tracker: ms.track(),
    skillLocked,
    skillDry,
    skillCdPct,
    tonicCount: game.loot.count('tonic'),
    draughtCount: game.loot.count('draught'),
    actMode,
    targetName: target ? target.name : '',
    targetLevel: target ? target.level : 0,
    targetRatio: target ? quantRatio(target.hp / Math.max(1, target.maxHp)) : 0,
    bossName: boss ? boss.name : '',
    bossSub: boss ? (boss.enraged ? 'Wounded, and faster for it' : boss.def.epithet || '') : '',
    bossDefId: boss ? boss.defId : '',
    bossMad: Boolean(boss?.enraged),
    bossRatio: boss ? quantRatio(boss.hp / Math.max(1, boss.maxHp)) : 0,
    zoneName: ms.active ? ms.active.offer.name : game.biome.name,
    clockText: ms.active
      ? (ms.active.offer.depth || 1) > 1
        ? `Depth ${ms.active.offer.depth} · ${game.biome.name}`
        : game.biome.name
      : 'Aloft',
    missionActive: Boolean(ms.active),
  };
}

function sameHud(a: HudSnapshot, b: HudSnapshot): boolean {
  return (
    a.name === b.name &&
    a.people === b.people &&
    a.cls === b.cls &&
    a.level === b.level &&
    a.glint === b.glint &&
    a.hp === b.hp &&
    a.maxHp === b.maxHp &&
    a.hpRatio === b.hpRatio &&
    a.low === b.low &&
    a.focus === b.focus &&
    a.maxFocus === b.maxFocus &&
    a.focusRatio === b.focusRatio &&
    a.xpPct === b.xpPct &&
    a.xpRatio === b.xpRatio &&
    a.boon === b.boon &&
    a.due === b.due &&
    a.lumenKind === b.lumenKind &&
    a.lumenLevel === b.lumenLevel &&
    a.lumenCharge === b.lumenCharge &&
    a.lumenFull === b.lumenFull &&
    a.tracker === b.tracker &&
    a.tonicCount === b.tonicCount &&
    a.draughtCount === b.draughtCount &&
    a.actMode === b.actMode &&
    a.targetName === b.targetName &&
    a.targetLevel === b.targetLevel &&
    a.targetRatio === b.targetRatio &&
    a.bossName === b.bossName &&
    a.bossSub === b.bossSub &&
    a.bossDefId === b.bossDefId &&
    a.bossMad === b.bossMad &&
    a.bossRatio === b.bossRatio &&
    a.zoneName === b.zoneName &&
    a.clockText === b.clockText &&
    a.missionActive === b.missionActive &&
    a.skillLocked[0] === b.skillLocked[0] &&
    a.skillLocked[1] === b.skillLocked[1] &&
    a.skillLocked[2] === b.skillLocked[2] &&
    a.skillLocked[3] === b.skillLocked[3] &&
    a.skillDry[0] === b.skillDry[0] &&
    a.skillDry[1] === b.skillDry[1] &&
    a.skillDry[2] === b.skillDry[2] &&
    a.skillDry[3] === b.skillDry[3] &&
    a.skillCdPct[0] === b.skillCdPct[0] &&
    a.skillCdPct[1] === b.skillCdPct[1] &&
    a.skillCdPct[2] === b.skillCdPct[2] &&
    a.skillCdPct[3] === b.skillCdPct[3]
  );
}

function trapFocus(e: KeyboardEvent, box: HTMLElement): boolean {
  const items = Array.from(
    box.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'),
  ).filter(
    (x) => !(x as HTMLButtonElement).disabled && x.tabIndex >= 0 && x.getClientRects().length > 0,
  );
  const at = document.activeElement;
  const first = items[0];
  const last = items[items.length - 1];
  if (!first) return true;
  if (!box.contains(at) || at === box) {
    (e.shiftKey ? last : first).focus();
    return true;
  }
  if (e.shiftKey ? at === first : at === last) {
    (e.shiftKey ? last : first).focus();
    return true;
  }
  return false;
}

export function UiRoot({ game }: UiRootProps) {
  const store = useMemo(() => createSettings(game), [game]);

  const [hud, setHud] = useState<HudSnapshot>(() => readHudSnapshot(game));
  const [bust, setBust] = useState<string>(() => game.portraits.bust || '');
  const [artRev, setArtRev] = useState(0);
  const [touch, setTouch] = useState<boolean>(() => Boolean(game.touch));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [toast, setToast] = useState<ToastState>({ title: '', sub: '', show: false });
  const [talk, setTalk] = useState<TalkState | null>(null);
  const [report, setReport] = useState<MissionReport | null>(null);
  const [choice, setChoice] = useState<DepthChoiceState | null>(null);
  const [windowKind, setWindowKind] = useState<WindowKind | null>(null);
  const [windowTab, setWindowTab] = useState<MenuTabId>('character');
  const [trader, setTrader] = useState<NpcEntity | null>(null);
  const [tutorialStep, setTutorialStep] = useState<GuideStepPayload | null>(null);
  const [windowOpenSeq, setWindowOpenSeq] = useState(0);
  const [windowRev, setWindowRev] = useState(0);
  const [picked, setPicked] = useState<Record<PickContext, string>>({ gear: '', food: '', shop: '' });
  const [pauseState, setPauseState] = useState<PauseState>({
    open: false,
    view: 'root',
    section: 'display',
    asking: false,
    direct: false,
  });

  const ringRef = useRef<HTMLButtonElement | null>(null);
  const logRef = useRef<HTMLElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const platesRef = useRef<HTMLDivElement | null>(null);
  const floatersRef = useRef<HTMLDivElement | null>(null);
  const tutorMarkRef = useRef<HTMLDivElement | null>(null);
  const tutorPointRef = useRef<HTMLDivElement | null>(null);
  const winRef = useRef<HTMLElement | null>(null);
  const pauseRef = useRef<HTMLDivElement | null>(null);

  const hudRef = useRef(hud);
  hudRef.current = hud;
  const windowKindRef = useRef(windowKind);
  windowKindRef.current = windowKind;
  const windowTabRef = useRef(windowTab);
  windowTabRef.current = windowTab;
  const pauseRefState = useRef(pauseState);
  pauseRefState.current = pauseState;
  const reportRef = useRef(report);
  reportRef.current = report;

  const logIdRef = useRef(1);
  const logTimersRef = useRef<Set<number>>(new Set());
  const toastTimerRef = useRef(0);
  const talkTimerRef = useRef(0);

  const pushLogSegments = useCallback((segments: LogSegment[]) => {
    const id = logIdRef.current++;
    setLogs((prev) => [...prev.slice(-4), { id, segments, old: false }]);
    const t1 = window.setTimeout(() => {
      logTimersRef.current.delete(t1);
      setLogs((prev) => prev.map((e) => (e.id === id ? { ...e, old: true } : e)));
    }, 5200);
    const t2 = window.setTimeout(() => {
      logTimersRef.current.delete(t2);
      setLogs((prev) => prev.filter((e) => e.id !== id));
    }, 6200);
    logTimersRef.current.add(t1);
    logTimersRef.current.add(t2);
  }, []);

  const pushLogText = useCallback(
    (raw: string) => {
      pushLogSegments(parseLogText(raw));
    },
    [pushLogSegments],
  );

  const showToast = useCallback((title: string, sub = '', seconds = 2.8) => {
    setToast({ title, sub, show: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, seconds * 1000);
  }, []);

  const hushTalk = useCallback(() => {
    setTalk(null);
    clearTimeout(talkTimerRef.current);
  }, []);

  const fitLog = useCallback(() => {
    const box = logRef.current;
    if (!box || box.clientHeight <= 0) return;
    let h = -5;
    const kids = Array.from(box.children) as HTMLElement[];
    for (const c of kids) h += c.offsetHeight + 5;
    let drop = 0;
    while (kids.length - drop > 1 && h > box.clientHeight + 1) {
      h -= kids[drop].offsetHeight + 5;
      drop++;
    }
    if (drop > 0) {
      setLogs((prev) => prev.slice(drop));
    }
  }, []);

  useEffect(() => {
    fitLog();
  }, [logs.length, fitLog]);

  const placeMap = useCallback(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const r = boxOf(ring);
    const c = game.canvas.getBoundingClientRect();
    const shown =
      !document.body.classList.contains('titled') && !document.body.classList.contains('cine');
    game.renderer.minimap.rect = [
      r.left - c.left + r.width / 2,
      r.top - c.top + r.height / 2,
      shown ? r.width / 2 - 3 : 0,
      0.62 * Math.max(1, 150 / Math.max(r.width, 1)),
    ];
  }, [game]);

  const layout = useCallback(() => {
    document.body.classList.toggle(
      'compact',
      Boolean(game.touch) || innerWidth < 900 || innerHeight < 640,
    );
    game.resize();
    placeMap();
    fitLog();
  }, [game, placeMap, fitLog]);

  useEffect(() => {
    game.halt = pauseState.open || windowKind === 'menu';
  }, [game, pauseState.open, windowKind]);

  useEffect(() => {
    document.body.classList.toggle('has-boon', Boolean(hud.boon));
  }, [hud.boon]);

  const blurActive = useCallback(() => {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }, []);

  const closeWindow = useCallback(() => {
    if (!windowKindRef.current) return;
    setWindowKind(null);
    blurActive();
  }, [blurActive]);

  const openWindow = useCallback(
    (kind: WindowKind, tab?: MenuTabId) => {
      if (!game.started || game.cinema.blocking) return;
      setWindowKind(kind);
      if (tab) setWindowTab(tab);
      setWindowOpenSeq((n) => n + 1);
      setWindowRev((n) => n + 1);
      game.bus.emit('ui:click');
    },
    [game],
  );

  const toggleMenuTab = useCallback(
    (tab: MenuTabId) => {
      if (windowKindRef.current === 'menu' && windowTabRef.current === tab) closeWindow();
      else openWindow('menu', tab);
    },
    [closeWindow, openWindow],
  );

  const stepTab = useCallback(
    (dir: number) => {
      const i = WINDOW_TABS.findIndex((x) => x.id === windowTabRef.current);
      const next = WINDOW_TABS[(i + dir + WINDOW_TABS.length) % WINDOW_TABS.length].id;
      openWindow('menu', next);
    },
    [openWindow],
  );

  const showPause = useCallback(
    (view: 'root' | 'settings' = 'root', section?: SettingsSectionId) => {
      if (!game.started || game.cinema.blocking) return;
      const was = pauseRefState.current.open;
      setPauseState((prev) => ({
        open: true,
        view,
        section: section || prev.section,
        asking: false,
        direct: !was && view === 'settings',
      }));
      if (!was) game.bus.emit('ui:click');
    },
    [game],
  );

  const hidePause = useCallback(() => {
    if (!pauseRefState.current.open) return;
    setPauseState((prev) => ({ ...prev, open: false, asking: false }));
    blurActive();
  }, [blurActive]);

  const backPause = useCallback(() => {
    const st = pauseRefState.current;
    if (st.asking) setPauseState((prev) => ({ ...prev, asking: false }));
    else if (st.view === 'settings' && !st.direct) setPauseState((prev) => ({ ...prev, view: 'root' }));
    else hidePause();
  }, [hidePause]);

  const closeReport = useCallback(() => {
    if (!reportRef.current) return;
    setReport(null);
    game.bus.emit('report:closed');
  }, [game]);

  const handlePick = useCallback((ctx: PickContext, key: string) => {
    setPicked((prev) => (prev[ctx] === key ? prev : { ...prev, [ctx]: key }));
  }, []);

  const handleMutateWindow = useCallback(() => {
    setWindowRev((n) => n + 1);
  }, []);

  useEffect(() => {
    if (Object.keys(game.portraits.gear).length > 0) setGearArt(game.portraits.gear);
    if (Object.keys(game.portraits.elders).length > 0) setElderArt(game.portraits.elders);
    if (game.portraits.bust) setBust(game.portraits.bust);

    const platesEl = platesRef.current;
    const floatersEl = floatersRef.current;
    const platesOverlay =
      platesEl && floatersEl ? new PlatesOverlay(game, platesEl, floatersEl) : null;
    const offStick = stickRef.current ? mountTouchStick(game, stickRef.current) : () => {};
    const offWatchTouch = watchTouch(game, () => {
      setTouch(true);
      setWindowRev((n) => n + 1);
      layout();
    });
    const offTutorMarkers =
      tutorMarkRef.current && tutorPointRef.current
        ? mountTutorMarkers(game, tutorMarkRef.current, tutorPointRef.current)
        : () => {};

    const bus = game.bus;
    let choiceTimer = 0;
    const refreshIfOpen = (): void => {
      if (windowKindRef.current) setWindowRev((n) => n + 1);
    };

    const unsubs = [
      bus.on('frame', (dt) => {
        platesOverlay?.update(dt);
        const next = readHudSnapshot(game);
        if (!sameHud(hudRef.current, next)) {
          hudRef.current = next;
          setHud(next);
        }
      }),
      bus.on('portrait', (d) => {
        if (d.gear) setGearArt(d.gear);
        if (d.elders) setElderArt(d.elders);
        if (d.bust) setBust(d.bust);
        setArtRev((n) => n + 1);
        refreshIfOpen();
      }),
      bus.on('ui:toggle', (id) => {
        if (id === 'sound') {
          store.set('mute', !store.values.mute);
          pushLogSegments([
            { text: 'Sound ' },
            { text: store.values.mute ? 'off' : 'on', className: store.values.mute ? 'c-bad' : 'c-good', bold: true },
          ]);
        } else if (id === 'view') {
          showPause('settings', 'controls');
        } else if (TAB_OF[id]) {
          toggleMenuTab(TAB_OF[id]);
        }
      }),
      bus.on('ui:close', () => {
        closeWindow();
        closeReport();
        hushTalk();
      }),
      bus.on('ui:escape', () => {
        if (pauseRefState.current.open) backPause();
        else if (windowKindRef.current) closeWindow();
        else if (reportRef.current) closeReport();
        else if (game.started && !game.cinema.blocking) {
          hushTalk();
          const had = game.controls.clearTarget();
          if (!had) showPause('root');
        }
      }),
      bus.on('npc:talk', (npc) => {
        if (npc.role === 'shop' || npc.role === 'bounty') {
          setTrader(npc);
          openWindow(npc.role);
          return;
        }
        const says = npc.says && npc.says.length ? npc.says : ['Fair winds.'];
        npc.sayIdx = (npc.sayIdx + 1) % says.length;
        bus.emit('talk', {
          name: npc.name,
          title: npc.title || '',
          people: npc.people,
          line: says[npc.sayIdx],
        });
      }),
      bus.on('talk', (d) => {
        setTalk({ name: d.name, title: d.title, line: d.line });
        clearTimeout(talkTimerRef.current);
        talkTimerRef.current = window.setTimeout(hushTalk, 5200);
      }),
      bus.on('moveclick', hushTalk),
      bus.on('zone', closeWindow),
      bus.on('cine:begin', (d) => {
        hushTalk();
        if (d.blocking) {
          hidePause();
          closeWindow();
        }
      }),
      bus.on('mission:begin', (d) => {
        hushTalk();
        closeReport();
        if (game.cinema.quiet) {
          showToast(d.offer.name, `${d.biome.name} · ${GOALS[d.offer.goal].name}`, 4);
        }
      }),
      bus.on('mission:report', (r) => {
        setReport(r);
      }),
      bus.on('begin', () => {
        if (game.store.failed) {
          showToast(
            'This browser will not keep your journey',
            'A private window, or its storage is full. Settings, Saves can keep a copy in a file.',
            6,
          );
        }
      }),
      bus.on('settings', (d) => {
        if (!d.key || d.key === 'text') layout();
      }),
      bus.on('guide', (d) => {
        setTutorialStep(d);
      }),
      bus.on('guide:chapter', (d) => {
        if (d.id !== 'town') showToast(d.title, '', 2.4);
      }),
      bus.on('guide:done', (d) => {
        if (d.quiet) return;
        if (d.skipped) {
          pushLogSegments([
            { text: 'First steps skipped. The ' },
            { text: 'Guide', className: 'c-key', bold: true },
            { text: ' has the controls, and the menu can start them again.' },
          ]);
        } else {
          showToast('The board is yours', 'Three contracts, three places. Each is laid out afresh.', 5);
        }
      }),
      bus.on('log', (d) => pushLogText(d.text)),
      bus.on('pickup', (d) => {
        if (d.gear) {
          const g = describe(d.gear);
          pushLogSegments([
            { text: 'Picked up ' },
            { text: g.name, color: g.color, bold: true },
            { text: ' ' },
            { text: g.rarity, className: 'dim' },
          ]);
          return;
        }
        if (!d.item) return;
        const it = ITEMS[d.item];
        const count = d.n ?? 1;
        if (it.kind === 'coin') {
          pushLogSegments([{ text: `+${count} glint`, className: 'c-coin', bold: true }]);
        } else {
          const segs: LogSegment[] = [
            { text: 'Picked up ' },
            { text: it.name, className: 'c-item', bold: true },
          ];
          if (count > 1) {
            segs.push({ text: ' ' }, { text: `×${count}`, className: 'c-num', bold: true });
          }
          pushLogSegments(segs);
        }
      }),
      bus.on('equip', (d) => {
        if (!d.item) return;
        const desc = describe(d.item);
        pushLogSegments([
          { text: 'Now using ' },
          { text: desc.name, color: desc.color, bold: true },
          { text: '.' },
        ]);
      }),
      bus.on('relic:found', (d) => {
        const first = d.first ?? (game.player.sheet.relics[d.id] || 0) <= 1;
        showToast(
          describe(d.item).name,
          first ? 'A relic. The Gear tab says what it does.' : 'A relic, again.',
          4.6,
        );
      }),
      bus.on('salvage', (d) => {
        if (d.count === 1) {
          pushLogSegments([
            { text: 'Salvaged: ' },
            { text: `+${d.parts} parts`, className: 'c-parts', bold: true },
            { text: '.' },
          ]);
        }
      }),
      bus.on('hone', (d) => {
        const desc = describe(d.item);
        pushLogSegments([
          { text: 'Honed ' },
          { text: desc.name, color: desc.color, bold: true },
          { text: ' to level ' },
          { text: String(d.item.ilvl), className: 'c-num', bold: true },
          { text: '.' },
        ]);
      }),
      bus.on('boss:arrive', (m) => {
        if (game.cinema.quiet) showToast(m.name, 'It holds this island.', 3.2);
      }),
      bus.on('boss:fell', (m) => {
        pushLogSegments([{ text: m.name, className: 'c-foe', bold: true }, { text: ' is down.' }]);
      }),
      bus.on('boss:enrage', (m) => {
        pushLogSegments([
          { text: m.name, className: 'c-foe', bold: true },
          { text: ' is wounded, and faster for it.' },
        ]);
      }),
      bus.on('talent', (d) => {
        pushLogSegments([
          { text: 'Talent taken: ' },
          { text: d.name, className: 'c-key', bold: true },
          { text: '.' },
        ]);
      }),
      bus.on('levelup', (d) => {
        showToast(
          `Level ${d.level}`,
          game.touch ? 'A talent to choose.' : 'A talent to choose: press C.',
          3.6,
        );
      }),
      bus.on('trade', (d) => {
        const total = d.kind === 'sell' && !d.name ? d.glint || 0 : 0;
        if (total > 0) {
          pushLogSegments([
            { text: 'Sold materials for ' },
            { text: `${total} glint`, className: 'c-coin', bold: true },
          ]);
        }
      }),
      bus.on('monster:died', (m) => {
        if (m.elite) {
          pushLogSegments([
            { text: 'You felled an ' },
            { text: m.name, className: 'c-foe', bold: true },
            { text: '.' },
          ]);
        }
      }),
      bus.on('xp', (d) => {
        if (d.amount >= 40) {
          pushLogSegments([{ text: `+${d.amount} experience`, className: 'c-xp', bold: true }]);
        }
      }),
      bus.on('mission:taken', (o) => {
        if (o) showToast(o.name, 'Taken. Step onto the pad at the south gate.', 4);
      }),
      bus.on('room:wave', (d) => {
        if (d.wave > 0) pushLogSegments([{ text: 'More of them.' }]);
      }),
      bus.on('room:clear', (d) => {
        if (d.kind === 'boss') return;
        if (d.kind === 'cache' || d.kind === 'side') {
          pushLogSegments([{ text: 'Clear.', className: 'c-good', bold: true }]);
        } else {
          pushLogSegments([
            { text: 'Island clear.', className: 'c-good', bold: true },
            { text: ' The gate is down.' },
          ]);
        }
      }),
      bus.on('pod:open', (d) => {
        if (d.core) showToast('A survey core', game.missions.track(), 3);
      }),
      bus.on('site:used', (d) => {
        const segs: LogSegment[] = [{ text: d.name, className: 'c-key', bold: true }];
        if (d.text) {
          segs.push({ text: ' · ' }, ...highlightNumbers(d.text));
        }
        pushLogSegments(segs);
      }),
      bus.on('site:guard', (d) => {
        const name = d.name || SITES[d.site].name;
        pushLogSegments([
          { text: 'Something was sitting on the ' },
          { text: name.toLowerCase(), className: 'c-key', bold: true },
          { text: ': ' },
          { text: d.guard.name, className: 'c-foe', bold: true },
          { text: '.' },
        ]);
      }),
      bus.on('mission:done', (d) => {
        window.clearTimeout(choiceTimer);
        if (!d.choose) {
          setChoice(null);
          showToast(d.offer.depth && d.offer.depth > 1 ? `Depth ${d.offer.depth} done` : 'Contract done', 'Lifting out…', 2.6);
          return;
        }
        // a moment for the elder to fall and its drops to land before the choice comes up
        choiceTimer = window.setTimeout(() => setChoice(readDepthChoice(game)), 1800);
      }),
      bus.on('run:deeper', () => {
        window.clearTimeout(choiceTimer);
        setChoice(null);
      }),
      bus.on('mission:report', () => {
        window.clearTimeout(choiceTimer);
        setChoice(null);
      }),
      bus.on('lumen:ready', () => {
        const burstName = LUMENS[game.player.sheet.lumen.kind].burst.name;
        const segs: LogSegment[] = [
          { text: 'Your lumen is full: ' },
          { text: burstName, className: 'c-key', bold: true },
          { text: ' is ready' },
        ];
        if (!game.touch) {
          segs.push({ text: ' (' }, { text: 'G', className: 'c-key', bold: true }, { text: ')' });
        }
        segs.push({ text: '.' });
        pushLogSegments(segs);
      }),
      bus.on('lumen:burst', (d) => {
        pushLogSegments([{ text: d.burst.name, className: 'c-key', bold: true }]);
      }),
      bus.on('lumen:changed', (d) => {
        showToast(`Your lumen is now a ${d.name}`, LUMENS[d.kind].blurb, 4.5);
      }),
      bus.on('lumen:level', (d) => {
        pushLogSegments([
          { text: 'Your lumen is level ' },
          { text: String(d.level), className: 'c-num', bold: true },
          { text: '.' },
        ]);
      }),
      bus.on('lumen:changed', refreshIfOpen),
      bus.on('lumen:level', refreshIfOpen),
      bus.on('lumen:ready', refreshIfOpen),
      bus.on('lumen:burst', refreshIfOpen),
      bus.on('bag:changed', refreshIfOpen),
      bus.on('levelup', refreshIfOpen),
      bus.on('trade', refreshIfOpen),
      bus.on('xp', refreshIfOpen),
      bus.on('boon', refreshIfOpen),
      bus.on('talent', refreshIfOpen),
      bus.on('mission:taken', refreshIfOpen),
      bus.on('mission:begin', refreshIfOpen),
      bus.on('mission:progress', refreshIfOpen),
      bus.on('mission:done', refreshIfOpen),
      bus.on('room:clear', refreshIfOpen),
      bus.on('site:used', refreshIfOpen),
      bus.on('class', refreshIfOpen),
      bus.on('people', refreshIfOpen),
    ];

    const onKeyDown = (e: KeyboardEvent): void => {
      if (!game.started || game.cinema.blocking) return;
      const typing = e.target instanceof Element && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      const isPause = pauseRefState.current.open;
      const box = isPause ? pauseRef.current : windowKindRef.current ? winRef.current : null;
      if (!box) {
        if (reportRef.current && e.code === 'Escape') {
          closeReport();
          e.preventDefault();
          e.stopImmediatePropagation();
        } else if (e.code === 'KeyH' && !e.repeat && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
          bus.emit('ui:toggle', 'help');
        }
        return;
      }

      e.stopImmediatePropagation();
      if (e.repeat && (e.code === 'Escape' || /^Key/.test(e.code))) {
        if (!typing) e.preventDefault();
        return;
      }

      let handled = false;
      if (isPause) {
        if (e.code === 'Escape') {
          backPause();
          handled = true;
        } else if (!e.metaKey && !e.ctrlKey && !e.altKey && e.target instanceof Element) {
          const step = e.code === 'ArrowDown' ? 1 : e.code === 'ArrowUp' ? -1 : 0;
          if (step) {
            const t = e.target;
            const list = t.matches('.pause-item, .pause-ask .btn')
              ? Array.from(box.querySelectorAll<HTMLElement>('.pause-item, .pause-ask .btn'))
              : t.matches('.set-tab')
                ? Array.from(box.querySelectorAll<HTMLElement>('.set-tab'))
                : null;
            if (list && list.length) {
              const next = list[(list.indexOf(t as HTMLElement) + step + list.length) % list.length];
              if (t.matches('.set-tab')) next.click();
              else next.focus();
              handled = true;
            }
          }
        }
      } else {
        handled = handleWindowKey(e, winRef.current, windowKindRef.current, windowTabRef.current, game, {
          onClose: closeWindow,
          onToggleTab: toggleMenuTab,
          onSelectTab: (nextTab) => openWindow('menu', nextTab),
          onStepTab: stepTab,
        });
      }

      if (handled || (e.code === 'Tab' && trapFocus(e, box))) {
        e.preventDefault();
      }
    };

    addEventListener('keydown', onKeyDown, true);
    addEventListener('resize', layout);
    const canvasRo =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
    canvasRo?.observe(game.canvas);
    layout();

    return () => {
      for (const off of unsubs) off();
      clearTimeout(choiceTimer);
      removeEventListener('keydown', onKeyDown, true);
      removeEventListener('resize', layout);
      canvasRo?.disconnect();
      platesOverlay?.destroy();
      offStick();
      offWatchTouch();
      offTutorMarkers();
      clearTimeout(toastTimerRef.current);
      clearTimeout(talkTimerRef.current);
      for (const t of logTimersRef.current) clearTimeout(t);
      logTimersRef.current.clear();
      game.halt = false;
    };
  }, [
    game,
    store,
    layout,
    closeWindow,
    openWindow,
    toggleMenuTab,
    stepTab,
    showPause,
    hidePause,
    backPause,
    closeReport,
    hushTalk,
    pushLogSegments,
    pushLogText,
    showToast,
  ]);

  return (
    <>
      <Hud
        game={game}
        store={store}
        hud={hud}
        bust={bust}
        artRev={artRev}
        touch={touch}
        logs={logs}
        toast={toast}
        choice={choice}
        talk={talk}
        report={report}
        windowKind={windowKind}
        windowTab={windowTab}
        trader={trader}
        tutorialStep={tutorialStep}
        windowOpenSeq={windowOpenSeq}
        windowRev={windowRev}
        picked={picked}
        pauseState={pauseState}
        ringRef={ringRef}
        logRef={logRef}
        stickRef={stickRef}
        platesRef={platesRef}
        floatersRef={floatersRef}
        tutorMarkRef={tutorMarkRef}
        tutorPointRef={tutorPointRef}
        winRef={winRef}
        pauseRef={pauseRef}
        onPlaceMap={placeMap}
        onLumenClick={() => {
          if (!game.companion.burst()) game.bus.emit('ui:toggle', 'lumen');
        }}
        onMenuOpen={(id) => {
          if (id === 'menu') showPause('root');
          else game.bus.emit('ui:toggle', id);
        }}
        onCloseReport={closeReport}
        onPick={handlePick}
        onSelectTab={(nextTab) => openWindow('menu', nextTab)}
        onCloseWindow={closeWindow}
        onMutateWindow={handleMutateWindow}
        onPauseResume={hidePause}
        onPauseBack={backPause}
        onPauseOpenSettings={() =>
          setPauseState((prev) => ({ ...prev, view: 'settings', direct: false }))
        }
        onPauseSelectSection={(section) => setPauseState((prev) => ({ ...prev, section }))}
        onPauseOpenGuide={() => {
          hidePause();
          openWindow('menu', 'guide');
        }}
        onPauseRestartSteps={() => {
          hidePause();
          game.bus.emit('guide:restart');
        }}
        onPauseAskQuit={(asking) => setPauseState((prev) => ({ ...prev, asking }))}
      />
      <CinemaOverlay game={game} onLayout={layout} />
      <TitleScreen game={game} touch={touch} onBegan={layout} />
    </>
  );
}
