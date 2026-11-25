// The lumen: the small light that rides at a surveyor's shoulder. One figure
// with eight shapes (eExtra), one for each kind in content/companions.js. All of
// them hang in the air round a light of their own; the light burns brighter the
// fuller the lumen is (ePose.w) and flares when its burst goes (action 2).
// Pencils: A its body, B its light, C its trim.

import { registerArchetype } from '../passes/entities.js';

registerArchetype({
  id: 'lumen', boundY: 0.0, boundR: 0.62, steps: 40,
  glsl: /* glsl */ `
float lBob, lGlow, lFlash; mat2 lSpin;
void entPose() {
  lBob = 0.06 * sin(uTime * 2.2 + eLook.x * 6.28);
  lSpin = rot2(uTime * 1.5 + eLook.x * 6.28);
  lGlow = 0.35 + 0.65 * saturate(ePose.w);
  lFlash = (ePose.y > 1.5 && ePose.y < 2.5) ? 1.0 - saturate(ePose.z) : 0.0;
}
// three of something, evenly round the upright axis
vec3 lThree(vec3 r) {
  float sec = TAU / 3.0, a = mod(atan(r.x, r.z) + sec * 0.5, sec) - sec * 0.5, len = length(r.xz);
  return vec3(sin(a) * len, r.y, cos(a) * len);
}
float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(0.0, lBob, 0.0);
  vec3 r = q; r.xz = lSpin * r.xz;
  float sh = floor(eExtra + 0.5);
  float core = length(q) - (0.085 + 0.06 * lFlash);
  float body = 1e3, trim = 1e3;
  if (sh < 0.5) {
    // mote: a bead of light in a thin ring, a fin each side
    body = sdTorusY(r, 0.17, 0.022);
    trim = sdEllipsoid(vec3(abs(q.x) - 0.21, q.y - 0.02, q.z + 0.05), vec3(0.075, 0.02, 0.05));
  } else if (sh < 1.5) {
    // kindle: a flame-shaped shell open at the front, three shards circling it
    body = max(sdEllipsoid(q - vec3(0.0, 0.07, 0.0), vec3(0.15, 0.25, 0.15)), 0.135 - length(q - vec3(0.0, 0.0, 0.1)));
    trim = sdEllipsoid(lThree(r) - vec3(0.0, -0.03, 0.28), vec3(0.03, 0.085, 0.03));
  } else if (sh < 2.5) {
    // carapace: two half shells, the light showing in the gap between them
    body = max(sdEllipsoid(q, vec3(0.22, 0.17, 0.2)), 0.048 - abs(q.y));
    trim = sdTorusY(q - vec3(0.0, 0.1, 0.0), 0.185, 0.02);
  } else if (sh < 3.5) {
    // ripple: a ring standing on edge round the light, two ribbons trailing under it
    body = sdTorusY(q.xzy, 0.185, 0.028);
    float w = 0.05 * sin(uTime * 3.0 + eLook.x * 6.0);
    trim = min(sdTaper(q, vec3(-0.1, -0.15, -0.02), vec3(-0.15 + w, -0.42, -0.18), 0.03, 0.008), sdTaper(q, vec3(0.1, -0.15, -0.02), vec3(0.15 + w, -0.42, -0.18), 0.03, 0.008));
  } else if (sh < 4.5) {
    // pyre: a pointed crystal, taller than it is wide, a ring of fire round its waist
    body = (abs(r.x) + abs(r.y) * 0.55 + abs(r.z)) * 0.6 - 0.105;
    trim = sdTorusY(r + vec3(0.0, 0.03, 0.0), 0.29, 0.016);
  } else if (sh < 5.5) {
    // bastion: a six-sided plate with the light as its boss, a rim behind it
    float hx = max(abs(q.x) * 0.866 + abs(q.y) * 0.5, abs(q.y));
    body = max(hx - 0.23, abs(q.z) - 0.03);
    trim = max(abs(hx - 0.27) - 0.02, abs(q.z + 0.03) - 0.016);
  } else if (sh < 6.5) {
    // current: two rings turning inside one another
    body = sdTorusY(r, 0.22, 0.024);
    vec3 r2 = q.yxz; r2.xz = lSpin * r2.xz;
    trim = sdTorusY(r2.xzy, 0.16, 0.02);
  } else {
    // prism: a three-sided crystal, three motes circling it
    float tri = max(r.x * 0.5 + abs(r.z) * 0.866, -r.x) - 0.1;
    body = max(tri, abs(r.y) - 0.2 + 0.4 * max(tri + 0.1, 0.0));
    trim = length(lThree(q) - vec3(0.0, 0.02, 0.3)) - 0.036;
  }
  float d = core;
  mat = 1.0;
  if (body < d) { d = body; mat = 0.0; }
  if (trim < d) { d = trim; mat = 2.0; }
  return d * 0.85;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(0.0, lBob, 0.0);
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.86; s.glow = 0.5 * lFlash; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.45 * (1.0 - lGlow); s.glow = max(lGlow, lFlash); return; }      // the light: paper, the fuller the brighter
  s.albedo = eColA; s.cover = 0.84; s.wrap = 0.3;
  // a crystal lets its light through: paler toward its middle
  float through = smoothstep(0.24, 0.07, length(q)) * step(3.5, floor(eExtra + 0.5));
  s.cover = mix(s.cover, 0.2, through * lGlow);
  s.glow = max(lFlash * 0.7, through * 0.5 * lGlow);
  s.ink = penLine((fract(length(q.xy) * 7.0) - 0.5) / 7.0) * 0.3 * (1.0 - through);
}
`,
});
