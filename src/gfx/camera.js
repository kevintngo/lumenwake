// Orbit camera. Shaders build rays from the basis vectors; instanced geometry
// uses the view-projection matrix; gameplay uses project() and ray().
//
// Two things may ask more of it than the player's own turning and zooming, and
// both are set from outside (app/cinema.js):
//   stage   a fight with something huge: the orbit stands further back, aims a little higher, and takes a wider lens
//   rail    a cinematic's camera: where it stands, what it looks at, which lens. While
//           `rail.mix` is under 1 the picture is part-way between the rail and the orbit.

import { clamp, damp, dampAngle, lerp, lerp3, m4, smoothstep, v3 } from '../core/math.js';
import { RENDER } from '../config.js';

const LOOK_AHEAD = 1.5;     // how far above the hero a low camera aims

export class Camera {
  constructor() {
    this.target = [0, 0, 0];
    this.yaw = Math.PI * 0.25;   // around the target
    this.pitch = 0.8;           // radians above the horizon
    this.distance = 15.5;
    this.goal = { yaw: this.yaw, pitch: this.pitch, distance: this.distance };
    this.fov = RENDER.FOV * Math.PI / 180;     // the lens in play
    this.lens = this.fov;                      // the lens this frame
    this.stage = { lift: 0, pull: 1, wide: 0 };         // asked for; eased toward below
    this.lift = 0; this.pull = 1; this.wide = 0;
    this.rail = null;                          // { pos, look, lens, mix }
    this.aspect = 1;
    this.pos = [0, 10, 10];
    this.right = [1, 0, 0]; this.up = [0, 1, 0]; this.fwd = [0, 0, -1];
    this.tan = [1, 1];
    this.view = new Float32Array(16); this.proj = new Float32Array(16); this.viewProj = new Float32Array(16);
    this.shake = 0;
  }

  rotate(dYaw, dPitch) {
    this.goal.yaw += dYaw;
    this.goal.pitch = clamp(this.goal.pitch + dPitch, 0.2, 1.35);
  }
  zoom(factor) {
    this.goal.distance = clamp(this.goal.distance * factor, 7, 42);
  }

  /** Eases toward the goal and rebuilds every derived quantity. minY keeps the eye above ground. */
  update(dt, target, aspect, groundAt) {
    this.aspect = aspect;
    this.yaw = dampAngle(this.yaw, this.goal.yaw, 12, dt);
    this.pitch = damp(this.pitch, this.goal.pitch, 12, dt);
    this.distance = damp(this.distance, this.goal.distance, 8, dt);
    for (let i = 0; i < 3; i++) this.target[i] = damp(this.target[i], target[i], 9, dt);

    this.lift = damp(this.lift, this.stage.lift, 1.8, dt);
    this.pull = damp(this.pull, this.stage.pull, 1.8, dt);
    this.wide = damp(this.wide, this.stage.wide || 0, 1.8, dt);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dir = [Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp]; // from target to eye
    const d = this.distance * this.pull;
    // Seen from low down and behind, the camera aims above the hero's head, so the hero
    // stands in the lower third and the way ahead fills the picture; from above it aims at him.
    let aim = [this.target[0], this.target[1] + LOOK_AHEAD * (1 - smoothstep(0.24, 0.62, this.pitch)) + this.lift, this.target[2]];
    this.pos = v3.add(aim, v3.scale(dir, d));
    let lens = this.fov + this.wide, clear = 1.2;
    const r = this.rail;
    if (r) {
      const k = r.mix ?? 1;
      this.pos = lerp3(this.pos, r.pos, k);
      aim = lerp3(aim, r.look, k);
      lens = lerp(lens, r.lens || this.fov, k);
      clear = lerp(clear, 0.35, k);            // a cinematic may put the camera down in the grass
    }
    this.lens = lens;
    if (groundAt) {
      const floor = groundAt(this.pos[0], this.pos[2]) + clear;
      if (this.pos[1] < floor) this.pos[1] = floor;
    }
    if (this.shake > 0 && !this.still) {
      const s = this.shake * this.shake * 0.35 * (1 + 0.04 * v3.len(v3.sub(aim, this.pos)));      // the same wobble on the page however far the camera stands
      this.pos[0] += (Math.random() - 0.5) * s; this.pos[1] += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    } else if (this.still) this.shake = 0;
    this.fwd = v3.norm(v3.sub(aim, this.pos));
    this.right = v3.norm(v3.cross(this.fwd, [0, 1, 0]));
    this.up = v3.cross(this.right, this.fwd);
    const ty = Math.tan(lens / 2);
    this.tan = [ty * aspect, ty];
    m4.view(this.view, this.pos, this.right, this.up, this.fwd);
    m4.perspective(this.proj, lens, aspect, 0.2, 600);
    m4.mul(this.viewProj, this.proj, this.view);
  }

  /** World ray through a point given in normalised device coordinates (-1..1, y up). */
  ray(nx, ny) {
    const r = this.right, u = this.up, f = this.fwd;
    return {
      origin: this.pos,
      dir: v3.norm([
        f[0] + r[0] * nx * this.tan[0] + u[0] * ny * this.tan[1],
        f[1] + r[1] * nx * this.tan[0] + u[1] * ny * this.tan[1],
        f[2] + r[2] * nx * this.tan[0] + u[2] * ny * this.tan[1],
      ]),
    };
  }

  /** World point -> { x, y } in 0..1 screen space (y down) and depth along the view; null behind the eye. */
  project(x, y, z) {
    const m = this.viewProj;
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (w <= 0.05) return null;
    return {
      x: ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w) * 0.5 + 0.5,
      y: 0.5 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * 0.5,
      w,
    };
  }
}
