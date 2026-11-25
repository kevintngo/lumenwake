// More of what lives on the islands: two machines left running by an older
// survey (a watcher that hangs in the air and a strider on two long legs) and
// three animals (a hound that hunts in packs, a delver that comes up under you,
// a mite that bursts). Original designs, built like the first six: a handful
// of distance primitives each, one mustard part, the part that hurts.
// Pencils: A the hide or the hull (a place gives its own to it), B the part that hurts, C a detail.
// See passes/entities.js for what an archetype has to define.

import { registerArchetype } from '../passes/entities.js';

// ------------------------------------------------------------ Fanghound
// Lean, long-eared, quick. Runs with its body low and springs.
registerArchetype({
  id: 'hound', boundY: 0.5, boundR: 1.0, steps: 48,
  glsl: /* glsl */ `
float hBob, hLunge, hNod, hCrouch;
void entPose() {
  float mv = ePose.w;
  hBob = abs(sin(ePose.x)) * 0.07 * mv + 0.012 * sin(uTime * 2.4 + eLook.x * 6.0);
  hLunge = 0.0; hCrouch = 0.0;
  hNod = 0.05 * sin(uTime * 1.5 + eLook.x * 9.0) * (1.0 - mv);
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = sin(saturate(ePose.z) * PI);
    hLunge = k * 0.34; hNod = -k * 0.3;
    hCrouch = 0.1 * smoothstep(0.0, 0.2, ePose.z) * (1.0 - smoothstep(0.2, 0.5, ePose.z));      // gathers itself before it springs
  }
  if (ePose.y > 2.5) hLunge = -0.1 * (1.0 - ePose.z);
}
float entMap(vec3 p, out float mat) {
  mat = 0.0;
  float s = sin(ePose.x) * ePose.w;
  // legs: thin, the diagonal pairs together; each foot comes forward lifted
  float sx = p.x < 0.0 ? -1.0 : 1.0, sz = p.z < 0.0 ? -1.0 : 1.0, ph = s * sx * sz;
  float lifted = max(cos(ePose.x) * sx * sz, 0.0) * ePose.w;
  vec3 hip = vec3(0.12 * sx, 0.44 + hBob - hCrouch, 0.27 * sz + hLunge * 0.5);
  vec3 foot = vec3(0.13 * sx, 0.04 + lifted * 0.16, 0.3 * sz + ph * 0.3 + hLunge * 0.3);
  vec3 knee = mix(hip, foot, 0.5) + vec3(0.0, 0.0, -0.09 * sz);
  float legs = min(sdTaper(p, hip, knee, 0.06, 0.04), sdTaper(p, knee, foot, 0.04, 0.03));
  float paws = length((p - foot - vec3(0.0, 0.0, 0.03)) * vec3(1.0, 1.4, 0.8)) - 0.05;
  vec3 q = p - vec3(0.0, hBob - hCrouch, hLunge);
  float body = sdEllipsoid(q - vec3(0.0, 0.5, -0.02), vec3(0.17, 0.17, 0.4));
  body = smin(body, sdEllipsoid(q - vec3(0.0, 0.53, 0.22), vec3(0.19, 0.2, 0.2)), 0.08);       // a deep chest
  vec3 h = q - vec3(0.0, 0.62, 0.44);
  h.zy = rot2(hNod) * h.zy;
  float head = sdEllipsoid(h, vec3(0.13, 0.12, 0.15));
  head = smin(head, sdTaper(h, vec3(0.0, -0.03, 0.08), vec3(0.0, -0.06, 0.3), 0.085, 0.05), 0.06);
  // ears: long, swept back
  vec3 e = vec3(abs(h.x) - 0.08, h.y - 0.08, h.z + 0.02);
  float ears = sdTaper(e, vec3(0.0), vec3(0.06, 0.2, -0.24), 0.05, 0.012);
  float tail = sdTaper(q, vec3(0.0, 0.56, -0.38), vec3(0.03 * sin(uTime * 5.0 + eLook.x), 0.74 - 0.2 * ePose.w, -0.72), 0.05, 0.02);
  float d = smin(body, head, 0.07);
  d = min(d, min(min(legs, ears), tail));
  // what hurts: the fangs, and a crest of spines down its back
  float fang = sdTaper(vec3(abs(h.x) - 0.045, h.y, h.z), vec3(0.0, -0.09, 0.24), vec3(0.0, -0.17, 0.25), 0.02, 0.004);
  vec3 c = q - vec3(0.0, 0.68, -0.02);
  float cz = mod(c.z + 0.07, 0.14) - 0.07;
  vec3 sp = vec3(c.x, c.y, cz); sp.zy = rot2(-0.55) * sp.zy;
  float crest = abs(c.z) < 0.34 ? sdConeUp(sp, 0.04, 0.13) * 0.8 : 1e3;
  float hurt = min(min(fang, crest), paws);
  if (hurt < d) { d = hurt; mat = 1.0; }
  return d * 0.9;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.9; return; }
  vec3 q = p - vec3(0.0, hBob - hCrouch, hLunge);
  float belly = smoothstep(0.46, 0.36, q.y) * step(0.3, q.y);
  s.albedo = eColA; s.cover = mix(0.84, 0.14, belly); s.wrap = 0.25;
  s.ink = step(0.74, vnoise(q.xz * 24.0 + q.y * 16.0)) * (1.0 - belly) * 0.45;
  vec3 h = q - vec3(0.0, 0.62, 0.44);
  h.zy = rot2(hNod) * h.zy;
  if (h.z > 0.0 && length(h) < 0.4) {
    vec2 e = vec2(abs(h.x) - 0.075, h.y - 0.03);
    float eye = smoothstep(0.03, 0.022, length(e * vec2(1.0, 1.3)));
    float nose = smoothstep(0.035, 0.025, length(vec3(h.x, h.y + 0.05, h.z - 0.3)));
    if (max(eye, nose) > 0.5) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
    else s.ink = max(s.ink, penLine(e.y - 0.04 + e.x * 0.6) * step(abs(e.x), 0.05));        // a hard brow
  }
}
`,
});

