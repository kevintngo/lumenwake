const vec3 CRAG_N[5] = vec3[5](
  vec3(0.83, 0.52, 0.21), vec3(-0.61, 0.61, 0.51), vec3(0.1, 0.7, -0.71),
  vec3(-0.5, 0.31, -0.81), vec3(0.3, -0.9, 0.31)
);

float lump(vec3 c, float r, float seed) {
  float d = length(c) - r;
  for (int i = 0; i < 5; i++) d = max(d, dot(c, CRAG_N[i]) - r * (0.66 + 0.22 * fract(seed * (5.0 + float(i) * 2.7))));
  return d - 0.03;
}

vec3 cFistL, cFistR;
float cBob, cStomp;

void entPose() {
  float s = sin(ePose.x) * ePose.w;
  cBob = abs(cos(ePose.x)) * 0.05 * ePose.w + 0.012 * sin(uTime * 1.6 + eLook.x * 6.0);
  cStomp = s;
  cFistL = vec3(-0.5, 0.4 + cBob, 0.08 - s * 0.2);
  cFistR = vec3(0.5, 0.4 + cBob, 0.08 + s * 0.2);
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float up = smoothstep(0.0, 0.4, ePose.z), down = smoothstep(0.4, 0.58, ePose.z), rec = smoothstep(0.7, 1.0, ePose.z);
    vec3 hi = vec3(0.3, 1.25, 0.1), lo = vec3(0.26, 0.2, 0.62);
    vec3 tgt = mix(mix(cFistR, hi, up), lo, down);
    tgt = mix(tgt, cFistR, rec);
    cFistR = tgt; cFistL = tgt * vec3(-1.0, 1.0, 1.0);
  }
  if (ePose.y > 2.5) cBob -= 0.06 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  float d = lump(p - vec3(0.0, 0.55 + cBob, 0.0), 0.44, eLook.x);
  d = min(d, lump(p - vec3(0.0, 1.02 + cBob, 0.06), 0.25, eLook.x + 0.31));
  vec3 fl = p - cFistL; fl.xz = fl.zx;
  d = min(d, lump(fl, 0.21, eLook.x + 0.53));
  d = min(d, lump(p - cFistR, 0.21, eLook.x + 0.71));
  vec3 lg = vec3(abs(p.x) - 0.17, p.y - 0.12 - max(cStomp * sign(p.x), 0.0) * 0.08, p.z - cStomp * sign(p.x) * 0.1);
  d = min(d, sdRoundBox(lg, vec3(0.11, 0.12, 0.13), 0.04));
  return d * 0.92;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec2 pv = pavers(p.xy * 3.4 + p.z * 2.3 + eLook.x * 20.0);
  s.albedo = eColA;
  s.cover = mix(0.5, 0.82, pv.y);
  s.ink = penLine(0.5 * pv.x / 3.4) * 0.8;
  float fist = step(min(length(p - cFistL), length(p - cFistR)), 0.3);
  if (fist > 0.5) { s.albedo = eColB; s.cover = mix(0.7, 0.92, pv.y); }
  float moss = smoothstep(0.75, 0.85, p.y - cBob) * step(p.y - cBob, 0.92) * step(0.45, vnoise(p.xz * 9.0));
  if (moss > 0.5 && fist < 0.5) { s.albedo = P_SAGE; s.cover = 0.8; s.ink *= 0.4; }
  vec3 f = p - vec3(0.0, 1.03 + cBob, 0.06);
  if (f.z > 0.1) {
    vec2 e = vec2(abs(f.x) - 0.09, f.y - 0.02);
    float socket = smoothstep(0.055, 0.045, length(e * vec2(1.0, 1.4)));
    float pupil = smoothstep(0.024, 0.016, length(e));
    if (socket > 0.5) { s.albedo = eColB; s.cover = 0.9; s.ink = 0.0; }
    if (pupil > 0.5) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; }
  }
}
