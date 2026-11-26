// Small things that fill an island between the trees: flower clumps, ferns, tall grass, pebbles, and ruins.
// Each starts with a cheap bound, since the ground is full of them.

// the blossom colors of a clump, by scheme (the prop's palette slot) and flower
vec3 bloomColor(float scheme, float k) {
  int sc = int(scheme + 0.5);
  if (sc == 1) return k < 0.4 ? vec3(0.66, 0.6, 0.9) : k < 0.75 ? P_SKY : P_CREAM;
  if (sc == 2) return k < 0.5 ? P_CREAM : P_BUTTER;
  if (sc == 3) return k < 0.4 ? P_APRICOT : k < 0.75 ? P_POPPY : P_HONEY;
  if (sc == 4) return k < 0.5 ? P_ROSE : k < 0.8 ? P_PEACH : P_CREAM;
  if (sc == 5) return k < 0.5 ? vec3(0.55, 0.85, 0.85) : vec3(0.8, 0.95, 1.0);
  return k < 0.3 ? P_POPPY : k < 0.55 ? P_BUTTER : k < 0.8 ? P_ROSE : P_CREAM;
}

float sdf_flowers(vec3 q, Prop pr, out float mat) {
  q.xz += 0.05 * sin(uTime * 1.7 + pr.seed * 30.0) * q.y;
  float bound = max(length(q.xz) - 1.15, abs(q.y - 0.4) - 0.45);
  mat = 0.0;
  if (bound > 0.2) return bound;
  float stem = 1e3, head = 1e3, which = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float a = fi * 2.399 + pr.seed * 6.0;
    float r = 0.08 + 0.78 * sqrt(fract(fi * 0.618 + pr.seed));
    float h = 0.3 + 0.32 * fract(fi * 0.37 + pr.seed * 3.0);
    vec3 b = vec3(cos(a) * r, 0.0, sin(a) * r);
    vec3 t = b * 1.12 + vec3(0.0, h, 0.0);
    stem = min(stem, sdCapsule(q, b, t, 0.016));
    // a tulip-like cup, open at the top
    vec3 hq = q - t - vec3(0.0, 0.06, 0.0);
    float hd = max(sdEllipsoid(hq, vec3(0.075, 0.1, 0.075)), -(length(hq - vec3(0.0, 0.11, 0.0)) - 0.055));
    if (hd < head) { head = hd; which = fi; }
  }
  mat = head < stem ? 1.0 + 0.05 * which : 0.0;
  return min(stem, head) * 0.9;
}
void mat_flowers(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { s.albedo = mix(INK_LEAF, P_LEAF, 0.5); s.cover = 0.7; s.soft = 1.0; s.wrap = 0.5; return; }
  float fi = floor((mat - 1.0) * 20.0 + 0.5);
  float k = fract(fi * 0.618 + pr.seed * 3.7);
  vec3 c = bloomColor(pr.pal, k);
  // petals round a darker heart, found from the flower's own middle
  float a = fi * 2.399 + pr.seed * 6.0;
  float r = 0.08 + 0.78 * sqrt(fract(fi * 0.618 + pr.seed));
  float h = 0.3 + 0.32 * fract(fi * 0.37 + pr.seed * 3.0);
  vec2 mid = vec2(cos(a), sin(a)) * r * 1.12;
  vec2 lp = q.xz - mid;
  float petal = abs(fract(atan(lp.y, lp.x) / TAU * 3.0 + k) - 0.5);
  float up = smoothstep(h, h + 0.15, q.y);
  s.albedo = mix(c, mix(c, PAPER, 0.35), up);
  s.cover = dot(c, vec3(0.33)) > 0.85 ? 0.14 : mix(0.86, 0.6, up);
  s.soft = 1.0; s.wrap = 0.6;
  s.ink = max(penLine(petal * 0.08) * 0.45 * up, 0.1);
  s.glow = uNight * 0.25 * step(4.5, pr.pal);
}

float sdf_fern(vec3 q, Prop pr, out float mat) {
  mat = 1.0;
  q.xz += 0.03 * sin(uTime * 1.3 + pr.seed * 30.0) * q.y;
  float bound = max(length(q.xz) - 0.8, abs(q.y - 0.45) - 0.55);
  if (bound > 0.2) return bound;
  float d = 1e3;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float a = fi * 0.7854 + pr.seed * 6.0;
    vec2 dir = vec2(cos(a), sin(a));
    float L = 0.5 + 0.16 * fract(fi * 0.7 + pr.seed * 5.0);
    // the frond's own frame: along it, across it, and up from its arch
    float lx = dot(q.xz, dir);
    float lz = dot(q.xz, vec2(-dir.y, dir.x));
    float k = clamp(lx / L, 0.0, 1.0);
    // fronds rise steeply from the middle and droop at the tips, a vase rather than a star
    float arch = 0.95 * sin(k * 1.85) * (1.0 - 0.15 * k);
    float wide = 0.13 * sin(k * 3.1) * (0.72 + 0.28 * abs(sin(lx * 38.0)));
    float f = sdEllipsoid(vec3(lx - L * 0.5, q.y - arch, lz * 0.13 / max(wide, 0.02)), vec3(L * 0.5, 0.025, 0.13));
    d = min(d, f);
  }
  return d * 0.6;
}
void mat_fern(vec3 q, float mat, Prop pr, inout Surf s) {
  vec3 leaf = mix(mix(P_LEAF, P_SAGE, 0.3), uLeafPal[int(pr.pal + 0.5)], 0.15);
  float r = length(q.xz);
  float comb = abs(fract(r * 19.0) - 0.5);
  s.albedo = mix(mix(leaf, INK_LEAF, 0.35), mix(leaf, P_BUTTER, 0.25), smoothstep(0.1, 0.45, q.y));
  s.cover = 0.78;
  s.soft = 1.0; s.wrap = 0.55; s.leafy = 1.0;
  s.ink = penLine(comb / 19.0) * 0.28;
  s.occ = mix(0.6, 1.0, smoothstep(0.0, 0.35, q.y));
}

