float cSway, cSnap, cBob;

void entPose() {
  cSway = sin(ePose.x * 2.0) * 0.03 * ePose.w;
  cBob = 0.012 * sin(uTime * 2.6 + eLook.x * 6.0) + abs(sin(ePose.x * 2.0)) * 0.02 * ePose.w;
  cSnap = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) cSnap = sin(saturate(ePose.z) * PI);
  if (ePose.y > 2.5) cBob -= 0.05 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(cSway, cBob, 0.0);
  vec3 sr = vec3(0.37, 0.17, 0.29);
  float shell = sdEllipsoid(q - vec3(0.0, 0.24, 0.0), sr);
  shell = max(shell, 0.17 - q.y);
  float under = sdEllipsoid(q - vec3(0.0, 0.2, 0.0), vec3(0.33, 0.1, 0.25));
  float d = min(shell, under);
  mat = shell < under ? 0.0 : 2.0;
  vec3 a = vec3(abs(q.x), q.y, q.z);
  float sgn = sign(q.x);
  float legs = 1e3;
  for (int i = 0; i < 3; i++) {
    float z = -0.16 + 0.14 * float(i);
    float ph = sin(ePose.x * 2.0 + float(i) * 2.1 + sgn * 1.2) * ePose.w;
    vec3 knee = vec3(0.44, 0.24 + max(ph, 0.0) * 0.06, z * 1.3);
    vec3 tip = vec3(0.56, 0.0 + max(ph, 0.0) * 0.07 - cBob, z * 1.6 + ph * 0.05);
    legs = min(legs, min(sdCapsule(a, vec3(0.28, 0.2, z), knee, 0.035), sdTaper(a, knee, tip, 0.032, 0.015)));
  }
  if (legs < d) { d = legs; mat = 2.0; }
  vec3 cl = vec3(0.38 - 0.1 * cSnap, 0.24 + 0.14 * cSnap, 0.3 + 0.22 * cSnap);
  float arm = sdCapsule(a, vec3(0.26, 0.2, 0.18), cl, 0.045);
  vec3 cq = a - cl;
  float claw = length(cq * vec3(1.0, 1.15, 0.85)) - 0.13;
  claw = max(claw, -sdBox(cq - vec3(0.0, 0.0, 0.12), vec3(0.2, 0.02 + 0.03 * (1.0 - cSnap), 0.1)));
  claw = min(claw, arm);
  if (claw < d) { d = claw; mat = 1.0; }
  float stalk = sdCapsule(a, vec3(0.09, 0.3, 0.22), vec3(0.1, 0.46, 0.26), 0.022);
  float eye = length(a - vec3(0.1, 0.48, 0.26)) - 0.055;
  if (stalk < d) { d = stalk; mat = 2.0; }
  if (eye < d) { d = eye; mat = 3.0; }
  return d * 0.85;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(cSway, cBob, 0.0);
  if (mat > 2.5) {
    s.albedo = P_CREAM; s.cover = 0.06;
    vec3 e = vec3(abs(q.x), q.y, q.z) - vec3(0.1, 0.48, 0.26);
    if (length(e.xy - vec2(0.0, 0.005)) < 0.03 && e.z > 0.0) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; }
    return;
  }
  if (mat > 1.5) { s.albedo = eColC; s.cover = mix(0.7, 0.15, step(q.y, 0.2) * step(length(q.xz), 0.3)); return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.88; return; }
  float r = length(q.xz / vec2(0.37, 0.29));
  vec2 v = voronoi(q.xz * 9.0 + eLook.x * 20.0);
  float freckle = smoothstep(0.16, 0.1, v.x) * step(0.5, v.y);
  s.albedo = eColA;
  s.cover = mix(mix(0.78, 0.92, smoothstep(0.5, 1.0, r)), 0.0, freckle);
  s.ink = penLine((abs(fract(r * 2.5) - 0.5)) / 2.5 * 0.3) * 0.6;
}
