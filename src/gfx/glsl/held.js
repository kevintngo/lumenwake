// What a figure carries and wears. One set of shapes, shared by the people
// (archetypes/humanoid.js) and by the drawings of gear on the interface's tiles
// (archetypes/gear.js), so a tile always shows the very thing that is in the
// hand, on the shoulders or on the back.
//
// Every base in content/gear.js has a `look`: which of its family's shapes it is.
//   blade   0 arc saber: a grip and one bar of light      1 split glaive: a haft, a yoke, two bars
//   rifle   0 pulse rifle: a long body, a muzzle light    1 needle carbine: a stock, a short body, a thin barrel
//   rod     0 focus rod: a staff, a ball of light         1 prism staff: a longer staff, a cut prism
//   frame   0 scout: the wearer's own clothes             1 bulwark: pauldrons, a plate front and back
//   unit    0 none   1 core: a drum with a light in it    2 drive: two tubes, a light at the foot of each
//   offhand 0 arc ward: a round plate with a light boss    1 charge cell: a canister with a lit band    2 focus lens: a ring round a light
//   visor   0 scout visor: a band with a lit strip         1 crest helm: a dome with a fin
//   grips   0 grip gloves                                  1 power gauntlets: plated, a flared cuff
//   greaves 0 shin plates          boots 0 trail boots: leather      1 mag boots: plated, a light at the heel
//   mod     0 signal chip: a square chip with a lit core   1 coil ring: a ring with a lit stone

