// The pause menu: a short column over the dimmed picture, with the game held
// while it is up. Resume, Settings, How to play, Start the first steps again (in
// town), Return to the select screen.
//
// Settings is one panel with five short sections down its left side (Display,
// Sound, Controls, Accessibility, Saves). Every control is a real input with its
// label beside it and its value shown; a change takes effect at once and is
// kept (ui/settings.js does both).
//
// This module only draws and listens. ui.js decides when the menu opens, hands
// it the keys while it is up (`key`), and holds the game while `open` is true.

import { VIEWS } from '../config.js';
import { SET_ICONS } from './icons.js';

const SECTIONS = [
  { id: 'display', name: 'Display', rows: [
    { key: 'quality', name: 'Picture quality', kind: 'choice', options: [['auto', 'Auto'], ['high', 'High'], ['low', 'Low']] },
    { key: 'shake', name: 'Screen shake', kind: 'range' },
    { key: 'fullscreen', name: 'Full screen', kind: 'switch' },
    { key: 'numbers', name: 'Damage numbers', kind: 'switch' },
  ] },
  { id: 'sound', name: 'Sound', rows: [
    { key: 'master', name: 'Master volume', kind: 'range' },
    { key: 'music', name: 'Music', kind: 'range' },
    { key: 'sfx', name: 'Effects', kind: 'range' },
    { key: 'ambience', name: 'Ambience', kind: 'range' },
    { key: 'mute', name: 'Mute', kind: 'switch' },
  ] },
  { id: 'controls', name: 'Controls' },
  { id: 'access', name: 'Accessibility', short: 'Access', rows: [
    { key: 'calm', name: 'Reduce motion', hint: 'No screen shake, hit pauses or moving cameras', kind: 'switch' },
    { key: 'text', name: 'Text size', kind: 'choice', options: [[1, '100%'], [1.15, '115%'], [1.3, '130%']] },
    { key: 'skip', name: 'Skip cinematics', kind: 'switch' },
    { key: 'contrast', name: 'High contrast', hint: 'White lettering, heavier lines, solid plates', kind: 'switch' },
  ] },
  { id: 'saves', name: 'Saves' },
];
const CAMERA = [['behind', 'Behind'], ['above', 'Above'], ['left', 'Turn left'], ['right', 'Turn right'], ['high', 'Higher'], ['low', 'Lower'], ['near', 'Closer'], ['far', 'Farther']];
const KEYS = [['W A S D', 'Walk'], ['Space', 'Jump'], ['F', 'Attack or talk'], ['Tab', 'Next target'], ['1 2 3 4', 'Abilities'], ['R T', 'Flasks'], ['G', 'Lumen’s burst'], ['Q E', 'Turn the view'], ['C B L J', 'Menu tabs'], ['M', 'Sound on or off']];
const TOUCHES = [['Stick', 'Walk'], ['Tap', 'Walk there, attack or talk'], ['Drag', 'Turn the view'], ['Pinch', 'Zoom']];

