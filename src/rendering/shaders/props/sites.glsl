float sdf_pad(vec3 q, Prop pr, out float mat) {
  float dais = min(sdCylinder(q, 2.45, 0.14), sdCylinder(q - vec3(0.0, 0.1, 0.0), 1.95, 0.1));
  vec3 e = q; float a = atan(e.x, e.z), k = TAU / 3.0;
  a = mod(a + k * 0.5, k) - k * 0.5;
  e.xz = length(q.xz) * vec2(sin(a), cos(a));
  float post = min(sdTaper(e, vec3(0.0, 0.0, 2.2), vec3(0.0, 0.5, 2.2), 0.17, 0.11), sdSphere(e - vec3(0.0, 0.62, 2.2), 0.12));
  mat = post < dais ? (e.y > 0.5 ? 2.0 : 1.0) : 0.0;
  return min(dais, post);
}
void mat_pad(vec3 q, float mat, Prop pr, inout Surf s) {
  vec3 lightCol = pr.pal > 0.5 ? P_APRICOT : P_SKY;
  if (mat > 1.5) { s.albedo = lightCol; s.cover = 0.35; s.glow = 1.0; return; }
  if (mat > 0.5) { s.albedo = P_SLATE; s.cover = 0.7; return; }
  float r = length(q.xz);
  s.albedo = mix(P_STONE, P_CREAM, 0.55); s.cover = 0.34; s.soft = 1.0;
  s.ink = max(penLine(r - 1.95), max(penLine(r - 1.3), penLine(r - 0.55))) * 0.8;
  float lit = smoothstep(0.12, 0.06, abs(r - 1.62)) + smoothstep(0.1, 0.05, abs(r - 0.92));
  float turn = step(0.5, fract(atan(q.x, q.z) / TAU * 12.0 + uTime * 0.12));
  s.albedo = mix(s.albedo, lightCol, saturate(lit));
  s.cover = mix(s.cover, 0.75 * mix(0.55, 1.0, turn), saturate(lit));
}

float sdf_gate(vec3 q, Prop pr, out float mat) {
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
    vec2 g = vec2(q.x + q.y, q.x - q.y) * 2.2 + vec2(uTime * 0.5, -uTime * 0.5);
    float lat = max(penLine((fract(g.x) - 0.5) * 0.45), penLine((fract(g.y) - 0.5) * 0.45));
    s.albedo = P_SKY; s.cover = 0.3 + 0.25 * lat; s.soft = 1.0; s.ink = lat * 0.55;
    return;
  }
  s.albedo = mix(P_STONE, P_CREAM, 0.5); s.cover = 0.5;
  s.ink = max(penLine(q.y - 0.55), penLine(q.y - 2.0)) * 0.7;
  if (q.y > 0.7 && q.y < 1.85 && abs(abs(q.x) - 2.42) < 0.07) { s.albedo = P_SLATE; s.cover = 0.75; }
}

float sdf_pod(vec3 q, Prop pr, out float mat) {
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
  if (pr.pal > 0.5 && mat < 0.5 && q.y > 0.6 && length(q.xz) < 0.38) { s.albedo = P_CHARCOAL; s.cover = 0.85; }
  s.ink = penLine(abs(q.x) - 0.2) * 0.35 * step(0.8, q.y) * (1.0 - step(0.5, pr.pal));
}

float sdf_console(vec3 q, Prop pr, out float mat) {
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
}

float sdf_crate(vec3 q, Prop pr, out float mat) {
  float a = sdRoundBox(q - vec3(0.0, 0.42, 0.0), vec3(0.5, 0.42, 0.5), 0.04);
  vec3 t = q - vec3(0.08, 1.1, -0.06); t.xz = rot2(0.5) * t.xz;
  float b = pr.seed > 0.45 ? sdRoundBox(t, vec3(0.33, 0.26, 0.33), 0.03) : 1e3;
  mat = b < a ? 1.0 : 0.0;
  return min(a, b);
}
void mat_crate(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = mat > 0.5 ? P_APRICOT : mix(P_STONE, P_CREAM, 0.45); s.cover = mat > 0.5 ? 0.6 : 0.4; s.soft = 1.0;
  float e = mat > 0.5 ? 0.0 : max(penLine(max(abs(q.x), abs(q.z)) - 0.4), penLine(abs(q.y - 0.42) - 0.3));
  s.ink = max(e * 0.6, penLine(abs(q.x) - 0.12) * 0.5 * (1.0 - mat));
  if (mat < 0.5 && abs(q.x) < 0.12) { s.albedo = P_SLATE; s.cover = 0.7; }
}

float sdf_brazier(vec3 q, Prop pr, out float mat) {
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
  float rim = smoothstep(0.04, 0.17, length(q.xz));
  s.albedo = mix(P_SUN, P_POPPY, smoothstep(1.3, 1.8, q.y));
  s.cover = mix(0.06, 0.85, rim);
  s.glow = 0.3 + 0.6 * (1.0 - rim);
  s.soft = 1.0;
}

float sdf_urn(vec3 q, Prop pr, out float mat) {
  mat = 0.0;
  float d = urnOne(q, 1.0);
  if (pr.seed > 0.45) d = min(d, urnOne(q - vec3(0.36, 0.0, 0.16), 0.62));
  return d * 0.9;
}
void mat_urn(vec3 q, float mat, Prop pr, inout Surf s) {
  s.albedo = pr.seed < 0.5 ? P_CLAY : mix(P_TAN, P_PEACH, 0.5); s.cover = 0.62;
  float band = abs(q.y - 0.62) - 0.035;
  if (band < 0.0 && length(q.xz) < 0.34) { s.albedo = P_TEAL; s.cover = 0.85; }
  s.ink = penLine(band) * 0.7;
}

float sdf_wreck(vec3 q, Prop pr, out float mat) {
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
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (abs(q.y - 1.05) < 0.07) { s.albedo = P_VERMILION; s.cover = 0.8; }
  s.ink = max(penLine(q.y - 0.55) * 0.6, smoothstep(0.045, 0.025, length(vec2(fract(q.z * 4.0) - 0.5, (q.y - 0.4) * 4.0))) * 0.6);
}

float sdf_dish(vec3 q, Prop pr, out float mat) {
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
}
