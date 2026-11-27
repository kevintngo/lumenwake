import { useEffect, useState } from '../dom';
import { VIEWS } from '../../config';
import type { QualitySetting } from '../../types/domain';
import type { GameContext } from '../../types/game-context';
import type { SettingsKey, SettingsStore } from '../../types/render';
import { SET_ICONS } from '../icons';

export type SettingsSectionId = 'display' | 'sound' | 'controls' | 'access' | 'saves';

interface SettingsModalProps {
  game: GameContext;
  store: SettingsStore;
  section: SettingsSectionId;
  direct: boolean;
  touch: boolean;
  onSelectSection: (section: SettingsSectionId) => void;
  onBack: () => void;
}

type SettingRowKey = SettingsKey | 'fullscreen';

interface SettingRowDef {
  key: SettingRowKey;
  name: string;
  hint?: string;
  kind: 'choice' | 'range' | 'switch';
  options?: readonly (readonly [string | number, string])[];
}

interface SectionDef {
  id: SettingsSectionId;
  name: string;
  short?: string;
  rows?: readonly SettingRowDef[];
}

const SECTIONS: readonly SectionDef[] = [
  {
    id: 'display',
    name: 'Display',
    rows: [
      {
        key: 'quality',
        name: 'Picture quality',
        kind: 'choice',
        options: [
          ['auto', 'Auto'],
          ['high', 'High'],
          ['low', 'Low'],
        ],
      },
      { key: 'shake', name: 'Screen shake', kind: 'range' },
      { key: 'fullscreen', name: 'Full screen', kind: 'switch' },
      { key: 'numbers', name: 'Damage numbers', kind: 'switch' },
    ],
  },
  {
    id: 'sound',
    name: 'Sound',
    rows: [
      { key: 'master', name: 'Master volume', kind: 'range' },
      { key: 'music', name: 'Music', kind: 'range' },
      { key: 'sfx', name: 'Effects', kind: 'range' },
      { key: 'ambience', name: 'Ambience', kind: 'range' },
      { key: 'mute', name: 'Mute', kind: 'switch' },
    ],
  },
  { id: 'controls', name: 'Controls' },
  {
    id: 'access',
    name: 'Accessibility',
    short: 'Access',
    rows: [
      {
        key: 'calm',
        name: 'Reduce motion',
        hint: 'No screen shake, hit pauses or moving cameras',
        kind: 'switch',
      },
      {
        key: 'text',
        name: 'Text size',
        kind: 'choice',
        options: [
          [1, '100%'],
          [1.15, '115%'],
          [1.3, '130%'],
        ],
      },
      { key: 'skip', name: 'Skip cinematics', kind: 'switch' },
      {
        key: 'contrast',
        name: 'High contrast',
        hint: 'White lettering, heavier lines, solid plates',
        kind: 'switch',
      },
    ],
  },
  { id: 'saves', name: 'Saves' },
];

const CAMERA_ACTIONS: readonly (readonly [string, string])[] = [
  ['behind', 'Behind'],
  ['above', 'Above'],
  ['left', 'Turn left'],
  ['right', 'Turn right'],
  ['high', 'Higher'],
  ['low', 'Lower'],
  ['near', 'Closer'],
  ['far', 'Farther'],
];

const KEYS_LIST: readonly (readonly [string, string])[] = [
  ['W A S D', 'Walk'],
  ['Space', 'Jump'],
  ['F', 'Attack or talk'],
  ['Tab', 'Next target'],
  ['1 2 3 4', 'Abilities'],
  ['R T', 'Flasks'],
  ['G', 'Lumen’s burst'],
  ['Q E', 'Turn the view'],
  ['C B L J', 'Menu tabs'],
  ['M', 'Sound on or off'],
];

const TOUCH_LIST: readonly (readonly [string, string])[] = [
  ['Stick', 'Walk'],
  ['Tap', 'Walk there, attack or talk'],
  ['Drag', 'Turn the view'],
  ['Pinch', 'Zoom'],
];

type WebkitDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitElem = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const isFull = (): boolean => {
  const d = document as WebkitDoc;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
};

const canFull = (): boolean => {
  const d = document as WebkitDoc;
  return Boolean(d.fullscreenEnabled || d.webkitFullscreenEnabled);
};

