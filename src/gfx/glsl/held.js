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
void unitSurf(vec3 c, float look, bool light, inout Surf s) {
  if (light) { s.albedo = mix(P_SKY, P_TEAL, 0.45); s.cover = 0.22; s.glow = 0.85; s.soft = 1.0; return; }
  s.albedo = P_STONE; s.cover = 0.62;
  s.ink = look < 1.5 ? penLine(length(c.xy) - 0.085) * 0.7 : max(penLine(c.y - 0.06), penLine(c.y + 0.05)) * 0.6;
}
`;
