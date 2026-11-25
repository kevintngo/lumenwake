// Controls: turns devices into intent. Camera orbit and zoom, cursor picking
// and hover, click- and tap-to-move, the on-screen stick, targeting, hotkeys.
// Writes `player.intent`, `player.target` and `player.moveTo`; never moves
// anything itself.


export class Controls {
  constructor(game) {
    this.game = game;
    this.hover = null;
    this.ground = null;
    this.steerTime = 0;
  }

  /** A cinematic has the controls: nothing is hovered, nothing is asked of the hero. */
  release() {
    const g = this.game, it = g.player.intent;
    if (this.hover) { this.hover.hover = false; this.hover = null; }
    it.moveX = 0; it.moveZ = 0; it.aim = null;
    this.steerTime = 0;
    g.canvas.style.cursor = 'default';
  }

  update(dt) {
    const g = this.game, input = g.input, cam = g.camera, p = g.player;
    if (input.dragX || input.dragY) cam.rotate(-input.dragX * 0.006, input.dragY * 0.005);
    if (input.wheel) cam.zoom(input.wheel > 0 ? 1.12 : 0.89);
    if (input.pinch !== 1) cam.zoom(input.pinch);
    if (input.held('KeyQ')) cam.rotate(1.9 * dt, 0);
    if (input.held('KeyE')) cam.rotate(-1.9 * dt, 0);

    // what is under the cursor
    const ray = cam.ray(input.mouse.nx, input.mouse.ny);
    if (this.hover) this.hover.hover = false;
    this.hover = input.mouse.inside && !g.paused ? this.pick(ray) : null;
    if (this.hover) this.hover.hover = true;
    this.ground = input.mouse.inside ? g.world.raycast(ray.origin, ray.dir) : null;   // no cursor, nothing to aim at
    g.player.intent.aim = this.ground;          // where skills are aimed when there is no target
    g.canvas.style.cursor = this.hover ? 'pointer' : 'default';

    const it = p.intent;
    it.moveX = 0; it.moveZ = 0;
    if (g.paused) return;

    // WASD / arrows and the on-screen stick, relative to the camera
    let f = input.stick.y, r = input.stick.x;
    if (input.held('KeyW') || input.held('ArrowUp')) f += 1;
    if (input.held('KeyS') || input.held('ArrowDown')) f -= 1;
    if (input.held('KeyD') || input.held('ArrowRight')) r += 1;
    if (input.held('KeyA') || input.held('ArrowLeft')) r -= 1;
    if (f || r) {
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      let x = fx * f - fz * r, z = fz * f + fx * r;
      const l = Math.hypot(x, z), k = Math.min(1, l) / l;    // a stick pushed part-way walks slower
      it.moveX = x * k; it.moveZ = z * k;
    }

    for (const c of input.clicks) {
      if (c.button !== 0) continue;
      const hit = this.pick(cam.ray(c.nx, c.ny), c.touch ? 1.8 : 1);    // a fingertip is blunt
      if (hit) this.setTarget(hit, true);
      else {
        const gr = g.world.raycast(cam.pos, cam.ray(c.nx, c.ny).dir);
        if (gr) {
          p.moveTo = { x: gr.x, z: gr.z };
          p.pursue = false;
          g.bus.emit('moveclick', { x: gr.x, y: g.world.surface(gr.x, gr.z), z: gr.z });
        }
      }
    }
    // holding the button down steers toward the cursor
    if (input.steering() && !this.hover) {
      this.steerTime += dt;
      if (this.steerTime > 0.22 && this.ground) { p.moveTo = { x: this.ground.x, z: this.ground.z }; p.pursue = false; }
    } else this.steerTime = 0;

    for (let i = 0; i < 4; i++) if (input.hit('Digit' + (i + 1))) g.skills.cast(i);
    if (input.hit('KeyR')) g.loot.use('tonic');
    if (input.hit('KeyF')) g.loot.use('draught');
    if (input.hit('Tab')) this.cycleTarget();
    if (input.hit('Space')) this.act();
    // holding the on-screen attack button keeps the fight going from one creature to the next
    if (input.acting) {
      const t = p.target;
      if (t && t.kind === 'monster' && !t.dead) p.pursue = true;
      else if (!t) { const m = g.entities.nearest('monster', p.x, p.z, 9); if (m) this.setTarget(m, true); }
    }
    if (input.hit('Escape')) { p.target = null; p.pursue = false; g.bus.emit('ui:close'); }
    if (input.hit('KeyC')) g.bus.emit('ui:toggle', 'character');
    if (input.hit('KeyB') || input.hit('KeyI')) g.bus.emit('ui:toggle', 'bag');
    if (input.hit('KeyV')) g.bus.emit('ui:toggle', 'view');
    if (input.hit('KeyM')) g.bus.emit('ui:toggle', 'sound');
  }

  /** What the one "do it" button (Space, or the big button on a touch screen) would act on. */
  actTarget() {
    const g = this.game, p = g.player, t = p.target;
    if (t && t.kind === 'monster' && !t.dead) return t;
    return g.entities.nearest('monster', p.x, p.z, 9) || g.entities.nearest('npc', p.x, p.z, 7);
  }
  /** Fight the nearest creature; with none about, walk up to someone near and talk. */
  act() {
    const e = this.actTarget();
    if (e) this.setTarget(e, true);
    return e;
  }

  setTarget(e, pursue) {
    const p = this.game.player;
    p.target = e; p.pursue = pursue; p.moveTo = null;
    this.game.bus.emit('target', e);
  }

  cycleTarget() {
    const g = this.game, p = g.player;
    const near = g.monsters.filter((m) => !m.dead && Math.hypot(m.x - p.x, m.z - p.z) < 18)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    if (!near.length) return;
    const i = near.indexOf(p.target);
    this.setTarget(near[(i + 1) % near.length], false);
  }

  /**
   * The entity whose bounding sphere the ray passes through: the nearest one for a
   * cursor. With `fat` above 1 (a fingertip) the spheres are that much bigger and
   * the one the ray passes closest to the middle of wins.
   */
  pick(ray, fat = 1) {
    const o = ray.origin, d = ray.dir;
    let best = null, bt = 1e9;
    for (const e of this.game.entities.list) {
      if (e.kind === 'player' || e.dead || e.gone) continue;
      const r = Math.max(e.radius * 1.35, e.height * 0.5) * (e.kind === 'drop' ? 1.3 : 1) * fat;
      const cx = e.x - o[0], cy = e.y + e.height * 0.5 + e.lift - o[1], cz = e.z - o[2];
      const b = cx * d[0] + cy * d[1] + cz * d[2];
      if (b < 0) continue;
      const h = cx * cx + cy * cy + cz * cz - b * b;
      const score = fat > 1 ? h / (r * r) : b;
      if (h < r * r && score < bt) { bt = score; best = e; }
    }
    return best;
  }
}
