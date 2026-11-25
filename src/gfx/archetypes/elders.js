// Two more elders, modelled at their true size like the three in colossi.js and
// knowing the same actions (ePose.y, taken from 0 to 1 by ePose.z):
//   1 strike   3 flinch   4 emerge   5 roar   6 fall
// Pencils: A what it is made of, B the one mustard part that hurts, C its pale part and its lights.

import { registerArchetype } from '../passes/entities.js';

// ------------------------------------------------------------ The Lantern Keeper
// Eleven metres of cloak and cowl that walks the Underhalls with a staff: a bone mask in the dark of its
// hood, one slit of light in the mask, and on a crook at the staff's head a lantern the size of a supply
// pod. The lantern is what hurts, and it is the only light the keeper needs.
registerArchetype({
  id: 'keeper', boundY: 6.3, boundR: 9.8, steps: 84,
  glsl: /* glsl */ `
vec3 kHandL, kHandR, kFoot, kTop, kCrook, kLamp;
float kSink, kLean, kSway, kBob, kLight;
void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float breath = sin(uTime * 1.0 + eLook.x * 6.0);
  kSink = 0.0; kLean = 0.02 * breath; kLight = 0.78 + 0.12 * sin(uTime * 2.3);
  kSway = sin(w) * 0.06 * mv;                         // it walks without haste, the cloak swinging from side to side
  kBob = abs(cos(w)) * 0.25 * mv + 0.08 * breath;
  kHandL = vec3(-3.3, 5.2 + 0.2 * breath, 0.9 - sin(w) * 0.9 * mv);
  kHandR = vec3(3.5, 6.3 - 0.15 * breath, 1.3 + sin(w) * 0.5 * mv);
  vec3 idle = normalize(vec3(-0.08, 1.0, 0.1)), up = idle;                            // the way the staff stands
  float swing = 0.28 * sin(uTime * 1.3 + eLook.x * 9.0) + 0.45 * sin(w) * mv;          // the lantern on its chain
  if (act > 0.5 && act < 1.5) {
    // lifts the staff high, a long moment, and brings the lantern down in front
    float hi = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    vec3 t = mix(mix(kHandR, vec3(2.6, 9.6, 0.4), hi), vec3(1.4, 3.0, 3.4), down);
    kHandR = mix(t, kHandR, rec);
    up = normalize(mix(mix(mix(idle, vec3(0.0, 1.0, -0.25), hi), vec3(0.0, -0.05, 1.0), down), idle, rec));
    kLean = (-0.12 * hi + 0.4 * down) * (1.0 - rec);
    kLight = mix(kLight, 1.0, hi * (1.0 - rec));
    swing *= 1.0 - down * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    kLean = -0.1 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    // comes up through the floor of its hall with the lantern dark, and lights it when it stands
    kSink = (1.0 - smoothstep(0.05, 0.88, at)) * 13.5;
    kLight = smoothstep(0.7, 1.0, at);
  } else if (act > 4.5 && act < 5.5) {
    // the lantern held out and up, the other hand flung wide: everything shakes, the light at its fullest
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    kHandR = mix(kHandR, vec3(4.4, 8.4, 1.6), hold);
    kHandL = mix(kHandL, vec3(-5.6, 7.4, 0.6), hold);
    kLean = -0.14 * hold;
    kSway += 0.02 * sin(uTime * 36.0) * hold;
    kLight = mix(kLight, 1.0, hold);
  } else if (act > 5.5) {
    // the light gutters; it folds forward over its staff and goes down into the floor
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    kLight *= (1.0 - st * (0.5 + 0.5 * step(0.5, fract(uTime * 7.0)))) * (1.0 - dn);
    kLean = -0.1 * st + 0.9 * dn;
    kSway += 0.07 * sin(uTime * 8.0) * st * (1.0 - dn);
    kSink = go * 9.5;
    kHandL = mix(kHandL, vec3(-2.6, 1.6, 2.4), dn);
  }
  kFoot = kHandR - up * 5.7;
  kTop = kHandR + up * 5.0;
  kCrook = kTop + vec3(-0.1, 0.3, 1.5);
  kLamp = kCrook + vec3(sin(swing) * 1.9, -cos(swing) * 1.9, 0.0);
}
// into the keeper's own frame: it bends and sways more the higher up it is, its hem stays on the floor
vec3 kLocal(vec3 p) {
  p.y += kSink;
  float h = smoothstep(0.3, 9.0, p.y);
  p.y -= kBob * h;
  p.xy = rot2(kSway * h) * p.xy;
  p.zy = rot2(kLean * h) * p.zy;
  return p;
}
float entMap(vec3 p, out float mat) {
  vec3 q = kLocal(p);
  mat = 0.0;
  // the cloak: a bell from the shoulders to the floor in deep folds, a mantle over the shoulders
  float fold = 0.12 * cos(atan(q.x, q.z) * 9.0 + 1.5 * sin(q.y * 0.5)) * smoothstep(8.0, 1.0, q.y);
  float d = max(sdTaper(q, vec3(0.0, 0.3, 0.0), vec3(0.0, 8.0, 0.0), 3.1, 1.7) + fold, -q.y);        // (cut square at the hem: it stands on a floor, or on nothing)
  d = smin(d, sdEllipsoid(q - vec3(0.0, 8.2, 0.0), vec3(3.2, 1.1, 1.9)), 0.6);
  // arms in wide sleeves
  float arms = min(sdTaper(q, vec3(-2.7, 8.3, 0.2), kHandL, 0.85, 0.75), sdTaper(q, vec3(2.7, 8.3, 0.2), kHandR, 0.85, 0.75));
  d = smin(d, arms, 0.35);
  // the hood: a deep cowl open at the front, its point falling behind
  vec3 hp = q - vec3(0.0, 9.9, 0.25);
  float hood = max(length(hp) - 1.55, -(length(hp - vec3(0.0, -0.1, 0.9)) - 1.12));
  hood = smin(hood, sdTaper(hp, vec3(0.0, 0.9, -0.7), vec3(0.0, 0.2, -2.2), 0.7, 0.15), 0.4);
  d = smin(d, hood, 0.3);
  float mask = sdEllipsoid(hp - vec3(0.0, -0.15, 0.5), vec3(0.8, 0.98, 0.55));
  if (mask < d) { d = mask; mat = 1.0; }
  float hands = min(length(q - kHandL), length(q - kHandR)) - 0.95;
  if (hands < d) { d = hands; mat = 2.0; }
  // the staff, its crook, the chain; the lantern's cage: a cap, a foot, four bars
  vec3 l = q - kLamp;
  float iron = min(sdCapsule(q, kFoot, kTop, 0.2), sdCapsule(q, kTop, kCrook, 0.17));
  iron = min(iron, sdCapsule(q, kCrook, kLamp + vec3(0.0, 0.95, 0.0), 0.06));
  iron = min(iron, min(sdRoundBox(l - vec3(0.0, 0.85, 0.0), vec3(0.62, 0.12, 0.62), 0.08), sdRoundBox(l + vec3(0.0, 0.85, 0.0), vec3(0.55, 0.1, 0.55), 0.08)));
  iron = min(iron, sdCapsule(vec3(abs(l.x) - 0.62, l.y, abs(l.z) - 0.62), vec3(0.0, -0.8, 0.0), vec3(0.0, 0.8, 0.0), 0.07));
  if (iron < d) { d = iron; mat = 3.0; }
  float ball = length(l) - 0.72;
  if (ball < d) { d = ball; mat = 4.0; }
  return d * 0.8;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = kLocal(p);
  vec3 hp = q - vec3(0.0, 9.9, 0.25);
  if (mat > 3.5) { s.albedo = eColB; s.cover = mix(0.9, 0.1, kLight); s.glow = kLight; return; }          // the lantern: the part that hurts
  if (mat > 2.5) {
    // iron: staff and cage, the staff bound with rings
    s.albedo = P_CHARCOAL; s.cover = 0.88;
    s.ink = penLine((fract(q.y * 0.8) - 0.5) / 0.8) * 0.4;
    return;
  }
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.34; s.wrap = 0.3; s.ink = step(0.7, vnoise(q.xy * 3.0)) * 0.3; return; }      // gauntlets
  if (mat > 0.5) {
    // the mask: bone, one upright slit of light, a line across the brow
    s.albedo = P_CREAM; s.cover = 0.1; s.wrap = 0.3;
    s.ink = penLine(hp.y - 0.42) * step(abs(hp.x), 0.5) * 0.6;
    if (abs(hp.x) < 0.085 && abs(hp.y + 0.2) < 0.5) { s.albedo = eColB; s.cover = mix(0.9, 0.15, kLight); s.glow = kLight; s.ink = 0.0; }
    return;
  }
  // the cloak: one dark pencil, the folds drawn down it, a pale band with a key pattern at the hem
  s.albedo = eColA; s.cover = 0.88;
  float ang = atan(q.x, q.z);
  s.ink = penLine((abs(fract(ang * 9.0 / TAU + 0.24 * sin(q.y * 0.5)) - 0.5) - 0.22) * 2.0) * 0.45 * smoothstep(8.0, 5.5, q.y);
  if (q.y < 1.25 && length(hp) > 2.0) {
    s.albedo = eColC; s.cover = 0.3;
    float key = step(0.5, fract(ang * 22.0 / TAU)) * step(0.45, q.y) * step(q.y, 0.9);
    if (key > 0.5) { s.albedo = eColA; s.cover = 0.86; }
    s.ink = max(penLine(q.y - 1.25), penLine(q.y - 0.32)) * 0.7;
  }
  // the dark inside the hood
  if (hp.z > 0.25 && length(hp - vec3(0.0, -0.1, 0.9)) < 1.2) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
}
`,
});