export function createPause(game, store, hooks = {}) {
  const el = document.getElementById('pause'), doc = document;
  const state = { open: false, view: 'root', section: 'display', asking: false, direct: false, importing: null, note: '', noteBad: false };
  const full = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);
  const canFull = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
  const value = (key) => (key === 'fullscreen' ? full() : store.values[key]);

  // ---- drawing
  function where() {
    const a = game.missions.active;
    return a ? `${game.biome.name} · ${a.offer.name}` : game.biome.name;
  }
  function root() {
    const item = (id, text) => `<button type="button" class="pause-item" data-p="${id}">${text}</button>`;
    return `<div class="pause-col plate" role="document">
      <h2 id="pause-title">Paused</h2>
      <p class="pause-where">${where()}</p>
      <nav class="pause-list" aria-label="Pause menu">
        ${state.asking ? '' : `${item('resume', 'Resume')}${item('settings', 'Settings')}${item('guide', 'How to play')}${game.missions.active ? '' : item('steps', 'Start the first steps again')}`}
        ${state.asking ? `<div class="pause-ask" role="group" aria-label="Leave for the select screen?"><p>${game.missions.active ? 'Leave? Your surveyor is kept, with what they have picked up. This contract starts over.' : 'Leave for the select screen? Your surveyor is kept.'}</p>
          <div><button type="button" class="btn" data-p="stay">Stay</button><button type="button" class="btn primary" data-p="leave">Leave</button></div></div>` : item('quit', 'Save and leave')}
      </nav>
      ${game.touch ? '' : '<p class="pause-keys"><kbd>Esc</kbd> Resume</p>'}
    </div>`;
  }

  function control(r) {
    const v = value(r.key), id = 'set-' + r.key;
    if (r.kind === 'range') {
      const n = Math.round(v * 100);
      return `<div class="set-row"><label for="${id}">${r.name}</label>
        <div class="set-ctl range"><input type="range" id="${id}" data-set="${r.key}" min="0" max="100" step="5" value="${n}" style="--fill:${n}%" /><output for="${id}">${n}%</output></div></div>`;
    }
    if (r.kind === 'switch') {
      const off = r.key === 'fullscreen' && !canFull;
      return `<div class="set-row"><label for="${id}">${r.name}${r.hint ? `<small>${r.hint}</small>` : ''}</label>
        <div class="set-ctl switch"><output for="${id}">${off ? 'Not available here' : v ? 'On' : 'Off'}</output><input type="checkbox" role="switch" id="${id}" data-set="${r.key}" ${v ? 'checked' : ''} ${off ? 'disabled' : ''} /></div></div>`;
    }
    return `<div class="set-row" role="radiogroup" aria-labelledby="${id}"><span class="set-name" id="${id}">${r.name}</span>
      <div class="set-ctl seg">${r.options.map(([val, text]) => `<label><input type="radio" name="${id}" data-set="${r.key}" value="${val}" ${String(v) === String(val) ? 'checked' : ''} /><span>${text}</span></label>`).join('')}</div></div>`;
  }
  function controls() {
    const keys = (game.touch ? TOUCHES : KEYS).map(([k, t]) => `<span class="keys">${k.split(' ').map((x) => `<kbd>${x}</kbd>`).join('')}</span><span>${t}</span>`).join('');
    return `<h4 class="label">Camera</h4>
      <div class="cam-grid">${CAMERA.map(([arg, text]) => `<button type="button" class="btn" data-cam="${arg}">${text}</button>`).join('')}</div>
      <h4 class="label">${game.touch ? 'Touch' : 'Keys'}</h4>
      <div class="keys-list two">${keys}</div>`;
  }
  /** Saves: where the journey is kept, and a copy of it out to a file and back (app/save.js). */
  function saves() {
    return `<p class="set-note">Your surveyors are kept in this browser: every few seconds, when a contract ends, and whenever you leave. A copy in a file can be kept, or taken to another browser or device.</p>
      <div class="save-pair"><button type="button" class="btn" data-p="export">Save a copy to a file</button>
        <label class="btn file">Load from a file<input type="file" accept="application/json,.json" data-import /></label></div>
      ${state.importing ? `<div class="pause-ask" role="group" aria-label="Replace your surveyors?"><p>Replace every surveyor here with the ones in the file?</p>
        <div><button type="button" class="btn" data-p="import-no">Keep mine</button><button type="button" class="btn primary" data-p="import-yes">Replace</button></div></div>` : ''}
      ${state.note ? `<p class="set-note ${state.noteBad ? 'c-bad' : 'c-good'}" role="status">${state.note}</p>` : ''}
      ${game.store.failed ? '<p class="set-note c-bad">This browser is refusing to keep anything (a private window, or its storage is full). Keep a copy in a file.</p>' : ''}`;
  }
  function settings() {
    const sec = SECTIONS.find((s) => s.id === state.section) || SECTIONS[0];
    return `<section class="settings plate" aria-labelledby="pause-title">
      <header><h2 id="pause-title">Settings</h2><button type="button" class="x" data-p="back" aria-label="Back" title="Back (Esc)">×</button></header>
      <div class="set-rail" role="tablist" aria-orientation="vertical" aria-label="Settings sections">${SECTIONS.map((s) => `<button type="button" role="tab" class="set-tab" id="settab-${s.id}" data-sec="${s.id}"
        aria-selected="${s.id === sec.id}" aria-controls="set-pane" tabindex="${s.id === sec.id ? 0 : -1}" aria-label="${s.name}">${SET_ICONS[s.id]}<span class="long">${s.name}</span><span class="short" aria-hidden="true">${s.short || s.name}</span></button>`).join('')}</div>
      <div class="set-pane" id="set-pane" role="tabpanel" aria-labelledby="settab-${sec.id}">${sec.rows ? sec.rows.map(control).join('') : sec.id === 'saves' ? saves() : controls()}</div>
      <footer>${sec.id === 'saves' ? '<span></span>' : '<button type="button" class="btn" data-p="reset">Reset to defaults</button>'}<button type="button" class="btn primary" data-p="back">${state.direct ? 'Done' : 'Back'}</button></footer>
    </section>`;
  }

  function draw(focus) {
    el.innerHTML = state.view === 'settings' ? settings() : root();
    const to = focus && el.querySelector(focus);
    (to || el).focus({ preventScroll: true });
  }

  // ---- opening and closing
  function show(view = 'root', section) {
    if (!game.started || game.cinema.blocking) return;
    const was = state.open;
    Object.assign(state, { open: true, view, asking: false, direct: !was && view === 'settings' });
    if (section) state.section = section;
    el.hidden = false;
    draw(view === 'settings' ? '[role="tab"][aria-selected="true"]' : '[data-p="resume"]');
    if (!was) { game.bus.emit('ui:click'); if (hooks.onChange) hooks.onChange(); }
  }
  function hide() {
    if (!state.open) return;
    state.open = false;
    el.hidden = true;
    el.replaceChildren();
    if (doc.activeElement instanceof HTMLElement && doc.activeElement !== doc.body) doc.activeElement.blur();      // the keys go back to the game
    if (hooks.onChange) hooks.onChange();
  }
  /** One step back: out of a question, out of settings, out of the menu. */
  function back() {
    if (state.asking) { state.asking = false; draw('[data-p="quit"]'); }
    else if (state.view === 'settings' && !state.direct) { state.view = 'root'; draw('[data-p="settings"]'); }
    else hide();
  }

  // ---- what the buttons do
  function camera(arg) {
    const cam = game.camera;
    if (arg === 'left') cam.rotate(0.5, 0); else if (arg === 'right') cam.rotate(-0.5, 0);
    else if (arg === 'high') cam.rotate(0, 0.16); else if (arg === 'low') cam.rotate(0, -0.16);
    else if (arg === 'near') cam.zoom(0.84); else if (arg === 'far') cam.zoom(1.19);
    else if (VIEWS[arg]) Object.assign(cam.goal, { pitch: VIEWS[arg][0], distance: VIEWS[arg][1] * (game.touch ? 0.9 : 1) });
    game.bus.emit('ui:click');
  }
  function setFull(on) {
    const rootEl = doc.documentElement;
    try {
      const done = on ? (rootEl.requestFullscreen || rootEl.webkitRequestFullscreen).call(rootEl) : (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      if (done && done.catch) done.catch(() => {});
    } catch { /* the browser said no; the page simply stays as it is */ }
  }
  el.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t === el) { back(); return; }                 // a click on the dimmed picture
    const cam = t.closest('[data-cam]'), sec = t.closest('[data-sec]'), b = t.closest('[data-p]');
    if (cam) return camera(cam.dataset.cam);
    if (sec) { state.section = sec.dataset.sec; game.bus.emit('ui:click'); draw('[role="tab"][aria-selected="true"]'); return; }
    if (!b) return;
    const p = b.dataset.p;
    game.bus.emit('ui:click');
    if (p === 'resume') hide();
    else if (p === 'back') back();
    else if (p === 'settings') { state.view = 'settings'; state.direct = false; draw('[role="tab"][aria-selected="true"]'); }
    else if (p === 'guide') { hide(); if (hooks.guide) hooks.guide(); }
    else if (p === 'steps') { hide(); game.bus.emit('guide:restart'); }          // (app/tutorial.js: only from the town, so it is not offered on a contract)
    else if (p === 'quit') { state.asking = true; draw('[data-p="stay"]'); }
    else if (p === 'stay') back();
    else if (p === 'leave') { game.save(); location.reload(); }
    else if (p === 'export') {
      // (the surveyor being played is written first, so the file has this minute in it)
      game.save();
      const a = doc.createElement('a');
      a.href = URL.createObjectURL(new Blob([game.store.exportAll(game.account)], { type: 'application/json' }));
      a.download = `lumenwake-save-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      Object.assign(state, { note: 'A copy is in your downloads.', noteBad: false }); draw('[data-p="export"]');
    }
    else if (p === 'import-no') { Object.assign(state, { importing: null, note: '' }); draw('[data-p="export"]'); }
    else if (p === 'import-yes') {
      const text = state.importing;
      state.importing = null;
      const mine = game.hero;
      game.hero = null;                               // (nothing of this visit is written over what is being loaded)
      if (game.store.importAll(text)) { Object.assign(state, { note: 'Loaded. Starting again…', noteBad: false }); draw(); setTimeout(() => location.reload(), 900); }
      else { game.hero = mine; Object.assign(state, { note: 'That file is not a Lumenwake save.', noteBad: true }); draw('[data-p="export"]'); }
    }
    else if (p === 'reset') { store.reset(); draw('[data-p="reset"]'); }
  });
  // a control changed: put it into force, and say its new value beside it (a slider as it is dragged, the rest when they settle)
  const control$ = (e) => (e.target instanceof HTMLInputElement && e.target.dataset.set ? e.target : null);
  el.addEventListener('input', (e) => {
    const c = control$(e);
    if (!c || c.type !== 'range') return;
    const n = +c.value;
    c.style.setProperty('--fill', n + '%');
    c.closest('.set-row').querySelector('output').textContent = n + '%';
    store.set(c.dataset.set, n / 100);
  });
  el.addEventListener('change', (e) => {
    const f = e.target instanceof HTMLInputElement && e.target.type === 'file' ? e.target : null;
    if (f && f.files && f.files[0]) { f.files[0].text().then((text) => { Object.assign(state, { importing: text, note: '' }); draw('[data-p="import-no"]'); }); return; }
    const c = control$(e);
    if (!c || c.type === 'range') return;
    const key = c.dataset.set;
    if (c.type === 'checkbox') {
      c.closest('.set-row').querySelector('output').textContent = c.checked ? 'On' : 'Off';
      if (key === 'fullscreen') setFull(c.checked); else store.set(key, c.checked);
    } else if (c.checked) store.set(key, key === 'text' ? +c.value : c.value);
    game.bus.emit('ui:click');
  });
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) doc.addEventListener(ev, () => {
    const c = el.querySelector('[data-set="fullscreen"]');
    if (c) { c.checked = full(); c.closest('.set-row').querySelector('output').textContent = full() ? 'On' : 'Off'; }
  });

  /** A key pressed while the menu is up. Returns true if the menu took it. */
  function key(e) {
    if (!state.open) return false;
    const code = e.code, t = e.target instanceof Element ? e.target : null;
    if (code === 'Escape') { back(); return true; }
    if (!t || e.metaKey || e.ctrlKey || e.altKey) return false;
    const step = { ArrowDown: 1, ArrowUp: -1 }[code];
    // up and down walk the column, and the settings' sections
    const list = step && t.matches('.pause-item, .pause-ask .btn') ? [...el.querySelectorAll('.pause-item, .pause-ask .btn')] : step && t.matches('.set-tab') ? [...el.querySelectorAll('.set-tab')] : null;
    if (!list) return false;
    const next = list[(list.indexOf(t) + step + list.length) % list.length];
    if (t.matches('.set-tab')) next.click(); else next.focus();
    return true;
  }

  return { el, get open() { return state.open; }, show, hide, back, key };
}
