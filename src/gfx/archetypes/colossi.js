// The elders: the three colossi that hold the last island of a hunt. Unlike the
// small creatures they are modelled at their true size (scale 1: a unit is a
// metre), so the stones, spots and seams drawn on them are the size the hero's
// own boots are, and they read as huge rather than as small things brought near.
//
// Actions they know (ePose.y), each taken from 0 to 1 by ePose.z:
//   1 strike   rears (to 0.4), brings the blow down (0.4 to 0.5), recovers
//   3 flinch   (the Tide Sentinel holds it at 0.2 to stay tucked in its shell)
//   4 emerge   comes up out of the island        5 roar   gives voice
//   6 fall     staggers, comes down, sinks back into the ground
// The last three are played by cinematics (content/cinematics.js) and by the rules when one dies.

import { registerArchetype } from '../passes/entities.js';

// A boulder: a ball cut by five planes. From far off the ball will do.
const SLAB = /* glsl */ `
const vec3 SLAB_N[5] = vec3[5](vec3(0.83, 0.52, 0.21), vec3(-0.61, 0.61, 0.51), vec3(0.1, 0.7, -0.71), vec3(-0.5, 0.31, -0.81), vec3(0.3, -0.9, 0.31));
float slab(vec3 c, float r, float seed) {
  float d = length(c) - r;
  if (d > r * 0.6) return d;
  for (int i = 0; i < 5; i++) d = max(d, dot(c, SLAB_N[i]) - r * (0.68 + 0.2 * fract(seed * (5.0 + float(i) * 2.7))));
  return d - 0.06 * r;
}
`;

