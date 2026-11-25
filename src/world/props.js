// Prop registry. A prop is everything that stands on the terrain: trees, rocks,
// buildings. Each one carries its gameplay data (collision, size) together with
// the two GLSL snippets that draw it:
//
//   float sdf_<id>(vec3 q, Prop pr, out float mat)       distance field, q in prop space
//   void  mat_<id>(vec3 q, float mat, Prop pr, inout Surf s)   which pencil, how firmly, what pen marks
//
// The world shader's dispatchers are generated from this list, so a new prop is
// one registerProp() call and nothing else.
//
// reach   = furthest the shape extends sideways from its origin at scale 1
// seeThrough = its leaf material (mat 1) is cut away where it would hide the player
// collide = radius that blocks walking (0 = walk-through)

import { registerChunk } from '../gfx/shaderlib.js';
import { SHUTTLE_GLSL } from '../gfx/glsl/shuttle.js';

export const PROPS = [];
const byId = new Map();

export function registerProp(def) {
  def.type = PROPS.length + 1; // 0 means "empty cell"
  def.scale = def.scale || [1, 1];
  PROPS.push(def);
  byId.set(def.id, def);
  return def;
}
export const propById = (id) => byId.get(id);
export const propByType = (type) => PROPS[type - 1];

registerChunk('props', () => `
struct Prop { int type; vec3 base; float rot; float scale; float seed; float pal; };
${PROPS.map((p) => p.glsl).join('\n')}
float propSdf(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  switch (pr.type) {
${PROPS.map((p) => `    case ${p.type}: return sdf_${p.id}(q, pr, mat);`).join('\n')}
  }
  return 1e3;
}
// Foliage that opens up when it stands between the camera and the player.
bool propSeeThrough(int type, float mat) {
  if (mat < 0.5 || mat > 1.5) return false;
  return ${PROPS.filter((p) => p.seeThrough).map((p) => `type == ${p.type}`).join(' || ') || 'false'};
}
void propMat(vec3 q, float mat, Prop pr, inout Surf s) {
  switch (pr.type) {
${PROPS.map((p) => `    case ${p.type}: mat_${p.id}(q, mat, pr, s); break;`).join('\n')}
  }
}
`);

// ---------------------------------------------------------------- vegetation

registerProp({
  id: 'tree', seeThrough: true, reach: 1.5, height: 4.5, collide: 0.34, scale: [0.82, 1.2], map: [0.25, 0.45, 0.22],
  glsl: /* glsl */ `
float sdf_tree(vec3 q, Prop pr, out float mat) {
  q.xz += 0.035 * sin(uTime * 1.2 + pr.seed * 30.0) * max(q.y - 1.2, 0.0) * vec2(0.8, 0.5);
  float trunk = sdTaper(q, vec3(0.0), vec3(0.06, 2.3, 0.02), 0.2, 0.1);
  float bound = length(q - vec3(0.0, 3.0, 0.0)) - 1.75;
  if (bound > 0.7) { mat = trunk < bound ? 0.0 : 1.0; return min(trunk, bound); }
  // five lobes that stay distinct, like a cloud; each tree leans its lobes differently
  vec3 w = vec3(pr.seed - 0.5, 0.0, fract(pr.seed * 7.3) - 0.5) * 0.3;
  float can = length(q - vec3(0.0, 3.0, 0.0)) - 1.05;
  can = smin(can, length(q - vec3(0.66, 2.5, 0.3) - w) - 0.78, 0.16);
  can = smin(can, length(q - vec3(-0.6, 2.6, -0.4) + w) - 0.76, 0.16);
  can = smin(can, length(q - vec3(-0.15, 2.45, 0.74) - w.zyx) - 0.68, 0.16);
  can = smin(can, length(q - vec3(0.2, 3.75, -0.2) + w.zyx) - 0.66, 0.16);
  can += 0.06 * sin(q.x * 4.7 + pr.seed * 17.0) * sin(q.y * 5.1) * sin(q.z * 4.9 + 1.3);
  can += 0.022 * sin(q.x * 10.3 + 2.0) * sin(q.y * 9.1 + pr.seed * 9.0) * sin(q.z * 9.7);
  mat = trunk < can ? 0.0 : 1.0;
  return min(trunk, can) * 0.7;
}
// Foliage: one pencil for the mass, a lighter one dabbed where the light falls,
// and the scribbled edges of the leaf clumps in pen.
void leafSurf(vec3 q, Prop pr, inout Surf s, float lo, float hi) {
  vec3 leaf = uLeafPal[int(pr.pal + 0.5)];
  float clump = vnoise3(q * 2.3 + pr.seed * 10.0);
  float lift = smoothstep(lo, hi, q.y);
  s.albedo = mix(leaf, mix(leaf, P_BUTTER, 0.45), smoothstep(0.56, 0.66, clump) * mix(0.35, 0.9, lift));
  s.cover = mix(0.62, 0.9, clump);
  s.soft = 1.0;                                             // leaves are dabbed with the side of the pencil, not ruled
  s.ink = penLine((clump - 0.44) / 1.9) * 0.42;             // one loose line round the leaf masses
  s.wrap = 0.5; s.leafy = 1.0;
  s.occ = mix(0.55, 1.0, lift) * mix(0.72, 1.0, smoothstep(0.22, 0.42, clump));
}
void barkSurf(vec3 q, Prop pr, inout Surf s) {
  float a = atan(q.z, q.x);
  float streak = vnoise(vec2(a * 3.0, q.y * 1.6 + pr.seed * 10.0));
  s.albedo = mix(P_BARK, P_UMBER, streak * 0.55);
  s.cover = 0.78;
  s.ink = penLine((abs(fract(a * 1.3 + vnoise(vec2(q.y * 2.0, pr.seed * 7.0)) * 0.8) - 0.5)) / 1.3 * 0.18) * step(0.55, streak) * 0.5;
}
void mat_tree(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  leafSurf(q, pr, s, 2.1, 4.2);
  // an orchard tree now and then: a few red fruit
  if (fract(pr.seed * 7.13) < 0.3 && pr.pal < 0.5) {
    vec2 v = voronoi(q.xy * 2.6 + q.z * 1.9 + pr.seed * 20.0);
    float fruit = smoothstep(0.13, 0.09, v.x) * step(0.72, v.y);
    s.albedo = mix(s.albedo, P_POPPY, fruit);
    s.cover = mix(s.cover, 0.95, fruit);
  }
}`,
});

registerProp({
  id: 'pine', seeThrough: true, reach: 1.42, height: 5.7, collide: 0.3, scale: [0.8, 1.25], map: [0.13, 0.32, 0.27],
  glsl: /* glsl */ `
float sdf_pine(vec3 q, Prop pr, out float mat) {
  q.xz += 0.02 * sin(uTime * 1.1 + pr.seed * 30.0) * max(q.y - 1.0, 0.0) * vec2(0.7, 0.4);
  float trunk = sdCylinder(q, 0.15, 1.6);
  float fr = 0.07 * sin(q.x * 5.0 + pr.seed * 20.0) * sin(q.z * 5.0 + q.y * 2.0);
  float c1 = sdConeUp(q - vec3(0.0, 0.9, 0.0), 1.3 + fr, 2.3);
  float c2 = sdConeUp(q - vec3(0.0, 2.3, 0.0), 1.05 + fr, 2.1);
  float c3 = sdConeUp(q - vec3(0.0, 3.6, 0.0), 0.75 + fr, 2.0);
  float can = min(c1, min(c2, c3)) - 0.05;
  mat = trunk < can ? 0.0 : 1.0;
  return min(trunk, can) * 0.82;
}
void mat_pine(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  leafSurf(q, pr, s, 1.0, 5.4);
  // each tier is darker underneath and ends in a drawn, ragged hem
  float tier = fract((q.y - 0.9) / 1.35);
  s.occ *= mix(0.6, 1.0, smoothstep(0.0, 0.6, tier));
  s.ink = max(s.ink * 0.6, penLine(tier * 1.35) * 0.75);
  s.cover = mix(s.cover, 0.12, gSnow * smoothstep(0.55, 0.95, tier));   // snow on the boughs is paper
}`,
});

registerProp({
  id: 'bush', seeThrough: true, reach: 1.0, height: 1.1, collide: 0, scale: [0.7, 1.25], map: [0.3, 0.5, 0.25],
  glsl: /* glsl */ `
float sdf_bush(vec3 q, Prop pr, out float mat) {
  mat = 1.0;
  q.xz += 0.02 * sin(uTime * 1.6 + pr.seed * 30.0) * q.y;
  float d = length(q - vec3(0.0, 0.42, 0.0)) - 0.6;
  d = smin(d, length(q - vec3(0.48, 0.33, 0.15)) - 0.44, 0.2);
  d = smin(d, length(q - vec3(-0.4, 0.36, -0.25)) - 0.48, 0.2);
  d += 0.04 * sin(q.x * 7.0 + pr.seed * 9.0) * sin(q.y * 7.5) * sin(q.z * 6.5);
  return d * 0.82;
}
void mat_bush(vec3 q, float mat, Prop pr, inout Surf s) {
  leafSurf(q, pr, s, 0.1, 0.9);
  vec2 v = voronoi(q.xz * 5.0 + q.y * 3.0 + pr.seed * 20.0);
  float berry = smoothstep(0.16, 0.1, v.x) * step(0.6, v.y) * step(0.35, q.y);
  bool bloom = pr.pal > 1.5 && pr.pal < 2.5;
  s.albedo = mix(s.albedo, bloom ? PAPER : P_POPPY, berry);
  s.cover = mix(s.cover, bloom ? 0.0 : 0.95, berry);
}`,
});

registerProp({
  id: 'palm', seeThrough: true, reach: 1.7, height: 4.0, collide: 0.26, scale: [0.85, 1.05], map: [0.3, 0.52, 0.4],
  glsl: /* glsl */ `
float sdf_palm(vec3 q, Prop pr, out float mat) {
  vec3 b = vec3(0.22, 1.6, 0.0), c = vec3(0.55, 3.1, 0.0);
  float trunk = min(sdTaper(q, vec3(0.0), b, 0.17, 0.12), sdTaper(q, b, c, 0.12, 0.09));
  vec3 h = q - c;
  h.xz -= 0.04 * sin(uTime * 1.3 + pr.seed * 30.0);
  float bound = length(h) - 1.2;
  if (bound > 0.6) { mat = 0.0; return min(trunk, bound); }
  float sec = TAU / 7.0;
  float a = mod(atan(h.z, h.x) + sec * 0.5, sec) - sec * 0.5;
  float r = length(h.xz);
  vec3 f = vec3(r * cos(a), h.y, r * sin(a));
  float droop = 0.35 * f.x - 0.48 * f.x * f.x;
  vec3 g = vec3(f.x - 0.57, f.y - droop, f.z);
  float frond = sdRoundBox(g, vec3(0.55, 0.025, 0.17 * (1.0 - 0.75 * abs(g.x) / 0.55) + 0.03), 0.02) * 0.6;
  float nuts = length(h - vec3(0.0, -0.12, 0.0)) - 0.17;
  mat = trunk < min(frond, nuts) ? 0.0 : (frond < nuts ? 1.0 : 2.0);
  return min(trunk, min(frond, nuts));
}
void mat_palm(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) {
    s.albedo = mix(P_TAN, P_BARK, 0.5);
    s.cover = 0.7;
    s.ink = penLine((abs(fract(q.y * 2.6) - 0.5)) / 2.6) * 0.6;   // ringed trunk
  } else if (mat < 1.5) {
    leafSurf(q, pr, s, 2.2, 3.6);
    s.ink = max(s.ink * 0.4, 0.0);
  } else { s.albedo = P_UMBER; s.cover = 0.9; }
}`,
});

