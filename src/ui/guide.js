// The guide: the plate that says what to try next, the ring drawn round the
// button to press, and the arrow at the edge of the picture when the goal is
// out of sight. The tutorial system (game/systems/tutorial.js) decides what the
// goal is; this module only words it for the device in the player's hands.

const WORDS = {
  walk: ['Click the ground to walk to the ring. The W A S D keys walk too.', 'Push the stick to walk to the ring, or tap the ground there.'],
  look: ['Hold the right mouse button and drag to turn the view. The wheel zooms.', 'Drag the picture to turn the view. Pinch to zoom.'],
  fight: ['Click the Sproutling to attack it.', 'Tap the sword to attack the Sproutling.'],
  skill: ['Press 1 for Cleave: one wide cut through everything in front of you.', 'Tap the ringed button, Cleave: one wide cut through everything in front of you.'],
  bounty: ['Click Bram, the warden, and take a bounty from his board.', 'Tap Bram, the warden, and take a bounty from his board.'],
  'tip:dodge': ['Mustard hatching on the ground means a blow is coming there. Step out of it.', 'Mustard hatching on the ground means a blow is coming there. Step out of it.'],
  'tip:tonic': ['Low on health: press R to drink a Red Tonic.', 'Low on health: tap the red flask.'],
  'tip:points': ['A new level: press C to choose a talent and spend your points.', 'A new level: open your character sheet to choose a talent and spend your points.'],
};
// the control each step is about: [with a mouse, on a touch screen]
const HINTS = {
  fight: [null, '.slot.act'],
  skill: ['.slot.s0', '.slot.s0'],
  'tip:tonic': ['.slot.d0', '.slot.d0'],
  'tip:points': ['#menu [data-open="character"]', '#menu [data-open="character"]'],
};

export function createGuide(game, toast, log) {
  const bus = game.bus, $ = (id) => document.getElementById(id);
  const box = $('guide'), count = $('guide-count'), text = $('guide-text'), skip = $('guide-skip'), arrow = $('guide-arrow');
  let now = null, hinted = null, marked = null;

  const show = (d) => {
    if (hinted) { delete hinted.dataset.hint; hinted = null; }
    if (marked) { marked.marked = marked.practice || false; marked = null; }
    now = d;
    box.hidden = !d;
    document.body.classList.toggle('guiding', !!d);
    if (!d) { arrow.hidden = true; return; }
    const k = game.touch ? 1 : 0;
    box.classList.toggle('tip', !!d.tip);
    count.hidden = skip.hidden = !!d.tip;
    if (!d.tip) count.textContent = `First steps · ${d.index + 1} of ${d.total}`;
    text.textContent = WORDS[d.id][k];
    const sel = HINTS[d.id] && HINTS[d.id][k];
    if (sel) { hinted = document.querySelector(sel); if (hinted) hinted.dataset.hint = '1'; }
    if (d.entity) { marked = d.entity; marked.marked = true; }      // its name slip shows, ringed in red
  };
  bus.on('guide', show);
  bus.on('guide:done', (d) => {
    if (d.quiet) return;
    if (d.skipped) log('First steps skipped. The <em>?</em> button has them.');
    else toast('You know the way now', 'The ? button shows all of this again.', 4);
  });
  skip.addEventListener('click', (e) => { bus.emit('guide:skip'); if (e.detail) skip.blur(); });

  // an arrow at the edge of the picture when the goal is out of sight
  bus.on('frame', () => {
    const goal = now && (now.entity || now.at);
    if (!goal) { if (!arrow.hidden) arrow.hidden = true; return; }
    const cam = game.camera, W = game.renderer.size.cssW, H = game.renderer.size.cssH;
    const s = cam.project(goal.x, goal.y + (goal.height || 0) * 0.6, goal.z);
    const inSight = s && s.x > 0.07 && s.x < 0.93 && s.y > 0.12 && s.y < 0.9;
    if (inSight) { if (!arrow.hidden) arrow.hidden = true; return; }
    // which way it lies, on the picture
    let dx, dy;
    if (s) { dx = (s.x - 0.5) * W; dy = (s.y - 0.5) * H; }
    else {
      const p = game.player, x = goal.x - p.x, z = goal.z - p.z, f = cam.fwd, fl = Math.hypot(f[0], f[2]) || 1;
      dx = x * cam.right[0] + z * cam.right[2]; dy = -(x * f[0] + z * f[2]) / fl;
    }
    const l = Math.hypot(dx, dy) || 1, k = Math.min((W / 2 - 46) / Math.abs(dx / l || 1e-6), (H / 2 - 46) / Math.abs(dy / l || 1e-6));
    arrow.hidden = false;
    arrow.style.transform = `translate(${(W / 2 + dx / l * k).toFixed(1)}px, ${(H / 2 + dy / l * k).toFixed(1)}px) translate(-50%, -50%) rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
  });
}