// ------------------------------------------------------------ The Stone Warden
// Thirteen metres of stacked island stone: pillar legs, a barrel of a chest, a small head with one slit
// of light, fists the size of a shuttle. Crystal grows down its back; moss and scrub on its shoulders.
registerArchetype({
  id: 'warden', boundY: 7.0, boundR: 9.8, steps: 84,
  glsl: SLAB + /* glsl */ `
vec3 wHip, wChest, wHead, wShL, wShR, wFistL, wFistR, wFootL, wFootR;
float wSink, wEye;
void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float s = sin(w), c = cos(w);
  float breath = sin(uTime * 1.1 + eLook.x * 6.0);
  wSink = 0.0; wEye = 0.55 + 0.1 * breath;
  // a walk: the weight goes over the planted foot, the other swings through lifted
  wHip = vec3(0.5 * s * mv, 5.3 + abs(c) * 0.35 * mv + 0.07 * breath, 0.0);
  wChest = wHip + vec3(0.0, 3.3, 0.5 + 0.35 * mv);
  wHead = wChest + vec3(0.0, 2.95, 1.3);
  wFootL = vec3(-2.0, 0.85 + max(c, 0.0) * 1.3 * mv, s * 1.9 * mv);
  wFootR = vec3(2.0, 0.85 + max(-c, 0.0) * 1.3 * mv, -s * 1.9 * mv);
  wFistL = vec3(-5.0, 2.7 + 0.2 * breath, 0.7 - s * 1.7 * mv);
  wFistR = vec3(5.0, 2.7 - 0.2 * breath, 0.7 + s * 1.7 * mv);
  if (act > 0.5 && act < 1.5) {
    // both fists up over the head, a long moment, then down in front
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    vec3 t = mix(mix(wFistR, vec3(2.6, 14.0, 1.0), up), vec3(2.4, 1.8, 5.8), down);
    t = mix(t, wFistR, rec);
    wFistR = t; wFistL = t * vec3(-1.0, 1.0, 1.0);
    wChest.z += (-0.8 * up + 2.2 * down) * (1.0 - rec);
    wChest.y -= 1.0 * down * (1.0 - rec);
    wHead = wChest + vec3(0.0, 2.95, 1.3 + 0.7 * down * (1.0 - rec));
    wEye = mix(wEye, 1.0, up * (1.0 - rec));
  } else if (act > 2.5 && act < 3.5) {
    wChest.z -= 0.4 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    // out of the island fists first, then the head and shoulders, then all of it; the arms come down last
    wSink = (1.0 - smoothstep(0.05, 0.92, at)) * 15.5;
    float down = smoothstep(0.72, 1.0, at);
    wFistL = mix(vec3(-3.0, wChest.y + 6.2, 1.6), wFistL, down);
    wFistR = mix(vec3(3.0, wChest.y + 6.2, 1.6), wFistR, down);
    wChest.x += 0.1 * sin(uTime * 31.0) * (1.0 - down);
    wEye = mix(0.2, 1.0, smoothstep(0.5, 0.9, at));
  } else if (act > 4.5 && act < 5.5) {
    // arms thrown wide and back, chest out, head up, everything shaking
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    wFistL = mix(wFistL, vec3(-7.4, 8.8, -1.4), hold);
    wFistR = mix(wFistR, vec3(7.4, 8.8, -1.4), hold);
    wChest += vec3(0.12 * sin(uTime * 37.0) * hold, 0.5 * hold, 0.9 * hold);
    wHead = wChest + vec3(0.0, 3.2, 1.5);
    wEye = mix(wEye, 1.0, hold);
  } else if (act > 5.5) {
    // staggers back, the knees go, down on its face and into the ground
    float st = smoothstep(0.0, 0.25, at), dn = smoothstep(0.25, 0.75, at), go = smoothstep(0.68, 1.0, at);
    wHip.y -= 2.5 * dn;
    wChest = wHip + vec3(0.14 * sin(uTime * 23.0) * st * (1.0 - dn), 3.3 - 1.2 * dn, 0.5 - 1.3 * st + 4.2 * dn);
    wHead = wChest + vec3(0.0, 2.95 - 1.7 * dn, 1.3 + 1.8 * dn);
    wFistL = mix(wFistL, vec3(-6.0, 1.4, 3.0), dn);
    wFistR = mix(wFistR, vec3(6.0, 1.4, 3.0), dn);
    wSink = go * 10.5;
    wEye *= 1.0 - dn;
  }
  wShL = wChest + vec3(-3.9, 1.2, 0.0);
  wShR = wChest + vec3(3.9, 1.2, 0.0);
}
float entMap(vec3 p, out float mat) {
  p.y += wSink;
  float sd = eLook.x;
  mat = 0.0;
  float d = slab(p - wHip, 2.3, sd);
  vec3 hL = wHip + vec3(-1.6, -0.7, 0.0), hR = wHip + vec3(1.6, -0.7, 0.0);
  d = min(d, min(slab(p - mix(hL, wFootL, 0.28), 1.5, sd + 0.11), slab(p - mix(hR, wFootR, 0.28), 1.5, sd + 0.17)));
  d = min(d, min(slab(p - mix(hL, wFootL, 0.72), 1.35, sd + 0.23), slab(p - mix(hR, wFootR, 0.72), 1.35, sd + 0.29)));
  d = min(d, min(sdRoundBox(p - wFootL - vec3(0.0, -0.2, 0.5), vec3(1.5, 0.65, 2.0), 0.3), sdRoundBox(p - wFootR - vec3(0.0, -0.2, 0.5), vec3(1.5, 0.65, 2.0), 0.3)));
  d = min(d, slab(p - mix(wHip, wChest, 0.48), 2.5, sd + 0.37));
  d = min(d, slab(p - wChest, 3.5, sd + 0.31));
  d = min(d, min(slab(p - wShL, 2.0, sd + 0.41), slab(p - wShR, 2.0, sd + 0.47)));
  // arms: an upper stone and a forearm stone each, hanging between shoulder and fist
  d = min(d, min(slab(p - mix(wShL, wFistL, 0.36) - vec3(-0.5, 0.0, 0.0), 1.3, sd + 0.61), slab(p - mix(wShR, wFistR, 0.36) - vec3(0.5, 0.0, 0.0), 1.3, sd + 0.67)));
  d = min(d, min(slab(p - mix(wShL, wFistL, 0.7), 1.45, sd + 0.71), slab(p - mix(wShR, wFistR, 0.7), 1.45, sd + 0.79)));
  float head = slab(p - wHead, 1.3, sd + 0.53);
  if (head < d) { d = head; mat = 3.0; }
  float fists = min(slab(p - wFistL, 1.95, sd + 0.83), slab(p - wFistR, 1.95, sd + 0.89));
  if (fists < d) { d = fists; mat = 1.0; }
  // crystal down the back: three spikes leaning away
  vec3 b = p - wChest - vec3(0.0, 1.6, -2.4);
  b.zy = rot2(-0.5) * b.zy;
  float cr = min(sdConeUp(b, 0.9, 4.6), min(sdConeUp(b - vec3(-1.6, -0.6, 0.2), 0.7, 3.2), sdConeUp(b - vec3(1.5, -0.9, 0.1), 0.65, 2.8)));
  if (cr < d) { d = cr; mat = 2.0; }
  return d * 0.9;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  p.y += wSink;
  // stone: blocks the size of a doorway, their seams in pen, and the bedding of the rock across them
  vec2 pv = pavers(p.xy * 0.6 + p.z * 0.41 + eLook.x * 20.0);
  s.albedo = eColA; s.cover = mix(0.52, 0.84, pv.y);
  s.ink = max(penLine(0.5 * pv.x / 0.6) * 0.8, penLine((fract(p.y * 0.5 + 0.35 * vnoise(p.xz * 0.5)) - 0.5) / 0.5) * 0.3);
  if (mat > 2.5) {
    // the head: one slit of light
    vec3 f = p - wHead;
    if (f.z > 0.2 && abs(f.y - 0.1) < 0.17 && abs(f.x) < 0.85) { s.albedo = eColB; s.cover = 0.9 - 0.8 * wEye; s.glow = wEye; s.ink = 0.0; }
    else s.ink = max(s.ink, penLine(abs(f.y - 0.1) - 0.24) * step(0.2, f.z) * step(abs(f.x), 0.95) * 0.7);
  } else if (mat > 1.5) {
    // crystal: paper faces, a pencil in the hollows
    float facet = vnoise(vec2(atan(p.x - wChest.x, p.z - wChest.z) * 3.0, p.y * 0.8));
    s.albedo = eColC; s.cover = mix(0.25, 0.86, step(0.5, facet)); s.glow = 0.25; s.ink = 0.0;
  } else if (mat > 0.5) {
    s.albedo = eColB; s.cover = mix(0.72, 0.94, pv.y);                    // the fists: the part that hurts
  } else {
    // moss and scrub on the shoulders and the top of the chest
    float high = max(max(p.y - wShL.y, p.y - wShR.y) - 0.9, p.y - wChest.y - 2.6);
    if (high > 0.0 && vnoise(p.xz * 1.1 + eLook.x * 9.0) > 0.42) { s.albedo = P_SAGE; s.cover = 0.84; s.ink = step(0.7, vnoise(p.xz * 6.0)) * 0.5; }
  }
}
`,
});

