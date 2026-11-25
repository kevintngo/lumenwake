// A piece of gear on its own: what the interface draws on a tile. The shapes are
// the ones a figure carries and wears (glsl/held.js), so a tile always shows the
// very thing that is in the hand, on the shoulders or on the back.
//   eExtra   the piece: 0..5 what is held (kit * 2 + look), 6..7 a frame (look 0, 1), 8..9 a unit (look 1, 2)
//   eSpare   the people of whoever will wear it (a frame is drawn as their own clothes: 0 the scout unit's shell)
// Pencils: A what the wearer wears, B their accent.

import { registerArchetype } from '../passes/entities.js';
import { HELD_GLSL } from '../glsl/held.js';

registerArchetype({
  id: 'gear', boundY: 0.0, boundR: 0.8, steps: 56,
  glsl: /* glsl */ `
${HELD_GLSL}
const float STOUT = 1.8;
float gPiece, gKit, gLook;
vec3 gHand, gDir, gSide;
void entPose() {
  gPiece = floor(eExtra + 0.5);
  gKit = floor(gPiece * 0.5 + 0.01); gLook = gPiece - gKit * 2.0;
  // held things lie across the tile from the lower left to the upper right, turned a little toward the eye
  gDir = normalize(vec3(0.62, 0.76, 0.12)); gSide = normalize(vec3(-0.76, 0.62, 0.0));
  // (the middle of each, measured along it from the grip)
  float mid = gKit < 0.5 ? (gLook < 0.5 ? 0.45 : 0.37) : (gKit < 1.5 ? (gLook < 0.5 ? 0.2 : 0.2) : (gLook < 0.5 ? 0.31 : 0.37));
  gHand = -gDir * mid;
}
float entMap(vec3 p, out float mat) {
  mat = 0.0;
  if (gPiece < 5.5) {
    // (drawn nearly twice as stout as it is: a thing in the hand is long and thin, and a tile is small)
    vec3 q = p - gHand;
    float along = dot(q, gDir);
    q = gHand + gDir * along + (q - gDir * along) / STOUT;
    float solid, lit;
    heldMap(q, gHand, gDir, gSide, gKit, gLook, solid, lit);
    mat = lit < solid ? 1.0 : 0.0;
    return min(solid, lit);
  }
  if (gPiece < 7.5) {
    // a frame: the wearer's own top (a body, two short sleeves, a collar), and over it whatever the frame adds
    float body = sdTaper(p, vec3(0.0, -0.2, 0.0), vec3(0.0, 0.07, 0.0), 0.168, 0.15);
    body = min(body, sdTaper(vec3(abs(p.x), p.y, p.z), vec3(0.17, 0.08, 0.0), vec3(0.3, -0.06, 0.02), 0.07, 0.062));
    float collar = sdTorusY(p - vec3(0.0, 0.2, 0.0), 0.115, 0.045);
    float caps = eSpare < 0.5 ? length(vec3(abs(p.x) - 0.205, p.y - 0.115, p.z)) - 0.108 : 1e3;      // the scout unit's own shoulder plates
    float worn = frameMap(p - vec3(0.0, 0.03, 0.0), 1.0, gPiece - 6.0);
    float d = body; mat = 2.0;
    if (collar < d) { d = collar; mat = 3.0; }
    if (caps < d) { d = caps; mat = 4.0; }
    if (worn < d) { d = worn; mat = 5.0; }
    return d;
  }
  // a unit, seen from the side it shows the world
  float lit, pack = unitMap(vec3(p.x, p.y, -p.z), gPiece - 7.0, lit);
  mat = lit < pack ? 7.0 : 6.0;
  return min(pack, lit);
}
void entSurf(vec3 p, float mat, inout Surf s) {
  int m = int(mat + 0.5);
  if (m < 2) { heldSurf(gKit, gLook, m == 1, s); return; }
  if (m == 5) { frameSurf(p - vec3(0.0, 0.03, 0.0), 1.0, s); return; }
  if (m > 5) { unitSurf(vec3(p.x, p.y, -p.z), gPiece - 7.0, m == 7, s); return; }
  bool shell = eSpare < 0.5;
  if (m == 3) { s.albedo = eColB; s.cover = 0.86; return; }
  if (m == 4) { s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25; s.ink = penLine(abs(p.y - 0.115) - 0.06) * 0.6; return; }
  if (shell) {
    // the scout unit's body: a white chest plate with a lamp in it, a dark waist, a belt in its colour
    s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25;
    bool arm = abs(p.x) > 0.19;
    if (arm) { s.albedo = P_SLATE; s.cover = 0.84; }
    else {
      if (p.y < -0.1) { s.albedo = P_SLATE; s.cover = 0.84; }
      s.ink = penLine(p.y + 0.1) * 0.85;
      float lamp = length(p.xy - vec2(0.0, 0.085));
      if (p.z > 0.04 && lamp < 0.07) { s.albedo = P_SKY; s.cover = lamp < 0.048 ? 0.3 : 0.9; s.glow = lamp < 0.048 ? 0.7 : 0.0; s.ink = penLine(lamp - 0.07) * 0.8; }
      if (abs(p.y + 0.15) < 0.03) { s.albedo = eColA; s.cover = 0.86; s.ink = 0.0; }
    }
  } else {
    // a jacket in the wearer's colour: a belt, a pale fastening down the front, pale cuffs
    s.albedo = eColA; s.cover = 0.84;
    bool torso = abs(p.x) < 0.17;
    float belt = abs(p.y + 0.15) - 0.026;
    if (belt < 0.0 && torso) { s.albedo = P_UMBER; s.cover = 0.95; }
    s.ink = penLine(belt) * 0.9 * float(torso);
    if (torso && p.z > 0.0 && abs(p.x) < 0.022 && belt > 0.0) { s.albedo = P_CREAM; s.cover = 0.12; }
    if (torso && p.z > 0.0 && belt > 0.0) s.ink = max(s.ink, penLine(abs(p.x) - 0.022) * 0.6);
    if (!torso && p.y < -0.02) { s.albedo = P_CREAM; s.cover = 0.14; }
  }
}
`,
});
