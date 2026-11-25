#include <shuttle>

float sdf_lamp(vec3 q, Prop pr, out float mat) {
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
    if (q.y > 0.55 && q.y < 0.75) { s.albedo = P_VERMILION; s.cover = 0.8; }
    return;
  }
  s.albedo = P_SKY;
  s.cover = mix(0.6, 0.0, uNight);
  s.glow = max(uNight, 0.3);
}

float sdf_shuttle(vec3 q, Prop pr, out float mat) { return shuttleMap(q - vec3(0.0, 1.05, 0.0), 0.0, mat); }
void mat_shuttle(vec3 q, float mat, Prop pr, inout Surf s) { shuttleSurf(q - vec3(0.0, 1.05, 0.0), mat, 0.0, P_VERMILION, s); }

float sdf_hall(vec3 q, Prop pr, out float mat) {
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
    s.albedo = P_SKY; s.cover = 0.1; s.soft = 1.0;
    if (abs(q.x) < 0.72 && q.y < 2.0 && q.z > 3.6) { s.albedo = P_SLATE; s.cover = 0.85; if (abs(q.x) < 0.035) { s.albedo = P_SKY; s.cover = 0.2; s.glow = 0.7; } }
    s.ink = max(penLine(max(abs(q.x) - 0.72, q.y - 2.0)), penLine(q.y - 2.2)) * 0.8;
    if (q.y > 2.2) { s.albedo = P_VERMILION; s.cover = 0.82; }
    return;
  }
  if (mat > 1.5) { s.albedo = P_SKY; s.cover = 0.25; s.glow = 0.8; return; }
  if (mat > 0.5) {
    s.albedo = mix(P_SLATE, P_TEAL, 0.35); s.cover = 0.66; s.soft = 1.0;
    s.ink = max(penLine((fract(ang / TAU * 12.0) - 0.5) * length(q.xz) * 0.5), penLine(q.y - 3.4)) * 0.6;
    return;
  }
  s.albedo = P_SKY; s.cover = 0.09; s.soft = 1.0; s.wrap = 0.2;
  float cell = fract(ang / TAU * 12.0) - 0.5;
  float win = max(abs(cell) * 3.3 * 1.7 - 0.32, abs(q.y - 1.3) - 0.55);
  if (win < 0.0) { s.albedo = P_SLATE; s.cover = 0.8 * (1.0 - smoothstep(0.05, 0.0, abs(cell * 5.0 + q.y - 1.5))); }
  s.ink = max(penLine(win), penLine(q.y - 0.4) * 0.6) * 0.8;
  if (q.y > 2.12 && q.y < 2.42) { s.albedo = P_VERMILION; s.cover = 0.82; s.ink = 0.0; }
}

float sdf_hab(vec3 q, Prop pr, out float mat) {
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
  s.albedo = P_SKY; s.cover = 0.09; s.soft = 1.0; s.wrap = 0.2;
  float side = abs(ang) - 1.15;
  float port = length(vec2(side * 1.9, q.y - 0.62)) - 0.26;
  if (port < 0.0) { s.albedo = P_SLATE; s.cover = 0.8 * (1.0 - smoothstep(0.04, 0.0, abs(side * 1.9 + q.y - 0.7))); }
  s.ink = max(penLine(port), penLine(q.y - 0.16) * 0.6) * 0.8;
  if (q.y < 0.16) { s.albedo = P_STONE; s.cover = 0.55; }
}

float sdf_kiosk(vec3 q, Prop pr, out float mat) {
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
}

float sdf_spire(vec3 q, Prop pr, out float mat) {
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
}

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
}

float sdf_planter(vec3 q, Prop pr, out float mat) {
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
}

float sdf_banner(vec3 q, Prop pr, out float mat) {
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
  float ring = abs(length(vec2(q.x - 0.3, q.y - 2.55)) - 0.13) - 0.03;
  if (ring < 0.0) s.cover = 0.08;
}

float sdf_column(vec3 q, Prop pr, out float mat) {
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
  if (q.y > 2.85 && q.y < 3.0) { s.albedo = P_HONEY; s.cover = 0.8; }
}
