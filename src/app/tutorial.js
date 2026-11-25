// The first few minutes, taught by doing. One small goal at a time: walk to a
// mark, turn the view, fight a practice creature, use a skill, take a bounty.
// Each goal is finished by doing the thing, never by reading or pressing "next".
//
// This system only decides what the goal is and when it is met. It announces
// goals on the bus ('guide', with what to point at) and the interface words
// them for whatever device is in the player's hands (see ui/guide.js). After
// the first steps it still offers a tip the first time one is needed: a flask
// when health runs low, the character sheet when a level is gained.
//
// A journey remembers that it has had its first steps (sheet.guide) and which
// tips it has seen (sheet.tips), so nothing is taught twice.

const STEPS = ['walk', 'look', 'fight', 'skill', 'bounty'];
const TIPS = {
  dodge: { seconds: 9, when: (g) => g.hazards.warned },
  tonic: { seconds: 12, when: (g) => !g.player.dead && g.player.hp < g.player.maxHp * 0.45 && g.loot.count('tonic') > 0 },
  points: { seconds: 12, when: (g) => g.player.sheet.points > 0 || g.player.sheet.picks > 0 },
};

export class Tutorial {
  constructor(game) {
    this.game = game;
    this.i = -1;                 // index into STEPS, -1 when the first steps are not running
    this.goal = null;            // { x, y, z } or an entity the current step points at
    this.mobs = [];              // practice creatures this system brought in
    this.t = 0;                  // seconds in the current step
    this.from = null;            // camera settings when the "look" step began
    this.tip = null;             // { id, left } while a tip is showing
    this.pulse = 0;

    const bus = game.bus;
    bus.on('begin', () => this.begin());
    bus.on('guide:skip', (d) => this.finish(true, d && d.quiet));
    bus.on('guide:restart', () => { this.clear(); this.go(0); });
    bus.on('skill', (d) => { if (this.step === 'skill' && d.id === 'cleave') this.next(); });
    bus.on('bounty:changed', () => { if (this.step === 'bounty' && game.player.sheet.bounty) this.next(); });
    bus.on('drink', (d) => { if (this.tip && this.tip.id === 'tonic' && d.item === 'tonic') this.endTip(); });
    bus.on('ui:toggle', (id) => { if (this.tip && this.tip.id === 'points' && id === 'character') this.endTip(); });
  }

  get step() { return this.i >= 0 ? STEPS[this.i] : null; }

  /** A fresh journey gets its first steps; one already under way does not. */
  begin() {
    const s = this.game.player.sheet;
    s.guide = 'done';      // (the ship's first steps are still to be written)
    if (s.guide === 'done') return;
    if (s.level > 1 || s.xp > 0 || s.bounty) { s.guide = 'done'; return; }
    this.go(0);
  }

  go(i) {
    const g = this.game, p = g.player;
    this.i = i; this.t = 0; this.goal = null;
    this.endTip();
    const step = this.step;
    if (step === 'walk') {
      this.goal = this.freeSpot(6.5, 0.6);
    } else if (step === 'look') {
      this.from = { ...g.camera.goal };
    } else if (step === 'fight') {
      this.goal = this.practice(4.2, 0.9)[0];
    } else if (step === 'skill') {
      this.mobs = this.mobs.filter((m) => !m.dead && !m.gone);
      const pack = this.practice(3.6, 0.8, 3 - Math.min(2, this.mobs.length));
      this.goal = pack[0] || this.mobs[0] || null;
    } else if (step === 'bounty') {
      if (p.sheet.bounty) return this.next();
      this.goal = g.entities.nearest('npc', p.x, p.z, 80, (e) => e.role === 'bounty');
      if (!this.goal) return this.next();          // no warden near: nothing to teach here
    }
    this.announce();
  }

  next() {
    this.game.bus.emit('guide:step', { id: this.step });
    if (this.i + 1 < STEPS.length) this.go(this.i + 1); else this.finish(false);
  }

  finish(skipped, quiet = false) {
    if (this.i < 0 && this.game.player.sheet.guide === 'done') return;
    this.clear();
    this.game.player.sheet.guide = 'done';
    this.game.bus.emit('guide', null);
    this.game.bus.emit('guide:done', { skipped, quiet });
  }

