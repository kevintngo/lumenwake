// Touch furniture: the walking stick under the left thumb, and the switch that
// lays the interface out for fingers. The buttons under the right thumb are the
// hotbar's own (see ui.js); the stylesheet moves them into an arc.
//
// The stick floats: its ring comes to wherever the thumb lands inside the
// stick's zone, so a thumb never has to find it. It writes `input.stick`, which
// the Controls system reads beside WASD. Tapping the picture walks too, so
// nothing in the game needs a dragging movement.

import { clamp } from '../core/math.js';

const DEAD = 0.16;   // the middle of the stick does nothing

/** Turns the finger layout on, now if `game.touch`, otherwise at the first touch on the page. */
export function watchTouch(game, onChange) {
  const set = () => {
    game.touch = true;
    document.body.classList.add('touch');
    onChange();
  };
  if (game.touch) set();
  else addEventListener('pointerdown', function first(e) {
    if (e.pointerType !== 'touch') return;
    removeEventListener('pointerdown', first, true);
    set();
  }, true);
  // iOS only shows a button's pressed look when the page listens for touches
  addEventListener('touchstart', () => {}, { passive: true });
}

export function createStick(game, root) {
  const zone = document.createElement('div');
  zone.id = 'stick';
  zone.setAttribute('aria-hidden', 'true');      // a pointer-only control; tapping the picture and the keys do the same job
  zone.innerHTML = '<div class="base"><div class="nub"></div></div>';
  root.insertBefore(zone, root.querySelector('#hotbar'));   // under the buttons and the sheets
  const base = zone.firstChild, nub = base.firstChild, stick = game.input.stick;
  let id = null, ox = 0, oy = 0, reach = 40;

  const move = (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - ox, dy = e.clientY - oy, l = Math.hypot(dx, dy);
    const k = l > reach ? reach / l : 1;
    nub.style.transform = `translate(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px)`;
    // a still middle, then from a stroll up to a run
    const m = Math.min(1, l / reach);
    const out = m < DEAD ? 0 : 0.42 + 0.58 * (m - DEAD) / (1 - DEAD);
    stick.x = l ? dx / l * out : 0;
    stick.y = l ? -dy / l * out : 0;
  };
  const release = (e) => {
    if (e && e.pointerId !== id) return;
    id = null;
    stick.x = stick.y = 0;
    base.style.left = base.style.top = base.style.right = base.style.bottom = '';
    nub.style.transform = '';
    zone.classList.remove('held');
  };
  zone.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    id = e.pointerId;
    try { zone.setPointerCapture(id); } catch { /* synthetic pointer */ }
    const z = zone.getBoundingClientRect(), half = base.offsetWidth / 2;
    reach = half * 0.62;
    // the ring comes to the thumb, kept whole inside its zone
    ox = clamp(e.clientX, z.left + half, Math.max(z.left + half, z.right - half));
    oy = clamp(e.clientY, z.top + half, Math.max(z.top + half, z.bottom - half));
    Object.assign(base.style, { left: `${ox - z.left - half}px`, top: `${oy - z.top - half}px`, right: 'auto', bottom: 'auto' });
    zone.classList.add('held');
    game.input.any = true;
    move(e);
    e.preventDefault();
  });
  zone.addEventListener('pointermove', move);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(ev, release);
  addEventListener('blur', () => release());
  return zone;
}
