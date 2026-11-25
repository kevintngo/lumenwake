// Things a creature leaves in the world that go on hurting after its move is
// made: a cloud that hangs over a patch of ground, a mote of light in flight.
// Specials (specials.js) create them; this system moves them, hurts the hero
// when he stands in one or is struck by one, and lets them go.

export class Hazards {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.warned = false;        // a warning patch has been drawn near the hero at least once (the guide's cue for a tip)
    game.bus.on('telegraph', (d) => {
      const p = game.player;
      if (Math.hypot(d.x - p.x, d.z - p.z) < (d.len || d.r) + 6) this.warned = true;
    });
  }

  /** Spores hanging where `m` stands: every `tick` seconds they hurt whoever is inside. */
  cloud(m, r, life, mult, tick) {
    const g = this.game, y = g.world.surface(m.x, m.z);
    g.bus.emit('hazard:cloud', { x: m.x, y, z: m.z, r, life, color: m.colors[0] });
    this.list.push({ kind: 'cloud', src: m, x: m.x, z: m.z, r, left: life, mult, tick, next: tick * 0.5 });
  }

  /** A mote flying straight from `m`. sp: { speed, r, life, mult } */
  shot(m, dirx, dirz, sp) {
    const g = this.game, y = m.y + 0.9;
    const shot = { kind: 'shot', src: m, x: m.x + dirx * 0.5, y, z: m.z + dirz * 0.5, vx: dirx * sp.speed, vz: dirz * sp.speed, r: sp.r, left: sp.life, mult: sp.mult, color: [...m.colors[2]], size: 0.5, gone: false };
    this.list.push(shot);
    g.bus.emit('shot:launch', shot);
    g.bus.emit('monster:shot', m);
  }

  /** Something thrown high by `m` that lands at (x, z) after `delay` seconds and hurts within r. */
  fall(m, x, z, r, delay, mult) {
    const g = this.game, y = g.world.surface(x, z);
    g.bus.emit('telegraph', { x, y, z, r, t: delay, fill: true });
    const h = { kind: 'fall', src: m, x, y: y + 16, z, ground: y, r, left: delay, drop: 16 / delay, mult, color: [...m.colors[1]], size: 0.8, gone: false };
    this.list.push(h);
    g.bus.emit('shot:launch', h);
  }

  clear() {
    for (const h of this.list) h.gone = true;
    this.list.length = 0;
  }

  update(dt) {
    const g = this.game, p = g.player;
    let w = 0;
    for (const h of this.list) {
      h.left -= dt;
      let done = h.left <= 0;
      if (h.kind === 'fall') {
        h.y = Math.max(h.ground, h.y - h.drop * dt);
        if (done) {
          g.bus.emit('slam', { x: h.x, y: h.ground, z: h.z, r: h.r });
          if (!p.dead && Math.hypot(p.x - h.x, p.z - h.z) < h.r) g.combat.hurt(h.src, h.mult);
        }
      } else if (h.kind === 'cloud') {
        h.next -= dt;
        if (h.next <= 0) {
          h.next = h.tick;
          if (!p.dead && Math.hypot(p.x - h.x, p.z - h.z) < h.r) g.combat.hurt(h.src, h.mult, true);
        }
      } else {
        h.x += h.vx * dt; h.z += h.vz * dt;
        if (g.world.surface(h.x, h.z) > h.y - 0.1) done = true;
        if (!done) g.world.forEachProp(h.x, h.z, 1, (pr) => {
          if (pr.def.collide > 0 && Math.hypot(pr.x - h.x, pr.z - h.z) < pr.def.collide * pr.scale + 0.15 && h.y < pr.y + pr.def.height * pr.scale) done = true;
        });
        if (!done && !p.dead && Math.hypot(p.x - h.x, p.z - h.z) < h.r + p.radius) { g.combat.hurt(h.src, h.mult); done = true; }
        if (done) g.bus.emit('shot:hit', { x: h.x, y: h.y, z: h.z });
      }
      if (done) { h.gone = true; continue; }
      this.list[w++] = h;
    }
    this.list.length = w;
  }
}
