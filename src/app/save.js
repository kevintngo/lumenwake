// Save game in localStorage. One JSON blob, versioned by key.

import { GAME } from '../config.js';

export function loadSave() {
  try {
    if (new URLSearchParams(location.search).has('new')) {
      // "?new" starts over once; drop it so the next reload continues this journey
      clearSave();
      const rest = new URLSearchParams(location.search);
      rest.delete('new');
      const left = rest.toString();
      history.replaceState(null, '', location.pathname + (left ? '?' + left : '') + location.hash);
      return null;
    }
    const raw = localStorage.getItem(GAME.SAVE_KEY);
    const s = raw && JSON.parse(raw);
    return s && s.sheet ? s : null;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(GAME.SAVE_KEY, JSON.stringify(data));
  } catch { /* private window or full storage: play on without saving */ }
}

export function clearSave() {
  try { localStorage.removeItem(GAME.SAVE_KEY); } catch { /* nothing to clear */ }
}