export const HELD_GLSL = /* glsl */ `
// The thing in the hand. hand: the grip. dir: the way it points. side: across it (both unit).
// kit: 0 blade, 1 rifle, 2 rod. Gives the distance to its solid parts and to its light.
void heldMap(vec3 p, vec3 hand, vec3 dir, vec3 side, float kit, float look, out float solid, out float lit) {
  solid = 1e3; lit = 1e3;
  if (kit < 0.5) {
    if (look < 0.5) {
      // a short grip with a collar, and a bar of light out of it
      lit = sdCapsule(p, hand + dir * 0.14, hand + dir * 0.98, 0.04);
      solid = min(sdCapsule(p, hand - dir * 0.1, hand + dir * 0.09, 0.034),
                  sdCapsule(p, hand + dir * 0.09, hand + dir * 0.12, 0.052));
    } else {
      // a longer haft, a yoke across its head, and two bars of light that close toward their tips
      solid = min(sdCapsule(p, hand - dir * 0.2, hand + dir * 0.15, 0.03),
                  sdCapsule(p, hand + dir * 0.16 - side * 0.125, hand + dir * 0.16 + side * 0.125, 0.036));
      lit = min(sdCapsule(p, hand + dir * 0.22 - side * 0.115, hand + dir * 0.94 - side * 0.07, 0.03),
                sdCapsule(p, hand + dir * 0.22 + side * 0.115, hand + dir * 0.94 + side * 0.07, 0.03));
    }
  } else if (kit < 1.5) {
    if (look < 0.5) {
      // a long body held along the aim, a grip under it, a light at the muzzle
      solid = min(sdCapsule(p, hand - dir * 0.22, hand + dir * 0.5, 0.05),
                  sdCapsule(p, hand + dir * 0.12, hand + dir * 0.12 - vec3(0.0, 0.13, 0.0), 0.032));
      lit = length(p - hand - dir * 0.58) - 0.05;
    } else {
      // a stock behind the hand, a short body, and a long thin barrel with a point of light on it
      solid = min(sdCapsule(p, hand - dir * 0.1, hand + dir * 0.22, 0.046),
                  sdCapsule(p, hand + dir * 0.05, hand + dir * 0.05 - vec3(0.0, 0.12, 0.0), 0.03));
      solid = min(solid, sdTaper(p, hand - dir * 0.12, hand - dir * 0.3 - vec3(0.0, 0.05, 0.0), 0.034, 0.05));
      solid = min(solid, sdCapsule(p, hand + dir * 0.22, hand + dir * 0.66, 0.018));
      lit = length(p - hand - dir * 0.7) - 0.034;
    }
  } else if (kit < 2.5) {
    if (look < 0.5) {
      // a thin staff with a ball of light at its head
      solid = sdCapsule(p, hand - dir * 0.32, hand + dir * 0.74, 0.022);
      lit = length(p - hand - dir * 0.86) - 0.09;
    } else {
      // a longer staff, a collar under its head, and a prism cut to a point at each end
      solid = min(sdCapsule(p, hand - dir * 0.36, hand + dir * 0.7, 0.022),
                  sdCapsule(p, hand + dir * 0.67, hand + dir * 0.71, 0.046));
      vec3 q = p - hand - dir * 0.9;
      float along = dot(q, dir);
      vec3 across = q - dir * along;
      lit = (abs(along) / 0.2 + (abs(dot(across, side)) + abs(dot(across, cross(dir, side)))) / 0.09 - 1.0) * 0.05;
    }
  }
}

// How the thing in the hand is drawn. light: the point is on its light, not its solid parts.
void heldSurf(float kit, float look, bool light, inout Surf s) {
  if (!light) { s.albedo = P_CHARCOAL; s.cover = 0.85; return; }
  if (kit < 0.5) { s.albedo = mix(P_SKY, P_TEAL, 0.55); s.cover = 0.9; s.soft = 1.0; return; }       // a bar of light: blue pencil, laid soft
  s.albedo = mix(P_SKY, P_TEAL, 0.45); s.cover = 0.22; s.glow = 0.85; s.soft = 1.0;                   // a muzzle light, the head of a rod
  if (kit > 1.5 && look > 0.5) { s.cover = 0.42; s.glow = 0.6; }                                     // a prism holds a little more colour
}

// A frame worn over the clothes. c: the point, from the middle of the chest. wide: the wearer's build.
float frameMap(vec3 c, float wide, float look) {
  if (look < 0.5) return 1e3;
  float d = sdEllipsoid(vec3(abs(c.x) - 0.215 * wide, c.y - 0.1, c.z), vec3(0.15, 0.1, 0.145));
  return min(d, sdRoundBox(vec3(c.x, c.y - 0.005, abs(c.z) - 0.13), vec3(0.12 * wide, 0.09, 0.03), 0.028));
}
void frameSurf(vec3 c, float wide, inout Surf s) {
  // slate plate with a pale edge, and one band of the wearer's accent across the chest
  s.albedo = P_SLATE; s.cover = 0.8;
  bool chest = abs(c.x) < 0.14 * wide;
  s.ink = chest ? penLine(abs(c.y - 0.005) - 0.07) * 0.7 : penLine(c.y - 0.075) * 0.7;
  if (chest && abs(c.y - 0.005) < 0.022) { s.albedo = eColB; s.cover = 0.86; s.ink = 0.0; }
}

// A unit carried on the back. c: the point, from where it is fixed (its outer face looks along -z).
float unitMap(vec3 c, float look, out float lit) {
  lit = 1e3;
  if (look < 0.5) return 1e3;
  if (look < 1.5) {
    // a drum, with a light in the middle of its face
    lit = max(length(c.xy) - 0.055, abs(c.z + 0.03) - 0.04);
    return max(length(c.xy) - 0.11, abs(c.z) - 0.05) - 0.012;
  }
  // two tubes side by side, a light at the foot of each
  vec3 t = vec3(abs(c.x) - 0.068, c.y, c.z);
  lit = length(t - vec3(0.0, -0.135, 0.0)) - 0.036;
  return min(sdCapsule(t, vec3(0.0, -0.09, 0.0), vec3(0.0, 0.1, 0.0), 0.046), sdRoundBox(c, vec3(0.07, 0.03, 0.03), 0.015));
}
// ---- the newer pieces, each about its own middle (a ward and a lens face +z, a cell stands up y).
// piece: 0..2 an off-hand, 3..4 a visor, 5..6 grips, 7 greaves, 8..9 boots, 10..11 a mod. Gives the solid and its light.
float wornMap(vec3 p, float piece, out float lit) {
  lit = 1e3;
  if (piece < 0.5) {
    // a round plate, a raised rim, a light in its boss
    float plate = max(length(p.xy) - 0.17, abs(p.z) - 0.018) - 0.008;
    float rim = length(vec2(length(p.xy) - 0.165, p.z - 0.008)) - 0.022;
    lit = length(p - vec3(0.0, 0.0, 0.03)) - 0.045;
    return min(plate, rim);
  }
  if (piece < 1.5) {
    // a canister: dark ends, and a lit band round its middle
    lit = max(length(p.xz) - 0.064, abs(p.y) - 0.035);
    return min(sdCapsule(p, vec3(0.0, -0.11, 0.0), vec3(0.0, 0.11, 0.0), 0.058), max(length(p.xz) - 0.07, abs(abs(p.y) - 0.1) - 0.018));
  }
  if (piece < 2.5) {
    // a thin ring, two short spokes, and a light held in its middle
    lit = length(p) - 0.055;
    float ring = length(vec2(length(p.xy) - 0.12, p.z)) - 0.018;
    return min(ring, sdCapsule(vec3(abs(p.x), p.y, p.z), vec3(0.06, 0.0, 0.0), vec3(0.105, 0.0, 0.0), 0.01));
  }
  if (piece < 3.5) {
    // a band round the front of the head, a lit strip across it
    float band = max(abs(length(p.xz) - 0.2) - 0.022, abs(p.y) - 0.05);
    band = max(band, -(p.z + 0.02));
    lit = max(max(abs(length(p.xz) - 0.226) - 0.012, abs(p.y) - 0.026), 0.12 - p.z);
    return band - 0.006;
  }
  if (piece < 4.5) {
    // a dome over the head, a lip, and a fin from front to back
    float dome = max(length(p) - 0.19, -(p.y + 0.02));
    float lip = max(length(p.xz) - 0.205, abs(p.y + 0.01) - 0.02);
    float fin = sdRoundBox(p - vec3(0.0, 0.17, -0.01), vec3(0.016, 0.07, 0.13), 0.012);
    return min(min(dome, lip), fin);
  }
  if (piece < 6.5) {
    // a hand in a glove, fingers together, the thumb out, and a cuff; gauntlets are bigger, plated, the cuff flared
    float g = piece - 5.0, k = 1.0 + 0.18 * g;
    float palm = sdRoundBox(p - vec3(0.0, 0.03, 0.0), vec3(0.075, 0.085, 0.04) * k, 0.03);
    float fingers = sdRoundBox(p - vec3(0.0, 0.14 * k, 0.012), vec3(0.07, 0.05, 0.034) * k, 0.03);
    float thumb = sdCapsule(p, vec3(0.07, 0.0, 0.0) * k, vec3(0.12, 0.07, 0.02) * k, 0.027 * k);
    float cuff = sdTaper(p, vec3(0.0, -0.06, 0.0), vec3(0.0, -0.15, 0.0), 0.075 * k, (0.075 + 0.03 * g) * k);
    return min(smin(min(palm, fingers), thumb, 0.03), cuff);
  }
  if (piece < 7.5) {
    // a plate down the shin and a knee cap over it
    float shin = sdTaper(p, vec3(0.0, -0.17, 0.0), vec3(0.0, 0.1, 0.0), 0.065, 0.085);
    shin = max(shin, -(p.z + 0.01));
    return min(shin, sdEllipsoid(p - vec3(0.0, 0.16, 0.02), vec3(0.075, 0.06, 0.06)));
  }
  if (piece < 9.5) {
    // a boot: a rounded foot, a shaft to the calf; mag boots are plated, with a light at the heel
    float m = piece - 8.0;
    float foot = sdEllipsoid(p - vec3(0.0, -0.1, 0.05), vec3(0.08, 0.062, 0.15) * (1.0 + 0.1 * m));
    float shaft = sdCapsule(p, vec3(0.0, -0.1, -0.02), vec3(0.0, 0.1, -0.02), 0.07 + 0.012 * m);
    float sole = sdRoundBox(p - vec3(0.0, -0.15, 0.04), vec3(0.08, 0.016, 0.16) * (1.0 + 0.1 * m), 0.012);
    if (m > 0.5) lit = length(p - vec3(0.0, -0.08, -0.1)) - 0.03;
    return min(smin(foot, shaft, 0.05), sole);
  }
  if (piece < 10.5) {
    // a square chip, a lit core in its face, short pins along two sides
    lit = sdRoundBox(p - vec3(0.0, 0.0, 0.02), vec3(0.04, 0.04, 0.01), 0.008);
    float chip = sdRoundBox(p, vec3(0.11, 0.11, 0.018), 0.012);
    float pins = sdRoundBox(vec3(abs(p.x) - 0.13, mod(p.y + 0.0275, 0.055) - 0.0275, p.z), vec3(0.02, 0.008, 0.006), 0.003);
    return min(chip, max(pins, abs(p.y) - 0.1));
  }
  // a ring standing up, and a lit stone set on its top
  lit = length(p - vec3(0.0, 0.135, 0.0)) - 0.045;
  return min(length(vec2(length(p.xy) - 0.105, p.z)) - 0.028, sdRoundBox(p - vec3(0.0, 0.1, 0.0), vec3(0.035, 0.025, 0.035), 0.01));
}
void wornSurf(vec3 p, float piece, bool light, inout Surf s) {
  if (light) { s.albedo = mix(P_SKY, P_TEAL, 0.45); s.cover = 0.22; s.glow = 0.85; s.soft = 1.0; return; }
  s.albedo = P_SLATE; s.cover = 0.8;
  if (piece < 0.5) { s.ink = penLine(length(p.xy) - 0.11) * 0.7; if (abs(p.y) < 0.02 && length(p.xy) > 0.06) { s.albedo = eColB; s.cover = 0.86; } return; }
  if (piece < 1.5) { s.albedo = P_STONE; s.cover = 0.62; s.ink = penLine(abs(abs(p.y) - 0.065) - 0.0) * 0.6; return; }
  if (piece < 2.5) { s.albedo = P_STONE; s.cover = 0.6; return; }
  if (piece < 3.5) { s.albedo = P_CHARCOAL; s.cover = 0.85; return; }
  if (piece < 4.5) { if (abs(p.x) < 0.03 && p.y > 0.08) { s.albedo = eColB; s.cover = 0.86; } s.ink = penLine(p.y + 0.0) * 0.6; return; }
  if (piece < 5.5) { s.albedo = P_CHARCOAL; s.cover = 0.85; s.ink = penLine(p.y + 0.06) * 0.6; return; }
  if (piece < 6.5) { s.ink = max(penLine(p.y + 0.07) * 0.7, penLine(abs(p.y - 0.09) - 0.0) * 0.5); if (p.y < -0.07) { s.albedo = eColB; s.cover = 0.86; } return; }
  if (piece < 7.5) { s.ink = max(penLine(p.y - 0.1) * 0.7, penLine(abs(p.y + 0.05)) * 0.5); return; }
  if (piece < 8.5) { s.albedo = P_UMBER; s.cover = 0.86; s.ink = max(penLine(p.y + 0.13) * 0.8, penLine(p.y - 0.06) * 0.6); return; }
  if (piece < 9.5) { s.ink = max(penLine(p.y + 0.13) * 0.8, penLine(p.y - 0.04) * 0.6); if (abs(p.y + 0.02) < 0.02) { s.albedo = eColB; s.cover = 0.86; s.ink = 0.0; } return; }
  if (piece < 10.5) { s.albedo = P_CHARCOAL; s.cover = 0.85; s.ink = max(penLine(abs(p.x) - 0.07), penLine(abs(p.y) - 0.07)) * 0.5; return; }
  s.albedo = P_STONE; s.cover = 0.62;
}

void unitSurf(vec3 c, float look, bool light, inout Surf s) {
  if (light) { s.albedo = mix(P_SKY, P_TEAL, 0.45); s.cover = 0.22; s.glow = 0.85; s.soft = 1.0; return; }
  s.albedo = P_STONE; s.cover = 0.62;
  s.ink = look < 1.5 ? penLine(length(c.xy) - 0.085) * 0.7 : max(penLine(c.y - 0.06), penLine(c.y + 0.05)) * 0.6;
}
`;