// ------------------------------------------------------------ Watcher
// A machine from an older survey, still at its post: a shallow dome that hangs in the air on a
// turning ring, one lens under it. It keeps its distance and puts a bolt where you stand.
registerArchetype({
  id: 'watcher', boundY: 1.25, boundR: 0.85, steps: 44,
  glsl: /* glsl */ `
vec3 wAt; float wTilt, wEye, wSpin, wKick;
void entPose() {
  float t = uTime * 1.7 + eLook.x * 6.28;
  wAt = vec3(0.03 * sin(t * 0.8), 1.3 + 0.08 * sin(t), 0.0);
  wTilt = 0.2 * ePose.w;                          // noses down as it moves
  wSpin = uTime * 2.2 + eLook.x * 6.28;
  wEye = 0.45; wKick = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) { float k = saturate(ePose.z); wEye = mix(0.45, 1.0, smoothstep(0.0, 0.4, k)); wKick = smoothstep(0.4, 0.5, k) * (1.0 - smoothstep(0.5, 1.0, k)) * 0.16; }
  if (ePose.y > 2.5) wAt.y -= 0.12 * (1.0 - ePose.z);
}
vec3 wLocal(vec3 p) { vec3 q = p - wAt; q.z += wKick; q.zy = rot2(wTilt) * q.zy; return q; }
float entMap(vec3 p, out float mat) {
  vec3 q = wLocal(p);
  mat = 0.0;
  float dome = max(sdEllipsoid(q, vec3(0.36, 0.2, 0.36)), -q.y - 0.05);
  float skirt = sdCylinder(q + vec3(0.0, 0.1, 0.0), 0.3, 0.07);
  float d = smin(dome, skirt, 0.04);
  d = min(d, sdCapsule(q, vec3(0.1, 0.16, -0.1), vec3(0.14, 0.46, -0.16), 0.014));          // an aerial
  // two vanes that it steers by
  vec3 v = vec3(abs(q.x) - 0.42, q.y + 0.02, q.z + 0.06);
  d = min(d, sdRoundBox(v, vec3(0.1, 0.012, 0.13), 0.01));
  // the ring it hangs on, turning
  vec3 r = q + vec3(0.0, 0.16, 0.0);
  r.xz = rot2(wSpin) * r.xz;
  float ring = max(sdTorusY(r, 0.46, 0.022), -(abs(r.x) - 0.1));       // (a ring in two halves)
  if (ring < d) { d = ring; mat = 2.0; }
  float lens = length(q - vec3(0.0, -0.17, 0.12)) - 0.13;
  if (lens < d) { d = lens; mat = 1.0; }
  return d * 0.9;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = wLocal(p);
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.82; return; }
  if (mat > 0.5) {
    // the lens: a dark iris round a light that comes up before it fires
    float r = length(q.xy - vec2(0.0, -0.17));
    s.albedo = eColB; s.cover = mix(0.9, 0.25, wEye) * step(0.05, r) + step(r, 0.05); s.glow = wEye * step(0.05, r);
    if (r < 0.05) { s.albedo = INK_BLACK; s.solid = 1.0; }
    return;
  }
  // the hull: pale plates, one band in the hide's pencil, panel lines
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (q.y < 0.02 && q.y > -0.09) { s.albedo = eColA; s.cover = 0.84; }
  s.ink = max(penLine(q.y - 0.02), penLine((fract(atan(q.x, q.z) * 1.6) - 0.5) / 1.6 * 0.3) * step(0.02, q.y)) * 0.6;
}
`,
});

