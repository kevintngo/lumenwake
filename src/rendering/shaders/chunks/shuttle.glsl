float shuttleCylZ(vec3 p, float r, float h) {
  vec2 d = vec2(length(p.xy) - r, abs(p.z) - h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
const vec3 SHUTTLE_ENGINE = vec3(1.04, 0.0, -1.5);
float shuttleMap(vec3 b, float fly, out float mat) {
  vec3 w = vec3(abs(b.x), b.y, b.z);
  float hull = smin(sdRoundBox(b - vec3(0.0, 0.0, -0.5), vec3(0.8, 0.58, 1.7), 0.45), sdEllipsoid(b - vec3(0.0, -0.08, 1.2), vec3(0.72, 0.5, 1.7)), 0.45);
  hull = max(hull, -(b.y + 0.56));
  float glass = sdEllipsoid(b - vec3(0.0, 0.2, 1.45), vec3(0.5, 0.33, 0.85));
  vec3 wq = vec3(w.x - 1.6, w.y + 0.15, w.z + 0.9 + (w.x - 0.8) * 0.6);
  float wing = sdRoundBox(wq, vec3(0.95, 0.05, 0.64 - (w.x - 0.8) * 0.14), 0.035);
  wing = min(wing, sdRoundBox(vec3(w.x - 2.52, w.y - 0.08, w.z + 2.02 + (w.y - 0.08) * 0.5), vec3(0.035, 0.27, 0.3), 0.02));
  float fin = sdRoundBox(vec3(w.x - 0.4 - (b.y - 0.5) * 0.45, b.y - 0.92, b.z + 1.7 + (b.y - 0.5) * 0.95), vec3(0.035, 0.4, 0.42 - (b.y - 0.5) * 0.28), 0.02);
  vec3 e = w - SHUTTLE_ENGINE;
  float rad = length(e.xy);
  float nac = shuttleCylZ(e, 0.31, 0.72) - 0.05;
  nac = min(nac, sdRoundBox(w - vec3(0.8, 0.0, -1.45), vec3(0.2, 0.13, 0.5), 0.05));
  float white = min(min(hull, wing), min(fin, nac));
  float lip = max(abs(rad - 0.33) - 0.045, abs(e.z - 0.78) - 0.07);
  white = min(white, lip);
  float dark = max(rad - 0.3, abs(e.z - 0.76) - 0.04);
  float t = saturate((-e.z - 0.72) / 0.5);
  float bell = max(max(rad - mix(0.3, 0.43, t), -(rad - mix(0.22, 0.37, t))), abs(e.z + 0.97) - 0.25);
  dark = min(dark, bell);
  float core = max(rad - 0.29, abs(e.z + 0.84) - 0.05);
  vec3 k = vec3(w.x, b.y + 1.05 - 0.52 * fly, b.z);
  float skid = min(sdCapsule(k, vec3(0.5, 0.1, -1.3), vec3(0.5, 0.1, 1.4), 0.07),
               min(sdCapsule(k, vec3(0.5, 0.1, 0.9), vec3(0.42, 0.56, 0.8), 0.045), sdCapsule(k, vec3(0.5, 0.1, -0.9), vec3(0.42, 0.56, -0.8), 0.045)));
  dark = min(dark, skid);
  float d = min(min(white, glass), min(core, dark));
  mat = d == glass ? 1.0 : (d == core ? 2.0 : (d == dark ? 3.0 : 0.0));
  if (fly > 0.05) {
    float len = fly * (1.7 + 0.22 * sin(uTime * 41.0) + 0.1 * sin(uTime * 17.0));
    float flame = sdTaper(e, vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0 - len * 1.25), 0.2, 0.02);
    if (flame < d) { d = flame; mat = 4.0; }
  }
  return d * 0.85;
}
void shuttleSurf(vec3 b, float mat, float fly, vec3 trim, inout Surf s) {
  vec3 w = vec3(abs(b.x), b.y, b.z);
  vec3 e = w - SHUTTLE_ENGINE;
  float rad = length(e.xy);
  if (mat > 3.5) {
    float along = saturate((-e.z - 1.0) / (2.1 * max(fly, 0.05)));
    s.albedo = mix(P_SUN, P_APRICOT, along); s.cover = mix(0.05, 0.6, smoothstep(0.15, 0.95, along)); s.glow = 1.0 - 0.45 * along; s.soft = 1.0;
    return;
  }
  if (mat > 2.5) {
    s.albedo = P_CHARCOAL; s.cover = 0.86;
    if (e.z < -0.7 && rad < 0.5) s.ink = penLine((fract(e.z * 5.0) - 0.5) / 5.0) * 0.5;
    return;
  }
  if (mat > 1.5) { s.albedo = P_APRICOT; s.cover = 0.5 - 0.4 * fly; s.glow = 0.35 + 0.6 * fly; return; }
  if (mat > 0.5) {
    s.albedo = P_SLATE; s.cover = 0.86 * (1.0 - smoothstep(0.05, 0.02, abs(b.x * 0.6 + b.y - 0.42)));
    s.ink = max(penLine(b.x), penLine(b.z - 1.45)) * 0.7;
    return;
  }
  s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0; s.wrap = 0.2;
  bool side = w.x > 0.55 && w.x < 0.95 && abs(b.y) < 0.6;
  s.ink = max(penLine((fract(b.z * 0.8 + 0.25) - 0.5) / 0.8) * step(w.x, 0.95), penLine(b.y + 0.2) * step(w.x, 0.95)) * 0.45;
  if (w.x < 0.95 && abs(b.y - 0.02) < 0.055 && b.z > -2.0) { s.albedo = trim; s.cover = 0.84; s.ink = 0.0; }
  if (w.x > 2.18) { s.albedo = trim; s.cover = 0.84; }
  if (b.y > 1.14 && b.z < -1.2) { s.albedo = trim; s.cover = 0.84; }
  if (rad < 0.42 && e.z > 0.3 && e.z < 0.48) { s.albedo = trim; s.cover = 0.84; s.ink = 0.0; }
  if (rad < 0.42 && abs(e.z) < 0.75) s.ink = max(s.ink, max(penLine(e.z - 0.3), penLine(e.z + 0.45)) * 0.5);
  if (side) {
    float ring = length(vec2(b.z + 0.75, b.y - 0.3));
    if (ring < 0.09) { s.albedo = trim; s.cover = 0.84; }
    s.ink = max(s.ink, penLine(ring - 0.16) * 0.8);
    s.ink = max(s.ink, penLine(sdBox(vec3(b.z - 0.25, b.y + 0.2, 0.0), vec3(0.28, 0.27, 1.0))) * step(b.y, 0.0) * 0.6);
  }
}
