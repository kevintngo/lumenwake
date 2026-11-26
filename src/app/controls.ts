import type { Entity } from '../types/entity';
import type { ControlsLike, GameContext } from '../types/game-context';
import type { CameraRay } from '../types/render';

export class Controls implements ControlsLike {
  private readonly game: GameContext;
  hover: Entity | null = null;
  ground: { x: number; z: number } | null = null;
  private steerTime = 0;

  constructor(game: GameContext) {
    this.game = game;
  }

  release(): void {
    const g = this.game;
    const it = g.player.intent;
    if (this.hover) {
      this.hover.hover = false;
      this.hover = null;
    }
    it.moveX = 0;
    it.moveZ = 0;
    it.aim = null;
    it.jump = false;
    this.steerTime = 0;
    g.canvas.style.cursor = 'default';
  }

  update(dt: number): void {
    const g = this.game;
    const input = g.input;
    const cam = g.camera;
    const p = g.player;

    if (input.dragX || input.dragY) cam.rotate(-input.dragX * 0.006, input.dragY * 0.005);
    if (input.wheel) cam.zoom(input.wheel > 0 ? 1.12 : 0.89);
    if (input.pinch !== 1) cam.zoom(input.pinch);
    if (input.held('KeyQ')) cam.rotate(1.9 * dt, 0);
    if (input.held('KeyE')) cam.rotate(-1.9 * dt, 0);

    const ray = cam.ray(input.mouse.nx, input.mouse.ny);
    if (this.hover) this.hover.hover = false;
    this.hover = input.mouse.inside && !g.paused ? this.pick(ray) : null;
    if (this.hover) this.hover.hover = true;
    this.ground = input.mouse.inside ? g.world.raycast(ray.origin, ray.dir) : null;
    g.player.intent.aim = this.ground;
    g.canvas.style.cursor = this.hover ? 'pointer' : 'default';

    const it = p.intent;
    it.moveX = 0;
    it.moveZ = 0;
    if (g.paused) return;

    let f = input.stick.y;
    let r = input.stick.x;
    if (input.held('KeyW') || input.held('ArrowUp')) f += 1;
    if (input.held('KeyS') || input.held('ArrowDown')) f -= 1;
    if (input.held('KeyD') || input.held('ArrowRight')) r += 1;
    if (input.held('KeyA') || input.held('ArrowLeft')) r -= 1;
    if (f || r) {
      const fx = -Math.sin(cam.yaw);
      const fz = -Math.cos(cam.yaw);
      const x = fx * f - fz * r;
      const z = fz * f + fx * r;
      const l = Math.hypot(x, z);
      const k = Math.min(1, l) / l;
      it.moveX = x * k;
      it.moveZ = z * k;
    }

    for (const c of input.clicks) {
      if (c.button !== 0) continue;
      const hit = this.pick(cam.ray(c.nx, c.ny), c.touch ? 1.8 : 1);
      if (hit) {
        this.setTarget(hit, true);
      } else {
        const gr = g.world.raycast(cam.pos, cam.ray(c.nx, c.ny).dir);
        if (gr) {
          p.moveTo = { x: gr.x, z: gr.z };
          p.pursue = false;
          g.bus.emit('moveclick', { x: gr.x, y: g.world.surface(gr.x, gr.z), z: gr.z });
        }
      }
    }

    if (input.steering() && !this.hover) {
      this.steerTime += dt;
      if (this.steerTime > 0.22 && this.ground) {
        p.moveTo = { x: this.ground.x, z: this.ground.z };
        p.pursue = false;
      }
    } else {
      this.steerTime = 0;
    }

    for (let i = 0; i < 4; i++) {
      if (input.hit('Digit' + (i + 1))) g.skills.cast(i);
    }
    if (input.hit('KeyR')) g.loot.use('tonic');
    if (input.hit('KeyT')) g.loot.use('draught');
    if (input.hit('Tab')) this.cycleTarget();
    if (input.hit('Space')) this.jump();
    if (input.hit('KeyF')) this.act();
    if (g.missions.active?.choosing) {
      if (input.hit('KeyO')) g.missions.choose(false);
      if (input.hit('KeyN')) g.missions.choose(true);
    }

    if (input.acting) {
      const t = p.target;
      if (t && t.kind === 'monster' && !t.dead) {
        p.pursue = true;
      } else if (!t) {
        const m = g.entities.nearest('monster', p.x, p.z, 9);
        if (m) this.setTarget(m, true);
      }
    }

    if (input.hit('Escape')) g.bus.emit('ui:escape');
    if (input.hit('KeyJ')) g.bus.emit('ui:toggle', 'contract');
    if (input.hit('KeyG')) g.companion.burst();
    if (input.hit('KeyL')) g.bus.emit('ui:toggle', 'lumen');
    if (input.hit('KeyC')) g.bus.emit('ui:toggle', 'character');
    if (input.hit('KeyB') || input.hit('KeyI')) g.bus.emit('ui:toggle', 'bag');
    if (input.hit('KeyV')) g.bus.emit('ui:toggle', 'view');
    if (input.hit('KeyM')) g.bus.emit('ui:toggle', 'sound');
  }

  jump(): void {
    this.game.player.intent.jump = true;
  }

  clearTarget(): boolean {
    const p = this.game.player;
    const had = Boolean(p.target);
    p.target = null;
    p.pursue = false;
    return had;
  }

  actTarget(): Entity | null {
    const g = this.game;
    const p = g.player;
    const t = p.target;
    if (t && t.kind === 'monster' && !t.dead) return t;
    return g.entities.nearest('monster', p.x, p.z, 9) || g.entities.nearest('npc', p.x, p.z, 7);
  }

  act(): Entity | null {
    const e = this.actTarget();
    if (e) this.setTarget(e, true);
    return e;
  }

  setTarget(e: Entity, pursue: boolean): void {
    const p = this.game.player;
    p.target = e;
    p.pursue = pursue;
    p.moveTo = null;
  }

  cycleTarget(): void {
    const g = this.game;
    const p = g.player;
    const near = g.monsters
      .filter((m) => !m.dead && Math.hypot(m.x - p.x, m.z - p.z) < 18)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    if (!near.length) return;
    const i = near.findIndex((m) => m === p.target);
    this.setTarget(near[(i + 1) % near.length], false);
  }

  private pick(ray: CameraRay, fat = 1): Entity | null {
    const o = ray.origin;
    const d = ray.dir;
    let best: Entity | null = null;
    let bt = 1e9;
    for (const e of this.game.entities.list) {
      if (e.kind === 'player' || e.kind === 'pet' || e.kind === 'set' || e.dead || e.gone) continue;
      const r = Math.max(e.radius * 1.35, e.height * 0.5) * (e.kind === 'drop' ? 1.3 : 1) * fat;
      const cx = e.x - o[0];
      const cy = e.y + e.height * 0.5 + e.lift - o[1];
      const cz = e.z - o[2];
      const b = cx * d[0] + cy * d[1] + cz * d[2];
      if (b < 0) continue;
      const h = cx * cx + cy * cy + cz * cz - b * b;
      const score = fat > 1 ? h / (r * r) : b;
      if (h < r * r && score < bt) {
        bt = score;
        best = e;
      }
    }
    return best;
  }
}