// ------------------------------------------------------------ Delver
// A worm as thick as a tree. Most of it stays under the island: a neck of ringed segments stands
// out of a mound of thrown earth, and it goes under altogether to come up where you are standing.
registerArchetype({
  id: 'delver', boundY: 0.85, boundR: 1.35, steps: 48,
  glsl: /* glsl */ `
float dSink, dLunge, dSway, dGape;
void entPose() {
  dSway = 0.14 * sin(uTime * 1.6 + eLook.x * 6.0) + 0.12 * sin(ePose.x) * ePose.w;
  dSink = 0.0; dLunge = 0.0; dGape = 0.25 + 0.1 * sin(uTime * 2.3 + eLook.x * 4.0);
  if (ePose.y > 0.5 && ePose.y < 1.5) { float k = sin(saturate(ePose.z) * PI); dLunge = k; dGape = mix(dGape, 1.0, smoothstep(0.0, 0.35, ePose.z) * (1.0 - smoothstep(0.5, 0.7, ePose.z))); }
  if (ePose.y > 2.5 && ePose.y < 3.5) dSink = 0.25 * (1.0 - ePose.z);
  if (ePose.y > 3.5) dSink = 1.75 * saturate(ePose.z);            // gone under
}
vec3 dSeg(float k) {                                              // the middle of the k-th segment up the neck (0 at the ground)
  float lean = 0.55 * dLunge + 0.1;
  return vec3(dSway * k * 0.6, 0.28 + 1.18 * k - 0.35 * dLunge * k * k - dSink, lean * k * k * 1.3 + 0.05);
}
float entMap(vec3 p, out float mat) {
  mat = 0.0;
  // the mound: a low ring of earth, there whether it is up or under
  float d = max(sdTorusY(p - vec3(0.0, 0.02, 0.0), 0.5, 0.2), -p.y);
  mat = 2.0;
  float neck = 1e3;
  for (int i = 0; i < 5; i++) {
    float k = float(i) / 4.0;
    neck = smin(neck, length(p - dSeg(k)) - mix(0.4, 0.3, k), 0.1);
  }
  neck = max(neck, -p.y - 0.02);
  if (neck < d) { d = neck; mat = 0.0; }
  // the mouth: three hooked jaws round a dark throat
  vec3 top = dSeg(1.0), up = normalize(dSeg(1.0) - dSeg(0.75));
  vec3 m = p - top - up * 0.2;
  float ang = atan(m.x, m.z), sec = TAU / 3.0;
  float a3 = mod(ang + sec * 0.5, sec) - sec * 0.5, rr = length(m.xz);
  vec3 j = vec3(sin(a3) * rr, m.y, cos(a3) * rr);
  float jaw = sdTaper(j, vec3(0.0, -0.05, 0.2), vec3(0.0, 0.3, 0.2 + 0.2 * dGape - 0.14), 0.08, 0.015);
  jaw = max(jaw, -(p.y + 0.0));
  if (jaw < d) { d = jaw; mat = 1.0; }
  return d * 0.85;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_BARK; s.cover = 0.7; s.ink = step(0.7, vnoise(p.xz * 9.0)) * 0.5; return; }       // thrown earth
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.9; return; }
  // ringed hide, paler down the front
  float h = p.y + dSink;
  float front = smoothstep(0.0, 0.25, p.z - 0.05 - 0.4 * h * h * (0.55 * dLunge + 0.1));
  s.albedo = eColA; s.cover = mix(0.84, 0.3, front); s.wrap = 0.3;
  s.ink = penLine((fract(h * 3.4) - 0.5) / 3.4) * 0.7;
  vec3 top = dSeg(1.0);
  if (length(p - top) < 0.33 && p.y > top.y + 0.12) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }      // the throat
}
`,
});