registerProp({
  id: 'mushroom', reach: 0.75, height: 1.3, collide: 0.2, scale: [0.7, 1.5], map: [0.7, 0.3, 0.25],
  glsl: /* glsl */ `
float sdf_mushroom(vec3 q, Prop pr, out float mat) {
  float stem = sdTaper(q, vec3(0.0), vec3(0.04, 0.72, 0.0), 0.14, 0.09);
  vec3 c = q - vec3(0.04, 0.7, 0.0);
  float cap = max(length(c * vec3(1.0, 1.55, 1.0)) - 0.6, -c.y - 0.03) * 0.65;
  vec3 c2 = q - vec3(-0.42, 0.3, 0.3);
  float small = min(sdCapsule(q, vec3(-0.4, 0.0, 0.28), vec3(-0.42, 0.3, 0.3), 0.06),
                    max(length(c2 * vec3(1.0, 1.5, 1.0)) - 0.26, -c2.y - 0.02) * 0.65);
  float caps = min(cap, small);
  mat = stem < caps ? 0.0 : 1.0;
  return min(stem, caps);
}
void mat_mushroom(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_CREAM; s.cover = 0.3; return; }
  vec2 v = voronoi(q.xz * 4.5 + pr.seed * 20.0);
  float under = step(q.y, q.x < -0.2 ? 0.3 : 0.69);
  float spot = smoothstep(0.22, 0.16, v.x) * (1.0 - under);
  s.albedo = mix(pr.seed > 0.5 ? P_POPPY : P_SLATE, P_TAN, under);
  s.cover = mix(mix(0.86, 0.35, under), 0.0, spot);     // the spots are paper
  s.ink = max(penLine((v.x - 0.19) / 4.5) * (1.0 - under) * 0.6,
              under * smoothstep(0.2, 0.0, abs(fract(atan(q.z, q.x - 0.04) * 3.0) - 0.5)) * 0.5);
  s.glow = spot * uNight * 0.8;
}`,
});

// ---------------------------------------------------------------- stone

registerProp({
  id: 'rock', reach: 1.25, height: 1.5, collide: 0.8, scale: [0.5, 1.35], map: [0.5, 0.5, 0.52],
  glsl: /* glsl */ `
const vec3 ROCK_N[5] = vec3[5](vec3(0.83, 0.52, 0.21), vec3(-0.61, 0.61, 0.51), vec3(0.1, 0.7, -0.71),
                              vec3(-0.5, 0.31, -0.81), vec3(0.3, 0.9, 0.31));
float rockBody(vec3 c, float r, float seed) {
  float d = length(c * vec3(1.0, 1.2, 1.0)) - r;
  for (int i = 0; i < 5; i++) d = max(d, dot(c, ROCK_N[i]) - r * (0.62 + 0.25 * fract(seed * (7.0 + float(i) * 3.3))));
  return d - 0.04;
}
float sdf_rock(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = rockBody(q - vec3(0.0, 0.3, 0.0), 0.95, pr.seed);
  vec3 c2 = q - vec3(0.75, 0.1, 0.35);
  c2.xz = c2.zx;
  return min(d, rockBody(c2, 0.45, pr.seed + 0.37)) * 0.9;
}
void mat_rock(vec3 q, float mat, Prop pr, inout Surf s) {
  float strata = vnoise(vec2(q.y * 6.0 + vnoise(q.xz * 2.0) * 2.0, pr.seed * 9.0));
  s.albedo = uRockCol;
  s.cover = mix(0.5, 0.8, strata);
  s.ink = smoothstep(0.04, 0.0, abs(fract(strata * 2.0 + 0.25) - 0.5)) * 0.65;   // cracks
  s.moss = 1.0;
}`,
});

registerProp({
  id: 'crystal', reach: 0.9, height: 2.0, collide: 0.55, scale: [0.8, 1.5], map: [0.5, 0.8, 0.95],
  light: { color: [0.35, 0.75, 1.0], radius: 5, y: 1.0, always: true },
  glsl: /* glsl */ `
float crystalShard(vec3 q, float r, float h) {
  float hx = max(abs(q.x) * 0.866 + abs(q.z) * 0.5, abs(q.z));
  float d = max(hx - r, -q.y);
  return max(d, (q.y - h) * 0.55 + hx * 0.85) * 0.8;
}
float sdf_crystal(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = crystalShard(q, 0.26, 1.9);
  vec3 a = q; a.xy = rot2(0.5) * a.xy;
  d = min(d, crystalShard(a - vec3(0.12, 0.0, 0.1), 0.18, 1.3));
  vec3 b = q; b.zy = rot2(-0.6) * b.zy; b.xy = rot2(-0.35) * b.xy;
  d = min(d, crystalShard(b - vec3(-0.1, 0.0, -0.05), 0.16, 1.15));
  return d;
}
void mat_crystal(vec3 q, float mat, Prop pr, inout Surf s) {
  float band = 0.5 + 0.5 * sin(q.y * 5.0 + q.x * 3.0 + uTime * 1.5);
  s.albedo = mix(P_TEAL, P_SKY, band);
  s.cover = mix(0.75, 0.1, smoothstep(0.55, 0.9, band));    // its light is the paper showing
  s.glow = 0.25 + 0.3 * band;
}`,
});

registerProp({
  id: 'stone', reach: 0.6, height: 2.6, collide: 0.5, scale: [0.9, 1.2], map: [0.6, 0.6, 0.65],
  glsl: /* glsl */ `
float sdf_stone(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  q.xy = rot2(0.06 * (pr.seed - 0.5) * 4.0) * q.xy;
  float w = 0.42 - 0.06 * q.y;
  return sdRoundBox(q - vec3(0.0, 1.2, 0.0), vec3(w, 1.25, 0.22), 0.1) * 0.9;
}
void mat_stone(vec3 q, float mat, Prop pr, inout Surf s) {
  float n = vnoise(q.xy * 5.0 + pr.seed * 9.0);
  s.albedo = uRockCol;
  s.cover = mix(0.5, 0.75, n);
  // a carved spiral, drawn in pen and left pale
  vec2 r = vec2(q.x, q.y - 1.5);
  float sp = abs(fract(length(r) * 3.2 - atan(r.y, r.x) / TAU) - 0.5);
  float rune = smoothstep(0.1, 0.03, sp) * step(length(r), 0.3) * step(0.15, abs(q.z));
  s.albedo = mix(s.albedo, P_TEAL, rune);
  s.cover = mix(s.cover, 0.9, rune);
  s.glow = rune * uNight * 0.7;
  s.ink = smoothstep(0.03, 0.0, abs(fract(n * 2.0) - 0.5)) * 0.4;
  s.moss = 0.6;
}`,
});

// ---------------------------------------------------------------- settlement

registerProp({
  id: 'house', reach: 3.4, height: 4.5, collide: 2.5, map: [0.75, 0.42, 0.3],
  light: { color: [1.0, 0.72, 0.4], radius: 6, y: 1.4, forward: 2.3 },
  glsl: /* glsl */ `
float sdf_house(vec3 q, Prop pr, out float mat) {
  float body = sdBox(q - vec3(0.0, 1.25, 0.0), vec3(2.2, 1.25, 1.7));
  vec2 rz = vec2(abs(q.z), q.y);
  float side = dot(rz - vec2(2.15, 2.3), vec2(0.572, 0.82));
  float roof = max(max(side, 2.3 - q.y), abs(q.x) - 2.5);
  float gable = max(max(side + 0.22, 2.3 - q.y), abs(q.x) - 2.2);
  float chim = sdBox(q - vec3(1.25, 3.5, 0.7), vec3(0.27, 0.75, 0.27));
  float walls = min(body, gable);
  float step_ = sdBox(q - vec3(0.0, 0.08, 1.9), vec3(0.6, 0.08, 0.25));
  mat = 0.0;
  float d = walls;
  if (roof < d) { d = roof; mat = 1.0; }
  if (chim < d) { d = chim; mat = 2.0; }
  if (step_ < d) { d = step_; mat = 2.0; }
  return d;
}
void mat_house(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) {   // chimney and step: dressed stone with drawn joints
    vec2 pv = pavers(q.xy * 3.0 + q.z * 2.0);
    s.albedo = fract(pv.y * 5.3) < 0.5 ? P_PEACH : P_CLAY;
    s.cover = mix(0.3, 0.7, pv.y);
    s.ink = penLine(0.5 * pv.x / 3.0) * 0.8;
    return;
  }
  if (mat > 0.5) {   // roofs: brick tile, slate, or thatch
    float run = abs(q.z) * 3.2 - q.y * 0.4;
    float row = fract(run);
    if (pr.seed < 0.34) {
      s.albedo = mix(P_WOOD, P_HONEY, 0.35); s.cover = 0.72;
      float straw = vnoise(vec2(q.x * 9.0, run * 0.7));
      s.ink = max(penLine(row / 3.2) * 0.65, penLine((abs(fract(q.x * 3.5 + straw) - 0.5)) / 3.5) * step(0.5, straw) * 0.5);
    } else {
      s.albedo = pr.seed < 0.67 ? mix(P_BRICK, P_POPPY, 0.4) : P_SLATE;
      float col = fract(q.x * 2.4 + floor(run) * 0.5);
      s.cover = mix(0.6, 0.9, hash12(vec2(floor(q.x * 2.4 + floor(run) * 0.5), floor(run))));
      s.ink = max(penLine(row / 3.2) * 0.75, penLine(col / 2.4) * 0.4);
    }
    s.cover = mix(s.cover, 0.08, gSnow * 0.85);
    return;
  }
  // plaster left as paper, timber framing in bark; openings drawn on
  bool front = abs(q.z) > 1.69;
  vec2 f = front ? vec2(q.x, q.y) : vec2(q.z, q.y);
  float tim = min(abs(f.y - 2.4) - 0.1, abs(abs(f.x) - (front ? 2.1 : 1.6)) - 0.09);
  tim = min(tim, f.y - 0.2);
  tim = min(tim, max(abs(f.y - 3.0) - 0.05, 2.5 - f.y));
  s.albedo = P_CREAM; s.cover = 0.16;
  if (tim < 0.0) { s.albedo = P_BARK; s.cover = 0.85; }
  s.ink = penLine(tim) * 0.8;
  // windows
  vec2 w = vec2(abs(f.x) - (front ? 1.25 : 0.0), f.y - 1.45);
  float dw = max(abs(w.x) - 0.36, abs(w.y) - 0.42);
  float lit = step(0.25, fract(pr.seed * 7.3 + floor(f.x + 3.0) * 0.37 + (front ? 0.0 : 0.5)));
  if (dw < 0.0) {
    s.albedo = P_SLATE; s.cover = mix(0.7, 0.0, uNight * lit);     // a lit window is paper
    s.glow = uNight * lit;
    s.ink = max(penLine(w.x), penLine(w.y)) * 0.8;
  }
  s.ink = max(s.ink, penLine(dw) * 0.9);
  // the door, on the +z face
  if (q.z > 1.69) {
    float dd = max(abs(q.x) - 0.42, q.y - 1.55);
    if (dd < 0.0) {
      s.albedo = mix(P_BARK, P_UMBER, 0.35); s.cover = 0.82; s.glow = 0.0;
      s.ink = penLine((abs(fract(q.x * 3.5) - 0.5)) / 3.5) * 0.5;
      float knob = step(length(vec2(q.x - 0.27, q.y - 0.8)), 0.06);
      s.albedo = mix(s.albedo, P_HONEY, knob); s.cover = mix(s.cover, 0.95, knob);
    }
    s.ink = max(s.ink, penLine(dd) * 0.9);
  }
}`,
});

registerProp({
  id: 'lamp', reach: 0.35, height: 3.0, collide: 0.15, map: [0.6, 0.85, 0.95],
  light: { color: [0.6, 0.9, 1.0], radius: 9, y: 2.4 },
  glsl: /* glsl */ `
float sdf_lamp(vec3 q, Prop pr, out float mat) {
  // a light pylon: a slim white mast, a ring of light under its cap
  float post = min(sdTaper(q, vec3(0.0), vec3(0.0, 2.5, 0.0), 0.1, 0.05), sdCylinder(q, 0.2, 0.1));
  float cap = sdRoundBox(q - vec3(0.0, 2.72, 0.0), vec3(0.19, 0.04, 0.19), 0.03);
  float ring = sdTorusY(q - vec3(0.0, 2.4, 0.0), 0.15, 0.055);
  float mast = min(post, cap);
  mat = ring < mast ? 1.0 : 0.0;
  return min(mast, ring);
}
void mat_lamp(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) {
    s.albedo = mix(P_STONE, P_CREAM, 0.55); s.cover = 0.36; s.soft = 1.0;
    s.ink = max(penLine(q.y - 0.45), penLine(q.y - 1.9)) * 0.7;
    if (q.y > 0.55 && q.y < 0.75) { s.albedo = P_VERMILION; s.cover = 0.8; }      // a band of the corps' red
    return;
  }
  s.albedo = P_SKY;
  s.cover = mix(0.6, 0.0, uNight);      // lit, the ring is bare paper
  s.glow = max(uNight, 0.3);
}`,
});

