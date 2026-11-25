import type { Entity } from '../../types/entity';
import type { GuideGoalPayload, GuideStepPayload } from '../../types/events';
import type { GameContext } from '../../types/game-context';
import { boxOf } from '../settings';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createChevron(): SVGSVGElement {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 44 30');
  const outer = document.createElementNS(SVG_NS, 'path');
  outer.setAttribute('d', 'M8 7l14 16 14-16');
  outer.setAttribute('fill', 'none');
  outer.setAttribute('stroke', '#070d1f');
  outer.setAttribute('stroke-width', '10');
  outer.setAttribute('stroke-linecap', 'round');
  outer.setAttribute('stroke-linejoin', 'round');
  const inner = document.createElementNS(SVG_NS, 'path');
  inner.setAttribute('d', 'M8 7l14 16 14-16');
  inner.setAttribute('fill', 'none');
  inner.setAttribute('stroke', '#ffc45e');
  inner.setAttribute('stroke-width', '5');
  inner.setAttribute('stroke-linecap', 'round');
  inner.setAttribute('stroke-linejoin', 'round');
  s.append(outer, inner);
  return s;
}

function isEntityGoal(goal: NonNullable<GuideGoalPayload>): goal is Entity {
  return 'kind' in goal && goal.kind !== undefined;
}

export function mountTutorMarkers(
  game: GameContext,
  mark: HTMLElement,
  point: HTMLElement,
): () => void {
  mark.replaceChildren();
  point.replaceChildren();
  const arrowSvg = createChevron();
  const far = document.createElement('b');
  mark.append(arrowSvg, far);
  point.append(createChevron());
  mark.hidden = true;
  point.hidden = true;

  let now: GuideStepPayload | null = null;
  let goal: GuideGoalPayload = null;
  let hinted: HTMLElement | null = null;
  let chain: readonly string[] = [];
  let seek = 0;
  let leave = false;

  const showing = (n: Element | null): n is HTMLElement =>
    n instanceof HTMLElement && n.getClientRects().length > 0;

  const find = (): HTMLElement | null => {
    const win = document.querySelector('#panels .win');
    if (!win) leave = false;
    let outside: HTMLElement | null = null;
    for (const sel of chain) {
      const n = document.querySelector(sel);
      if (!showing(n)) continue;
      if (!win || win.contains(n)) return n;
      outside = outside || n;
    }
    if (!win) return outside;
    if (!leave) return null;
    const x = win.querySelector('.x');
    return showing(x) ? x : null;
  };

  const ring = (
    sel?: string | readonly string[] | null,
    touchSel?: string | readonly string[] | null,
  ): void => {
    if (hinted) {
      delete hinted.dataset.hint;
      hinted = null;
    }
    const use = game.touch && touchSel !== undefined ? touchSel : sel;
    chain = !use ? [] : typeof use === 'string' ? [use] : use;
    seek = 0;
  };

  const bus = game.bus;
  const unsubs = [
    bus.on('guide', (d) => {
      now = d;
      if (!d) {
        ring(null);
        leave = false;
        mark.hidden = true;
        point.hidden = true;
        return;
      }
      leave = Boolean(document.querySelector('#panels .win'));
      ring(d.spot, d.touchSpot);
    }),
    bus.on('guide:goal', (t) => {
      goal = t;
      if (!t) mark.hidden = true;
    }),
    bus.on('guide:tip', (d) => {
      if (d && d.spot && !now) ring(d.spot, d.touchSpot);
      else if (!d && !now) ring(null);
    }),
    bus.on('frame', (dt) => {
      if ((chain.length || leave || hinted) && (seek -= dt) <= 0) {
        seek = 0.2;
        const n = find();
        if (n !== hinted) {
          if (hinted) delete hinted.dataset.hint;
          hinted = n;
          if (n) {
            n.dataset.hint = '1';
            if (n.closest('#panels .win-body') && n.scrollIntoView) {
              n.scrollIntoView({ block: 'nearest', behavior: game.reducedMotion ? 'auto' : 'smooth' });
            }
          }
        }
      }

      if (hinted && hinted.isConnected && hinted.matches('button, .slot, #lumen')) {
        const r = boxOf(hinted);
        const under = r.top + r.height / 2 < innerHeight * 0.3;
        point.hidden = false;
        point.className = under ? 'under' : '';
        point.style.transform = `translate(${(r.left + r.width / 2).toFixed(1)}px, ${(
          under ? r.bottom + 10 : r.top - 10
        ).toFixed(1)}px) translate(-50%, ${under ? '0' : '-100%'})`;
      } else if (!point.hidden) {
        point.hidden = true;
      }

      if (!goal || !now) {
        if (!mark.hidden) mark.hidden = true;
        return;
      }

      const cam = game.camera;
      const W = game.renderer.size.cssW;
      const H = game.renderer.size.cssH;
      const p = game.player;
      const top = isEntityGoal(goal)
        ? goal.hitY
          ? goal.hitY + 1.5
          : (goal.height || 1) * (goal.kind === 'npc' ? 1 : goal.scale || 1) + 0.3
        : 1.1;
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

      let dx: number;
      let dy: number;
      if (s) {
        dx = (s.x - 0.5) * W;
        dy = (s.y - 0.5) * H;
      } else {
        const x = goal.x - p.x;
        const z = goal.z - p.z;
        const f = cam.forward;
        const fl = Math.hypot(f[0], f[2]) || 1;
        dx = x * cam.right[0] + z * cam.right[2];
        dy = -(x * f[0] + z * f[2]) / fl;
      }
      const l = Math.hypot(dx, dy) || 1;
      const k = Math.min((W / 2 - 60) / Math.abs(dx / l || 1e-6), (H / 2 - 110) / Math.abs(dy / l || 1e-6));
      mark.className = 'edge';
      mark.style.transform = `translate(${(W / 2 + (dx / l) * k).toFixed(1)}px, ${(H / 2 + (dy / l) * k).toFixed(
        1,
      )}px) translate(-50%, -50%)`;
      arrowSvg.style.transform = `rotate(${(Math.atan2(dy, dx) - Math.PI / 2).toFixed(3)}rad)`;
      far.textContent = `${Math.round(Math.hypot(goal.x - p.x, goal.z - p.z))} m`;
    }),
  ];

  return () => {
    for (const off of unsubs) off();
    if (hinted) {
      delete hinted.dataset.hint;
      hinted = null;
    }
    mark.hidden = true;
    point.hidden = true;
  };
}
