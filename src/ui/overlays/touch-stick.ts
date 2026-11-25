import { clamp } from '../../core/math';
import type { GameContext } from '../../types/game-context';

const DEAD = 0.16;

export function watchTouch(game: GameContext, onChange: () => void): () => void {
  const set = (): void => {
    game.touch = true;
    document.body.classList.add('touch');
    onChange();
  };

  let onFirst: ((e: PointerEvent) => void) | null = null;
  if (game.touch) {
    set();
  } else {
    onFirst = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (onFirst) removeEventListener('pointerdown', onFirst, true);
      onFirst = null;
      set();
    };
    addEventListener('pointerdown', onFirst, true);
  }

  const noopTouch = (): void => {};
  addEventListener('touchstart', noopTouch, { passive: true });

  return () => {
    if (onFirst) removeEventListener('pointerdown', onFirst, true);
    removeEventListener('touchstart', noopTouch);
  };
}

export function mountTouchStick(game: GameContext, zone: HTMLElement): () => void {
  const base = zone.querySelector('.base') as HTMLElement | null;
  const nub = zone.querySelector('.nub') as HTMLElement | null;
  if (!base || !nub) return () => {};

  const stick = game.input.stick;
  let id: number | null = null;
  let ox = 0;
  let oy = 0;
  let reach = 40;

  const move = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - ox;
    const dy = e.clientY - oy;
    const l = Math.hypot(dx, dy);
    const k = l > reach ? reach / l : 1;
    nub.style.transform = `translate(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px)`;
    const m = Math.min(1, l / reach);
    const out = m < DEAD ? 0 : 0.42 + (0.58 * (m - DEAD)) / (1 - DEAD);
    stick.x = l ? (dx / l) * out : 0;
    stick.y = l ? (-dy / l) * out : 0;
  };

  const release = (e?: PointerEvent): void => {
    if (e && e.pointerId !== id) return;
    id = null;
    stick.x = 0;
    stick.y = 0;
    base.style.left = '';
    base.style.top = '';
    base.style.right = '';
    base.style.bottom = '';
    nub.style.transform = '';
    zone.classList.remove('held');
  };

  const onDown = (e: PointerEvent): void => {
    if (id !== null) return;
    id = e.pointerId;
    try {
      zone.setPointerCapture(id);
    } catch {
    }
    const z = zone.getBoundingClientRect();
    const half = base.offsetWidth / 2;
    reach = half * 0.62;
    ox = clamp(e.clientX, z.left + half, Math.max(z.left + half, z.right - half));
    oy = clamp(e.clientY, z.top + half, Math.max(z.top + half, z.bottom - half));
    base.style.left = `${ox - z.left - half}px`;
    base.style.top = `${oy - z.top - half}px`;
    base.style.right = 'auto';
    base.style.bottom = 'auto';
    zone.classList.add('held');
    move(e);
    e.preventDefault();
  };

  const onBlur = (): void => release();

  zone.addEventListener('pointerdown', onDown);
  zone.addEventListener('pointermove', move);
  zone.addEventListener('pointerup', release);
  zone.addEventListener('pointercancel', release);
  zone.addEventListener('lostpointercapture', release);
  addEventListener('blur', onBlur);

  return () => {
    release();
    zone.removeEventListener('pointerdown', onDown);
    zone.removeEventListener('pointermove', move);
    zone.removeEventListener('pointerup', release);
    zone.removeEventListener('pointercancel', release);
    zone.removeEventListener('lostpointercapture', release);
    removeEventListener('blur', onBlur);
  };
}