registerProp({
  id: 'waystone', reach: 1.1, height: 3.9, collide: 0.75, map: [0.4, 0.9, 1.0],
  light: { color: [0.35, 0.8, 1.0], radius: 8, y: 3.2, always: true },
  glsl: /* glsl */ `
float sdf_waystone(vec3 q, Prop pr, out float mat) {
  float base = min(sdCylinder(q, 1.05, 0.16), sdCylinder(q, 0.75, 0.32));
  float w = 0.4 - 0.065 * q.y;
  float mono = sdRoundBox(q - vec3(0.0, 1.7, 0.0), vec3(w, 1.45, w * 0.72), 0.06) * 0.9;
  float orb = length(q - vec3(0.0, 3.55 + 0.08 * sin(uTime * 1.4), 0.0)) - 0.2;
  float stone = min(base, mono);
  mat = orb < stone ? 1.0 : 0.0;
  return min(stone, orb);
}
void mat_waystone(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_SKY; s.cover = 0.12; s.glow = 0.8; return; }
  float n = vnoise(q.xy * 4.0 + q.z * 3.0);
  s.albedo = mix(P_STONE, P_SLATE, 0.3);
  s.cover = mix(0.5, 0.78, n);
  float lines = smoothstep(0.08, 0.02, abs(fract(q.y * 1.6 + 0.2 * sin(q.x * 9.0)) - 0.5)) * step(0.5, q.y) * step(q.y, 3.0) * step(abs(q.x), 0.2);
  float ring = smoothstep(0.06, 0.02, abs(length(q.xz) - 0.9)) * step(q.y, 0.2);
  float rune = max(lines, ring);
  s.albedo = mix(s.albedo, P_TEAL, rune);
  s.cover = mix(s.cover, 0.92, rune);
  s.glow = rune * (0.3 + 0.5 * uNight) * (0.6 + 0.4 * sin(uTime * 1.4 - q.y * 2.0));
  s.ink = smoothstep(0.03, 0.0, abs(fract(n * 2.0) - 0.5)) * 0.35;
}`,
});

registerProp({
  id: 'stall', reach: 1.75, height: 2.6, collide: 1.3, map: [0.85, 0.6, 0.35],
  glsl: /* glsl */ `
float sdf_stall(vec3 q, Prop pr, out float mat) {
  float counter = sdBox(q - vec3(0.0, 0.5, 0.0), vec3(1.2, 0.5, 0.55));
  vec3 a = vec3(abs(q.x) - 1.18, q.y, abs(q.z) - 0.55);
  float posts = sdCylinder(a, 0.05, 2.1);
  vec3 r = q - vec3(0.0, 2.2, 0.15);
  r.zy = rot2(0.28) * r.zy;
  float awn = sdBox(r, vec3(1.4, 0.035, 0.95));
  float goods = length(vec3(mod(q.x + 0.3, 0.6) - 0.3, q.y - 1.08, q.z)) - 0.15;
  goods = max(goods, abs(q.x) - 1.1);
  float wood = min(counter, posts);
  mat = 0.0;
  float d = wood;
  if (awn < d) { d = awn; mat = 1.0; }
  if (goods < d) { d = goods; mat = 2.0; }
  return d;
}
void mat_stall(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) {
    s.albedo = P_WOOD; s.cover = 0.7;
    s.ink = penLine((abs(fract(q.y * 3.0 + q.x * 0.6) - 0.5)) / 3.0) * 0.55;    // planks
    return;
  }
  if (mat < 1.5) {   // striped awning: one pencil and the paper
    float stripe = step(0.5, fract(q.x * 1.6));
    s.albedo = pr.seed < 0.5 ? P_BRICK : P_SLATE;
    s.cover = mix(0.06, 0.82, stripe);
    s.ink = penLine((abs(fract(q.x * 3.2) - 0.5)) / 3.2) * 0.5;
    return;
  }
  float k = floor((q.x + 0.3) / 0.6);
  float pick = fract(k * 0.37 + pr.seed);
  s.albedo = pick < 0.33 ? P_APRICOT : (pick < 0.66 ? P_LEAF : P_BUTTER);
  s.cover = 0.85;
}`,
});

registerProp({
  id: 'well', reach: 1.1, height: 2.5, collide: 0.9, map: [0.55, 0.55, 0.6],
  glsl: /* glsl */ `
float sdf_well(vec3 q, Prop pr, out float mat) {
  float ring = max(sdCylinder(q, 0.78, 0.7), -(length(q.xz) - 0.56));
  float water = sdCylinder(q, 0.6, 0.45);
  vec3 a = vec3(abs(q.x) - 0.7, q.y, q.z);
  float posts = sdCylinder(a, 0.06, 1.9);
  float roof = sdConeUp(q - vec3(0.0, 1.85, 0.0), 1.05, 0.62);
  mat = 0.0;
  float d = ring;
  if (posts < d) { d = posts; mat = 1.0; }
  if (roof < d) { d = roof; mat = 2.0; }
  if (water < d) { d = water; mat = 3.0; }
  return d;
}
void mat_well(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) {
    vec2 pv = pavers(vec2(atan(q.z, q.x) * 2.2, q.y * 3.2));
    s.albedo = fract(pv.y * 5.3) < 0.5 ? P_PEACH : mix(P_STONE, P_CLAY, 0.5);
    s.cover = mix(0.3, 0.7, pv.y);
    s.ink = penLine(0.5 * pv.x / 3.0 * 0.75) * 0.8;
  } else if (mat < 1.5) { s.albedo = P_BARK; s.cover = 0.8; }
  else if (mat < 2.5) {
    s.albedo = P_SLATE; s.cover = 0.8;
    s.ink = penLine((abs(fract(q.y * 6.0) - 0.5)) / 6.0) * 0.5;
  } else { s.albedo = P_TEAL; s.cover = 0.6; s.soft = 1.0; }
}`,
});

// ---------------------------------------------------------------- more that grows

registerProp({
  id: 'birch', seeThrough: true, reach: 1.15, height: 4.7, collide: 0.2, scale: [0.85, 1.2], map: [0.6, 0.72, 0.45],
  glsl: /* glsl */ `
float sdf_birch(vec3 q, Prop pr, out float mat) {
  q.xz += 0.03 * sin(uTime * 1.3 + pr.seed * 30.0) * max(q.y - 1.5, 0.0) * vec2(0.8, 0.5);
  float trunk = sdTaper(q, vec3(0.0), vec3(0.16 * (pr.seed - 0.5), 3.6, 0.0), 0.11, 0.05);
  float bound = length(q - vec3(0.0, 3.5, 0.0)) - 1.4;
  if (bound > 0.6) { mat = trunk < bound ? 0.0 : 1.0; return min(trunk, bound); }
  float can = length((q - vec3(0.0, 3.9, 0.0)) * vec3(1.0, 0.8, 1.0)) - 0.76;
  can = smin(can, length(q - vec3(0.5, 3.2, 0.2)) - 0.55, 0.14);
  can = smin(can, length(q - vec3(-0.45, 3.35, -0.3)) - 0.53, 0.14);
  can = smin(can, length(q - vec3(-0.1, 2.85, 0.5)) - 0.45, 0.14);
  can += 0.04 * sin(q.x * 6.0 + pr.seed * 17.0) * sin(q.y * 6.3) * sin(q.z * 5.9);
  mat = trunk < can ? 0.0 : 1.0;
  return min(trunk, can) * 0.75;
}
void mat_birch(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { leafSurf(q, pr, s, 2.6, 4.4); return; }
  // white bark: the paper itself, with short dark dashes
  s.albedo = P_CREAM; s.cover = 0.1;
  float dash = step(0.6, vnoise(vec2(atan(q.z, q.x) * 2.0 + pr.seed * 9.0, floor(q.y * 3.3 + pr.seed))));
  s.ink = dash * penLine((abs(fract(q.y * 3.3 + pr.seed) - 0.5)) / 3.3) * 0.85;
}`,
});

registerProp({
  id: 'willow', seeThrough: true, reach: 1.72, height: 3.9, collide: 0.3, scale: [0.85, 1.08], map: [0.4, 0.55, 0.42],
  glsl: /* glsl */ `
float sdf_willow(vec3 q, Prop pr, out float mat) {
  float trunk = sdTaper(q, vec3(0.0), vec3(0.1, 2.0, 0.05), 0.24, 0.14);
  // a dome of hanging fronds: a thick shell, open underneath, with a ragged hem
  vec3 c = q - vec3(0.0, 2.3, 0.0);
  c.xz += 0.04 * sin(uTime * 1.1 + pr.seed * 30.0 + q.y * 1.5) * max(2.3 - q.y, 0.0);
  float dome = length(c * vec3(1.0, 0.82, 1.0)) - 1.55;
  float hollow = length((c + vec3(0.0, 0.5, 0.0)) * vec3(1.0, 0.7, 1.0)) - 1.25;
  float can = max(max(dome, -hollow), 0.55 - q.y);
  can += 0.07 * sin(atan(c.z, c.x) * 9.0 + pr.seed * 20.0) * smoothstep(1.6, 0.6, q.y);
  mat = trunk < can ? 0.0 : 1.0;
  return min(trunk, can) * 0.7;
}
void mat_willow(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  leafSurf(q, pr, s, 1.0, 3.6);
  // the fronds hang in strands
  float strand = abs(fract(atan(q.z, q.x) * 4.5 + pr.seed * 3.0) - 0.5) / 4.5 * 1.2;
  s.ink = max(s.ink * 0.4, penLine(strand) * smoothstep(2.6, 1.2, q.y) * 0.45);
}`,
});

registerProp({
  id: 'deadtree', reach: 1.12, height: 3.5, collide: 0.22, scale: [0.8, 1.25], map: [0.5, 0.45, 0.4],
  glsl: /* glsl */ `
float sdf_deadtree(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = sdTaper(q, vec3(0.0), vec3(0.1, 2.4, 0.0), 0.2, 0.09);
  d = min(d, sdTaper(q, vec3(0.06, 1.5, 0.0), vec3(0.9, 2.6, 0.2), 0.08, 0.03));
  d = min(d, sdTaper(q, vec3(0.05, 1.9, 0.0), vec3(-0.75, 2.9, -0.25), 0.07, 0.03));
  d = min(d, sdTaper(q, vec3(0.1, 2.4, 0.0), vec3(0.25, 3.4, 0.45), 0.06, 0.02));
  d = min(d, sdTaper(q, vec3(0.6, 2.25, 0.13), vec3(1.05, 2.3, -0.3), 0.04, 0.02));
  return d;
}
void mat_deadtree(vec3 q, float mat, Prop pr, inout Surf s) {
  barkSurf(q, pr, s);
  s.albedo = mix(s.albedo, P_STONE, 0.5);      // weathered grey
  s.cover = 0.66;
}`,
});

registerProp({
  id: 'reeds', reach: 0.62, height: 1.75, collide: 0, scale: [0.8, 1.3], map: [0.42, 0.56, 0.36],
  glsl: /* glsl */ `
float sdf_reeds(vec3 q, Prop pr, out float mat) {
  // five stems in a ring, each with a brown head
  float sec = TAU / 5.0;
  float k = floor(atan(q.z, q.x) / sec + 0.5);
  float ca = k * sec;
  float h = 1.1 + 0.5 * fract(sin(k * 12.9898 + pr.seed * 78.233) * 43758.5453);
  vec3 root = vec3(cos(ca) * 0.26, 0.0, sin(ca) * 0.26);
  vec3 top = vec3(root.x * 1.7 + 0.05 * sin(uTime * 1.8 + pr.seed * 30.0 + k), h, root.z * 1.7);
  float stem = sdCapsule(q, root, top, 0.026);
  float head = sdCapsule(q, mix(root, top, 0.72), mix(root, top, 0.94), 0.058);
  mat = head < stem ? 1.0 : 0.0;
  return min(stem, head) * 0.8;
}
void mat_reeds(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_UMBER; s.cover = 0.95; }
  else { s.albedo = P_GREEN; s.cover = 0.9; }
}`,
});

