import { useEffect, useRef } from '../dom';
import type { GameContext } from '../../types/game-context';
import type { SettingsStore } from '../../types/render';
import { SettingsModal, type SettingsSectionId } from './settings-modal';

export interface PauseState {
  open: boolean;
  view: 'root' | 'settings';
  section: SettingsSectionId;
  asking: boolean;
  direct: boolean;
}

interface PauseModalProps {
  game: GameContext;
  store: SettingsStore;
  state: PauseState;
  touch: boolean;
  onResume: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
  onSelectSection: (section: SettingsSectionId) => void;
  onOpenGuide: () => void;
  onRestartSteps: () => void;
  onAskQuit: (asking: boolean) => void;
  containerRef: { current: HTMLDivElement | null };
}

export function PauseModal({
  game,
  store,
  state,
  touch,
  onResume,
  onBack,
  onOpenSettings,
  onSelectSection,
  onOpenGuide,
  onRestartSteps,
  onAskQuit,
  containerRef,
}: PauseModalProps) {
  const prevViewRef = useRef<string>('');

  useEffect(() => {
    const el = containerRef.current;
    if (!state.open || !el) {
      prevViewRef.current = '';
      return;
    }
    const sig = `${state.view}:${state.section}:${state.asking}`;
    if (sig === prevViewRef.current) return;
    prevViewRef.current = sig;
    const sel =
      state.view === 'settings'
        ? '[role="tab"][aria-selected="true"]'
        : state.asking
          ? '[data-p="stay"]'
          : '[data-p="resume"]';
    const target = el.querySelector<HTMLElement>(sel);
    (target || el).focus({ preventScroll: true });
  }, [state.open, state.view, state.section, state.asking, containerRef]);

  const activeMission = game.missions.active;
  const where = activeMission
    ? `${game.biome.name} · ${activeMission.offer.name}`
    : game.biome.name;

  return (
    <div
      ref={containerRef}
      id="pause"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      tabIndex={-1}
      hidden={!state.open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBack();
      }}
    >
      {state.open &&
        (state.view === 'settings' ? (
          <SettingsModal
            game={game}
            store={store}
            section={state.section}
            direct={state.direct}
            touch={touch}
            onSelectSection={onSelectSection}
            onBack={onBack}
          />
        ) : (
          <div class="pause-col plate" role="document">
            <h2 id="pause-title">Paused</h2>
            <p class="pause-where">{where}</p>
            <nav class="pause-list" aria-label="Pause menu">
              {!state.asking && (
                <>
                  <button
                    type="button"
                    class="pause-item"
                    data-p="resume"
                    onClick={() => {
                      game.bus.emit('ui:click');
                      onResume();
                    }}
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    class="pause-item"
                    data-p="settings"
                    onClick={() => {
                      game.bus.emit('ui:click');
                      onOpenSettings();
                    }}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    class="pause-item"
                    data-p="guide"
                    onClick={() => {
                      game.bus.emit('ui:click');
                      onOpenGuide();
                    }}
                  >
                    How to play
                  </button>
                  {!activeMission && (
                    <button
                      type="button"
                      class="pause-item"
                      data-p="steps"
                      onClick={() => {
                        game.bus.emit('ui:click');
                        onRestartSteps();
                      }}
                    >
                      Start the first steps again
                    </button>
                  )}
                </>
              )}
              {state.asking ? (
                <div class="pause-ask" role="group" aria-label="Leave for the select screen?">
                  <p>
                    {activeMission
                      ? 'Leave? Your surveyor is kept, with what they have picked up. This contract starts over.'
                      : 'Leave for the select screen? Your surveyor is kept.'}
                  </p>
                  <div>
                    <button
                      type="button"
                      class="btn"
                      data-p="stay"
                      onClick={() => {
                        game.bus.emit('ui:click');
                        onAskQuit(false);
                      }}
                    >
                      Stay
                    </button>
                    <button
                      type="button"
                      class="btn primary"
                      data-p="leave"
                      onClick={() => {
                        game.bus.emit('ui:click');
                        game.save();
                        location.reload();
                      }}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  class="pause-item"
                  data-p="quit"
                  onClick={() => {
                    game.bus.emit('ui:click');
                    onAskQuit(true);
                  }}
                >
                  Save and leave
                </button>
              )}
            </nav>
            {!touch && (
              <p class="pause-keys">
                <kbd>Esc</kbd> Resume
              </p>
            )}
          </div>
        ))}
    </div>
  );
}
