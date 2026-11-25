const vec3 SABER_COL = vec3(0.32, 0.74, 1.0);

void heldMap(vec3 p, vec3 hand, vec3 dir, vec3 side, float kit, float look, out float solid, out float lit) {
  solid = 1e3; lit = 1e3;
  if (kit < 0.5) {
    if (look < 0.5) {
      lit = sdCapsule(p, hand + dir * 0.17, hand + dir * 1.04, 0.043);
      solid = min(sdCapsule(p, hand - dir * 0.12, hand + dir * 0.1, 0.031),
                  sdCapsule(p, hand + dir * 0.1, hand + dir * 0.15, 0.043));
      solid = min(solid, sdCapsule(p, hand - dir * 0.15, hand - dir * 0.12, 0.037));
    } else {
      solid = min(sdCapsule(p, hand - dir * 0.2, hand + dir * 0.15, 0.03),
                  sdCapsule(p, hand + dir * 0.16 - side * 0.11, hand + dir * 0.16 + side * 0.11, 0.034));
      solid = min(solid, min(sdCapsule(p, hand + dir * 0.15 - side * 0.105, hand + dir * 0.21 - side * 0.105, 0.04),
                             sdCapsule(p, hand + dir * 0.15 + side * 0.105, hand + dir * 0.21 + side * 0.105, 0.04)));
      lit = min(sdCapsule(p, hand + dir * 0.22 - side * 0.105, hand + dir * 1.0 - side * 0.105, 0.034),
                sdCapsule(p, hand + dir * 0.22 + side * 0.105, hand + dir * 1.0 + side * 0.105, 0.034));
    }
  } else if (kit < 1.5) {
    if (look < 0.5) {
      solid = min(sdCapsule(p, hand - dir * 0.22, hand + dir * 0.5, 0.05),
                  sdCapsule(p, hand + dir * 0.12, hand + dir * 0.12 - vec3(0.0, 0.13, 0.0), 0.032));
      lit = length(p - hand - dir * 0.58) - 0.05;
    } else {
      solid = min(sdCapsule(p, hand - dir * 0.1, hand + dir * 0.22, 0.046),
                  sdCapsule(p, hand + dir * 0.05, hand + dir * 0.05 - vec3(0.0, 0.12, 0.0), 0.03));
      solid = min(solid, sdTaper(p, hand - dir * 0.12, hand - dir * 0.3 - vec3(0.0, 0.05, 0.0), 0.034, 0.05));
      solid = min(solid, sdCapsule(p, hand + dir * 0.22, hand + dir * 0.66, 0.018));
      lit = length(p - hand - dir * 0.7) - 0.034;
    }
  } else if (kit < 2.5) {
    if (look < 0.5) {
      solid = sdCapsule(p, hand - dir * 0.32, hand + dir * 0.74, 0.022);
      lit = length(p - hand - dir * 0.86) - 0.09;
    } else {
      solid = min(sdCapsule(p, hand - dir * 0.36, hand + dir * 0.7, 0.022),
                  sdCapsule(p, hand + dir * 0.67, hand + dir * 0.71, 0.046));
      vec3 q = p - hand - dir * 0.9;
      float along = dot(q, dir);
      vec3 across = q - dir * along;
      lit = (abs(along) / 0.2 + (abs(dot(across, side)) + abs(dot(across, cross(dir, side)))) / 0.09 - 1.0) * 0.05;
    }
  }
}

void heldSurf(float kit, float look, bool light, inout Surf s, float along) {
  if (!light) {
    s.albedo = P_CHARCOAL; s.cover = 0.85;
    if (kit < 0.5 && look < 0.5) {
      s.albedo = P_STONE; s.cover = 0.5; s.wrap = 0.3;
      if (along > -0.12 && along < 0.08 && fract(along * 26.0) < 0.42) { s.albedo = P_CHARCOAL; s.cover = 0.9; }
      s.ink = max(penLine(along - 0.1), penLine(along + 0.12)) * 0.8;
    }
    return;
  }
  if (kit < 0.5) {
    float facing = abs(dot(gNormal, gRay)), core = smoothstep(0.32, 0.72, facing);
    s.albedo = SABER_COL; s.cover = mix(0.96, 0.0, core); s.solid = 1.0; s.glow = core; s.ink = 0.0;
    return;
  }
  s.albedo = mix(P_SKY, P_TEAL, 0.45); s.cover = 0.22; s.glow = 0.85; s.soft = 1.0;
  if (kit > 1.5 && look > 0.5) { s.cover = 0.42; s.glow = 0.6; }
}

float frameMap(vec3 c, float wide, float look) {
  if (look < 0.5) return 1e3;
  float d = sdEllipsoid(vec3(abs(c.x) - 0.215 * wide, c.y - 0.1, c.z), vec3(0.15, 0.1, 0.145));
  return min(d, sdRoundBox(vec3(c.x, c.y - 0.005, abs(c.z) - 0.13), vec3(0.12 * wide, 0.09, 0.03), 0.028));
}
void frameSurf(vec3 c, float wide, inout Surf s) {
  s.albedo = P_SLATE; s.cover = 0.8;
  bool chest = abs(c.x) < 0.14 * wide;
  s.ink = chest ? penLine(abs(c.y - 0.005) - 0.07) * 0.7 : penLine(c.y - 0.075) * 0.7;
  if (chest && abs(c.y - 0.005) < 0.022) { s.albedo = eColB; s.cover = 0.86; s.ink = 0.0; }
}