registerProp({
  id: 'bigcap', seeThrough: true, reach: 1.66, height: 3.8, collide: 0.36, scale: [0.75, 1.2], map: [0.6, 0.35, 0.3],
  glsl: /* glsl */ `
float sdf_bigcap(vec3 q, Prop pr, out float mat) {
  float lean = 0.24 * (pr.seed - 0.5);
  float stem = sdTaper(q, vec3(0.0), vec3(lean, 2.7, 0.0), 0.3, 0.2);
  vec3 c = q - vec3(lean, 2.7, 0.0);
  float bound = length(c) - 1.72;
  if (bound > 0.6) { mat = stem < bound ? 0.0 : 1.0; return min(stem, bound); }
  float cap = max(length(c * vec3(1.0, 1.7, 1.0)) - 1.6, -c.y - 0.05) * 0.58;
  mat = stem < cap ? 0.0 : 1.0;
  return min(stem, cap);
}
void mat_bigcap(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_CREAM; s.cover = 0.26; s.ink = penLine((abs(fract(atan(q.z, q.x) * 1.6) - 0.5)) / 1.6 * 0.25) * 0.4; return; }
  vec3 c = q - vec3(0.24 * (pr.seed - 0.5), 2.7, 0.0);
  float under = step(c.y, 0.0);
  vec2 v = voronoi(c.xz * 1.7 + pr.seed * 20.0);
  float spot = smoothstep(0.26, 0.2, v.x) * (1.0 - under);
  float pick = fract(pr.seed * 5.3);
  s.albedo = mix(pick < 0.3 ? P_POPPY : (pick < 0.6 ? P_SLATE : (pick < 0.8 ? P_TEAL : P_HONEY)), P_TAN, under);
  s.cover = mix(mix(0.86, 0.4, under), 0.0, spot);              // the spots are paper
  s.ink = max(penLine((v.x - 0.23) / 1.7) * (1.0 - under) * 0.6,
              under * penLine((abs(fract(atan(c.z, c.x) * 5.0) - 0.5)) / 5.0 * length(c.xz)) * 0.5);
  s.soft = 1.0;
  s.glow = spot * uNight * 0.8;
}`,
});

registerProp({
  id: 'stump', reach: 0.68, height: 0.5, collide: 0.4, scale: [0.8, 1.3], map: [0.6, 0.48, 0.32],
  glsl: /* glsl */ `
float sdf_stump(vec3 q, Prop pr, out float mat) {
  float d = sdCylinder(q, 0.34 + 0.04 * sin(atan(q.z, q.x) * 5.0 + pr.seed * 9.0), 0.42);
  float root = sdTaper(vec3(abs(q.x), q.y, abs(q.z)), vec3(0.24, 0.14, 0.24), vec3(0.5, 0.0, 0.5), 0.09, 0.04);
  mat = (q.y > 0.4 && d < root) ? 1.0 : 0.0;
  return min(d, root) * 0.85;
}
void mat_stump(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  s.albedo = P_WOOD; s.cover = 0.5;
  s.ink = penLine((abs(fract(length(q.xz) * 9.0 + 0.3) - 0.5)) / 9.0) * 0.6;     // the rings
}`,
});

registerProp({
  id: 'cairn', reach: 0.72, height: 1.45, collide: 0.6, scale: [0.8, 1.4], map: [0.5, 0.5, 0.52],
  glsl: /* glsl */ `
float sdf_cairn(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = rockBody(q - vec3(0.0, 0.28, 0.0), 0.55, pr.seed);
  vec3 b = q - vec3(0.05, 0.75, 0.0);
  b.xz = b.zx;
  d = min(d, rockBody(b, 0.38, pr.seed + 0.3));
  d = min(d, rockBody(q - vec3(-0.03, 1.12, 0.04), 0.24, pr.seed + 0.6));
  return d * 0.9;
}
void mat_cairn(vec3 q, float mat, Prop pr, inout Surf s) { mat_rock(q, mat, pr, s); s.moss = 0.4; }`,
});

// ---------------------------------------------------------------- finds: things left out in the wilds

registerProp({
  id: 'chest', reach: 0.8, height: 0.95, collide: 0.6, map: [0.87, 0.7, 0.43],
  glsl: /* glsl */ `
float sdf_chest(vec3 q, Prop pr, out float mat) {
  // palette 1 = opened: the lid stands back on its hinge
  float box = sdRoundBox(q - vec3(0.0, 0.3, 0.0), vec3(0.52, 0.29, 0.36), 0.03);
  vec3 l = q - vec3(0.0, 0.58, 0.0);
  if (pr.pal > 0.5) { l = q - vec3(0.0, 0.58, -0.36); l.yz = rot2(1.3) * l.yz; l.z -= 0.36; }
  float lid = max(max(length(l.yz * vec2(1.0, 0.86)) - 0.31, -l.y), abs(l.x) - 0.54);    // half a barrel lying along x
  float latch = sdRoundBox(q - vec3(0.0, 0.5, 0.38), vec3(0.07, 0.1, 0.03), 0.012);
  float d = min(box, lid);
  mat = latch < d ? 2.0 : (lid < box ? 1.0 : 0.0);
  return min(d, latch) * 0.9;
}
void mat_chest(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_BUTTER; s.cover = 0.9; return; }
  s.albedo = mix(P_WOOD, P_BARK, 0.3 + 0.35 * mat); s.cover = 0.82;
  // two iron bands and the joints of the planks
  s.ink = max(penLine(abs(abs(q.x) - 0.3) - 0.035), penLine(fract(q.y * 6.0 + 0.2) - 0.5) * 0.35 * (1.0 - mat));
}`,
});

registerProp({
  id: 'beacon', reach: 1.5, height: 9.2, collide: 1.2, map: [0.95, 0.6, 0.3],
  light: { color: [1.0, 0.7, 0.36], radius: 13, y: 8.4, always: true },
  glsl: /* glsl */ `
float sdf_beacon(vec3 q, Prop pr, out float mat) {
  // a watch tower of dressed stone, tall enough to be seen over the trees, with a fire kept on top
  float tower = sdTaper(q, vec3(0.0, 0.0, 0.0), vec3(0.0, 7.3, 0.0), 1.2, 0.82);
  float gallery = sdCylinder(q - vec3(0.0, 7.2, 0.0), 1.2, 0.28);
  float bowl = sdCylinder(q - vec3(0.0, 7.48, 0.0), 0.55, 0.32);
  float fire = sdEllipsoid(q - vec3(0.0, 8.35, 0.0), vec3(0.42, 0.66, 0.42));
  float stone = min(tower, min(gallery, bowl));
  mat = fire < stone ? 1.0 : 0.0;
  return min(stone, fire) * 0.85;
}
void mat_beacon(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_APRICOT; s.cover = mix(0.5, 0.0, uNight); s.glow = 1.0; return; }   // the fire is paper, most of all at night
  s.albedo = mix(P_STONE, P_TAN, 0.25 + 0.2 * pr.seed); s.cover = 0.72;
  // courses of stone, their joints staggered, and a dark doorway at the foot
  float course = fract(q.y / 0.62);
  float ang = atan(q.z, q.x) * 3.0 + floor(q.y / 0.62) * 1.7;
  s.ink = max(penLine(course - 0.5) * 0.5 * step(q.y, 7.2), penLine(fract(ang) - 0.5) * 0.3 * step(q.y, 7.2));
  if (q.z > 0.6 && abs(q.x) < 0.3 && q.y < 1.3) { s.albedo = P_CHARCOAL; s.cover = 0.9; s.ink = 0.0; }
}`,
});

// ---------------------------------------------------------------- farm, camp and ruin

registerProp({
  id: 'haystack', reach: 1.0, height: 1.45, collide: 0.85, scale: [0.8, 1.2], map: [0.9, 0.72, 0.3],
  glsl: /* glsl */ `
float sdf_haystack(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  return max(sdEllipsoid(q - vec3(0.0, 0.5, 0.0), vec3(0.95, 0.92, 0.95)), -q.y);
}
void mat_haystack(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mix(P_HONEY, P_WOOD, 0.5); s.cover = 0.78; s.soft = 1.0;
  float straw = vnoise(vec2(atan(q.z, q.x) * 6.0 + pr.seed * 9.0, q.y * 2.0));
  s.ink = penLine((abs(fract(atan(q.z, q.x) * 3.0 + straw * 0.6) - 0.5)) / 3.0 * 0.6) * step(0.45, straw) * 0.5;
}`,
});

registerProp({
  id: 'fence', reach: 1.28, height: 1.0, collide: 0, map: [0.7, 0.55, 0.35],
  glsl: /* glsl */ `
float sdf_fence(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float posts = min(sdCylinder(vec3(abs(q.x) - 1.1, q.y, q.z), 0.07, 1.0), sdCylinder(q, 0.07, 0.95));
  float rails = min(sdBox(q - vec3(0.0, 0.75, 0.0), vec3(1.2, 0.05, 0.03)), sdBox(q - vec3(0.0, 0.4, 0.0), vec3(1.2, 0.05, 0.03)));
  return min(posts, rails);
}
void mat_fence(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = P_WOOD; s.cover = 0.66;
  s.ink = step(0.6, vnoise(q.xy * vec2(3.0, 18.0) + pr.seed * 9.0)) * 0.35;      // a little grain
}`,
});

registerProp({
  id: 'scarecrow', reach: 0.82, height: 2.25, collide: 0.2, map: [0.7, 0.4, 0.3],
  glsl: /* glsl */ `
float sdf_scarecrow(vec3 q, Prop pr, out float mat) {
  float pole = min(sdCylinder(q, 0.05, 1.9), sdCapsule(q, vec3(-0.75, 1.35, 0.0), vec3(0.75, 1.35, 0.0), 0.045));
  float shirt = min(sdRoundBox(q - vec3(0.0, 1.12, 0.0), vec3(0.3, 0.36, 0.13), 0.08), sdCapsule(q, vec3(-0.62, 1.35, 0.0), vec3(0.62, 1.35, 0.0), 0.1));
  float head = length(q - vec3(0.0, 1.78, 0.0)) - 0.2;
  float hat = min(sdCylinder(q - vec3(0.0, 1.9, 0.0), 0.36, 0.035), sdConeUp(q - vec3(0.0, 1.9, 0.0), 0.2, 0.3));
  mat = 0.0;
  float d = pole;
  if (shirt < d) { d = shirt; mat = 1.0; }
  if (head < d) { d = head; mat = 2.0; }
  if (hat < d) { d = hat; mat = 3.0; }
  return d;
}
void mat_scarecrow(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_BARK; s.cover = 0.8; }
  else if (mat < 1.5) {
    s.albedo = pr.seed < 0.5 ? P_BRICK : P_SLATE; s.cover = 0.8;
    s.ink = penLine(max(abs(q.x - 0.1) - 0.09, abs(q.y - 1.05) - 0.09)) * 0.7;     // a patch
  } else if (mat < 2.5) {
    s.albedo = P_TAN; s.cover = 0.4;
    vec2 e = vec2(abs(q.x) - 0.07, q.y - 1.8);
    s.ink = max(penLine(abs(e.x) - abs(e.y)) * step(max(abs(e.x), abs(e.y)), 0.04), penLine(q.y - 1.7) * step(abs(q.x), 0.07)) * step(0.0, q.z);
  } else { s.albedo = mix(P_WOOD, P_HONEY, 0.4); s.cover = 0.75; }
}`,
});