// ------------------------------------------------------------ Strider
// The other machine the old survey left: a pod on two long back-bent legs, taller than a hab,
// with a lance under its chin. It walks you down, plants its feet, and fires down a line.
registerArchetype({
  id: 'strider', boundY: 1.55, boundR: 1.95, steps: 52,
  glsl: /* glsl */ `
vec3 sPod, sFootL, sFootR; float sAim, sGlow;
void entPose() {
  float w = ePose.x, mv = ePose.w, s = sin(w), c = cos(w);
  float breath = sin(uTime * 1.4 + eLook.x * 6.0);
  sPod = vec3(0.05 * s * mv, 2.2 + abs(c) * 0.1 * mv + 0.03 * breath, 0.0);
  sFootL = vec3(-0.5, 0.1 + max(c, 0.0) * 0.5 * mv, s * 0.7 * mv);
  sFootR = vec3(0.5, 0.1 + max(-c, 0.0) * 0.5 * mv, -s * 0.7 * mv);
  sAim = 0.0; sGlow = 0.3;
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    // plants itself and dips its lance to the line; the lance lights as it charges
    float k = saturate(ePose.z), set = smoothstep(0.0, 0.3, k), rec = smoothstep(0.6, 1.0, k);
    sPod.y -= 0.35 * set * (1.0 - rec);
    sAim = 0.3 * set * (1.0 - rec);
    sGlow = mix(0.3, 1.0, smoothstep(0.05, 0.45, k) * (1.0 - rec));
    sPod.z -= 0.2 * smoothstep(0.45, 0.52, k) * (1.0 - rec);          // the kick as it fires
  }
  if (ePose.y > 2.5) sPod.z -= 0.15 * (1.0 - ePose.z);
}
float entMap(vec3 p, out float mat) {
  mat = 0.0;
  vec3 q = p - sPod;
  q.zy = rot2(sAim) * q.zy;
  float pod = sdRoundBox(q, vec3(0.46, 0.3, 0.56), 0.16);
  pod = smin(pod, sdEllipsoid(q - vec3(0.0, 0.24, -0.1), vec3(0.36, 0.2, 0.42)), 0.1);
  float d = pod;
  d = min(d, sdCapsule(q, vec3(-0.22, 0.4, -0.3), vec3(-0.28, 0.9, -0.42), 0.016));
  // legs: hip at the pod's side, the knee thrown back, a wide foot
  vec3 hipL = sPod + vec3(-0.5, -0.1, -0.05), hipR = sPod + vec3(0.5, -0.1, -0.05);
  vec3 kneeL = mix(hipL, sFootL, 0.45) + vec3(-0.08, 0.2, -0.55), kneeR = mix(hipR, sFootR, 0.45) + vec3(0.08, 0.2, -0.55);
  float legs = min(min(sdTaper(p, hipL, kneeL, 0.1, 0.075), sdTaper(p, kneeL, sFootL + vec3(0.0, 0.08, 0.0), 0.075, 0.055)),
                   min(sdTaper(p, hipR, kneeR, 0.1, 0.075), sdTaper(p, kneeR, sFootR + vec3(0.0, 0.08, 0.0), 0.075, 0.055)));
  legs = min(legs, min(length(p - kneeL), length(p - kneeR)) - 0.11);
  float feet = min(sdRoundBox(p - sFootL - vec3(0.0, -0.02, 0.08), vec3(0.16, 0.06, 0.26), 0.04), sdRoundBox(p - sFootR - vec3(0.0, -0.02, 0.08), vec3(0.16, 0.06, 0.26), 0.04));
  legs = min(legs, feet);
  if (legs < d) { d = legs; mat = 2.0; }
  // the lance: a barrel under the chin, its mouth the part that hurts
  float barrel = sdCapsule(q, vec3(0.0, -0.3, 0.2), vec3(0.0, -0.34, 0.95), 0.07);
  if (barrel < d) { d = barrel; mat = 2.0; }
  float mouth = length(q - vec3(0.0, -0.34, 1.0)) - 0.1;
  if (mouth < d) { d = mouth; mat = 1.0; }
  return d * 0.9;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_CHARCOAL; s.cover = 0.84; s.ink = penLine(fract(p.y * 5.0) - 0.5) * 0.3; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = mix(0.9, 0.2, sGlow); s.glow = sGlow; return; }
  vec3 q = p - sPod;
  q.zy = rot2(sAim) * q.zy;
  // the pod: pale plates, a band in the hide's pencil, and a dark slit to see by
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (abs(q.y + 0.08) < 0.07) { s.albedo = eColA; s.cover = 0.84; }
  s.ink = max(penLine(abs(q.y + 0.08) - 0.07), penLine(q.x) * step(0.1, q.y)) * 0.6;
  if (q.z > 0.3 && abs(q.y - 0.12) < 0.06 && abs(q.x) < 0.34) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0;
    if (abs(q.x - 0.12 * sin(uTime * 0.9 + eLook.x * 6.0)) < 0.045) { s.albedo = eColB; s.cover = 0.3; s.solid = 0.0; s.glow = 0.9; } }       // the light in it, looking about
}
`,
});