float sdf_tallgrass(vec3 q, Prop pr, out float mat) {
  mat = 1.0;
  float bound = max(length(q.xz) - 0.85, abs(q.y - 0.5) - 0.55);
  if (bound > 0.2) return bound;
  float sway = sin(uTime * 1.9 + pr.seed * 30.0);
  float d = 1e3;
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    float a = fi * 2.399 + pr.seed * 6.0;
    float r = 0.03 + 0.14 * fract(fi * 0.618 + pr.seed);
    vec2 dir = vec2(cos(a), sin(a));
    float h = 0.55 + 0.45 * fract(fi * 0.41 + pr.seed * 2.0);
    // each blade bows outward and with the wind, more toward its tip
    float k = clamp(q.y / h, 0.0, 1.0);
    vec2 c = dir * (r + 0.55 * k * k) + vec2(0.07, 0.035) * sway * k * k;
    float bl = length(q.xz - c) - mix(0.04, 0.002, k);
    d = min(d, max(bl, max(-q.y, q.y - h * (1.0 - 0.25 * k * k))));
  }
  return d * 0.6;
}
void mat_tallgrass(vec3 q, float mat, Prop pr, inout Surf s) {
  // its own colors: green with a gold tip; slot 6 is dry and golden, slot 11 frosted
  int sc = int(pr.pal + 0.5);
  vec3 lo = mix(P_LEAF, INK_LEAF, 0.3), hi = mix(P_SAGE, P_BUTTER, 0.4);
  if (sc == 6) { lo = mix(P_SAGE, P_HONEY, 0.55); hi = mix(P_BUTTER, P_CREAM, 0.55); }
  if (sc == 11) { lo = mix(P_PINE, P_SLATE, 0.3); hi = mix(P_SKY, PAPER, 0.5); }
  s.albedo = mix(lo, hi, smoothstep(0.1, 0.85, q.y));
  s.cover = 0.72;
  s.soft = 1.0; s.wrap = 0.6; s.leafy = 1.0;
  s.ink = 0.15 * smoothstep(0.3, 0.9, q.y);
}

float sdf_pebbles(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float bound = max(length(q.xz) - 0.7, q.y - 0.35);
  if (bound > 0.2) return bound;
  float d = sdEllipsoid(q - vec3(0.0, 0.06, 0.0), vec3(0.26, 0.13, 0.2));
  d = min(d, sdEllipsoid(q - vec3(0.36, 0.04, 0.18), vec3(0.15, 0.08, 0.12)));
  d = min(d, sdEllipsoid(q - vec3(-0.28, 0.03, 0.3), vec3(0.11, 0.06, 0.13)));
  d = min(d, sdEllipsoid(q - vec3(-0.1, 0.03, -0.38), vec3(0.17, 0.07, 0.13)));
  return d;
}
void mat_pebbles(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mix(uRockCol, P_STONE, 0.4 + 0.3 * vnoise(q.xz * 6.0 + pr.seed * 9.0));
  s.cover = 0.55;
  s.ink = 0.15;
  s.moss = 0.5;
}

// a fallen ruin: a broken column still standing, its top lying beside it, and a block from the capital
float sdf_ruin(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float bound = max(length(q.xz) - 2.0, q.y - 3.0);
  if (bound > 0.4) return bound;
  float h = 1.8 + 0.8 * pr.seed;
  float shaft = sdCylinder(q, 0.34 + 0.02 * cos(atan(q.z, q.x) * 12.0), h);
  shaft = max(shaft, dot(q - vec3(0.0, h - 0.15, 0.0), normalize(vec3(0.45, 0.85, 0.3))));
  float base = sdBox(q - vec3(0.0, 0.16, 0.0), vec3(0.52, 0.16, 0.52));
  vec3 f = q - vec3(1.15, 0.3, 0.55);
  f.xz = rot2(0.6) * f.xz;
  float fallen = sdCylinder(f.yxz + vec3(0.0, 0.85, 0.0), 0.3, 1.7) ;
  vec3 c = q - vec3(-0.95, 0.22, 0.75);
  c.xz = rot2(0.4) * c.xz; c.xy = rot2(0.18) * c.xy;
  float cap = sdBox(c, vec3(0.5, 0.2, 0.5));
  return min(min(shaft, base), min(fallen, cap)) * 0.9;
}
void mat_ruin(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mix(P_STONE, P_CREAM, 0.3 + 0.3 * vnoise(q.xy * 3.0 + pr.seed * 9.0));
  s.cover = 0.52;
  s.moss = 0.8;
  s.ink = penLine((abs(fract(atan(q.z, q.x) * 1.9) - 0.5)) / 1.9 * 0.3) * 0.4 * step(0.35, q.y) * step(length(q.xz), 0.4);
}