registerProp({
  id: 'windmill', reach: 2.35, height: 6.2, collide: 1.25, map: [0.85, 0.8, 0.7],
  glsl: /* glsl */ `
float sdf_windmill(vec3 q, Prop pr, out float mat) {
  float tower = max(sdTaper(q, vec3(0.0), vec3(0.0, 4.2, 0.0), 1.05, 0.7), q.y - 4.2);
  float cap = sdConeUp(q - vec3(0.0, 4.2, 0.0), 0.86, 0.9);
  // four sails on the +z face, turning (a new drawing twelve times a second)
  vec3 h = q - vec3(0.0, 3.9, 0.9);
  h.xy = rot2(floor(uTime * 12.0) / 12.0 * 0.55 + pr.seed * 6.0) * h.xy;
  h.xy = abs(h.xy);
  if (h.y > h.x) h.xy = h.yx;
  float sails = min(sdBox(h - vec3(1.25, 0.15, 0.0), vec3(0.92, 0.2, 0.025)), sdBox(h - vec3(1.1, 0.0, 0.0), vec3(1.15, 0.035, 0.035)));
  sails = min(sails, sdCapsule(q, vec3(0.0, 3.9, 0.6), vec3(0.0, 3.9, 0.98), 0.09));
  mat = 0.0;
  float d = tower;
  if (cap < d) { d = cap; mat = 1.0; }
  if (sails < d) { d = sails; mat = 2.0; }
  return d * 0.85;
}
void mat_windmill(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) {            // sails: a lattice of laths with cloth over it
    vec3 h = q - vec3(0.0, 3.9, 0.9);
    h.xy = rot2(floor(uTime * 12.0) / 12.0 * 0.55 + pr.seed * 6.0) * h.xy;
    h.xy = abs(h.xy);
    if (h.y > h.x) h.xy = h.yx;
    s.albedo = P_CREAM; s.cover = 0.14;
    s.ink = max(penLine((abs(fract(h.x * 4.0) - 0.5)) / 4.0), penLine(h.y - 0.15)) * 0.6 * step(0.05, h.y);
    if (h.y < 0.05) { s.albedo = P_BARK; s.cover = 0.85; }
    return;
  }
  if (mat > 0.5) { s.albedo = pr.seed < 0.5 ? P_SLATE : mix(P_BRICK, P_POPPY, 0.4); s.cover = 0.82; s.ink = penLine((abs(fract(q.y * 5.0) - 0.5)) / 5.0) * 0.5; return; }
  // a plastered tower: paper, with courses of stone showing near the foot, a door and a window
  s.albedo = P_CREAM; s.cover = 0.14;
  float a = atan(q.x, q.z);
  vec2 pv = pavers(vec2(a * 3.0, q.y * 2.6));
  float foot = smoothstep(1.4, 0.3, q.y);
  if (foot > 0.4) { s.albedo = fract(pv.y * 5.3) < 0.5 ? P_PEACH : P_CLAY; s.cover = mix(0.3, 0.65, pv.y); }
  s.ink = penLine(0.5 * pv.x / 2.6) * 0.7 * foot;
  float door = max(abs(a) * 1.0 - 0.3, q.y - 1.35);
  if (door < 0.0) { s.albedo = mix(P_BARK, P_UMBER, 0.35); s.cover = 0.82; }
  float win = max(abs(a) - 0.2, abs(q.y - 2.7) - 0.26);
  if (win < 0.0) { s.albedo = P_SLATE; s.cover = mix(0.72, 0.0, uNight); s.glow = uNight; }
  s.ink = max(s.ink, max(penLine(door * 0.9), penLine(win * 0.8)) * 0.85);
}`,
});

registerProp({
  id: 'tent', reach: 1.62, height: 1.5, collide: 1.2, map: [0.85, 0.75, 0.6],
  glsl: /* glsl */ `
float sdf_tent(vec3 q, Prop pr, out float mat) {
  // a ridge tent: a prism along x, a pole at each end
  float side = dot(vec2(abs(q.z), q.y) - vec2(1.05, 0.0), vec2(0.795, 0.607));
  float cloth = max(max(side, -q.y), abs(q.x) - 1.2);
  float poles = sdCylinder(vec3(abs(q.x) - 1.2, q.y, q.z), 0.04, 1.52);
  mat = poles < cloth ? 1.0 : 0.0;
  return min(cloth, poles);
}
void mat_tent(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_BARK; s.cover = 0.85; return; }
  // canvas left as paper, with broad stripes of one pencil
  float stripe = step(0.5, fract(q.x * 1.25 + 0.25));
  s.albedo = pr.seed < 0.4 ? P_BRICK : (pr.seed < 0.75 ? P_SLATE : P_SAGE);
  s.cover = mix(0.08, 0.8, stripe);
  s.ink = penLine((abs(fract(q.x * 2.5 + 0.5) - 0.5)) / 2.5) * 0.45;
  // the open end
  float side = dot(vec2(abs(q.z), q.y) - vec2(1.05, 0.0), vec2(0.795, 0.607));
  if (abs(q.x) > 1.19 && side < -0.34) { s.albedo = P_UMBER; s.cover = 0.92; s.ink = 0.0; }
  if (abs(q.x) > 1.19) s.ink = max(s.ink, penLine(side + 0.34) * 0.8);
}`,
});

registerProp({
  id: 'campfire', reach: 0.68, height: 0.95, collide: 0.5, map: [0.9, 0.5, 0.3],
  light: { color: [1.0, 0.7, 0.36], radius: 8, y: 0.6, always: true },
  glsl: /* glsl */ `
float sdf_campfire(vec3 q, Prop pr, out float mat) {
  // a ring of stones, crossed logs, and a flame redrawn twelve times a second
  float sec = TAU / 7.0;
  float ca = floor(atan(q.z, q.x) / sec + 0.5) * sec;
  float stones = length(q - vec3(cos(ca) * 0.5, 0.07, sin(ca) * 0.5)) - 0.13;
  float logs = min(sdCapsule(q, vec3(-0.3, 0.1, -0.12), vec3(0.3, 0.16, 0.14), 0.07), sdCapsule(q, vec3(-0.14, 0.12, 0.28), vec3(0.16, 0.16, -0.3), 0.07));
  float tk = floor(uTime * 12.0);
  float fl = 0.5 + 0.12 * sin(tk * 2.1 + pr.seed * 9.0);
  vec3 f = q - vec3(0.03 * sin(tk * 1.7), 0.2, 0.0);
  float flame = sdEllipsoid(f - vec3(0.0, fl * 0.5, 0.0), vec3(0.17, fl * 0.55, 0.17));
  mat = 0.0;
  float d = stones;
  if (logs < d) { d = logs; mat = 1.0; }
  if (flame < d) { d = flame; mat = 2.0; }
  return d * 0.9;
}
void mat_campfire(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = uRockCol; s.cover = 0.7; }
  else if (mat < 1.5) { s.albedo = P_UMBER; s.cover = 0.9; }
  else {
    // fire is the paper with a rim of apricot and poppy
    float rim = smoothstep(0.03, 0.14, length(q.xz));
    s.albedo = mix(P_SUN, P_POPPY, smoothstep(0.25, 0.75, q.y));
    s.cover = mix(0.08, 0.85, rim);
    s.glow = 0.5 * (1.0 - rim);
    s.soft = 1.0;
  }
}`,
});

registerProp({
  id: 'pillar', reach: 0.62, height: 3.5, collide: 0.42, map: [0.82, 0.74, 0.66],
  glsl: /* glsl */ `
float sdf_pillar(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float h = 1.0 + 2.4 * pr.seed;                                  // each broke off at its own height
  float shaft = sdCylinder(q, 0.3 + 0.02 * cos(atan(q.z, q.x) * 10.0), h);
  shaft = max(shaft, dot(q - vec3(0.0, h - 0.15, 0.0), vec3(0.432, 0.864, 0.259)));
  float base = sdBox(q - vec3(0.0, 0.1, 0.0), vec3(0.42, 0.1, 0.42));
  return min(shaft, base) * 0.9;
}
void mat_pillar(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mix(P_PEACH, P_STONE, 0.4 + 0.3 * vnoise(q.xy * 3.0 + pr.seed * 9.0));
  s.cover = 0.46;
  s.ink = max(penLine((abs(fract(atan(q.z, q.x) * 1.6) - 0.5)) / 1.6 * 0.3) * 0.5 * step(0.2, q.y),      // flutes
              penLine((abs(fract(q.y * 0.9 + pr.seed) - 0.5)) / 0.9) * 0.7);                            // drum joints
  s.moss = 0.8;
}`,
});

registerProp({
  id: 'signpost', reach: 0.78, height: 1.75, collide: 0.15, map: [0.7, 0.55, 0.35],
  glsl: /* glsl */ `
float sdf_signpost(vec3 q, Prop pr, out float mat) {
  float post = sdCylinder(q, 0.06, 1.7);
  float boards = min(sdBox(q - vec3(0.28, 1.45, 0.0), vec3(0.42, 0.13, 0.03)), sdBox(q - vec3(-0.25, 1.1, 0.0), vec3(0.38, 0.12, 0.03)));
  mat = boards < post ? 1.0 : 0.0;
  return min(post, boards);
}
void mat_signpost(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_BARK; s.cover = 0.8; return; }
  s.albedo = P_WOOD; s.cover = 0.35;
  // a line or two of lettering, too small to read
  float row = q.y > 1.3 ? q.y - 1.45 : q.y - 1.1;
  s.ink = penLine(row + 0.02 * sin(q.x * 40.0)) * step(0.3, fract(q.x * 3.1 + pr.seed)) * 0.8;
}`,
});

// ---------------------------------------------------------------- what the survey corps builds

registerProp({
  id: 'pad', reach: 2.6, height: 0.6, collide: 0, map: [0.6, 0.85, 0.95],
  light: { color: [0.6, 0.9, 1.0], radius: 7, y: 0.8, always: true },
  glsl: /* glsl */ `
float sdf_pad(vec3 q, Prop pr, out float mat) {
  // a low dais of dressed stone with three emitters round it: where you arrive, and where you are lifted out
  float dais = min(sdCylinder(q, 2.45, 0.14), sdCylinder(q - vec3(0.0, 0.1, 0.0), 1.95, 0.1));
  vec3 e = q; float a = atan(e.x, e.z), k = TAU / 3.0;
  a = mod(a + k * 0.5, k) - k * 0.5;
  e.xz = length(q.xz) * vec2(sin(a), cos(a));
  float post = min(sdTaper(e, vec3(0.0, 0.0, 2.2), vec3(0.0, 0.5, 2.2), 0.17, 0.11), sdSphere(e - vec3(0.0, 0.62, 2.2), 0.12));
  mat = post < dais ? (e.y > 0.5 ? 2.0 : 1.0) : 0.0;
  return min(dais, post);
}
void mat_pad(vec3 q, float mat, Prop pr, inout Surf s) {
  vec3 lightCol = pr.pal > 0.5 ? P_APRICOT : P_SKY;      // the way out is marked in apricot
  if (mat > 1.5) { s.albedo = lightCol; s.cover = 0.35; s.glow = 1.0; return; }
  if (mat > 0.5) { s.albedo = P_SLATE; s.cover = 0.7; return; }
  float r = length(q.xz);
  s.albedo = mix(P_STONE, P_CREAM, 0.55); s.cover = 0.34; s.soft = 1.0;
  // rings cut in the stone, and the lit ones between them
  s.ink = max(penLine(r - 1.95), max(penLine(r - 1.3), penLine(r - 0.55))) * 0.8;
  float lit = smoothstep(0.12, 0.06, abs(r - 1.62)) + smoothstep(0.1, 0.05, abs(r - 0.92));
  float turn = step(0.5, fract(atan(q.x, q.z) / TAU * 12.0 + uTime * 0.12));
  s.albedo = mix(s.albedo, lightCol, saturate(lit));
  s.cover = mix(s.cover, 0.75 * mix(0.55, 1.0, turn), saturate(lit));
}`,
});

