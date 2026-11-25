import { RENDER } from '../config';
import type { QualitySetting } from '../types/domain';
import type { GameContext } from '../types/game-context';
import type { SettingsKey, SettingsStore, UiSettings } from '../types/render';

const KEY = 'lumenwake.settings.v1';
const TEXT_SIZES: readonly number[] = [1, 1.15, 1.3];

interface RectBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const systemCalm = (): boolean => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const defaults = (): UiSettings => ({
  quality: 'auto',
  shake: 1,
  numbers: true,
  master: 1,
  music: 1,
  sfx: 1,
  ambience: 1,
  mute: false,
  calm: systemCalm(),
  text: 1,
  skip: false,
  contrast: false,
});

function unit(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined;
}

function bool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

const VALIDATORS: { [K in SettingsKey]: (v: unknown) => UiSettings[K] | undefined } = {
  quality: (v) => (v === 'auto' || v === 'high' || v === 'low' ? v : undefined),
  shake: unit,
  master: unit,
  music: unit,
  sfx: unit,
  ambience: unit,
  numbers: bool,
  mute: bool,
  calm: bool,
  skip: bool,
  contrast: bool,
  text: (v) => {
    const n = Number(v);
    return TEXT_SIZES.includes(n) ? n : undefined;
  },
};

function read(): Partial<UiSettings> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, unknown>;
    const out: Partial<UiSettings> = {};
    for (const k of Object.keys(VALIDATORS) as SettingsKey[]) {
      if (raw && k in raw) {
        const v = VALIDATORS[k](raw[k]);
        if (v !== undefined) assignSetting(out, k, v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function assignSetting<K extends SettingsKey>(target: Partial<UiSettings>, key: K, value: UiSettings[K]): void {
  target[key] = value;
}

function write(kept: Partial<UiSettings>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
  }
}

export function createSettings(game: GameContext): SettingsStore {
  let kept = read();
  const values: UiSettings = { ...defaults(), ...kept };
  game.settings = values;
  const root = document.documentElement;
  const body = document.body;
  const r = game.renderer;
  const autoQuality = r.quality;
  const noCine = game.cinema.quiet;

  const emitVolume = (): void => {
    game.bus.emit('volume', {
      master: values.master,
      music: values.music,
      sfx: values.sfx,
      ambience: values.ambience,
    });
  };

  const apply: { [K in SettingsKey]: (v: UiSettings[K]) => void } = {
    quality(v: QualitySetting) {
      if (v === 'auto') {
        r.autoAdapt = true;
        r.quality = autoQuality;
        return;
      }
      r.autoAdapt = false;
      r.quality = v;
      r.scale = v === 'high' ? Math.max(1, RENDER.SCALE_START) : RENDER.SCALE_LITE;
      r.resize(r.size.cssW, r.size.cssH, r.size.dpr);
    },
    shake() {},
    numbers(v) {
      body.classList.toggle('no-numbers', !v);
    },
    master: emitVolume,
    music: emitVolume,
    sfx: emitVolume,
    ambience: emitVolume,
    mute(v) {
      game.bus.emit('sound', !v);
    },
    calm(v) {
      game.reducedMotion = v;
      body.classList.toggle('calm', v);
    },
    text(v) {
      root.style.setProperty('--ui-scale', String(v));
      root.style.setProperty('--hud-scale', String(Math.round((1 + (v - 1) / 2) * 1000) / 1000));
    },
    skip(v) {
      game.cinema.quiet = v || noCine;
    },
    contrast(v) {
      body.classList.toggle('contrast', v);
    },
  };

  const applyKey = <K extends SettingsKey>(key: K): void => {
    apply[key](values[key]);
  };

  const store: SettingsStore = {
    values,
    set<K extends SettingsKey>(key: K, value: UiSettings[K]) {
      const v = VALIDATORS[key](value);
      if (v === undefined || values[key] === v) return;
      values[key] = v;
      kept[key] = v;
      write(kept);
      apply[key](v);
      game.bus.emit('settings', { key, value: v });
    },
    reset() {
      kept = {};
      write(kept);
      Object.assign(values, defaults());
      for (const k of Object.keys(apply) as SettingsKey[]) applyKey(k);
      game.bus.emit('settings', { key: null });
    },
  };

  for (const k of Object.keys(apply) as SettingsKey[]) applyKey(k);
  return store;
}

let drawn: boolean | null = null;

function boxesAreDrawn(): boolean {
  if (drawn === null) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;width:10px;height:10px;zoom:2;visibility:hidden;pointer-events:none';
    document.body.appendChild(d);
    drawn = d.getBoundingClientRect().width > 15;
    d.remove();
  }
  return drawn;
}

export function boxOf(el: Element): RectBox {
  const b = el.getBoundingClientRect();
  if (boxesAreDrawn()) return b;
  let z = 1;
  for (let a: Element | null = el; a && a.nodeType === 1; a = a.parentElement) {
    const cs = getComputedStyle(a) as CSSStyleDeclaration & { zoom?: string };
    z *= parseFloat(cs.zoom || '1') || 1;
  }
  return z === 1
    ? b
    : {
        left: b.left * z,
        top: b.top * z,
        right: b.right * z,
        bottom: b.bottom * z,
        width: b.width * z,
        height: b.height * z,
      };
}