// ------------------------------------------------------------ Sparkmite
// A beetle the size of a helmet with a lit sac behind it. It runs at you, swells, and bursts.
registerArchetype({
  id: 'mite', boundY: 0.3, boundR: 0.66, steps: 40,
  glsl: /* glsl */ `
float mSwell, mBob;
void entPose() {
  mBob = abs(sin(ePose.x * 2.0)) * 0.03 * ePose.w + 0.01 * sin(uTime * 3.0 + eLook.x * 6.0);
  mSwell = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) mSwell = saturate(ePose.z) + 0.08 * sin(uTime * 40.0) * saturate(ePose.z);      // swelling, and shaking as it does
  if (ePose.y > 2.5) mBob -= 0.04 * (1.0 - ePose.z);
}
float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(0.0, mBob, 0.0);
  mat = 0.0;
  float shell = sdEllipsoid(q - vec3(0.0, 0.2, 0.08), vec3(0.2, 0.15, 0.22));
  float head = length(q - vec3(0.0, 0.17, 0.32)) - 0.1;
  float d = smin(shell, head, 0.05);
  vec3 a = vec3(abs(q.x), q.y, q.z);
  float sgn = q.x < 0.0 ? -1.0 : 1.0, legs = 1e3;
  for (int i = 0; i < 3; i++) {
    float z = -0.02 + 0.13 * float(i);
    float ph = sin(ePose.x * 2.0 + float(i) * 2.1 + sgn * 1.2) * ePose.w;
    legs = min(legs, sdTaper(a, vec3(0.16, 0.16, z), vec3(0.34, 0.0 + max(ph, 0.0) * 0.05 - mBob, z * 1.4 + ph * 0.05), 0.028, 0.012));
  }
  legs = min(legs, sdCapsule(a, vec3(0.05, 0.22, 0.38), vec3(0.12, 0.36, 0.5), 0.01));          // feelers
  d = min(d, legs);
  // the sac: what bursts
  float sac = length(q - vec3(0.0, 0.2 + 0.06 * mSwell, -0.2)) - (0.16 + 0.14 * mSwell);
  if (sac < d) { d = sac; mat = 1.0; }
  return d * 0.9;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(0.0, mBob, 0.0);
  if (mat > 0.5) { s.albedo = eColB; s.cover = mix(0.86, 0.2, mSwell); s.glow = 0.25 + 0.7 * mSwell; s.ink = penLine(fract(atan(q.x, q.y - 0.2) * 1.3) - 0.5) * 0.3 * (1.0 - mSwell); return; }
  s.albedo = eColA; s.cover = 0.86; s.wrap = 0.2;
  s.ink = max(penLine(q.x) * step(q.z, 0.25), penLine(q.z - 0.25)) * 0.6;                      // the split of its wing cases
  vec2 e = vec2(abs(q.x) - 0.05, q.y - 0.2);
  if (q.z > 0.36 && length(e) < 0.028) { s.albedo = eColB; s.cover = 0.3; s.glow = 0.8; s.ink = 0.0; }
}
`,
});
