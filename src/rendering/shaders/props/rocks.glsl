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
  s.ink = smoothstep(0.04, 0.0, abs(fract(strata * 2.0 + 0.25) - 0.5)) * 0.65;
  s.moss = 1.0;
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
  s.cover = mix(0.75, 0.1, smoothstep(0.55, 0.9, band));
  s.glow = 0.25 + 0.3 * band;
}

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
  vec2 r = vec2(q.x, q.y - 1.5);
  float sp = abs(fract(length(r) * 3.2 - atan(r.y, r.x) / TAU) - 0.5);
  float rune = smoothstep(0.1, 0.03, sp) * step(length(r), 0.3) * step(0.15, abs(q.z));
  s.albedo = mix(s.albedo, P_TEAL, rune);
  s.cover = mix(s.cover, 0.9, rune);
  s.glow = rune * uNight * 0.7;
  s.ink = smoothstep(0.03, 0.0, abs(fract(n * 2.0) - 0.5)) * 0.4;
  s.moss = 0.6;
}

float sdf_cairn(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = rockBody(q - vec3(0.0, 0.28, 0.0), 0.55, pr.seed);
  vec3 b = q - vec3(0.05, 0.75, 0.0);
  b.xz = b.zx;
  d = min(d, rockBody(b, 0.38, pr.seed + 0.3));
  d = min(d, rockBody(q - vec3(-0.03, 1.12, 0.04), 0.24, pr.seed + 0.6));
  return d * 0.9;
}
void mat_cairn(vec3 q, float mat, Prop pr, inout Surf s) { mat_rock(q, mat, pr, s); s.moss = 0.4; }

float sdf_shard(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  vec3 a = q; a.xy = rot2(0.16 + 0.2 * (pr.seed - 0.5)) * a.xy;
  float d = crystalShard(a, 0.42, 3.4 + 1.6 * pr.seed);
  vec3 b = q - vec3(0.5, 0.0, 0.2); b.zy = rot2(-0.45) * b.zy; b.xy = rot2(-0.3) * b.xy;
  return min(d, crystalShard(b, 0.26, 1.7));
}
void mat_shard(vec3 q, float mat, Prop pr, inout Surf s) {
  float face = vnoise(vec2(atan(q.x, q.z) * 2.0, q.y * 0.7 + pr.seed * 9.0));
  s.albedo = uRockCol; s.cover = mix(0.28, 0.74, step(0.5, face));
  s.ink = penLine((fract(q.y * 0.45 + 0.3 * vnoise(q.xz * 2.0)) - 0.5) / 0.45) * 0.35;
  float seam = abs(q.x + 0.1 * sin(q.y * 3.0) - 0.05) - 0.035;
  if (seam < 0.0 && q.z > 0.0) { s.albedo = mix(P_TEAL, P_SKY, 0.5); s.cover = 0.3; s.glow = 0.5; s.ink = 0.0; }
}

float sdf_floater(vec3 q, Prop pr, out float mat) {
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
}