  /** Ends the steps and sends the practice creatures away. */
  clear() {
    for (const m of this.mobs) if (!m.dead) m.gone = true;
    this.mobs = [];
    this.i = -1; this.goal = null;
    this.endTip();
  }

  announce() {
    const goal = this.goal;
    this.game.bus.emit('guide', {
      id: this.step, index: this.i, total: STEPS.length,
      at: goal && goal.kind === undefined ? goal : null,
      entity: goal && goal.kind !== undefined ? goal : null,
    });
  }

  /** A clear, walkable spot about `dist` from the hero, preferring straight ahead of the camera. */
  freeSpot(dist, room) {
    const g = this.game, p = g.player, w = g.world;
    const f = g.camera.fwd;
    const toward = Math.atan2(f[2], f[0]);                // ahead of the camera, where it can be seen
    for (let k = 0; k < 16; k++) {
      // fan out from the preferred direction: 0, +1, -1, +2, -2 ... sixteenths of a turn
      const a = toward + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.39;
      const x = p.x + Math.cos(a) * dist, z = p.z + Math.sin(a) * dist;
      if (!w.walkable(x, z) || w.waterDepth(x, z) > 0.05) continue;
      let clear = true;
      w.forEachProp(x, z, room, (pr) => { if (pr.def.collide > 0 && Math.hypot(pr.x - x, pr.z - z) < pr.def.collide * pr.scale + room) clear = false; });
      for (const e of g.entities.list) if (e !== p && !e.dead && Math.hypot(e.x - x, e.z - z) < room + e.radius) clear = false;
      if (clear) return { x, y: w.surface(x, z), z };
    }
    return { x: p.x + dist, y: w.surface(p.x + dist, p.z), z: p.z };
  }

  /** Brings in weak practice creatures near the hero. They are marked, so their names show. */
  practice(dist, room, n = 1) {
    const g = this.game, made = [];
    const first = this.freeSpot(dist, room);
    for (let k = 0; k < n; k++) {
      const m = g.spawner.spawnMonster('sproutling', first.x + (k % 2 ? 0.9 : -0.9) * Math.ceil(k / 2), first.z + (k ? 0.7 : 0), 1);
      m.marked = true; m.practice = true;
      this.mobs.push(m); made.push(m);
    }
    return made;
  }

  endTip() {
    if (!this.tip) return;
    this.tip = null;
    if (this.i < 0) this.game.bus.emit('guide', null);
  }

  update(dt) {
    const g = this.game, p = g.player, s = p.sheet;
    if (g.paused) return;
    const step = this.step;
    if (step) {
      this.t += dt;
      if (step === 'walk') {
        // a pen ring keeps being drawn round the spot
        if ((this.pulse -= dt) <= 0) { this.pulse = 0.8; g.fx.click(this.goal.x, this.goal.y, this.goal.z); }
        if (Math.hypot(p.x - this.goal.x, p.z - this.goal.z) < 1.3) this.next();
      } else if (step === 'look') {
        const c = g.camera.goal, f = this.from;
        if (Math.abs(c.yaw - f.yaw) > 0.45 || Math.abs(c.pitch - f.pitch) > 0.18 || Math.abs(c.distance / f.distance - 1) > 0.14) this.next();
      } else if (step === 'fight') {
        if (!this.goal || this.goal.dead || this.goal.gone) this.next();
      } else if (step === 'skill') {
        // keep pointing at a living one
        if (!this.goal || this.goal.dead || this.goal.gone) {
          this.goal = this.mobs.find((m) => !m.dead && !m.gone) || null;
          if (!this.goal) this.goal = this.practice(3.6, 0.8, 2)[0];
          this.announce();
        }
      } else if (step === 'bounty') {
        if (s.bounty) this.next();
      }
      return;
    }
    // ---- after the first steps: a tip the first time it is needed
    if (s.guide !== 'done') return;
    if (this.tip) {
      this.tip.left -= dt;
      if (this.tip.left <= 0 || !TIPS[this.tip.id].when(g)) this.endTip();
      return;
    }
    const seen = s.tips || (s.tips = {});
    for (const id in TIPS) {
      if (seen[id] || !TIPS[id].when(g)) continue;
      seen[id] = 1;
      this.tip = { id, left: TIPS[id].seconds };
      g.bus.emit('guide', { id: 'tip:' + id, tip: true });
      break;
    }
  }
}