export function SettingsModal({
  game,
  store,
  section,
  direct,
  touch,
  onSelectSection,
  onBack,
}: SettingsModalProps) {
  const [, setTick] = useState(0);
  const [full, setFullState] = useState<boolean>(() => isFull());
  const [importing, setImporting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [noteBad, setNoteBad] = useState(false);

  const fullSupported = canFull();

  useEffect(() => {
    const onFs = (): void => setFullState(isFull());
    const offSettings = game.bus.on('settings', () => setTick((t) => t + 1));
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      offSettings();
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, [game]);

  const setFullscreen = (on: boolean): void => {
    const rootEl = document.documentElement as WebkitElem;
    const doc = document as WebkitDoc;
    try {
      const fn = on
        ? rootEl.requestFullscreen || rootEl.webkitRequestFullscreen
        : doc.exitFullscreen || doc.webkitExitFullscreen;
      if (!fn) return;
      const res = fn.call(on ? rootEl : doc);
      if (res && typeof (res as Promise<void>).catch === 'function') {
        (res as Promise<void>).catch(() => {});
      }
    } catch {
    }
  };

  const handleCamera = (arg: string): void => {
    const cam = game.camera;
    if (arg === 'left') cam.rotate(0.5, 0);
    else if (arg === 'right') cam.rotate(-0.5, 0);
    else if (arg === 'high') cam.rotate(0, 0.16);
    else if (arg === 'low') cam.rotate(0, -0.16);
    else if (arg === 'near') cam.zoom(0.84);
    else if (arg === 'far') cam.zoom(1.19);
    else if (arg === 'behind' || arg === 'above') {
      const preset = VIEWS[arg];
      cam.goal.pitch = preset[0];
      cam.goal.distance = preset[1] * (game.touch ? 0.9 : 1);
    }
    game.bus.emit('ui:click');
  };

  const handleExport = (): void => {
    game.save();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([game.store.exportAll(game.account)], { type: 'application/json' }),
    );
    a.download = `lumenwake-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setNote('A copy is in your downloads.');
    setNoteBad(false);
    game.bus.emit('ui:click');
  };

  const handleImportFile = (file: File | undefined): void => {
    if (!file) return;
    file.text().then((text) => {
      setImporting(text);
      setNote('');
      setNoteBad(false);
    });
  };

  const handleImportConfirm = (): void => {
    if (!importing) return;
    const text = importing;
    setImporting(null);
    const mine = game.hero;
    game.hero = null;
    if (game.store.importAll(text)) {
      setNote('Loaded. Starting again…');
      setNoteBad(false);
      window.setTimeout(() => location.reload(), 900);
    } else {
      game.hero = mine;
      setNote('That file is not a Lumenwake save.');
      setNoteBad(true);
    }
    game.bus.emit('ui:click');
  };

  const handleReset = (): void => {
    store.reset();
    setTick((t) => t + 1);
    game.bus.emit('ui:click');
  };

  const sec = SECTIONS.find((s) => s.id === section) || SECTIONS[0];

  const renderControl = (r: SettingRowDef) => {
    const id = `set-${r.key}`;
    if (r.kind === 'range') {
      const k = r.key as 'shake' | 'master' | 'music' | 'sfx' | 'ambience';
      const n = Math.round(store.values[k] * 100);
      return (
        <div key={r.key} class="set-row">
          <label for={id}>{r.name}</label>
          <div class="set-ctl range">
            <input
              type="range"
              id={id}
              data-set={r.key}
              min={0}
              max={100}
              step={5}
              value={n}
              style={{ '--fill': `${n}%` }}
              onInput={(e) => {
                const val = Number(e.currentTarget.value);
                store.set(k, val / 100);
                setTick((t) => t + 1);
              }}
            />
            <output for={id}>{n}%</output>
          </div>
        </div>
      );
    }

    if (r.kind === 'switch') {
      const off = r.key === 'fullscreen' && !fullSupported;
      const checked =
        r.key === 'fullscreen'
          ? full
          : Boolean(store.values[r.key as 'numbers' | 'mute' | 'calm' | 'skip' | 'contrast']);
      return (
        <div key={r.key} class="set-row">
          <label for={id}>
            {r.name}
            {r.hint && <small>{r.hint}</small>}
          </label>
          <div class="set-ctl switch">
            <output for={id}>{off ? 'Not available here' : checked ? 'On' : 'Off'}</output>
            <input
              type="checkbox"
              role="switch"
              id={id}
              data-set={r.key}
              checked={checked}
              disabled={off}
              onChange={(e) => {
                const next = e.currentTarget.checked;
                if (r.key === 'fullscreen') setFullscreen(next);
                else {
                  store.set(r.key as 'numbers' | 'mute' | 'calm' | 'skip' | 'contrast', next);
                  setTick((t) => t + 1);
                }
                game.bus.emit('ui:click');
              }}
            />
          </div>
        </div>
      );
    }

    const currentVal = store.values[r.key as 'quality' | 'text'];
    return (
      <div key={r.key} class="set-row" role="radiogroup" aria-labelledby={id}>
        <span class="set-name" id={id}>
          {r.name}
        </span>
        <div class="set-ctl seg">
          {r.options?.map(([val, text]) => (
            <label key={String(val)}>
              <input
                type="radio"
                name={id}
                data-set={r.key}
                value={String(val)}
                checked={String(currentVal) === String(val)}
                onChange={() => {
                  if (r.key === 'text') store.set('text', Number(val));
                  else store.set('quality', val as QualitySetting);
                  setTick((t) => t + 1);
                  game.bus.emit('ui:click');
                }}
              />
              <span>{text}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section class="settings plate" aria-labelledby="pause-title">
      <header>
        <h2 id="pause-title">Settings</h2>
        <button
          type="button"
          class="x"
          data-p="back"
          aria-label="Back"
          title="Back (Esc)"
          onClick={() => {
            game.bus.emit('ui:click');
            onBack();
          }}
        >
          ×
        </button>
      </header>
      <div class="set-rail" role="tablist" aria-orientation="vertical" aria-label="Settings sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            class="set-tab"
            id={`settab-${s.id}`}
            data-sec={s.id}
            aria-selected={s.id === sec.id ? 'true' : 'false'}
            aria-controls="set-pane"
            tabIndex={s.id === sec.id ? 0 : -1}
            aria-label={s.name}
            onClick={() => {
              game.bus.emit('ui:click');
              onSelectSection(s.id);
            }}
          >
            {SET_ICONS[s.id]()}
            <span class="long">{s.name}</span>
            <span class="short" aria-hidden="true">
              {s.short || s.name}
            </span>
          </button>
        ))}
      </div>
      <div class="set-pane" id="set-pane" role="tabpanel" aria-labelledby={`settab-${sec.id}`}>
        {sec.rows ? (
          sec.rows.map(renderControl)
        ) : sec.id === 'saves' ? (
          <>
            <p class="set-note">
              Your surveyors are kept in this browser: every few seconds, when a contract ends, and
              whenever you leave. A copy in a file can be kept, or taken to another browser or device.
            </p>
            <div class="save-pair">
              <button type="button" class="btn" data-p="export" onClick={handleExport}>
                Save a copy to a file
              </button>
              <label class="btn file">
                Load from a file
                <input
                  type="file"
                  accept="application/json,.json"
                  data-import=""
                  onChange={(e) => {
                    handleImportFile(e.currentTarget.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            {importing && (
              <div class="pause-ask" role="group" aria-label="Replace your surveyors?">
                <p>Replace every surveyor here with the ones in the file?</p>
                <div>
                  <button
                    type="button"
                    class="btn"
                    data-p="import-no"
                    onClick={() => {
                      setImporting(null);
                      setNote('');
                      game.bus.emit('ui:click');
                    }}
                  >
                    Keep mine
                  </button>
                  <button type="button" class="btn primary" data-p="import-yes" onClick={handleImportConfirm}>
                    Replace
                  </button>
                </div>
              </div>
            )}
            {note && (
              <p class={`set-note ${noteBad ? 'c-bad' : 'c-good'}`} role="status">
                {note}
              </p>
            )}
            {game.store.failed && (
              <p class="set-note c-bad">
                This browser is refusing to keep anything (a private window, or its storage is full). Keep a
                copy in a file.
              </p>
            )}
          </>
        ) : (
          <>
            <h4 class="label">Camera</h4>
            <div class="cam-grid">
              {CAMERA_ACTIONS.map(([arg, text]) => (
                <button
                  key={arg}
                  type="button"
                  class="btn"
                  data-cam={arg}
                  onClick={() => handleCamera(arg)}
                >
                  {text}
                </button>
              ))}
            </div>
            <h4 class="label">{touch ? 'Touch' : 'Keys'}</h4>
            <div class="keys-list two">
              {(touch ? TOUCH_LIST : KEYS_LIST).map(([keys, desc]) => (
                <>
                  <span key={`${keys}-k`} class="keys">
                    {keys.split(' ').map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                  <span key={`${keys}-d`}>{desc}</span>
                </>
              ))}
            </div>
          </>
        )}
      </div>
      <footer>
        {sec.id === 'saves' ? (
          <span />
        ) : (
          <button type="button" class="btn" data-p="reset" onClick={handleReset}>
            Reset to defaults
          </button>
        )}
        <button
          type="button"
          class="btn primary"
          data-p="back"
          onClick={() => {
            game.bus.emit('ui:click');
            onBack();
          }}
        >
          {direct ? 'Done' : 'Back'}
        </button>
      </footer>
    </section>
  );
}