registerProp({
  id: 'gate', reach: 2.75, height: 2.9, collide: 0, map: [0.5, 0.75, 0.95],
  glsl: /* glsl */ `
float sdf_gate(vec3 q, Prop pr, out float mat) {
  // two posts across the bridge and, while it is shut (palette 0), a lattice of light between them
  vec3 e = vec3(abs(q.x) - 2.42, q.y, q.z);
  float post = min(sdTaper(e, vec3(0.0), vec3(0.0, 2.3, 0.0), 0.22, 0.15), sdRoundBox(e - vec3(0.0, 2.45, 0.0), vec3(0.22, 0.16, 0.22), 0.05));
  float foot = sdRoundBox(e - vec3(0.0, 0.12, 0.0), vec3(0.3, 0.12, 0.3), 0.04);
  float lamp = sdSphere(e - vec3(0.0, 2.72, 0.0), 0.13);
  float d = min(min(post, foot), lamp);
  mat = lamp < min(post, foot) ? 2.0 : 0.0;
  if (pr.pal < 0.5) {
    float field = sdBox(q - vec3(0.0, 1.22, 0.0), vec3(2.25, 1.05, 0.03));
    if (field < d) { d = field; mat = 1.0; }
  }
  return d;
}
void mat_gate(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) { s.albedo = pr.pal < 0.5 ? P_VERMILION : P_LEAF; s.cover = 0.75; s.glow = 0.4; return; }
  if (mat > 0.5) {
    // the field: mostly paper, a ruled lattice in blue that drifts upward
    vec2 g = vec2(q.x + q.y, q.x - q.y) * 2.2 + vec2(uTime * 0.5, -uTime * 0.5);
    float lat = max(penLine((fract(g.x) - 0.5) * 0.45), penLine((fract(g.y) - 0.5) * 0.45));
    s.albedo = P_SKY; s.cover = 0.3 + 0.25 * lat; s.soft = 1.0; s.ink = lat * 0.55;
    return;
  }
  s.albedo = mix(P_STONE, P_CREAM, 0.5); s.cover = 0.5;
  s.ink = max(penLine(q.y - 0.55), penLine(q.y - 2.0)) * 0.7;
  if (q.y > 0.7 && q.y < 1.85 && abs(abs(q.x) - 2.42) < 0.07) { s.albedo = P_SLATE; s.cover = 0.75; }     // a dark inlay up each post
}`,
});

registerProp({
  id: 'pod', reach: 0.8, height: 1.3, collide: 0.55, map: [0.95, 0.75, 0.4],
  glsl: /* glsl */ `
float sdf_pod(vec3 q, Prop pr, out float mat) {
  // a supply pod dropped ahead of the survey: a capsule on three feet. Palette 1 = opened: the cap stands off, askew
  vec3 e = q; float a = atan(e.x, e.z), k = TAU / 3.0;
  a = mod(a + k * 0.5, k) - k * 0.5;
  e.xz = length(q.xz) * vec2(sin(a), cos(a));
  float feet = sdTaper(e, vec3(0.0, 0.0, 0.52), vec3(0.0, 0.34, 0.3), 0.07, 0.06);
  float low = max(sdEllipsoid(q - vec3(0.0, 0.66, 0.0), vec3(0.46, 0.5, 0.46)), q.y - 0.72);
  vec3 c = q - vec3(0.0, 0.72, 0.0);
  if (pr.pal > 0.5) { c -= vec3(0.34, 0.22, 0.0); c.xy = rot2(-0.75) * c.xy; }
  float cap = max(sdEllipsoid(c - vec3(0.0, -0.06, 0.0), vec3(0.46, 0.5, 0.46)), -c.y);
  float band = sdCylinder(q - vec3(0.0, 0.6, 0.0), 0.485, 0.1);
  float hollow = pr.pal > 0.5 ? sdCylinder(q - vec3(0.0, 0.5, 0.0), 0.36, 0.3) : 1e3;
  low = max(low, -hollow);
  float d = min(min(feet, low), min(cap, band));
  mat = d == band ? 2.0 : (d == cap ? 1.0 : (d == feet ? 3.0 : 0.0));
  return d * 0.9;
}
void mat_pod(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 2.5) { s.albedo = P_SLATE; s.cover = 0.75; return; }
  if (mat > 1.5) { s.albedo = pr.pal > 0.5 ? P_STONE : P_APRICOT; s.cover = pr.pal > 0.5 ? 0.4 : 0.85; s.ink = penLine(fract(atan(q.x, q.z) / TAU * 8.0) - 0.5) * 0.5; return; }
  s.albedo = mix(P_CREAM, P_STONE, 0.25 + 0.2 * mat); s.cover = 0.4; s.soft = 1.0;
  if (pr.pal > 0.5 && mat < 0.5 && q.y > 0.6 && length(q.xz) < 0.38) { s.albedo = P_CHARCOAL; s.cover = 0.85; }     // the emptied inside
  s.ink = penLine(abs(q.x) - 0.2) * 0.35 * step(0.8, q.y) * (1.0 - step(0.5, pr.pal));
}`,
});

registerProp({
  id: 'console', reach: 1.05, height: 2.3, collide: 0.75, map: [0.5, 0.8, 0.95],
  light: { color: [0.6, 0.9, 1.0], radius: 5.5, y: 1.7, always: true },
  glsl: /* glsl */ `
float sdf_console(vec3 q, Prop pr, out float mat) {
  // the dispatcher's board: a desk of keys, and a sheet of light standing over it with the day's contracts
  float desk = sdRoundBox(q - vec3(0.0, 0.42, 0.0), vec3(0.62, 0.42, 0.32), 0.05);
  vec3 k = q - vec3(0.0, 0.9, 0.08); k.yz = rot2(0.5) * k.yz;
  float keys = sdRoundBox(k, vec3(0.56, 0.035, 0.24), 0.02);
  vec3 sc = q - vec3(0.0, 1.62, -0.12); sc.yz = rot2(-0.16) * sc.yz;
  float sheet = sdBox(sc, vec3(0.98, 0.56, 0.02));
  float arms = min(sdCapsule(vec3(abs(q.x), q.yz), vec3(0.9, 0.86, -0.2), vec3(0.98, 1.1, -0.14), 0.035), 1e3);
  float d = min(min(desk, keys), min(sheet, arms));
  mat = d == sheet ? 2.0 : (d == keys ? 1.0 : 0.0);
  return d;
}
void mat_console(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) {
    // light: paper, ruled with lines of writing and one framed chart
    vec3 sc = q - vec3(0.0, 1.62, -0.12);
    float rows = penLine((fract(sc.y * 5.5 + uTime * 0.04) - 0.5) * 0.18) * step(sc.x, 0.15) * step(-0.85, sc.x) * step(0.3, fract(sc.x * 2.3 + floor(sc.y * 5.5) * 0.37));
    float chart = penLine(max(abs(sc.x - 0.55) - 0.3, abs(sc.y) - 0.36));
    s.albedo = P_SKY; s.cover = 0.22 + 0.5 * max(rows, chart); s.soft = 1.0; s.glow = 0.55; s.ink = max(rows, chart) * 0.35;
    return;
  }
  if (mat > 0.5) { s.albedo = P_SLATE; s.cover = 0.8; s.ink = penLine((fract(q.x * 7.0) - 0.5) * 0.14) * 0.5; return; }
  s.albedo = mix(P_STONE, P_CREAM, 0.55); s.cover = 0.38; s.soft = 1.0;
  s.ink = max(penLine(q.y - 0.7), penLine(abs(q.x) - 0.42)) * 0.7;
  if (q.y > 0.2 && q.y < 0.32) { s.albedo = P_VERMILION; s.cover = 0.8; }
}`,
});

registerProp({
  id: 'crate', reach: 0.72, height: 1.45, collide: 0.62, map: [0.8, 0.8, 0.85],
  glsl: /* glsl */ `
float sdf_crate(vec3 q, Prop pr, out float mat) {
  // cargo: one case, and on some a smaller one stacked askew
  float a = sdRoundBox(q - vec3(0.0, 0.42, 0.0), vec3(0.5, 0.42, 0.5), 0.04);
  vec3 t = q - vec3(0.08, 1.1, -0.06); t.xz = rot2(0.5) * t.xz;
  float b = pr.seed > 0.45 ? sdRoundBox(t, vec3(0.33, 0.26, 0.33), 0.03) : 1e3;
  mat = b < a ? 1.0 : 0.0;
  return min(a, b);
}
void mat_crate(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mat > 0.5 ? P_APRICOT : mix(P_STONE, P_CREAM, 0.45); s.cover = mat > 0.5 ? 0.6 : 0.4; s.soft = 1.0;
  // the frame of each face, and a strap
  float e = mat > 0.5 ? 0.0 : max(penLine(max(abs(q.x), abs(q.z)) - 0.4), penLine(abs(q.y - 0.42) - 0.3));
  s.ink = max(e * 0.6, penLine(abs(q.x) - 0.12) * 0.5 * (1.0 - mat));
  if (mat < 0.5 && abs(q.x) < 0.12) { s.albedo = P_SLATE; s.cover = 0.7; }
}`,
});

registerProp({
  id: 'shuttle', reach: 3.4, height: 2.7, collide: 2.3, map: [0.9, 0.9, 0.95],
  glsl: SHUTTLE_GLSL + /* glsl */ `
// a drop shuttle at rest on its skids (the model itself is in gfx/glsl/shuttle.js)
float sdf_shuttle(vec3 q, Prop pr, out float mat) { return shuttleMap(q - vec3(0.0, 1.05, 0.0), 0.0, mat); }
void mat_shuttle(vec3 q, float mat, Prop pr, inout Surf s) { shuttleSurf(q - vec3(0.0, 1.05, 0.0), mat, 0.0, P_VERMILION, s); }`,
});

// ---------------------------------------------------------------- the town

registerProp({
  id: 'hall', reach: 4.0, height: 5.4, collide: 3.5, map: [0.9, 0.9, 0.95],
  light: { color: [0.6, 0.9, 1.0], radius: 9, y: 4.6, always: true },
  glsl: /* glsl */ `
float sdf_hall(vec3 q, Prop pr, out float mat) {
  // the contract hall: a round drum under a shallow dome, a porch with a tall door, a lantern on top
  float drum = sdCylinder(q, 3.3, 2.6);
  float dome = max(sdEllipsoid(q - vec3(0.0, 2.55, 0.0), vec3(3.45, 1.7, 3.45)), 2.5 - q.y);
  float lantern = min(sdCylinder(q - vec3(0.0, 4.05, 0.0), 0.55, 0.5), sdSphere(q - vec3(0.0, 4.85, 0.0), 0.33));
  float porch = sdRoundBox(q - vec3(0.0, 1.2, 3.25), vec3(1.25, 1.2, 0.55), 0.08);
  float foot = sdCylinder(q, 3.75, 0.16);
  float d = min(min(drum, dome), min(lantern, min(porch, foot)));
  mat = d == dome ? 1.0 : (d == lantern ? 2.0 : (d == porch ? 3.0 : (d == foot ? 4.0 : 0.0)));
  return d;
}
void mat_hall(vec3 q, float mat, Prop pr, inout Surf s) {
  float ang = atan(q.x, q.z);
  if (mat > 3.5) { s.albedo = P_STONE; s.cover = 0.5; s.ink = penLine(length(q.xz) - 3.5) * 0.6; return; }
  if (mat > 2.5) {
    // the porch: white, the door a dark panel with a line of light down its middle
    s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0;
    if (abs(q.x) < 0.72 && q.y < 2.0 && q.z > 3.6) { s.albedo = P_SLATE; s.cover = 0.85; if (abs(q.x) < 0.035) { s.albedo = P_SKY; s.cover = 0.2; s.glow = 0.7; } }
    s.ink = max(penLine(max(abs(q.x) - 0.72, q.y - 2.0)), penLine(q.y - 2.2)) * 0.8;
    if (q.y > 2.2) { s.albedo = P_VERMILION; s.cover = 0.82; }
    return;
  }
  if (mat > 1.5) { s.albedo = P_SKY; s.cover = 0.25; s.glow = 0.8; return; }
  if (mat > 0.5) {
    // the dome: slate plates meeting at the lantern, ribs in pen
    s.albedo = mix(P_SLATE, P_TEAL, 0.35); s.cover = 0.66; s.soft = 1.0;
    s.ink = max(penLine((fract(ang / TAU * 12.0) - 0.5) * length(q.xz) * 0.5), penLine(q.y - 3.4)) * 0.6;
    return;
  }
  // the drum: white wall, the corps' band under the eaves, a ring of tall windows
  s.albedo = P_SKY; s.cover = 0.09; s.soft = 1.0; s.wrap = 0.2;
  float cell = fract(ang / TAU * 12.0) - 0.5;
  float win = max(abs(cell) * 3.3 * 1.7 - 0.32, abs(q.y - 1.3) - 0.55);
  if (win < 0.0) { s.albedo = P_SLATE; s.cover = 0.8 * (1.0 - smoothstep(0.05, 0.0, abs(cell * 5.0 + q.y - 1.5))); }
  s.ink = max(penLine(win), penLine(q.y - 0.4) * 0.6) * 0.8;
  if (q.y > 2.12 && q.y < 2.42) { s.albedo = P_VERMILION; s.cover = 0.82; s.ink = 0.0; }
}`,
});

