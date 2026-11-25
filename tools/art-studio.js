// HOW THIS IS RUN: it is not part of the game. It is evaluated inside a page that has loaded the game
// (window.__game) and pressed Begin, in a headless browser; the pictures come out as data URLs in a
// <pre id="art-dump"> element, which a shell script decodes into static/art/*.webp. Run it again
// whenever a figure, an elder or a place changes its look, so the interface's pictures keep up.
//
// Draws the game's own artwork with the game's own renderer: every picture the interface uses is a
// frame of the game, so none of it can drift from how the game looks. Figures are stood high in an
// overcast sky (clouds are bare paper) and seen from a little below, so each comes out as a drawing
// on a clean sheet. The pictures leave as data in the page, for the shell script to write to files.
//   ?set=figures | places
const g = window.__game, q = new URLSearchParams(location.search), p = g.player, ms = g.missions;
const { makeEntity, pencils } = await import('/src/sim/entities.js');
const { PEOPLES } = await import('/src/content/peoples.js');
const { CLASSES, FAMILIES } = await import('/src/content/classes.js');
const { CREATURES } = await import('/src/content/creatures.js');
const { TOWN } = await import('/src/content/town.js');
const out = {}, errs = [];
addEventListener('error', (e) => errs.push(e.message));
g.renderer.adapt = () => {}; g.renderer.scale = 1.5;
g.cinema.frameStage = () => {};
g.cinema.quiet = true;
const set = q.get('set') || 'figures';
const RAD = Math.PI / 180;

function shoot(name, w, h, rail, paper) {
  g.renderer.resize(w, h, 2);
  g.renderer.minimap.rect = [0, 0, 0, 0];
  g.renderer.paper.a = null; g.renderer.paper.b = null; g.renderer.paper.mix = 0;
  g.camera.rail = { ...rail, mix: 1 };
  g.camera.shake = 0;
  g.camera.update(0, [p.x, p.y, p.z], w / h, null);
  if (paper) g.env.cloud = 1.7;
  g.look.fade = 1; g.look.veil = 0; g.look.hurt = 0;
  g.renderer.render(g.view.build(g.time));
  out[name] = g.canvas.toDataURL('image/webp', 0.88);
}
/** A camera a little below a figure, looking up at it: tall is the height to fit, turn the angle off its front. */
function below(e, tall, lens, turn, mid = 0.5, up = 15.5) {
  const D = (tall / 2) / Math.tan(lens * RAD / 2) * 1.04, a = up * RAD;
  const cy = e.y + tall * mid;
  const t = turn + Math.PI;        // the figures face north; the camera stands north of them and looks south, away from the ringed planet
  return { pos: [e.x + Math.sin(t) * Math.cos(a) * D, cy - Math.sin(a) * D, e.z + Math.cos(t) * Math.cos(a) * D], look: [e.x, cy, e.z], lens: lens * RAD };
}

