import { useEffect, useRef, useState } from '../dom';
import { VIEWS } from '../../config';
import { damp } from '../../core/math';
import { ABILITIES } from '../../data/abilities';
import { CLASSES, FAMILIES } from '../../data/classes';
import { PEOPLE_ORDER, PEOPLES } from '../../data/peoples';
import type { ClassId, PeopleId } from '../../types/domain';
import type { GameContext } from '../../types/game-context';
import type { CameraRail } from '../../types/render';
import type { HeroSummary } from '../../types/sheet';
import { art, formatPlaytime } from '../ui-helpers';

interface TitleScreenProps {
  game: GameContext;
  touch: boolean;
  onBegan: () => void;
}

const HERO_TOP = 2.0;
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

function stripNow(): [number, number] {
  const head = document.querySelector('.select-head');
  const H = innerHeight;
  let top = (head ? head.getBoundingClientRect().bottom : 0) + 12;
  let bottom = H;
  for (const el of document.querySelectorAll('.select-col, .select-foot')) {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top < bottom) bottom = r.top;
  }
  bottom -= 16;
  if (bottom - top < 150) bottom = top + 150;
  return [top, bottom];
}

export function TitleScreen({ game, touch, onBegan }: TitleScreenProps) {
  const getKept = (): HeroSummary[] => (game.fresh ? [] : game.store.summaries(game.account));

  const [summaries, setSummaries] = useState<HeroSummary[]>(() => getKept());
  const [creating, setCreating] = useState<boolean>(() => getKept().length === 0);
  const [asking, setAsking] = useState<string | null>(null);
  const [people, setPeople] = useState<PeopleId>(() => game.player.sheet.people || 'unit');
  const [cls, setCls] = useState<ClassId>(() => game.player.sheet.cls);
  const [activeHeroId, setActiveHeroId] = useState<string | null>(() => game.hero?.id || null);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  const titleRef = useRef<HTMLDivElement | null>(null);
  const peopleRef = useRef<HTMLDivElement | null>(null);
  const classRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef({ top: -1, bottom: -1 });
  const selectTRef = useRef(0);
  const hideTimerRef = useRef<number>(0);

  const have = summaries.length > 0;
  const showCreating = creating || !have;

  useEffect(() => {
    document.body.classList.toggle('has-saves', have);
    document.body.classList.toggle('creating', showCreating);
  }, [have, showCreating]);

  useEffect(() => {
    const initial = getKept();
    if (initial.length > 0) {
      const h = game.store.loadHero(initial[0].id);
      if (h) {
        game.load(h);
        setActiveHeroId(h.id);
        setPeople(game.player.sheet.people || 'unit');
        setCls(game.player.sheet.cls);
      }
      setCreating(false);
    } else {
      setCreating(true);
    }
    setSummaries(initial);
    game.look.fadeGoal = 1;

    const selectView = (t: number, dt: number): CameraRail => {
      const p = game.player;
      const y = p.y;
      const sway = game.reducedMotion ? 0 : Math.sin(t * 0.22) * 0.22;
      const wide = innerWidth > 620 && innerWidth > innerHeight;
      const a = 0.18 + sway;
      if (wide) {
        stripRef.current.top = -1;
        return {
          pos: [p.x + Math.sin(a) * 5.6, y + 1.25, p.z + Math.cos(a) * 5.6],
          look: [p.x, y + 0.72, p.z],
          lens: (32 * Math.PI) / 180,
          mix: 1,
        };
      }
      const [top, bottom] = stripNow();
      if (stripRef.current.top < 0) {
        stripRef.current.top = top;
        stripRef.current.bottom = bottom;
      } else {
        stripRef.current.top = damp(stripRef.current.top, top, 7, dt);
        stripRef.current.bottom = damp(stripRef.current.bottom, bottom, 7, dt);
      }
      const lens = (30 * Math.PI) / 180;
      const tl = Math.tan(lens / 2);
      const H = innerHeight;
      const eye = 1.3;
      const nT = 1 - (2 * stripRef.current.top) / H;
      const nB = 1 - (2 * stripRef.current.bottom) / H;
      let lo = 2.5;
      let hi = 60;
      let D = 8;
      let pitch = 0;
      for (let i = 0; i < 22; i++) {
        D = (lo + hi) / 2;
        pitch = Math.atan(eye / D) + Math.atan(nB * tl);
        if (Math.tan(pitch + Math.atan((HERO_TOP - eye) / D)) / tl > nT) lo = D;
        else hi = D;
      }
      D = Math.max(D, 0.75 / ((tl * innerWidth) / H));
      return {
        pos: [p.x + Math.sin(a) * D, y + eye, p.z + Math.cos(a) * D],
        look: [p.x, y + eye - Math.tan(pitch) * D, p.z],
        lens,
        mix: 1,
      };
    };

    const unsubs = [
      game.bus.on('people', () => setPeople(game.player.sheet.people || 'unit')),
      game.bus.on('class', () => setCls(game.player.sheet.cls)),
      game.bus.on('frame', (dt) => {
        if (game.started) return;
        selectTRef.current += dt;
        game.player.yaw = 0;
        game.camera.rail = selectView(selectTRef.current, dt);
      }),
    ];

    return () => {
      for (const off of unsubs) off();
      clearTimeout(hideTimerRef.current);
    };
  }, [game]);

  useEffect(() => {
    const el = titleRef.current as (HTMLDivElement & { inert: boolean }) | null;
    if (el) el.inert = fading;
  }, [fading]);

  const pickSave = (id: string): void => {
    if (game.started) return;
    const h = game.store.loadHero(id);
    if (h) {
      game.load(h);
      setActiveHeroId(h.id);
      setPeople(game.player.sheet.people || 'unit');
      setCls(game.player.sheet.cls);
    }
    setSummaries(getKept());
  };

  const createNew = (): void => {
    if (game.started) return;
    game.hero = null;
    setActiveHeroId(null);
    game.chooseClass(game.player.sheet.cls);
    setCreating(true);
    setAsking(null);
  };

  const handleDeleteConfirm = (id: string): void => {
    if (game.started) return;
    game.store.deleteHero(id, game.account);
    setAsking(null);
    const left = getKept();
    setSummaries(left);
    if (left.length > 0) {
      pickSave(left[0].id);
      setCreating(false);
    } else {
      createNew();
    }
  };

  const handleBackToSaves = (): void => {
    if (game.started) return;
    const list = getKept();
    setSummaries(list);
    if (list.length > 0) {
      pickSave(list[0].id);
      setCreating(false);
    }
  };

  const handleRadioKeyDown = (e: KeyboardEvent, container: HTMLDivElement | null): void => {
    const stepMap: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    const step = stepMap[e.key];
    if (!step || !container) return;
    const list = Array.from(container.children).filter((x): x is HTMLElement => x instanceof HTMLElement);
    if (!list.length) return;
    const idx = list.indexOf(document.activeElement as HTMLElement);
    const next = list[(idx + step + list.length) % list.length];
    next.focus();
    next.click();
    e.preventDefault();
  };

  const handleBegin = (): void => {
    if (game.started) return;
    document.body.classList.remove('titled');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setFading(true);
    hideTimerRef.current = window.setTimeout(() => setGone(true), 1000);
    game.camera.rail = null;
    game.player.yaw = Math.PI;
    game.begin();
    onBegan();
    const [pitch, distance] = game.savedView || [
      VIEWS.behind[0],
      VIEWS.behind[1] * (game.touch ? 0.9 : 1),
    ];
    game.camera.goal.pitch = pitch;
    game.camera.goal.distance = distance;
    game.player.yaw = Math.PI - game.camera.goal.yaw;
  };

  if (gone) return null;

  return (
    <div id="title" ref={titleRef}>
      <div class="select">
        <header class="select-head">
          <h1>Lumenwake</h1>
          <p class="tag">Contracts across the sky islands</p>
        </header>

        <section class="select-col saves" id="saves" aria-labelledby="pick-saves" hidden={!have || showCreating}>
          <h2 class="pick-label" id="pick-saves">
            Your surveyors
          </h2>
          <div id="save-list" class="save-list" role="radiogroup" aria-labelledby="pick-saves">
            {summaries.map((h) =>
              asking === h.id ? (
                <div key={h.id} class="save-ask" role="group" aria-label="Let this surveyor go?">
                  <p>
                    Let this surveyor go? Level <b class="c-num">{h.level}</b>, and everything they carry.
                  </p>
                  <div>
                    <button type="button" class="btn" data-keep={h.id} onClick={() => setAsking(null)}>
                      Keep
                    </button>
                    <button
                      type="button"
                      class="btn danger"
                      data-gone={h.id}
                      onClick={() => handleDeleteConfirm(h.id)}
                    >
                      Let go
                    </button>
                  </div>
                </div>
              ) : (
                <div key={h.id} class="save-row">
                  <button
                    type="button"
                    class="pick"
                    role="radio"
                    data-hero={h.id}
                    aria-checked={activeHeroId === h.id ? 'true' : 'false'}
                    onClick={() => pickSave(h.id)}
                  >
                    <img src={art(`people-${h.people}`)} alt="" />
                    <span class="pick-words">
                      <strong>
                        {PEOPLES[h.people].name} <b class={`c-${h.cls}`}>{CLASSES[h.cls].name}</b>
                      </strong>
                      <span>
                        Level <b class="c-num">{h.level}</b> · {h.missions}{' '}
                        {h.missions === 1 ? 'contract' : 'contracts'}
                      </span>
                      <small>{formatPlaytime(h.played)} played</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    class="x"
                    data-drop={h.id}
                    aria-label="Let this surveyor go"
                    title="Let this surveyor go"
                    onClick={() => setAsking(h.id)}
                  >
                    ×
                  </button>
                </div>
              ),
            )}
          </div>
          <button type="button" id="btn-create" class="btn" onClick={createNew}>
            New surveyor
          </button>
        </section>

        <section class="select-col people" aria-labelledby="pick-people">
          <h2 class="pick-label" id="pick-people">
            Who you are
          </h2>
          <div
            ref={peopleRef}
            id="people-pick"
            class="people-pick"
            role="radiogroup"
            aria-labelledby="pick-people"
            onKeyDown={(e) => handleRadioKeyDown(e, peopleRef.current)}
          >
            {PEOPLE_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                class="pick people-tile"
                role="radio"
                data-people={id}
                aria-checked={people === id ? 'true' : 'false'}
                onClick={() => {
                  if (!game.started) game.choosePeople(id);
                }}
              >
                <img src={art(`people-${id}`)} alt="" loading="eager" />
                <span class="pick-words">
                  <strong>{PEOPLES[id].name}</strong>
                  <span>{PEOPLES[id].blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section class="select-col classes" aria-labelledby="pick-class">
          <h2 class="pick-label" id="pick-class">
            Your class
          </h2>
          <div
            ref={classRef}
            id="class-pick"
            class="class-pick"
            role="radiogroup"
            aria-labelledby="pick-class"
            onKeyDown={(e) => handleRadioKeyDown(e, classRef.current)}
          >
            {CLASS_IDS.map((id) => {
              const def = CLASSES[id];
              return (
                <button
                  key={id}
                  type="button"
                  class={`pick class-card c-${id}`}
                  role="radio"
                  data-class={id}
                  aria-checked={cls === id ? 'true' : 'false'}
                  onClick={() => {
                    if (!game.started) game.chooseClass(id);
                  }}
                >
                  <img src={art(`class-${id}`)} alt="" loading="eager" />
                  <span class="pick-words">
                    <strong>{def.name}</strong>
                    <span>{def.blurb}</span>
                    <small>
                      {FAMILIES[def.family].name} · {def.abilities.map((a) => ABILITIES[a].name).join(', ')}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <footer class="select-foot">
          <p id="select-summary" role="status" aria-live="polite">
            <b class="c-name">{PEOPLES[people].name}</b>{' '}
            <b class={`c-${cls}`}>{CLASSES[cls].name}</b>
          </p>
          <div class="title-actions">
            <button type="button" id="btn-begin" class="primary" onClick={handleBegin}>
              {have && !showCreating ? 'Continue' : 'Begin'}
            </button>
            <button type="button" id="btn-new" hidden={!have || !showCreating} onClick={handleBackToSaves}>
              Your surveyors
            </button>
          </div>
          <p class="keys" id="keys-hint">
            {touch ? 'The stick walks  ·  tap to fight or talk' : 'WASD to move \u00a0·\u00a0 F attack \u00a0·\u00a0 Space jump'}
          </p>
        </footer>
      </div>
    </div>
  );
}