registerProp({
  id: 'hab', reach: 2.25, height: 2.7, collide: 1.95, map: [0.9, 0.85, 0.8],
  glsl: /* glsl */ `
float sdf_hab(vec3 q, Prop pr, out float mat) {
  // a living pod: a low dome on a ring wall, a door, a vent pipe. Palette picks the dome's colour.
  float wall = sdCylinder(q, 1.9, 1.05);
  float dome = max(sdEllipsoid(q - vec3(0.0, 1.0, 0.0), vec3(1.97, 1.3, 1.97)), 0.98 - q.y);
  float door = sdRoundBox(q - vec3(0.0, 0.72, 1.82), vec3(0.5, 0.72, 0.18), 0.06);
  float vent = min(sdCylinder(q - vec3(0.7, 1.7, -0.5), 0.16, 0.7), sdCylinder(q - vec3(0.7, 2.36, -0.5), 0.24, 0.08));
  float d = min(min(wall, dome), min(door, vent));
  mat = d == dome ? 1.0 : (d == door ? 2.0 : (d == vent ? 3.0 : 0.0));
  return d;
}
void mat_hab(vec3 q, float mat, Prop pr, inout Surf s) {
  float ang = atan(q.x, q.z);
  if (mat > 2.5) { s.albedo = P_STONE; s.cover = 0.6; return; }
  if (mat > 1.5) { s.albedo = P_SLATE; s.cover = 0.84; s.ink = penLine(max(abs(q.x) - 0.42, q.y - 1.3)) * 0.6; if (abs(q.y - 1.05) < 0.1 && abs(q.x) < 0.2) { s.albedo = P_SKY; s.cover = 0.2; s.glow = 0.6; } return; }
  if (mat > 0.5) {
    s.albedo = pr.pal < 0.5 ? P_BRICK : (pr.pal < 1.5 ? mix(P_TEAL, P_PINE, 0.4) : (pr.pal < 2.5 ? P_HONEY : P_SLATE));
    s.cover = 0.74; s.soft = 1.0;
    s.ink = max(penLine((fract(ang / TAU * 8.0 + 0.06) - 0.5) * length(q.xz) * 0.7), penLine(q.y - 1.75)) * 0.55;
    return;
  }
  // the ring wall: white, a round window either side of the door, a dark foot
  s.albedo = P_SKY; s.cover = 0.09; s.soft = 1.0; s.wrap = 0.2;
  float side = abs(ang) - 1.15;
  float port = length(vec2(side * 1.9, q.y - 0.62)) - 0.26;
  if (port < 0.0) { s.albedo = P_SLATE; s.cover = 0.8 * (1.0 - smoothstep(0.04, 0.0, abs(side * 1.9 + q.y - 0.7))); }
  s.ink = max(penLine(port), penLine(q.y - 0.16) * 0.6) * 0.8;
  if (q.y < 0.16) { s.albedo = P_STONE; s.cover = 0.55; }
}`,
});

registerProp({
  id: 'kiosk', reach: 1.85, height: 2.8, collide: 1.35, map: [0.9, 0.7, 0.4],
  glsl: /* glsl */ `
float sdf_kiosk(vec3 q, Prop pr, out float mat) {
  // a trader's booth: a counter with goods on it, a back wall of shelves, a striped awning on two posts
  float counter = sdRoundBox(q - vec3(0.0, 0.5, 0.45), vec3(1.25, 0.5, 0.33), 0.05);
  float back = sdRoundBox(q - vec3(0.0, 1.15, -0.6), vec3(1.3, 1.15, 0.12), 0.04);
  float posts = sdCapsule(vec3(abs(q.x), q.yz), vec3(1.28, 0.0, 0.78), vec3(1.28, 2.15, 0.78), 0.05);
  vec3 a = q - vec3(0.0, 2.3, 0.2); a.yz = rot2(-0.2) * a.yz;
  float awning = sdRoundBox(a, vec3(1.5, 0.045, 0.95), 0.03);
  float goods = min(sdRoundBox(q - vec3(-0.65, 1.14, 0.45), vec3(0.2, 0.14, 0.18), 0.03), min(sdSphere(q - vec3(0.1, 1.13, 0.42), 0.15), sdCylinder(q - vec3(0.72, 1.0, 0.45), 0.12, 0.34)));
  float d = min(min(counter, back), min(min(posts, awning), goods));
  mat = d == awning ? 1.0 : (d == goods ? 2.0 : (d == back ? 3.0 : (d == posts ? 4.0 : 0.0)));
  return d;
}
void mat_kiosk(vec3 q, float mat, Prop pr, inout Surf s) {
  vec3 tint = pr.pal < 0.5 ? P_VERMILION : (pr.pal < 1.5 ? P_TEAL : P_HONEY);
  if (mat > 3.5) { s.albedo = P_STONE; s.cover = 0.6; return; }
  if (mat > 2.5) { s.albedo = P_SLATE; s.cover = 0.8; s.ink = max(penLine(fract(q.y * 1.6) - 0.5), penLine(abs(q.x) - 0.6) * 0.5) * 0.5; return; }
  if (mat > 1.5) { s.albedo = q.x < -0.3 ? P_APRICOT : (q.x < 0.4 ? P_SKY : P_LEAF); s.cover = 0.75; return; }
  if (mat > 0.5) { float stripe = step(0.5, fract(q.x * 1.4 + 0.25)); s.albedo = mix(P_SKY, tint, stripe); s.cover = mix(0.1, 0.84, stripe); s.soft = 1.0; s.ink = penLine((fract(q.x * 1.4 + 0.25) - 0.5) / 1.4) * 0.5; return; }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0;
  s.ink = max(penLine(q.y - 0.86), penLine(abs(q.x) - 0.62) * 0.5) * 0.75;
  if (q.y > 0.86) { s.albedo = tint; s.cover = 0.84; }
}`,
});

registerProp({
  id: 'spire', reach: 1.45, height: 9.1, collide: 1.25, map: [0.6, 0.9, 1.0],
  light: { color: [0.6, 0.9, 1.0], radius: 14, y: 8.2, always: true },
  glsl: /* glsl */ `
float sdf_spire(vec3 q, Prop pr, out float mat) {
  // the survey beacon: a slim mast on a wide stepped foot, three hoops of light up it, a lamp at the tip
  float foot = min(sdCylinder(q, 1.35, 0.3), sdCylinder(q - vec3(0.0, 0.3, 0.0), 1.0, 0.3));
  float base = sdTaper(q, vec3(0.0, 0.6, 0.0), vec3(0.0, 1.9, 0.0), 0.7, 0.38);
  float mast = sdTaper(q, vec3(0.0, 1.9, 0.0), vec3(0.0, 8.1, 0.0), 0.36, 0.12);
  float hoops = min(sdTorusY(q - vec3(0.0, 3.1, 0.0), 0.72, 0.06), min(sdTorusY(q - vec3(0.0, 5.0, 0.0), 0.58, 0.055), sdTorusY(q - vec3(0.0, 6.7, 0.0), 0.44, 0.05)));
  float lamp = sdSphere(q - vec3(0.0, 8.5, 0.0), 0.3);
  float d = min(min(foot, base), min(mast, min(hoops, lamp)));
  mat = (d == hoops || d == lamp) ? 1.0 : (d == foot ? 2.0 : 0.0);
  return d * 0.9;
}
void mat_spire(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_STONE; s.cover = 0.5; s.ink = max(penLine(length(q.xz) - 1.0), penLine(q.y - 0.3)) * 0.6; return; }
  if (mat > 0.5) { s.albedo = P_SKY; s.cover = 0.4 * (0.6 + 0.4 * sin(uTime * 1.6 - q.y * 1.3)); s.glow = 0.75; return; }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0; s.wrap = 0.2;
  s.ink = max(penLine(q.y - 1.9), penLine(fract(q.y * 0.6) - 0.5) * 0.4) * 0.7;
  if (q.y > 1.5 && q.y < 1.9) { s.albedo = P_VERMILION; s.cover = 0.82; }
  if (q.y > 7.7) { s.albedo = P_SLATE; s.cover = 0.7; }
}`,
});

registerProp({
  id: 'bench', reach: 0.95, height: 0.6, collide: 0.55, map: [0.8, 0.8, 0.85],
  glsl: /* glsl */ `
float sdf_bench(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float seat = sdRoundBox(q - vec3(0.0, 0.42, 0.0), vec3(0.85, 0.05, 0.26), 0.03);
  float legs = sdRoundBox(vec3(abs(q.x) - 0.62, q.y - 0.2, q.z), vec3(0.06, 0.2, 0.22), 0.02);
  if (legs < seat) mat = 1.0;
  return min(seat, legs);
}
void mat_bench(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_SLATE; s.cover = 0.75; return; }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0; s.ink = penLine(abs(q.z) - 0.09) * 0.5;
}`,
});

registerProp({
  id: 'planter', reach: 0.85, height: 1.5, collide: 0.62, map: [0.4, 0.7, 0.45],
  glsl: /* glsl */ `
float sdf_planter(vec3 q, Prop pr, out float mat) {
  // a tub of dressed stone with a clipped shrub in it
  float tub = max(sdCylinder(q, 0.62, 0.5), -sdCylinder(q - vec3(0.0, 0.4, 0.0), 0.5, 0.3));
  float shrub = sdEllipsoid(q - vec3(0.0, 0.9, 0.0), vec3(0.55, 0.5, 0.55)) + 0.04 * sin(q.x * 9.0 + pr.seed * 20.0) * sin(q.z * 8.0) * sin(q.y * 7.0);
  mat = shrub < tub ? 1.0 : 0.0;
  return min(tub, shrub) * 0.9;
}
void mat_planter(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = uLeafPal[int(pr.pal + 0.5)]; s.cover = 0.78; s.soft = 1.0; s.leafy = 1.0; return; }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0;
  s.ink = max(penLine(q.y - 0.4), penLine(q.y - 0.1)) * 0.6;
  if (q.y > 0.36) { s.albedo = P_STONE; s.cover = 0.5; }
}`,
});

registerProp({
  id: 'banner', reach: 0.75, height: 3.4, collide: 0.12, map: [0.9, 0.4, 0.3],
  glsl: /* glsl */ `
float sdf_banner(vec3 q, Prop pr, out float mat) {
  // a pole with a long pennant that moves in the wind
  float pole = min(sdCylinder(q, 0.045, 3.3), sdCylinder(q, 0.14, 0.12));
  vec3 f = q - vec3(0.0, 2.4, 0.0);
  f.z += 0.06 * sin(uTime * 2.2 + f.x * 5.0 + pr.seed * 9.0) * f.x * 1.6;
  float flag = sdBox(f - vec3(0.32, 0.0, 0.0), vec3(0.3, 0.72 - f.x * 0.5, 0.012));
  mat = flag < pole ? 1.0 : 0.0;
  return min(pole, flag) * 0.8;
}
void mat_banner(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_STONE; s.cover = 0.6; return; }
  s.albedo = pr.pal < 0.5 ? P_VERMILION : (pr.pal < 1.5 ? P_TEAL : P_HONEY); s.cover = 0.84; s.soft = 1.0;
  // the corps' mark: a ring left as paper
  float ring = abs(length(vec2(q.x - 0.3, q.y - 2.55)) - 0.13) - 0.03;
  if (ring < 0.0) s.cover = 0.08;
}`,
});

// ---------------------------------------------------------------- the Underhalls