float unitMap(vec3 c, float look, out float lit) {
  lit = 1e3;
  if (look < 0.5) return 1e3;
  if (look < 1.5) {
    lit = max(length(c.xy) - 0.055, abs(c.z + 0.03) - 0.04);
    return max(length(c.xy) - 0.11, abs(c.z) - 0.05) - 0.012;
  }
  vec3 t = vec3(abs(c.x) - 0.068, c.y, c.z);
  lit = length(t - vec3(0.0, -0.135, 0.0)) - 0.036;
  return min(sdCapsule(t, vec3(0.0, -0.09, 0.0), vec3(0.0, 0.1, 0.0), 0.046), sdRoundBox(c, vec3(0.07, 0.03, 0.03), 0.015));
}

float wornMap(vec3 p, float piece, out float lit) {
  lit = 1e3;
  if (piece < 0.5) {
    float plate = max(length(p.xy) - 0.17, abs(p.z) - 0.018) - 0.008;
    float rim = length(vec2(length(p.xy) - 0.165, p.z - 0.008)) - 0.022;
    lit = length(p - vec3(0.0, 0.0, 0.03)) - 0.045;
    return min(plate, rim);
  }
  if (piece < 1.5) {
    lit = max(length(p.xz) - 0.064, abs(p.y) - 0.035);
    return min(sdCapsule(p, vec3(0.0, -0.11, 0.0), vec3(0.0, 0.11, 0.0), 0.058), max(length(p.xz) - 0.07, abs(abs(p.y) - 0.1) - 0.018));
  }
  if (piece < 2.5) {
    lit = length(p) - 0.055;
    float ring = length(vec2(length(p.xy) - 0.12, p.z)) - 0.018;
    return min(ring, sdCapsule(vec3(abs(p.x), p.y, p.z), vec3(0.06, 0.0, 0.0), vec3(0.105, 0.0, 0.0), 0.01));
  }
  if (piece < 3.5) {
    float band = max(abs(length(p.xz) - 0.2) - 0.022, abs(p.y) - 0.05);
    band = max(band, -(p.z + 0.02));
    lit = max(max(abs(length(p.xz) - 0.226) - 0.012, abs(p.y) - 0.026), 0.12 - p.z);
    return band - 0.006;
  }
  if (piece < 4.5) {
    float dome = max(length(p) - 0.19, -(p.y + 0.02));
    float lip = max(length(p.xz) - 0.205, abs(p.y + 0.01) - 0.02);
    float fin = sdRoundBox(p - vec3(0.0, 0.17, -0.01), vec3(0.016, 0.07, 0.13), 0.012);
    return min(min(dome, lip), fin);
  }
  if (piece < 6.5) {
    float g = piece - 5.0, k = 1.0 + 0.18 * g;
    float palm = sdRoundBox(p - vec3(0.0, 0.03, 0.0), vec3(0.075, 0.085, 0.04) * k, 0.03);
    float fingers = sdRoundBox(p - vec3(0.0, 0.14 * k, 0.012), vec3(0.07, 0.05, 0.034) * k, 0.03);
    float thumb = sdCapsule(p, vec3(0.07, 0.0, 0.0) * k, vec3(0.12, 0.07, 0.02) * k, 0.027 * k);
    float cuff = sdTaper(p, vec3(0.0, -0.06, 0.0), vec3(0.0, -0.15, 0.0), 0.075 * k, (0.075 + 0.03 * g) * k);
    return min(smin(min(palm, fingers), thumb, 0.03), cuff);
  }
  if (piece < 7.5) {
    float shin = sdTaper(p, vec3(0.0, -0.17, 0.0), vec3(0.0, 0.1, 0.0), 0.065, 0.085);
    shin = max(shin, -(p.z + 0.01));
    return min(shin, sdEllipsoid(p - vec3(0.0, 0.16, 0.02), vec3(0.075, 0.06, 0.06)));
  }
  if (piece < 9.5) {
    float m = piece - 8.0;
    float foot = sdEllipsoid(p - vec3(0.0, -0.1, 0.05), vec3(0.08, 0.062, 0.15) * (1.0 + 0.1 * m));
    float shaft = sdCapsule(p, vec3(0.0, -0.1, -0.02), vec3(0.0, 0.1, -0.02), 0.07 + 0.012 * m);
    float sole = sdRoundBox(p - vec3(0.0, -0.15, 0.04), vec3(0.08, 0.016, 0.16) * (1.0 + 0.1 * m), 0.012);
    if (m > 0.5) lit = length(p - vec3(0.0, -0.08, -0.1)) - 0.03;
    return min(smin(foot, shaft, 0.05), sole);
  }
  if (piece < 10.5) {
    lit = sdRoundBox(p - vec3(0.0, 0.0, 0.02), vec3(0.04, 0.04, 0.01), 0.008);
    float chip = sdRoundBox(p, vec3(0.11, 0.11, 0.018), 0.012);
    float pins = sdRoundBox(vec3(abs(p.x) - 0.13, mod(p.y + 0.0275, 0.055) - 0.0275, p.z), vec3(0.02, 0.008, 0.006), 0.003);
    return min(chip, max(pins, abs(p.y) - 0.1));
  }
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
