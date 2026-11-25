float sdf_tree(vec3 q, Prop pr, out float mat) {
  q.xz += 0.035 * sin(uTime * 1.2 + pr.seed * 30.0) * max(q.y - 1.2, 0.0) * vec2(0.8, 0.5);
  float trunk = sdTaper(q, vec3(0.0), vec3(0.06, 2.3, 0.02), 0.2, 0.1);
  float bound = length(q - vec3(0.0, 3.0, 0.0)) - 1.75;
  if (bound > 0.7) { mat = trunk < bound ? 0.0 : 1.0; return min(trunk, bound); }
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
void mat_tree(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  leafSurf(q, pr, s, 2.1, 4.2);
  if (fract(pr.seed * 7.13) < 0.3 && pr.pal < 0.5) {
    vec2 v = voronoi(q.xy * 2.6 + q.z * 1.9 + pr.seed * 20.0);
    float fruit = smoothstep(0.13, 0.09, v.x) * step(0.72, v.y);
    s.albedo = mix(s.albedo, P_POPPY, fruit);
    s.cover = mix(s.cover, 0.95, fruit);
  }
}

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
  float tier = fract((q.y - 0.9) / 1.35);
  s.occ *= mix(0.6, 1.0, smoothstep(0.0, 0.6, tier));
  s.ink = max(s.ink * 0.6, penLine(tier * 1.35) * 0.75);
  s.cover = mix(s.cover, 0.12, gSnow * smoothstep(0.55, 0.95, tier));
}

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
}

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
  s.cover = mix(mix(0.86, 0.35, under), 0.0, spot);
  s.ink = max(penLine((v.x - 0.19) / 4.5) * (1.0 - under) * 0.6,
              under * smoothstep(0.2, 0.0, abs(fract(atan(q.z, q.x - 0.04) * 3.0) - 0.5)) * 0.5);
  s.glow = spot * uNight * 0.8;
}

float sdf_willow(vec3 q, Prop pr, out float mat) {
  float trunk = sdTaper(q, vec3(0.0), vec3(0.1, 2.0, 0.05), 0.24, 0.14);
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
  float strand = abs(fract(atan(q.z, q.x) * 4.5 + pr.seed * 3.0) - 0.5) / 4.5 * 1.2;
  s.ink = max(s.ink * 0.4, penLine(strand) * smoothstep(2.6, 1.2, q.y) * 0.45);
}

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
  s.albedo = mix(s.albedo, P_STONE, 0.5);
  s.cover = 0.66;
}

float sdf_reeds(vec3 q, Prop pr, out float mat) {
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
}

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
  s.cover = mix(mix(0.86, 0.4, under), 0.0, spot);
  s.ink = max(penLine((v.x - 0.23) / 1.7) * (1.0 - under) * 0.6,
              under * penLine((abs(fract(atan(c.z, c.x) * 5.0) - 0.5)) / 5.0 * length(c.xz)) * 0.5);
  s.soft = 1.0;
  s.glow = spot * uNight * 0.8;
}

float sdf_stump(vec3 q, Prop pr, out float mat) {
  float d = sdCylinder(q, 0.34 + 0.04 * sin(atan(q.z, q.x) * 5.0 + pr.seed * 9.0), 0.42);
  float root = sdTaper(vec3(abs(q.x), q.y, abs(q.z)), vec3(0.24, 0.14, 0.24), vec3(0.5, 0.0, 0.5), 0.09, 0.04);
  mat = (q.y > 0.4 && d < root) ? 1.0 : 0.0;
  return min(d, root) * 0.85;
}
void mat_stump(vec3 q, float mat, Prop pr, inout Surf s) {
  if (mat < 0.5) { barkSurf(q, pr, s); return; }
  s.albedo = P_WOOD; s.cover = 0.5;
  s.ink = penLine((abs(fract(length(q.xz) * 9.0 + 0.3) - 0.5)) / 9.0) * 0.6;
}
