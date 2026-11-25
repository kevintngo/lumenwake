float mSwell, mBob;

void entPose() {
  mBob = abs(sin(ePose.x * 2.0)) * 0.03 * ePose.w + 0.01 * sin(uTime * 3.0 + eLook.x * 6.0);
  mSwell = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) mSwell = saturate(ePose.z) + 0.08 * sin(uTime * 40.0) * saturate(ePose.z);
  if (ePose.y > 2.5) mBob -= 0.04 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  vec3 q = p - vec3(0.0, mBob, 0.0);
  mat = 0.0;
  float shell = sdEllipsoid(q - vec3(0.0, 0.2, 0.08), vec3(0.2, 0.15, 0.22));
  float head = length(q - vec3(0.0, 0.17, 0.32)) - 0.1;
  float d = smin(shell, head, 0.05);
  vec3 a = vec3(abs(q.x), q.y, q.z);
  float sgn = q.x < 0.0 ? -1.0 : 1.0, legs = 1e3;
  for (int i = 0; i < 3; i++) {
    float z = -0.02 + 0.13 * float(i);
    float ph = sin(ePose.x * 2.0 + float(i) * 2.1 + sgn * 1.2) * ePose.w;
    legs = min(legs, sdTaper(a, vec3(0.16, 0.16, z), vec3(0.34, 0.0 + max(ph, 0.0) * 0.05 - mBob, z * 1.4 + ph * 0.05), 0.028, 0.012));
  }
  legs = min(legs, sdCapsule(a, vec3(0.05, 0.22, 0.38), vec3(0.12, 0.36, 0.5), 0.01));
  d = min(d, legs);
  float sac = length(q - vec3(0.0, 0.2 + 0.06 * mSwell, -0.2)) - (0.16 + 0.14 * mSwell);
  if (sac < d) { d = sac; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = p - vec3(0.0, mBob, 0.0);
  if (mat > 0.5) {
    s.albedo = eColB; s.cover = mix(0.86, 0.2, mSwell); s.glow = 0.25 + 0.7 * mSwell;
    s.ink = penLine(fract(atan(q.x, q.y - 0.2) * 1.3) - 0.5) * 0.3 * (1.0 - mSwell);
    return;
  }
  s.albedo = eColA; s.cover = 0.86; s.wrap = 0.2;
  s.ink = max(penLine(q.x) * step(q.z, 0.25), penLine(q.z - 0.25)) * 0.6;
  vec2 e = vec2(abs(q.x) - 0.05, q.y - 0.2);
  if (q.z > 0.36 && length(e) < 0.028) { s.albedo = eColB; s.cover = 0.3; s.glow = 0.8; s.ink = 0.0; }
}
