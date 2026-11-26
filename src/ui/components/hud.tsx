import { useEffect } from 'preact/hooks';
import type { MenuTabId, WindowKind } from '../../types/domain';
import type { NpcEntity } from '../../types/entity';
import type { GuideStepPayload } from '../../types/events';
import type { GameContext } from '../../types/game-context';
import type { MissionReport } from '../../types/mission';
import type { SettingsStore } from '../../types/render';
import { elderPic } from '../icons';
import { art, type LogSegment } from '../ui-helpers';
import { GameWindow } from './game-window';
import { Hotbar, type HotbarSnapshot } from './hotbar';
import type { PickContext } from './item-detail';
import { PauseModal, type PauseState } from './pause-modal';
import { DepthChoice, type DepthChoiceState } from './depth-choice';
import { ReportModal } from './report-modal';
import type { SettingsSectionId } from './settings-modal';
import { StatusPlates, type StatusSnapshot } from './status-plates';
import { TutorialCard } from './tutorial-card';

export interface HudSnapshot extends StatusSnapshot, HotbarSnapshot {
  targetName: string;
  targetLevel: number;
  targetRatio: number;
  bossName: string;
  bossSub: string;
  bossDefId: string;
  bossMad: boolean;
  bossRatio: number;
  zoneName: string;
  clockText: string;
  missionActive: boolean;
}

export interface LogEntry {
  id: number;
  segments: LogSegment[];
  old: boolean;
}

export interface ToastState {
  title: string;
  sub: string;
  show: boolean;
}

export interface TalkState {
  name: string;
  title: string;
  line: string;
}

interface HudProps {
  game: GameContext;
  store: SettingsStore;
  hud: HudSnapshot;
  bust: string;
  artRev: number;
  touch: boolean;
  logs: LogEntry[];
  toast: ToastState;
  choice: DepthChoiceState | null;
  talk: TalkState | null;
  report: MissionReport | null;
  windowKind: WindowKind | null;
  windowTab: MenuTabId;
  trader: NpcEntity | null;
  tutorialStep: GuideStepPayload | null;
  windowOpenSeq: number;
  windowRev: number;
  picked: Record<PickContext, string>;
  pauseState: PauseState;
  ringRef: { current: HTMLButtonElement | null };
  logRef: { current: HTMLElement | null };
  stickRef: { current: HTMLDivElement | null };
  platesRef: { current: HTMLDivElement | null };
  floatersRef: { current: HTMLDivElement | null };
  tutorMarkRef: { current: HTMLDivElement | null };
  tutorPointRef: { current: HTMLDivElement | null };
  winRef: { current: HTMLElement | null };
  pauseRef: { current: HTMLDivElement | null };
  onPlaceMap: () => void;
  onLumenClick: () => void;
  onMenuOpen: (id: 'character' | 'bag' | 'lumen' | 'menu') => void;
  onCloseReport: () => void;
  onPick: (ctx: PickContext, key: string) => void;
  onSelectTab: (tab: MenuTabId) => void;
  onCloseWindow: () => void;
  onMutateWindow: () => void;
  onPauseResume: () => void;
  onPauseBack: () => void;
  onPauseOpenSettings: () => void;
  onPauseSelectSection: (section: SettingsSectionId) => void;
  onPauseOpenGuide: () => void;
  onPauseRestartSteps: () => void;
  onPauseAskQuit: (asking: boolean) => void;
}

