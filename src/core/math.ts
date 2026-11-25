type Vec3 = [number, number, number];
type ReadonlyVec3 = readonly [number, number, number];

export const TAU = Math.PI * 2;
export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const saturate = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = saturate((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const damp = (a: number, b: number, rate: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-rate * dt));

export function angleDelta(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export const dampAngle = (a: number, b: number, rate: number, dt: number): number =>
  a + angleDelta(a, b) * (1 - Math.exp(-rate * dt));

export const lerp3 = (a: ReadonlyVec3, b: ReadonlyVec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

export const v3 = {
  sub: (a: ReadonlyVec3, b: ReadonlyVec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a: ReadonlyVec3, b: ReadonlyVec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a: ReadonlyVec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: ReadonlyVec3, b: ReadonlyVec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: ReadonlyVec3, b: ReadonlyVec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a: ReadonlyVec3): number => Math.hypot(a[0], a[1], a[2]),
  norm: (a: ReadonlyVec3): Vec3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

export const m4 = {
  perspective(out: Float32Array, fovY: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  },
  view(out: Float32Array, pos: ReadonlyVec3, r: ReadonlyVec3, u: ReadonlyVec3, f: ReadonlyVec3): Float32Array {
    out[0] = r[0];
    out[4] = r[1];
    out[8] = r[2];
    out[12] = -v3.dot(r, pos);
    out[1] = u[0];
    out[5] = u[1];
    out[9] = u[2];
    out[13] = -v3.dot(u, pos);
    out[2] = -f[0];
    out[6] = -f[1];
    out[10] = -f[2];
    out[14] = v3.dot(f, pos);
    out[3] = 0;
    out[7] = 0;
    out[11] = 0;
    out[15] = 1;
    return out;
  },
  mul(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4];
      const b1 = b[c * 4 + 1];
      const b2 = b[c * 4 + 2];
      const b3 = b[c * 4 + 3];
      out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  },
};
