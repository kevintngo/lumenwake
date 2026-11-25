vec3 wAt;
float wTilt, wEye, wSpin, wKick;

void entPose() {
  float t = uTime * 1.7 + eLook.x * 6.28;
  wAt = vec3(0.03 * sin(t * 0.8), 1.3 + 0.08 * sin(t), 0.0);
  wTilt = 0.2 * ePose.w;
  wSpin = uTime * 2.2 + eLook.x * 6.28;
  wEye = 0.45;
  wKick = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = saturate(ePose.z);
    wEye = mix(0.45, 1.0, smoothstep(0.0, 0.4, k));
    wKick = smoothstep(0.4, 0.5, k) * (1.0 - smoothstep(0.5, 1.0, k)) * 0.16;
  }
  if (ePose.y > 2.5) wAt.y -= 0.12 * (1.0 - ePose.z);
}

vec3 wLocal(vec3 p) {
  vec3 q = p - wAt;
  q.z += wKick;
  q.zy = rot2(wTilt) * q.zy;
  return q;
}

float entMap(vec3 p, out float mat) {
  vec3 q = wLocal(p);
  mat = 0.0;
  float dome = max(sdEllipsoid(q, vec3(0.36, 0.2, 0.36)), -q.y - 0.05);
  float skirt = sdCylinder(q + vec3(0.0, 0.1, 0.0), 0.3, 0.07);
  float d = smin(dome, skirt, 0.04);
  d = min(d, sdCapsule(q, vec3(0.1, 0.16, -0.1), vec3(0.14, 0.46, -0.16), 0.014));
  vec3 v = vec3(abs(q.x) - 0.42, q.y + 0.02, q.z + 0.06);
  d = min(d, sdRoundBox(v, vec3(0.1, 0.012, 0.13), 0.01));
  vec3 r = q + vec3(0.0, 0.16, 0.0);
  r.xz = rot2(wSpin) * r.xz;
  float ring = max(sdTorusY(r, 0.46, 0.022), -(abs(r.x) - 0.1));
  if (ring < d) { d = ring; mat = 2.0; }
  float lens = length(q - vec3(0.0, -0.17, 0.12)) - 0.13;
  if (lens < d) { d = lens; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = wLocal(p);
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.82; return; }
  if (mat > 0.5) {
    float r = length(q.xy - vec2(0.0, -0.17));
    s.albedo = eColB; s.cover = mix(0.9, 0.25, wEye) * step(0.05, r) + step(r, 0.05); s.glow = wEye * step(0.05, r);
    if (r < 0.05) { s.albedo = INK_BLACK; s.solid = 1.0; }
    return;
  }
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (q.y < 0.02 && q.y > -0.09) { s.albedo = eColA; s.cover = 0.84; }
  s.ink = max(penLine(q.y - 0.02), penLine((fract(atan(q.x, q.z) * 1.6) - 0.5) / 1.6 * 0.3) * step(0.02, q.y)) * 0.6;
}