// ------------------------------------------------------------ The Spore Matron
// A fungus the height of the hall's spire: a stalk on a skirt of roots, a cap eleven metres across with
// smaller caps growing on it, sacs of spore hanging under the rim, two long arms that end in clubs.
registerArchetype({
  id: 'matron', boundY: 6.6, boundR: 9.6, steps: 84,
  glsl: /* glsl */ `
float mSink, mLean, mTilt, mOpen, mBob, mAnger;
vec3 mHandL, mHandR;
void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float breath = sin(uTime * 1.3 + eLook.x * 6.0);
  mSink = 0.0; mLean = 0.03 * breath; mOpen = 1.0; mAnger = 0.0;
  mTilt = sin(w) * 0.07 * mv;                                  // it waddles
  mBob = abs(cos(w)) * 0.3 * mv + 0.12 * breath;
  mHandL = vec3(-4.7, 3.0 + 0.25 * breath, 1.0 - sin(w) * 1.1 * mv);
  mHandR = vec3(4.7, 3.0 - 0.25 * breath, 1.0 + sin(w) * 1.1 * mv);
  if (act > 0.5 && act < 1.5) {
    // rears back, then brings the clubs and the whole cap down
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    mLean = (-0.2 * up + 0.5 * down) * (1.0 - rec);
    vec3 t = mix(mix(mHandR, vec3(4.2, 9.2, 0.4), up), vec3(3.0, 1.4, 5.4), down);
    t = mix(t, mHandR, rec);
    mHandR = t; mHandL = t * vec3(-1.0, 1.0, 1.0);
    mAnger = up * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    mLean = -0.1 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    // grows up out of the ground with its cap furled, and opens it
    mSink = (1.0 - smoothstep(0.05, 0.85, at)) * 13.5;
    mOpen = mix(0.32, 1.0, smoothstep(0.5, 1.0, at));
    float down = smoothstep(0.6, 1.0, at);
    mHandL = mix(vec3(-1.9, 7.0, 0.8), mHandL, down);
    mHandR = mix(vec3(1.9, 7.0, 0.8), mHandR, down);
  } else if (act > 4.5 && act < 5.5) {
    // throws its cap back and its arms wide
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    mLean = -0.26 * hold; mAnger = hold;
    mTilt += 0.03 * sin(uTime * 34.0) * hold;
    mHandL = mix(mHandL, vec3(-7.0, 7.6, -0.4), hold);
    mHandR = mix(mHandR, vec3(7.0, 7.6, -0.4), hold);
  } else if (act > 5.5) {
    // sways, folds its cap, and comes down forward
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    mTilt += 0.1 * sin(uTime * 9.0) * st * (1.0 - dn);
    mLean = -0.14 * st + 1.2 * dn;
    mOpen = 1.0 - 0.5 * dn;
    mSink = go * 8.5;
    mHandL = mix(mHandL, vec3(-3.6, 1.0, 2.6), dn);
    mHandR = mix(mHandR, vec3(3.6, 1.0, 2.6), dn);
  }
}
// into the body's own frame: it bobs and bends more the higher up it is, the root stays put
vec3 mLocal(vec3 p) {
  p.y += mSink;
  float h = smoothstep(0.4, 8.0, p.y);
  p.y -= mBob * h;
  p.xy = rot2(mTilt * h) * p.xy;
  p.zy = rot2(mLean * h) * p.zy;
  return p;
}
float entMap(vec3 p, out float mat) {
  vec3 q = mLocal(p);
  mat = 0.0;
  // the stalk on its skirt of roots
  float d = sdTaper(q, vec3(0.0, 1.0, 0.0), vec3(0.0, 7.6, 0.0), 2.5, 1.5);
  d = smin(d, sdEllipsoid(q - vec3(0.0, 0.5, 0.0), vec3(3.5, 0.9, 3.5)), 0.8);
  float sec = TAU / 6.0, ang = mod(atan(q.x, q.z) + eLook.x * 6.0 + sec * 0.5, sec) - sec * 0.5, rr = length(q.xz);
  d = smin(d, sdTaper(vec3(sin(ang) * rr, q.y, cos(ang) * rr), vec3(0.0, 0.9, 2.4), vec3(0.0, 0.12, 5.0), 0.75, 0.2), 0.5);
  // arms
  float arms = min(sdTaper(q, vec3(-1.5, 6.3, 0.3), mHandL, 0.62, 0.42), sdTaper(q, vec3(1.5, 6.3, 0.3), mHandR, 0.62, 0.42));
  d = smin(d, arms, 0.3);
  // the cap: a dome cut flat underneath, a thick rim; three small caps grow on it
  vec3 c = q - vec3(0.0, 8.1, 0.0);
  c.xz /= mOpen; c.y -= (1.0 - mOpen) * 1.4;
  float cap = max(sdEllipsoid(c, vec3(5.8, 3.0, 5.8)), -c.y - 0.3);
  cap = smin(cap, sdTorusY(c, 5.45, 0.55), 0.4);
  vec3 k1 = c - vec3(2.4, 2.75, -0.9), k2 = c - vec3(-2.9, 2.2, 0.8), k3 = c - vec3(-0.4, 3.1, -2.6);
  float small = min(min(max(sdEllipsoid(k1, vec3(1.2, 0.8, 1.2)), -k1.y), max(sdEllipsoid(k2, vec3(0.95, 0.65, 0.95)), -k2.y)), max(sdEllipsoid(k3, vec3(0.8, 0.55, 0.8)), -k3.y));
  small = min(small, min(sdCapsule(k1, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.3), min(sdCapsule(k2, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.25), sdCapsule(k3, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.22))));
  cap = min(cap, small) * min(mOpen, 0.85);
  if (cap < d) { d = cap; mat = 1.0; }
  // sacs of spore under the rim, eight of them, each on a thread; and the clubs
  float sec8 = TAU / 8.0, a8 = mod(atan(c.x, c.z) + sec8 * 0.5, sec8) - sec8 * 0.5, r8 = length(c.xz);
  vec3 sq = vec3(sin(a8) * r8, c.y, cos(a8) * r8);
  float swing = 0.25 * sin(uTime * 2.1 + floor((atan(c.x, c.z) + PI) / sec8) * 1.7) + mAnger * 0.25 * sin(uTime * 30.0);
  float sac = length(sq - vec3(swing, -1.75, 4.5)) - 0.62;
  sac = min(sac, sdCapsule(sq, vec3(0.0, -0.4, 4.7), vec3(swing, -1.3, 4.5), 0.07)) * min(mOpen, 0.85);
  float clubs = min(length(q - mHandL), length(q - mHandR)) - 1.2;
  float hurt = min(sac, clubs);
  if (hurt < d) { d = hurt; mat = 2.0; }
  return d * 0.8;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = mLocal(p);
  vec3 c = q - vec3(0.0, 8.1, 0.0);
  c.xz /= mOpen; c.y -= (1.0 - mOpen) * 1.4;
  if (mat > 1.5) {
    // clubs and sacs: the part that hurts, freckled
    s.albedo = eColB; s.cover = 0.88;
    s.ink = step(0.84, vnoise(q.xz * 5.0 + q.y * 3.0)) * 0.6;
    return;
  }
  if (mat > 0.5) {
    if (c.y < -0.05 && length(c.xz) < 5.3) {
      // under the cap: gills
      s.albedo = P_TAN; s.cover = 0.45;
      s.ink = smoothstep(0.22, 0.0, abs(fract(atan(c.z, c.x) * 9.0) - 0.5)) * 0.5;
      return;
    }
    // on top: its own red with spots left as paper, each ringed in pen; the rim in mustard
    vec2 v = voronoi(c.xz * 0.5 + eLook.x * 20.0);
    float spot = smoothstep(0.3, 0.24, v.x) * step(0.35, v.y);
    float rim = step(c.y, 0.5) * step(5.0, length(c.xz));
    s.albedo = mix(eColA, eColB, rim);
    s.cover = mix(0.86, 0.04, spot * (1.0 - rim));
    s.ink = penLine((v.x - 0.27) / 0.5) * step(0.35, v.y) * (1.0 - rim) * 0.6;
    return;
  }
  // the stalk: pale, fibres drawn down it, darker toward the roots; and a face
  s.albedo = mix(eColC, P_TAN, smoothstep(2.4, 0.4, q.y)); s.cover = mix(0.26, 0.62, smoothstep(2.4, 0.4, q.y)); s.wrap = 0.3;
  s.ink = step(0.62, vnoise(vec2(atan(q.x, q.z) * 9.0, q.y * 0.35))) * 0.3 * smoothstep(7.4, 6.0, q.y);
  vec3 f = q - vec3(0.0, 5.3, 0.0);
  if (f.z > 0.6 && abs(f.y) < 1.4 && abs(f.x) < 1.7) {
    float blink = step(0.97, fract(uTime * 0.17 + eLook.x));
    float side = f.x < 0.0 ? -1.0 : 1.0;
    vec2 e = vec2(f.x - side * 0.72, f.y - 0.1);
    vec2 sz = vec2(0.3, mix(0.44, 0.05, blink));
    float eye = smoothstep(1.0, 0.9, length(e / sz));
    eye *= step(e.y, 0.2 + (abs(f.x) - 0.72) * (0.5 + 0.5 * mAnger));      // a heavy lid that slants in toward the middle
    float glint = smoothstep(0.1, 0.07, length(e - vec2(-0.1, 0.12))) * (1.0 - blink);
    float brow = penLine(e.y - 0.5 + (abs(f.x) - 0.72) * (0.5 + 0.5 * mAnger)) * step(abs(e.x), 0.5);
    float mouth = penLine(f.y + 0.75 - 0.12 * abs(sin(f.x * 6.0))) * step(abs(f.x), 0.62);
    s.ink = max(s.ink, max(brow, mouth));
    if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0 - glint; s.solid = 1.0; s.ink = 0.0; }
  }
}
`,
});