try {
  if (set === 'figures') {
    g.sim = [];
    for (const e of g.entities.list) if (e !== p) e.gone = true;
    g.entities.sweep();
    p.grow = 0;
    const X = 140, Z = 140, Y = 70;          // out over the cloud, well above it
    p.x = X; p.z = Z;
    while (g.renderer.worldTex.update(X, Z, 16) > 0);
    let slot = 0;
    const stand = (archetype, props) => {
      const e = g.entities.add(makeEntity('set', archetype, { x: X + (slot++) * 40 - 400, z: Z, y: Y, far: true, ...props, yaw: Math.PI }));
      return e;
    };
    const one = (name, e, w, h, tall, lens, turn, mid, up) => { for (const o of g.entities.list) if (o !== p) o.grow = o === e ? 1 : 0; shoot(name, w, h, below(e, tall, lens, turn, mid, up), true); };

    // ---- the peoples, as the hero would wear them (the class colour is the Vanguard's), unarmed
    const wear = { unit: [[214, 70, 52], [214, 70, 52]], human: [[84, 108, 156], [226, 176, 52]], veiled: [[126, 92, 150], [84, 66, 120]], karn: [[176, 118, 62], [232, 164, 48]], lynd: [[70, 150, 150], [224, 112, 128]] };
    for (const id of Object.keys(PEOPLES)) {
      const P = PEOPLES[id];
      const e = stand('humanoid', { extra: P.index, scale: P.scale, kit: 3, seed: 0.62, colors: pencils([wear[id][0], wear[id][1], P.hair[0]]), yaw: 0 });
      one('people-' + id, e, 360, 440, 1.95 * P.scale, 13, 0.55, 0.47);
    }
    // ---- the classes: a scout unit in each class's colour, weapon in hand, mid-move
    const acts = { vanguard: [1, 0.36, 0.4], ranger: [2, 0.5, 1], adept: [2, 0.5, 2] };
    for (const id of Object.keys(CLASSES)) {
      const c = CLASSES[id], [action, at, kit] = acts[id];
      const e = stand('humanoid', { extra: 0, kit, action, actionT: at, actionDur: 1e3, seed: 0.5, colors: pencils([c.color, c.color, [122, 62, 44]]), yaw: 0 });
      one('class-' + id, e, 360, 300, 1.95, 16, id === 'vanguard' ? 0.6 : 0.8, 0.47);
    }
    // ---- the crew, head and shoulders
    for (const n of TOWN.crew) {
      const P = PEOPLES[n.people] || PEOPLES.unit, wearing = n.color;
      const e = stand('humanoid', { extra: P.index, scale: P.scale, kit: 3, seed: n.seed ?? 0.4, colors: pencils([wearing, n.trim || wearing, n.hair || P.hair[0]]), yaw: 0 });
      one('crew-' + n.name.toLowerCase(), e, 240, 240, 1.02 * P.scale, 8, 0.4, P.index === 3 ? 1.2 : P.index === 4 ? 1.24 : 1.14, 9);
    }
    // (the elders are not drawn here any more: the game draws each on a clear ground when it starts, app/portrait.js)
  } else if (set === 'lumens') {
    // ---- the lumens: each kind, burning at about two thirds
    g.sim = [];
    for (const e of g.entities.list) if (e !== p) e.gone = true;
    g.entities.sweep();
    p.grow = 0;
    const { LUMENS } = await import('/src/content/companions.js');
    let k = 0;
    for (const id of Object.keys(LUMENS)) {
      const L = LUMENS[id];
      const e = g.entities.add(makeEntity('set', 'lumen', { x: p.x + (k++) * 30 - 100, z: p.z, y: p.y + 70, far: true, extra: L.shape, move: 0.65, seed: 0.3, colors: pencils(L.colors), yaw: Math.PI }));
      for (const o of g.entities.list) if (o !== p) o.grow = o === e ? 1 : 0;
      shoot('lumen-' + id, 200, 200, below({ x: e.x, y: e.y - 0.5, z: e.z, yaw: e.yaw }, 1.0, 9, 0.45, 0.5, 14), true);
    }
  } else {
    // ---- the places: the town from the air, and the way ahead from the first island of a contract in each
    p.grow = 0;
    const y0 = g.world.surface(0, 0);
    const D = 64, yaw = 0.62;
    shoot('place-town', 640, 300, { pos: [Math.sin(yaw) * D, y0 + 9, 4 + Math.cos(yaw) * D], look: [-6, y0 + 9, 0], lens: 36 * RAD }, false);
    for (const biome of ['glasswood', 'ember', 'hush', 'rime', 'vault', 'shatter']) {
      for (let b = 0; b < 400 && !ms.offers.some((o) => o.biome === biome); b++) { p.sheet.board = (p.sheet.board || 0) + 1; ms.refresh(); }
      ms.accept(ms.offers.findIndex((o) => o.biome === biome));
      ms.deploy();
      p.grow = 0;
      const w = g.world, a = w.rooms[0], b2 = w.rooms[1], dx = b2.x - a.x, dz = b2.z - a.z, l = Math.hypot(dx, dz);
      const ux = dx / l, uz = dz / l, ya = w.surface(a.x, a.z), yb = w.surface(b2.x, b2.z);
      while (g.renderer.worldTex.update(a.x + ux * 20, a.z + uz * 20, 16) > 0);
      for (let i = 0; i < 4; i++) g.frame(1 / 30, 33);       // (the hour and the weather of the place)
      p.grow = 0;
      shoot('place-' + biome, 640, 300, { pos: [a.x - ux * 13 + uz * 5, ya + 6.5, a.z - uz * 13 - ux * 5], look: [b2.x, yb + 2.2, b2.z], lens: 44 * RAD }, false);
      ms.home(false);
    }
  }
} catch (e) { errs.push('EXC ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')); }
const pre = document.body.appendChild(document.createElement('pre'));
pre.id = 'art-dump';
pre.textContent = JSON.stringify(out);
window.__note = 'ART ' + set + ' n=' + Object.keys(out).length + ' errs=' + errs.slice(0, 3).join(' / ') + ' |';
g.frame = () => {};
