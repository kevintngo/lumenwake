// The first steps, on the screen. app/tutorial.js decides which step is showing
// and what it points at; this draws it:
//
//   the card    bottom middle, over the hotbar: which part of the first hour this is and how far through it,
//               the keys to press as caps, one plain line, and a way to skip
//   the marker  a chevron over whatever the step points at; when that is out of sight, an arrow at the edge
//               of the picture with how far off it is
//   the ring    round the button or bar the step is about (the `data-hint` attribute, styled in ui.css), with a
//               chevron bobbing beside it. Inside an open window it goes to the thing to press there; when the
//               step that needed the window is done, to the window's way out
//   a tip       a smaller card over the first, for the things said once when they first matter
//
// It builds its own elements inside #ui, so a cinematic hides it with the rest of the HUD.

import { boxOf } from './settings.js';

const CHEVRON = '<svg viewBox="0 0 44 30"><path d="M8 7l14 16 14-16" fill="none" stroke="#070d1f" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7l14 16 14-16" fill="none" stroke="#ffc45e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const el = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.appendChild(n); return n; };

export function createTutorUI(game, toast, log) {
  const bus = game.bus, ui = document.getElementById('ui');
  // ---- the card
  const stack = el('div', '', ui); stack.id = 'tutor-stack';
  const tip = el('section', 'plate small', stack); tip.id = 'tutor-tip'; tip.hidden = true; tip.setAttribute('role', 'status');
  const card = el('section', 'plate', stack); card.id = 'tutor'; card.hidden = true; card.setAttribute('aria-label', 'First steps');
  const head = el('div', 'tutor-head', card), title = el('span', 'tutor-title', head), pips = el('span', 'tutor-pips', head);
  const line = el('p', 'tutor-line', card); line.setAttribute('role', 'status'); line.setAttribute('aria-live', 'polite');
  const skip = el('button', 'btn tutor-skip', card); skip.type = 'button'; skip.textContent = 'Skip'; skip.setAttribute('aria-label', 'Skip the first steps');
  // ---- the marker
  const mark = el('div', '', ui); mark.id = 'tutor-mark'; mark.hidden = true; mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = CHEVRON + '<b></b>';
  // ---- the chevron beside a ringed control
  const point = el('div', '', ui); point.id = 'tutor-point'; point.hidden = true; point.setAttribute('aria-hidden', 'true'); point.innerHTML = CHEVRON;
  const arrowSvg = mark.querySelector('svg'), far = mark.querySelector('b');

  let now = null, goal = null, hinted = null, chain = [], seek = 0, leave = false;
  const words = (d) => {
    const touch = game.touch;
    const keys = !touch && d.keys ? d.keys.map((k) => `<kbd>${k}</kbd>`).join('') : '';
    return `${keys}<span>${touch && d.touch ? d.touch : d.text}</span>`;
  };
  // A step's `spot` is one selector or several in order of preference: the first that is on the page and
  // showing is ringed (the button in an open window before the tab that leads to it, before the button that opens the window).
  const showing = (n) => !!n && n.getClientRects().length > 0;
  const find = () => {
    // a window is open: what the step wants inside it; failing that, and if the step before was done in this
    // window, the way out of it (the game waits behind the menu)
    const win = document.querySelector('#panels .win');
    if (!win) leave = false;
    let outside = null;
    for (const sel of chain) {
      const n = document.querySelector(sel);
      if (!showing(n)) continue;
      if (!win || win.contains(n)) return n;
      outside = outside || n;
    }
    return win ? (leave ? win.querySelector('.x') : null) : outside;
  };
  const ring = (sel, touchSel) => {
    if (hinted) { delete hinted.dataset.hint; hinted = null; }
    const use = game.touch && touchSel !== undefined ? touchSel : sel;
    chain = !use ? [] : Array.isArray(use) ? use : [use];
    seek = 0;
  };
  bus.on('guide', (d) => {
    now = d;
    card.hidden = !d;
    document.body.classList.toggle('guiding', !!d);
    if (!d) { ring(null); leave = false; return; }
    leave = !!document.querySelector('#panels .win');        // the step before was done with a window open
    title.textContent = d.title;
    pips.innerHTML = Array.from({ length: d.total }, (_, k) => `<i class="${k < d.index ? 'done' : k === d.index ? 'now' : ''}"></i>`).join('');
    pips.setAttribute('aria-label', `Step ${d.index + 1} of ${d.total}`);
    line.innerHTML = words(d);
    ring(d.spot, d.touchSpot);
    card.classList.remove('fresh'); void card.offsetWidth; card.classList.add('fresh');       // the new line comes in, however quickly it followed the last
  });
  bus.on('guide:goal', (t) => { goal = t; if (!t) mark.hidden = true; });
  bus.on('guide:step', () => { card.classList.remove('tick'); void card.offsetWidth; card.classList.add('tick'); });
  bus.on('guide:chapter', (d) => { if (d.id !== 'town') toast(d.title, '', 2.4); });
  bus.on('guide:tip', (d) => {
    tip.hidden = !d;
    if (d) tip.innerHTML = words(d);
    if (d && d.spot && !now) ring(d.spot, d.touchSpot); else if (!d && !now) ring(null);
  });
  bus.on('guide:done', (d) => {
    if (d.quiet) return;
    if (d.skipped) log('First steps skipped. The <b class="c-key">Guide</b> has the controls, and the menu can start them again.');
    else toast('The board is yours', 'Three contracts, three places. Each is laid out afresh.', 5);
  });
  skip.addEventListener('click', (e) => { bus.emit('guide:skip'); if (e.detail) skip.blur(); });

  bus.on('frame', (dt) => {
    // the control a step is about may not be on the page yet (a window not opened), and the one to ring changes
    // as the player goes (the tab, then the tile, then the button): keep looking
    if ((chain.length || leave || hinted) && (seek -= dt) <= 0) {
      seek = 0.2;
      const n = find();
      if (n !== hinted) {
        if (hinted) delete hinted.dataset.hint;
        hinted = n;
        if (n) {
          n.dataset.hint = '1';
          // in a window that scrolls (a phone), the thing to press may be below the fold: bring it up
          if (n.closest('#panels .win-body') && n.scrollIntoView) n.scrollIntoView({ block: 'nearest', behavior: game.reducedMotion ? 'auto' : 'smooth' });
        }
      }
    }
    // the chevron: above the control, or under it when the control is near the top of the screen
    if (hinted && hinted.isConnected && hinted.matches('button, .slot, #lumen')) {
      const r = boxOf(hinted), under = r.top + r.height / 2 < innerHeight * 0.3;
      point.hidden = false;
      point.className = under ? 'under' : '';
      point.style.transform = `translate(${(r.left + r.width / 2).toFixed(1)}px, ${(under ? r.bottom + 10 : r.top - 10).toFixed(1)}px) translate(-50%, ${under ? '0' : '-100%'})`;
    } else if (!point.hidden) point.hidden = true;
    if (!goal || card.hidden) { if (!mark.hidden) mark.hidden = true; return; }
    const cam = game.camera, W = game.renderer.size.cssW, H = game.renderer.size.cssH, p = game.player;
    const top = goal.kind !== undefined ? (goal.hitY ? goal.hitY + 1.5 : (goal.height || 1) * (goal.kind === 'npc' ? 1 : goal.scale || 1) + 0.3) : 1.1;
    const s = cam.project(goal.x, (goal.y ?? p.y) + top, goal.z);
    const inSight = s && s.x > 0.06 && s.x < 0.94 && s.y > 0.14 && s.y < 0.86;
    mark.hidden = false;
    if (inSight) {
      mark.className = 'over';
      arrowSvg.style.transform = '';
      far.textContent = '';
      mark.style.transform = `translate(${(s.x * W).toFixed(1)}px, ${(s.y * H).toFixed(1)}px) translate(-50%, -100%)`;
      return;
    }
    // out of sight: at the edge of the picture, turned toward it, with how far it is
    let dx, dy;
    if (s) { dx = (s.x - 0.5) * W; dy = (s.y - 0.5) * H; }
    else { const x = goal.x - p.x, z = goal.z - p.z, f = cam.fwd, fl = Math.hypot(f[0], f[2]) || 1; dx = x * cam.right[0] + z * cam.right[2]; dy = -(x * f[0] + z * f[2]) / fl; }
    const l = Math.hypot(dx, dy) || 1, k = Math.min((W / 2 - 60) / Math.abs(dx / l || 1e-6), (H / 2 - 110) / Math.abs(dy / l || 1e-6));
    mark.className = 'edge';
    mark.style.transform = `translate(${(W / 2 + dx / l * k).toFixed(1)}px, ${(H / 2 + dy / l * k).toFixed(1)}px) translate(-50%, -50%)`;
    arrowSvg.style.transform = `rotate(${(Math.atan2(dy, dx) - Math.PI / 2).toFixed(3)}rad)`;
    far.textContent = Math.round(Math.hypot(goal.x - p.x, goal.z - p.z)) + ' m';
  });
}