// ------------------------------------------------------------ The Star Drifter
// Nineteen metres from wingtip to wingtip and nothing under it: a ray of slate plate that swims the dark
// between the shards of the Shatter, pale beneath, a light in its back and one at the end of a long tail.
// Five shards of mustard crystal go round it the way moons do. They are what it throws.
registerArchetype({
  id: 'drifter', boundY: 5.0, boundR: 11.2, steps: 84,
  glsl: /* glsl */ `
float dRise, dFlap, dPitch, dRoll, dSpin, dWide, dCore, dBob, dDrop;
void entPose() {
  float act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float beat = sin(uTime * 0.9 + eLook.x * 6.0);
  dRise = 0.0; dRoll = 0.0; dDrop = 0.0;
  dPitch = 0.07 * mv;
  dBob = 0.35 * sin(uTime * 0.6 + eLook.x * 3.0);
  dFlap = 0.16 * beat + 0.08 * mv * sin(uTime * 2.2);          // the wings beat slowly, a little faster when it travels
  dSpin = uTime * 0.45; dWide = 6.6; dCore = 0.62 + 0.15 * beat;
  if (act > 0.5 && act < 1.5) {
    // rears with its wings up, and comes down on its face: everything under it is struck
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    dPitch = (-0.5 * up + 1.25 * down) * (1.0 - rec);
    dFlap = mix(dFlap, 0.55, up * (1.0 - down));
    dRise = (1.6 * up - 4.2 * down) * (1.0 - rec);
    dCore = mix(dCore, 1.0, up * (1.0 - rec));
  } else if (act > 2.5 && act < 3.5) {
    dPitch = -0.15 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    // comes up through the dust like something breaching, wings folded, and opens them over its ground
    dRise = -(1.0 - smoothstep(0.05, 0.85, at)) * 16.0;
    dFlap = mix(0.8, dFlap, smoothstep(0.55, 1.0, at));
    dWide = mix(2.4, 6.6, smoothstep(0.6, 1.0, at));
    dPitch = -0.5 * (1.0 - smoothstep(0.3, 0.9, at));
    dCore = smoothstep(0.5, 0.9, at);
  } else if (act > 4.5 && act < 5.5) {
    // wings flat and wide, its shards flung out and round, its light at its fullest
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    dFlap = mix(dFlap, -0.1, hold);
    dWide = 6.6 + 2.8 * hold; dSpin += 5.0 * at;
    dPitch = -0.22 * hold; dRoll = 0.04 * sin(uTime * 33.0) * hold;
    dCore = mix(dCore, 1.0, hold);
  } else if (act > 5.5) {
    // lists, its shards fall out of the air one after another, and it goes down through the dust
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    dRoll = 0.5 * st + 0.3 * dn;
    dPitch = 0.4 * dn;
    dFlap = mix(dFlap, 0.5, dn);
    dRise = -3.2 * dn - 10.0 * go;
    dDrop = at;
    dCore *= 1.0 - dn;
  }
}
// into the drifter's own frame: it hangs four and a half metres up, and rolls and noses over as a whole
vec3 dLocal(vec3 p) {
  p.y -= 4.6 + dBob + dRise;
  p.xy = rot2(dRoll) * p.xy;
  p.zy = rot2(dPitch) * p.zy;
  return p;
}
float entMap(vec3 p, out float mat) {
  vec3 q = dLocal(p);
  mat = 0.0;
  // the body, deepest at the shoulders; wings: wide flat blades swept back, lifted or let fall by the beat
  float out_ = max(abs(q.x) - 1.6, 0.0);
  float d = sdEllipsoid(q - vec3(0.0, 0.0, 0.3), vec3(2.3, 1.15, 3.9));
  vec3 w = vec3(abs(q.x), q.y - out_ * dFlap, q.z + 0.3 * out_);
  d = smin(d, sdEllipsoid(w - vec3(4.8, 0.0, -0.4), vec3(4.9, 0.32, 2.5)), 0.7);
  d = smin(d, sdTaper(w, vec3(0.9, 0.0, 3.3), vec3(1.5, -0.35, 5.0), 0.5, 0.16), 0.4);            // two lobes at the head
  // the tail: long and thin, a slow wave down it, a light at its end
  float wave = 0.5 * sin(uTime * 1.1 + eLook.x * 5.0);
  vec3 t1 = vec3(0.0, -0.1, -3.4), t2 = vec3(wave * 0.6, -0.3, -6.6), t3 = vec3(-wave, -0.2 + 1.2 * dFlap, -9.8);
  d = smin(d, min(sdTaper(q, t1, t2, 0.55, 0.26), sdTaper(q, t2, t3, 0.26, 0.1)), 0.4);
  float lights = min(length(q - t3) - 0.42, length(q - vec3(0.0, 0.95, 0.6)) - 0.75);
  if (lights < d) { d = lights; mat = 3.0; }
  // its shards, five, going round it level whatever way it leans; when it dies they come down one by one
  vec3 o = p - vec3(0.0, 4.6 + dBob + max(dRise, -2.5), 0.0);
  float sec = TAU / 5.0, ang = atan(o.x, o.z) - dSpin;
  float k = floor(ang / sec + 0.5), a = ang - k * sec, rr = length(o.xz);
  k = mod(k, 5.0);
  float fall = 7.0 * smoothstep(0.0, 0.35, dDrop - 0.07 * k) * step(0.001, dDrop);
  vec3 sq = vec3(sin(a) * rr, o.y - 0.7 * sin(k * 2.1 + uTime * 0.8) + fall, cos(a) * rr - dWide);
  float shard = (abs(sq.y) / 1.5 + (abs(sq.x) + abs(sq.z)) / 0.6 - 1.0) * 0.38;
  if (shard < d) { d = shard; mat = 2.0; }
  return d * 0.8;
}
void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = dLocal(p);
  if (mat > 2.5) { s.albedo = eColC; s.cover = mix(0.8, 0.1, dCore); s.glow = dCore; return; }            // its lights
  if (mat > 1.5) { s.albedo = eColB; s.cover = 0.88; s.ink = step(0.8, vnoise(p.xy * 3.0 + p.z)) * 0.4; return; }      // the shards: the part that hurts
  // the shell: slate above, laid in plates along the back, marked like a ray with spots left as paper; pale beneath
  float out_ = max(abs(q.x) - 1.6, 0.0);
  float under = smoothstep(0.1, -0.25, q.y - out_ * dFlap);
  float along = q.z * 0.55 + 0.16 * abs(q.x);
  vec2 v = voronoi(q.xz * 0.55 + eLook.x * 20.0);
  float spot = smoothstep(0.24, 0.17, v.x) * step(0.45, v.y) * (1.0 - under);
  s.albedo = mix(eColA, eColC, under); s.wrap = 0.3;
  s.cover = mix(mix(0.66, 0.9, hash12(vec2(floor(along), floor(abs(q.x) * 0.5)))), 0.22, under);
  s.cover = mix(s.cover, 0.06, spot);
  s.ink = max(penLine((abs(fract(along) - 0.5) - 0.5) / 0.55) * 0.6 * (1.0 - under), penLine((v.x - 0.2) / 0.55) * step(0.45, v.y) * (1.0 - under) * 0.5);
  // two small eyes at the head, lit
  if (length(vec3(abs(q.x) - 0.85, q.y - 0.3, q.z - 3.5)) < 0.3) { s.albedo = eColC; s.cover = 0.12; s.glow = 0.9; s.ink = 0.0; }
}
`,
});