export function Hud({
  game,
  store,
  hud,
  bust,
  artRev,
  touch,
  logs,
  toast,
  choice,
  talk,
  report,
  windowKind,
  windowTab,
  trader,
  tutorialStep,
  windowOpenSeq,
  windowRev,
  picked,
  pauseState,
  ringRef,
  logRef,
  stickRef,
  platesRef,
  floatersRef,
  tutorMarkRef,
  tutorPointRef,
  winRef,
  pauseRef,
  onPlaceMap,
  onLumenClick,
  onMenuOpen,
  onCloseReport,
  onPick,
  onSelectTab,
  onCloseWindow,
  onMutateWindow,
  onPauseResume,
  onPauseBack,
  onPauseOpenSettings,
  onPauseSelectSection,
  onPauseOpenGuide,
  onPauseRestartSteps,
  onPauseAskQuit,
}: HudProps) {
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(onPlaceMap);
    ro.observe(ring);
    onPlaceMap();
    return () => ro.disconnect();
  }, [ringRef, onPlaceMap]);

  const bossFaceSrc = hud.bossDefId ? elderPic(hud.bossDefId) : '';

  return (
    <div id="ui" data-art={artRev}>
      <StatusPlates hud={hud} bust={bust} onLumenClick={onLumenClick} onMenuOpen={onMenuOpen} />

      <section id="target" class="plate" aria-label="Your target" hidden={!hud.targetName}>
        <div class="who">
          <span id="t-name">{hud.targetName}</span>
          <span id="t-lvl" class="dim">
            {hud.targetName ? `Level ${hud.targetLevel}` : ''}
          </span>
        </div>
        <div class="bar hp">
          <i id="t-fill" style={{ transform: `scaleX(${hud.targetRatio.toFixed(3)})` }} />
        </div>
      </section>

      <section id="compass" aria-label="Map and place">
        <button
          ref={ringRef}
          type="button"
          id="map-ring"
          title="Map"
          aria-label="Map of what is near"
          onClick={(e) => {
            if (e.detail) e.currentTarget.blur();
          }}
        />
        <div id="place" class="plate small">
          <span id="zone" class={hud.missionActive ? 'c-ink' : 'c-place'}>
            {hud.zoneName}
          </span>
          <span id="clock" class={hud.missionActive ? 'c-place' : 'dim'}>
            {hud.clockText}
          </span>
        </div>
      </section>

      <section
        id="boss"
        class={hud.bossMad ? 'plate mad' : 'plate'}
        aria-label="Elder"
        hidden={!hud.bossName}
      >
        <div class="face">
          <img id="boss-face" src={bossFaceSrc || undefined} alt="" />
        </div>
        <div class="boss-words">
          <strong id="boss-name">{hud.bossName}</strong>
          <small id="boss-sub">{hud.bossSub}</small>
        </div>
        <div class="bar hp" role="img" aria-label="Elder's health">
          <i id="boss-fill" style={{ transform: `scaleX(${hud.bossRatio.toFixed(3)})` }} />
          <b class="half" aria-hidden="true" />
        </div>
      </section>

      <section ref={logRef} id="log" role="log" aria-live="polite" aria-label="Messages">
        {logs.map((entry) => (
          <p key={entry.id} class={entry.old ? 'old' : undefined}>
            {entry.segments.map((seg, i) =>
              seg.bold ? (
                <b key={i} class={seg.className} style={seg.color ? { color: seg.color } : undefined}>
                  {seg.text}
                </b>
              ) : seg.className || seg.color ? (
                <span
                  key={i}
                  class={seg.className}
                  style={seg.color ? { color: seg.color } : undefined}
                >
                  {seg.text}
                </span>
              ) : (
                seg.text
              ),
            )}
          </p>
        ))}
      </section>

      <div
        id="toast"
        class={toast.show ? 'plate show' : 'plate'}
        role="status"
        aria-live="polite"
      >
        <strong>{toast.title}</strong>
        {toast.sub && <span>{toast.sub}</span>}
      </div>

      <section id="talk" class="plate" aria-live="polite" hidden={!talk}>
        <div class="face">
          <img
            id="talk-face"
            src={talk ? art(`crew-${talk.name.toLowerCase()}`) : undefined}
            alt=""
          />
        </div>
        <div class="talk-words">
          <div class="who">
            <strong id="talk-name">{talk?.name || ''}</strong>
            <small id="talk-title">{talk?.title || ''}</small>
          </div>
          <p id="talk-line">{talk ? `“${talk.line}”` : ''}</p>
        </div>
      </section>

      <DepthChoice game={game} choice={report ? null : choice} touch={touch} />

      <ReportModal game={game} report={report} onClose={onCloseReport} />

      <div ref={stickRef} id="stick" aria-hidden="true">
        <div class="base">
          <div class="nub" />
        </div>
      </div>

      <Hotbar game={game} hud={hud} />

      <div ref={platesRef} id="plates" aria-hidden="true" />
      <div ref={floatersRef} id="floaters" aria-hidden="true" />

      <TutorialCard game={game} touch={touch} />
      <div ref={tutorMarkRef} id="tutor-mark" aria-hidden="true" hidden />
      <div ref={tutorPointRef} id="tutor-point" aria-hidden="true" hidden />

      <GameWindow
        game={game}
        kind={windowKind}
        tab={windowTab}
        trader={trader}
        touch={touch}
        tutorialStep={tutorialStep}
        openSeq={windowOpenSeq}
        rev={windowRev}
        picked={picked}
        onPick={onPick}
        onSelectTab={onSelectTab}
        onClose={onCloseWindow}
        onMutate={onMutateWindow}
        winRef={winRef}
      />

      <PauseModal
        game={game}
        store={store}
        state={pauseState}
        touch={touch}
        onResume={onPauseResume}
        onBack={onPauseBack}
        onOpenSettings={onPauseOpenSettings}
        onSelectSection={onPauseSelectSection}
        onOpenGuide={onPauseOpenGuide}
        onRestartSteps={onPauseRestartSteps}
        onAskQuit={onPauseAskQuit}
        containerRef={pauseRef}
      />
    </div>
  );
}