registerProp({
  id: 'column', reach: 0.62, height: 3.6, collide: 0.45, scale: [0.95, 1.15], map: [0.7, 0.66, 0.6],
  glsl: /* glsl */ `
float sdf_column(vec3 q, Prop pr, out float mat) {
  // a dressed column: a square plinth, a fluted shaft, a square cap. One in four has lost its top.
  mat = 0.0;
  bool whole = pr.seed < 0.75;
  float h = whole ? 3.2 : 1.3 + 1.2 * fract(pr.seed * 7.0);
  float shaft = sdCylinder(q, 0.27 + 0.016 * cos(atan(q.z, q.x) * 12.0), h);
  if (!whole) shaft = max(shaft, dot(q - vec3(0.0, h - 0.12, 0.0), vec3(0.43, 0.86, 0.26)));
  float ends = sdBox(q - vec3(0.0, 0.14, 0.0), vec3(0.42, 0.14, 0.42));
  if (whole) ends = min(ends, sdBox(q - vec3(0.0, 3.3, 0.0), vec3(0.44, 0.13, 0.44)));
  return min(shaft, ends) * 0.9;
}
void mat_column(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mix(P_STONE, P_CREAM, 0.35 + 0.25 * vnoise(q.xy * 3.0 + pr.seed * 9.0));
  s.cover = 0.5;
  s.ink = max(penLine((abs(fract(atan(q.z, q.x) * 1.9) - 0.5)) / 1.9 * 0.27) * 0.5 * step(0.3, q.y) * step(q.y, 3.15),
              max(penLine(q.y - 0.28), penLine(q.y - 3.17)) * 0.8);
  if (q.y > 2.85 && q.y < 3.0) { s.albedo = P_HONEY; s.cover = 0.8; }       // a band of the builders' colour under the cap
}`,
});

registerProp({
  id: 'brazier', reach: 0.6, height: 2.0, collide: 0.42, map: [0.95, 0.65, 0.3],
  light: { color: [1.0, 0.75, 0.4], radius: 10.5, y: 1.5, always: true },
  glsl: /* glsl */ `
float sdf_brazier(vec3 q, Prop pr, out float mat) {
  // an iron bowl on three legs, and a fire redrawn twelve times a second
  vec3 e = q; float a = atan(e.x, e.z), k = TAU / 3.0;
  a = mod(a + k * 0.5, k) - k * 0.5;
  e.xz = length(q.xz) * vec2(sin(a), cos(a));
  float legs = sdCapsule(e, vec3(0.0, 0.0, 0.42), vec3(0.0, 1.0, 0.16), 0.035);
  float bowl = max(sdEllipsoid(q - vec3(0.0, 1.18, 0.0), vec3(0.44, 0.27, 0.44)), q.y - 1.22);
  bowl = max(bowl, -(length(q - vec3(0.0, 1.3, 0.0)) - 0.36));
  float tk = floor(uTime * 12.0);
  float fl = 0.62 + 0.14 * sin(tk * 2.1 + pr.seed * 9.0);
  vec3 f = q - vec3(0.035 * sin(tk * 1.7 + pr.seed * 5.0), 1.16, 0.0);
  float flame = sdEllipsoid(f - vec3(0.0, fl * 0.5, 0.0), vec3(0.21, fl * 0.55, 0.21));
  mat = 0.0;
  float d = min(legs, bowl);
  if (flame < d) { d = flame; mat = 1.0; }
  return d * 0.85;
}
void mat_brazier(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_CHARCOAL; s.cover = 0.86; s.ink = penLine(q.y - 1.2) * 0.6; return; }
  // fire is the paper with a rim of sun and poppy
  float rim = smoothstep(0.04, 0.17, length(q.xz));
  s.albedo = mix(P_SUN, P_POPPY, smoothstep(1.3, 1.8, q.y));
  s.cover = mix(0.06, 0.85, rim);
  s.glow = 0.3 + 0.6 * (1.0 - rim);
  s.soft = 1.0;
}`,
});

registerProp({
  id: 'urn', reach: 0.55, height: 1.2, collide: 0.36, scale: [0.8, 1.3], map: [0.75, 0.6, 0.5],
  glsl: /* glsl */ `
float urnOne(vec3 q, float sc) {
  q /= sc;
  float body = sdEllipsoid(q - vec3(0.0, 0.42, 0.0), vec3(0.3, 0.42, 0.3));
  float neck = sdCylinder(q - vec3(0.0, 0.74, 0.0), 0.13, 0.2);
  float lip = sdTorusY(q - vec3(0.0, 0.95, 0.0), 0.14, 0.035);
  return min(smin(body, neck, 0.08), lip) * sc;
}
float sdf_urn(vec3 q, Prop pr, out float mat) {
  // a tall jar with a narrow neck; as often as not a smaller one stands by it
  mat = 0.0;
  float d = urnOne(q, 1.0);
  if (pr.seed > 0.45) d = min(d, urnOne(q - vec3(0.36, 0.0, 0.16), 0.62));
  return d * 0.9;
}
void mat_urn(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = pr.seed < 0.5 ? P_CLAY : mix(P_TAN, P_PEACH, 0.5); s.cover = 0.62;
  // a painted band round the shoulder
  float band = abs(q.y - 0.62) - 0.035;
  if (band < 0.0 && length(q.xz) < 0.34) { s.albedo = P_TEAL; s.cover = 0.85; }
  s.ink = penLine(band) * 0.7;
}`,
});

// ---------------------------------------------------------------- the Shatter

registerProp({
  id: 'shard', reach: 1.5, height: 5.4, collide: 0.6, scale: [0.75, 1.15], map: [0.6, 0.58, 0.7],
  glsl: /* glsl */ `
float sdf_shard(vec3 q, Prop pr, out float mat) {
  // a splinter of the moon standing on end, and a smaller one leaning on it
  mat = 0.0;
  vec3 a = q; a.xy = rot2(0.16 + 0.2 * (pr.seed - 0.5)) * a.xy;
  float d = crystalShard(a, 0.42, 3.4 + 1.6 * pr.seed);
  vec3 b = q - vec3(0.5, 0.0, 0.2); b.zy = rot2(-0.45) * b.zy; b.xy = rot2(-0.3) * b.xy;
  return min(d, crystalShard(b, 0.26, 1.7));
}
void mat_shard(vec3 q, float mat, Prop pr, inout Surf s) {
  // pale rock in flat faces, some left nearly bare, its bedding drawn across it
  float face = vnoise(vec2(atan(q.x, q.z) * 2.0, q.y * 0.7 + pr.seed * 9.0));
  s.albedo = uRockCol; s.cover = mix(0.28, 0.74, step(0.5, face));
  s.ink = penLine((fract(q.y * 0.45 + 0.3 * vnoise(q.xz * 2.0)) - 0.5) / 0.45) * 0.35;
  // a seam of crystal up one face, lit from inside
  float seam = abs(q.x + 0.1 * sin(q.y * 3.0) - 0.05) - 0.035;
  if (seam < 0.0 && q.z > 0.0) { s.albedo = mix(P_TEAL, P_SKY, 0.5); s.cover = 0.3; s.glow = 0.5; s.ink = 0.0; }
}`,
});

registerProp({
  id: 'floater', reach: 1.1, height: 3.9, collide: 0, scale: [0.7, 1.3], map: [0.6, 0.58, 0.7],
  glsl: /* glsl */ `
float sdf_floater(vec3 q, Prop pr, out float mat) {
  // a boulder that has not come down: it hangs over its own shadow, turning, with two pebbles for company
  mat = 0.0;
  float bob = 0.18 * sin(uTime * 0.7 + pr.seed * 20.0);
  vec3 c = q - vec3(0.0, 2.0 + 0.7 * pr.seed + bob, 0.0);
  c.xz = rot2(uTime * 0.25 + pr.seed * 6.0) * c.xz;
  float d = length(c * vec3(1.0, 1.25, 0.9)) - 0.62;
  d = max(d, dot(c, vec3(0.6, 0.7, 0.38)) - 0.4);
  d = max(d, dot(c, vec3(-0.7, 0.3, -0.64)) - 0.42);
  d = max(d, dot(c, vec3(0.1, -0.9, 0.42)) - 0.38);
  vec3 p1 = q - vec3(0.75, 1.3 + 0.5 * pr.seed - bob * 0.6, 0.3), p2 = q - vec3(-0.6, 3.0 + bob * 0.8, -0.45);
  return min(d, min(length(p1) - 0.2, length(p2) - 0.15)) * 0.8;
}
void mat_floater(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = uRockCol; s.cover = mix(0.3, 0.7, step(0.5, vnoise(q.xy * 2.3 + pr.seed * 9.0)));
  s.ink = step(0.8, vnoise(q.xz * 7.0 + q.y * 3.0)) * 0.35;
}`,
});

registerProp({
  id: 'wreck', reach: 1.8, height: 1.9, collide: 1.0, scale: [0.9, 1.2], map: [0.85, 0.85, 0.9],
  glsl: /* glsl */ `
float sdf_wreck(vec3 q, Prop pr, out float mat) {
  // what is left of a survey craft: two ribs of its hull standing out of the dust, a plate of its skin against them
  vec3 a = q - vec3(0.0, 0.0, -0.5), b = q - vec3(0.0, 0.0, 0.6);
  float rib = max(abs(length(a.xy - vec2(0.0, 0.2)) - 1.5) - 0.07, abs(a.z) - 0.07);
  rib = min(rib, max(abs(length(b.xy - vec2(0.15, 0.1)) - 1.25) - 0.07, abs(b.z) - 0.07));
  rib = max(rib, -q.y);
  vec3 c = q - vec3(-0.5, 0.75, 0.05); c.xy = rot2(0.5) * c.xy;
  float skin = sdBox(c, vec3(0.03, 0.7, 0.55)) - 0.02;
  mat = skin < rib ? 1.0 : 0.0;
  return min(rib, skin) * 0.85;
}
void mat_wreck(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = P_SLATE; s.cover = 0.72; s.ink = step(0.75, fract(atan(q.y, q.x) * 5.0)) * 0.3; return; }
  // the craft's skin: pale plate, a band of the corps' red, a row of rivets
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (abs(q.y - 1.05) < 0.07) { s.albedo = P_VERMILION; s.cover = 0.8; }
  s.ink = max(penLine(q.y - 0.55) * 0.6, smoothstep(0.045, 0.025, length(vec2(fract(q.z * 4.0) - 0.5, (q.y - 0.4) * 4.0))) * 0.6);
}`,
});

registerProp({
  id: 'dish', reach: 1.15, height: 3.3, collide: 0.4, map: [0.85, 0.9, 0.95],
  light: { color: [0.6, 0.9, 1.0], radius: 5, y: 2.7, always: true },
  glsl: /* glsl */ `
float sdf_dish(vec3 q, Prop pr, out float mat) {
  // a survey aerial still standing: a mast, a dish turned up to the ringed world, a light at its feed that has not gone out
  float mast = min(sdTaper(q, vec3(0.0), vec3(0.0, 1.9, 0.0), 0.1, 0.06), sdCylinder(q, 0.3, 0.1));
  vec3 c = q - vec3(0.0, 2.1, 0.0); c.zy = rot2(-0.75) * c.zy;
  float bowl = max(abs(length(c - vec3(0.0, 0.9, 0.0)) - 1.1) - 0.03, c.y - 0.35);
  float arm = sdCapsule(c, vec3(0.0, -0.18, 0.0), vec3(0.0, 0.75, 0.0), 0.025);
  float feed = length(c - vec3(0.0, 0.8, 0.0)) - 0.09;
  float d = min(min(mast, bowl), arm);
  mat = 0.0;
  if (feed < d) { d = feed; mat = 1.0; }
  return d * 0.85;
}
void mat_dish(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat > 0.5) { s.albedo = P_SKY; s.cover = 0.1; s.glow = 0.8; return; }
  s.albedo = mix(P_STONE, P_CREAM, 0.6); s.cover = 0.3; s.soft = 1.0;
  s.ink = penLine(q.y - 0.45) * 0.6;
  if (q.y > 0.55 && q.y < 0.72 && length(q.xz) < 0.2) { s.albedo = P_VERMILION; s.cover = 0.8; }
}`,
});