// ------------------------------------------------------------ The Tide Sentinel
// A crab the size of the contract hall: a domed shell with barnacle towers on it, six legs like bridge
// piers, two claws that could close on a shuttle, eyes on stalks. It tucks down into its shell to guard.
registerArchetype({
  id: 'sentinel', boundY: 4.6, boundR: 10.2, steps: 84,
  glsl: /* glsl */ `
float tSink, tDrop, tRear, tSnap, tTuck, tWide, tSway, tBob;
void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  tSink = 0.0; tDrop = 0.0; tRear = 0.0; tSnap = 0.0; tTuck = 0.0; tWide = 0.0;
  tSway = sin(w * 2.0) * 0.18 * mv;
  tBob = 0.1 * sin(uTime * 1.2 + eLook.x * 6.0) + abs(sin(w * 2.0)) * 0.15 * mv;
  if (act > 0.5 && act < 1.5) {
    // rears, and both claws come over and shut
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    tRear = 0.22 * up * (1.0 - down);
    tWide = up * (1.0 - down);
    tSnap = down * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    tTuck = 1.0 - smoothstep(0.25, 1.0, at);
  } else if (act > 3.5 && act < 4.5) {
    // climbs up out of the island, front first
    tSink = (1.0 - smoothstep(0.05, 0.85, at)) * 11.0;
    tRear = 0.4 * sin(at * PI);
    tWide = sin(at * PI);
  } else if (act > 4.5 && act < 5.5) {
    // rears with its claws up and open
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    tRear = 0.42 * hold; tWide = hold;
    tSway += 0.06 * sin(uTime * 33.0) * hold;
  } else if (act > 5.5) {
    // the legs splay, the shell comes down flat, and it goes under
    float st = smoothstep(0.0, 0.25, at), dn = smoothstep(0.25, 0.7, at), go = smoothstep(0.66, 1.0, at);
    tSway += 0.2 * sin(uTime * 17.0) * st * (1.0 - dn);
    tDrop = 2.7 * dn; tRear = 0.2 * st * (1.0 - dn) - 0.12 * dn;
    tSink = go * 7.0;
  }
}
// the shell's own frame: lowered when it tucks or falls, tipped up at the front when it rears
vec3 tBody(vec3 p) {
  p.y += tSink;
  vec3 q = p - vec3(tSway, tBob - tTuck * 2.1 - tDrop, 0.0);
  q.zy = rot2(-tRear) * (q.zy - vec2(-3.4, 3.2)) + vec2(-3.4, 3.2);
  return q;
}
float entMap(vec3 p, out float mat) {
  vec3 q = tBody(p);
  p.y += tSink;
  float low = tTuck * 2.1 + tDrop;
  mat = 0.0;
  vec3 sc = q - vec3(0.0, 4.4, -0.2);
  float shell = max(sdEllipsoid(sc, vec3(5.4, 3.3, 4.6)), -sc.y - 0.9);
  shell = smin(shell, sdTorusY(sc * vec3(1.0, 1.0, 1.17) + vec3(0.0, 0.85, 0.0), 5.0, 0.42), 0.3);        // the shell's lip
  float belly = sdEllipsoid(q - vec3(0.0, 3.4, 0.0), vec3(4.7, 1.3, 3.9));
  float d = min(shell, belly);
  mat = shell < belly ? 0.0 : 2.0;
  // barnacle towers on the shell
  vec3 t1 = sc - vec3(-1.9, 2.3, -0.7), t2 = sc - vec3(1.6, 2.5, -1.5), t3 = sc - vec3(0.4, 2.7, 1.3);
  float tw = min(min(max(sdConeUp(t1, 1.35, 4.2), t1.y - 2.7), max(sdConeUp(t2, 1.05, 3.2), t2.y - 2.0)), max(sdConeUp(t3, 0.85, 2.4), t3.y - 1.45));
  if (tw < d) { d = tw; mat = 4.0; }
  // legs: three a side, the same both sides; alternate legs step
  vec3 a = vec3(abs(p.x), p.y, p.z);
  float sgn = p.x < 0.0 ? -1.0 : 1.0, legs = 1e3;
  for (int i = 0; i < 3; i++) {
    float z = -3.0 + 2.7 * float(i);
    float ph = sin(ePose.x * 2.0 + float(i) * 2.1 + sgn * 1.2) * ePose.w;
    vec3 root = vec3(4.0, 3.5 - low + tBob, z * 0.9);
    vec3 knee = vec3(6.7 - tTuck * 1.0 + tDrop * 0.5, 5.7 - low * 0.75 + max(ph, 0.0) * 0.5, z * 1.35);
    vec3 tip = vec3(8.1 - tTuck * 1.9 + tDrop * 0.9, 0.12 + max(ph, 0.0) * 0.95, z * 1.7 + ph * 0.8);
    legs = min(legs, min(sdTaper(a, root, knee, 0.64, 0.52), sdTaper(a, knee, tip, 0.52, 0.15)));
  }
  if (legs < d) { d = legs; mat = 2.0; }
  // claws: an arm each, and a pincer that gapes
  vec3 qa = vec3(abs(q.x), q.y, q.z);
  vec3 cl = vec3(4.9, 3.5, 5.6);
  cl = mix(cl, vec3(6.3, 8.2, 4.6), tWide);                 // up and wide
  cl = mix(cl, vec3(2.6, 2.6, 7.6), tSnap);                 // over and shut, in front
  cl = mix(cl, vec3(2.9, 2.5, 4.4), tTuck);                 // folded in across the face
  float gape = 0.25 + 0.75 * tWide - 0.2 * tSnap;
  vec3 cq = qa - cl;
  float claw = sdEllipsoid(cq, vec3(1.75, 1.5, 2.4));
  claw = max(claw, -sdBox(cq - vec3(0.0, 0.1, 1.7), vec3(2.6, 0.1 + 0.5 * gape, 1.7)));
  claw = min(claw, sdTaper(qa, vec3(3.3, 3.6, 3.0), cl - vec3(0.0, 0.0, 1.6), 0.72, 0.62));
  if (claw < d) { d = claw; mat = 1.0; }
  // eyes on stalks; they draw in when it tucks
  vec3 eyeAt = vec3(1.25, 7.5 - 1.9 * tTuck, 4.2);
  float stalk = sdCapsule(qa, vec3(1.0, 5.4, 3.5), eyeAt, 0.2);
  float eye = length(qa - eyeAt) - 0.62;
  if (stalk < d) { d = stalk; mat = 2.0; }
  if (eye < d) { d = eye; mat = 3.0; }
  return d * 0.82;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = tBody(p);
  if (mat > 3.5) {
    // barnacle: stone, ringed
    s.albedo = P_STONE; s.cover = 0.62;
    s.ink = penLine((fract(q.y * 1.3) - 0.5) / 1.3) * 0.5;
    return;
  }
  if (mat > 2.5) {
    // eyeballs: paper, a black pupil that looks forward
    s.albedo = P_CREAM; s.cover = 0.06;
    vec3 e = vec3(abs(q.x), q.y, q.z) - vec3(1.25, 7.5 - 1.9 * tTuck, 4.2);
    if (length(e.xy - vec2(0.0, 0.03)) < 0.34 && e.z > 0.0) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; }
    return;
  }
  if (mat > 1.5) {
    // legs and underside: tan, a joint drawn every so often
    s.albedo = eColC; s.cover = 0.72;
    s.ink = penLine((fract(length(vec2(abs(p.x), p.y + tSink)) * 0.6) - 0.5) / 0.6) * 0.45;
    return;
  }
  if (mat > 0.5) {
    // claws: the part that hurts, toothed along the gap
    s.albedo = eColB; s.cover = 0.88;
    s.ink = step(0.8, vnoise(q.xy * 2.2 + q.z * 1.3)) * 0.5;
    return;
  }
  // the shell: its own red, growth rings in pen, pale freckles, plates along the lip
  vec3 sc = q - vec3(0.0, 4.4, -0.2);
  float r = length(sc.xz / vec2(5.4, 4.6));
  vec2 v = voronoi(sc.xz * 0.7 + eLook.x * 20.0);
  float freckle = smoothstep(0.2, 0.14, v.x) * step(0.5, v.y);
  s.albedo = eColA;
  s.cover = mix(mix(0.78, 0.93, smoothstep(0.5, 1.0, r)), 0.04, freckle);
  s.ink = penLine((abs(fract(r * 3.5) - 0.5)) / 3.5 * 5.0) * 0.6;
  if (sc.y < -0.45) s.ink = max(s.ink, penLine((fract(atan(sc.x, sc.z) * 3.0) - 0.5) / 3.0 * 5.0) * 0.6);
}
`,
});
