// Settings: what the player has chosen about the picture, the sound, and how the
// interface reads. One small object, `game.settings`, that the rest of the game
// may read (app/view.js reads `shake`); one key in localStorage that keeps what
// was changed; and one function per setting that puts it into force.
//
// Only what the player changed is kept, so anything left alone follows its
// default (reduced motion follows the system's own setting until it is touched).
// Storage may be missing or refuse (private windows, an embedded page): every
// read and write is guarded, and the game plays the same without it.

import { RENDER } from '../config.js';

const KEY = 'lumenwake.settings.v1';
const TEXT_SIZES = [1, 1.15, 1.3];

const systemCalm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

export const defaults = () => ({
  quality: 'auto',         // the picture: 'auto' (the renderer keeps the frame rate itself) | 'high' | 'low'
  shake: 1,                // screen shake, 0..1
  numbers: true,           // numbers over the fight
  master: 1, music: 1, sfx: 1, ambience: 1,     // each 0..1, on top of the game's own mix
  mute: false,
  calm: systemCalm(),      // reduce motion
  text: 1,                 // lettering: 1 | 1.15 | 1.3
  skip: false,             // skip cinematics
  contrast: false,         // high-contrast interface
});

const KINDS = {
  quality: (v) => (['auto', 'high', 'low'].includes(v) ? v : undefined),
  shake: unit, master: unit, music: unit, sfx: unit, ambience: unit,
  numbers: bool, mute: bool, calm: bool, skip: bool, contrast: bool,
  text: (v) => (TEXT_SIZES.includes(+v) ? +v : undefined),
};
function unit(v) { return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined; }
function bool(v) { return typeof v === 'boolean' ? v : undefined; }

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}'), out = {};
    for (const k in KINDS) { const v = raw && k in raw ? KINDS[k](raw[k]) : undefined; if (v !== undefined) out[k] = v; }
    return out;
  } catch { return {}; }
}
function write(kept) {
  try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* no storage: the choice lasts for this visit */ }
}

/**
 * Makes `game.settings` and puts every setting into force. Returns the store:
 *   values            the same object as game.settings
 *   set(key, value)   changes one, applies it, keeps it
 *   reset()           everything back to its default
 * Each change is also announced on the bus as 'settings' ({ key, value }).
 */
export function createSettings(game) {
  let kept = read();
  const values = { ...defaults(), ...kept };
  game.settings = values;
  const root = document.documentElement, body = document.body, r = game.renderer;
  const autoQuality = r.quality;            // what the renderer chose for this device
  const noCine = game.cinema.quiet;         // (?nocine in the address)

  const apply = {
    // High and Low fix the shader and the resolution; Auto hands both back to the renderer's own scaler.
    quality(v) {
      if (v === 'auto') { delete r.adapt; r.quality = autoQuality; return; }
      r.adapt = () => {};
      r.quality = v;
      r.scale = v === 'high' ? Math.max(1, RENDER.SCALE_START) : RENDER.SCALE_LITE;
      r.resize(r.size.cssW, r.size.cssH, r.size.dpr);
    },
    shake() {},              // read where the camera is shaken (app/view.js)
    numbers(v) { body.classList.toggle('no-numbers', !v); },
    master: volume, music: volume, sfx: volume, ambience: volume,
    mute(v) { game.bus.emit('sound', !v); },
    calm(v) { game.reducedMotion = v; body.classList.toggle('calm', v); },
    // Menus and reading text grow by the whole step; the plates of the HUD by half of it, so they still clear one another.
    text(v) {
      root.style.setProperty('--ui-scale', String(v));
      root.style.setProperty('--hud-scale', String(Math.round((1 + (v - 1) / 2) * 1000) / 1000));
    },
    skip(v) { game.cinema.quiet = v || noCine; },
    contrast(v) { body.classList.toggle('contrast', v); },
  };
  function volume() { game.bus.emit('volume', { master: values.master, music: values.music, sfx: values.sfx, ambience: values.ambience }); }

  const store = {
    values,
    sizes: TEXT_SIZES,
    set(key, value) {
      const v = KINDS[key] ? KINDS[key](value) : undefined;
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
      for (const k in apply) apply[k](values[k]);
      game.bus.emit('settings', { key: null });
    },
  };
  for (const k in apply) apply[k](values[k]);
  return store;
}

// ---- measuring under `zoom`
// The interface is enlarged with the CSS `zoom` property. Current browsers give an element's box as it is drawn;
// older ones gave it as if it were not zoomed. Whoever lines the picture up with the page (the map, the name
// slips) asks here, and gets the drawn box either way.
let drawn = null;
function boxesAreDrawn() {
  if (drawn === null) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;top:0;width:10px;height:10px;zoom:2;visibility:hidden;pointer-events:none';
    document.body.appendChild(d);
    drawn = d.getBoundingClientRect().width > 15;
    d.remove();
  }
  return drawn;
}
export function boxOf(el) {
  const b = el.getBoundingClientRect();
  if (boxesAreDrawn()) return b;
  let z = 1;
  for (let a = el; a && a.nodeType === 1; a = a.parentElement) z *= parseFloat(getComputedStyle(a).zoom) || 1;
  return z === 1 ? b : { left: b.left * z, top: b.top * z, right: b.right * z, bottom: b.bottom * z, width: b.width * z, height: b.height * z };
}
