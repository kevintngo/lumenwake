float dBob;
mat2 dSpin;

void entPose() {
  dBob = 0.2 + 0.05 * sin(uTime * 2.6 + eLook.x * 6.28) + ePose.w;
  dSpin = rot2(uTime * 1.8 + eLook.x * 6.28);
}

float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(0.0, dBob, 0.0);
  q.xz = dSpin * q.xz;
  mat = 0.0;
  if (eExtra < 0.5) {
    float c1 = max(length(q.xy) - 0.14, abs(q.z) - 0.025);
    float c2 = max(length(q.xy - vec2(0.12, -0.06)) - 0.11, abs(q.z + 0.07) - 0.022);
    return min(c1, c2) - 0.008;
  }
  if (eExtra < 1.5) {
    float sack = length(q * vec3(1.0, 1.15, 1.0) + vec3(0.0, 0.02, 0.0)) - 0.15;
    float neck = sdCapsule(q, vec3(0.0, 0.1, 0.0), vec3(0.0, 0.19, 0.0), 0.05);
    float tie = sdTorusY(q - vec3(0.0, 0.13, 0.0), 0.055, 0.016);
    float d = smin(sack, neck, 0.05);
    if (tie < d) { d = tie; mat = 1.0; }
    return d;
  }
  if (eExtra < 2.5) {
    float flask = length(q + vec3(0.0, 0.03, 0.0)) - 0.13;
    float neck = sdCylinder(q - vec3(0.0, 0.06, 0.0), 0.045, 0.1);
    float cork = sdCylinder(q - vec3(0.0, 0.16, 0.0), 0.05, 0.04);
    float d = smin(flask, neck, 0.03);
    if (cork < d) { d = cork; mat = 1.0; }
    return d;
  }
  float hx = max(abs(q.x) * 0.866 + abs(q.z) * 0.5, abs(q.z));
  return max(hx - 0.12 + abs(q.y) * 0.7, abs(q.y) - 0.17) * 0.8;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(0.0, dBob, 0.0);
  q.xz = dSpin * q.xz;
  if (eExtra < 0.5) {
    s.albedo = P_SUN; s.cover = 0.85;
    s.ink = penLine(length(q.xy) - 0.095) * 0.6;
  } else if (eExtra < 1.5) {
    s.albedo = mat > 0.5 ? P_BRICK : P_TAN; s.cover = mat > 0.5 ? 0.9 : 0.7;
  } else if (eExtra < 2.5) {
    s.albedo = mat > 0.5 ? P_BARK : eColA;
    s.cover = mat > 0.5 ? 0.85 : mix(0.06, 0.88, step(q.y, 0.0));
    s.ink = mat > 0.5 ? 0.0 : penLine(q.y) * 0.7;
  } else {
    s.albedo = eColA; s.cover = mix(0.85, 0.15, step(0.0, q.x * 0.6 + q.y));
    s.glow = 0.25;
  }
}
