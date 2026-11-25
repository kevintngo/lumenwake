import { RENDER } from '../config';
import { clamp, damp, dampAngle, lerp, lerp3, m4, smoothstep, v3 } from '../core/math';
import type {
  CameraGoal,
  CameraLike,
  CameraRail,
  CameraRay,
  CameraStage,
  ProjectedPoint,
} from '../types/render';

const LOOK_AHEAD = 1.5;

export function cameraTan(cam: CameraLike): [number, number] {
  return cam.tan;
}

export class Camera implements CameraLike {
  target: [number, number, number] = [0, 0, 0];
  yaw = Math.PI * 0.25;
  pitch = 0.8;
  distance = 15.5;
  goal: CameraGoal;
  fov = (RENDER.FOV * Math.PI) / 180;
  stage: CameraStage = { lift: 0, pull: 1, wide: 0 };
  lift = 0;
  pull = 1;
  wide = 0;
  rail: CameraRail | null = null;
  pos: [number, number, number] = [0, 10, 10];
  right: [number, number, number] = [1, 0, 0];
  up: [number, number, number] = [0, 1, 0];
  forward: [number, number, number] = [0, 0, -1];
  tan: [number, number] = [1, 1];
  view = new Float32Array(16);
  proj = new Float32Array(16);
  viewProj = new Float32Array(16);
  shake = 0;
  shakeScale = 1;
  still = false;

  constructor() {
    this.goal = { yaw: this.yaw, pitch: this.pitch, distance: this.distance };
  }

  rotate(dYaw: number, dPitch: number): void {
    this.goal.yaw += dYaw;
    this.goal.pitch = clamp(this.goal.pitch + dPitch, 0.2, 1.35);
  }

  zoom(factor: number): void {
    this.goal.distance = clamp(this.goal.distance * factor, 7, 42);
  }

  update(
    dt: number,
    target: [number, number, number],
    aspect: number,
    groundAt: ((x: number, z: number) => number) | null,
  ): void {
    this.yaw = dampAngle(this.yaw, this.goal.yaw, 12, dt);
    this.pitch = damp(this.pitch, this.goal.pitch, 12, dt);
    this.distance = damp(this.distance, this.goal.distance, 8, dt);
    for (let i = 0; i < 3; i++) this.target[i] = damp(this.target[i], target[i], 9, dt);

    this.lift = damp(this.lift, this.stage.lift, 1.8, dt);
    this.pull = damp(this.pull, this.stage.pull, 1.8, dt);
    this.wide = damp(this.wide, this.stage.wide || 0, 1.8, dt);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const dir: [number, number, number] = [Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp];
    const d = this.distance * this.pull;
    let aim: [number, number, number] = [
      this.target[0],
      this.target[1] + LOOK_AHEAD * (1 - smoothstep(0.24, 0.62, this.pitch)) + this.lift,
      this.target[2],
    ];
    this.pos = v3.add(aim, v3.scale(dir, d));
    let lens = this.fov + this.wide;
    let clear = 1.2;
    const r = this.rail;
    if (r) {
      const k = r.mix ?? 1;
      this.pos = lerp3(this.pos, r.pos, k);
      aim = lerp3(aim, r.look, k);
      lens = lerp(lens, r.lens || this.fov, k);
      clear = lerp(clear, 0.35, k);
    }
    if (groundAt) {
      const floor = groundAt(this.pos[0], this.pos[2]) + clear;
      if (this.pos[1] < floor) this.pos[1] = floor;
    }
    if (this.shake > 0 && !this.still) {
      const s =
        this.shake *
        this.shake *
        0.35 *
        (1 + 0.04 * v3.len(v3.sub(aim, this.pos))) *
        (this.shakeScale ?? 1);
      this.pos[0] += (Math.random() - 0.5) * s;
      this.pos[1] += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    } else if (this.still) {
      this.shake = 0;
    }
    this.forward = v3.norm(v3.sub(aim, this.pos));
    this.right = v3.norm(v3.cross(this.forward, [0, 1, 0]));
    this.up = v3.cross(this.right, this.forward);
    const ty = Math.tan(lens / 2);
    this.tan = [ty * aspect, ty];
    m4.view(this.view, this.pos, this.right, this.up, this.forward);
    m4.perspective(this.proj, lens, aspect, 0.2, 600);
    m4.mul(this.viewProj, this.proj, this.view);
  }

  ray(nx: number, ny: number): CameraRay {
    const r = this.right;
    const u = this.up;
    const f = this.forward;
    return {
      origin: this.pos,
      dir: v3.norm([
        f[0] + r[0] * nx * this.tan[0] + u[0] * ny * this.tan[1],
        f[1] + r[1] * nx * this.tan[0] + u[1] * ny * this.tan[1],
        f[2] + r[2] * nx * this.tan[0] + u[2] * ny * this.tan[1],
      ]),
    };
  }

  project(x: number, y: number, z: number): ProjectedPoint | null {
    const m = this.viewProj;
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (w <= 0.05) return null;
    return {
      x: ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w) * 0.5 + 0.5,
      y: 0.5 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * 0.5,
    };
  }
}
