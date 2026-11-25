float dSink, dLunge, dSway, dGape;

void entPose() {
  dSway = 0.14 * sin(uTime * 1.6 + eLook.x * 6.0) + 0.12 * sin(ePose.x) * ePose.w;
  dSink = 0.0;
  dLunge = 0.0;
  dGape = 0.25 + 0.1 * sin(uTime * 2.3 + eLook.x * 4.0);
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = sin(saturate(ePose.z) * PI);
    dLunge = k;
    dGape = mix(dGape, 1.0, smoothstep(0.0, 0.35, ePose.z) * (1.0 - smoothstep(0.5, 0.7, ePose.z)));
  }
  if (ePose.y > 2.5 && ePose.y < 3.5) dSink = 0.25 * (1.0 - ePose.z);
  if (ePose.y > 3.5) dSink = 1.75 * saturate(ePose.z);
}

vec3 dSeg(float k) {
  float lean = 0.55 * dLunge + 0.1;
  return vec3(dSway * k * 0.6, 0.28 + 1.18 * k - 0.35 * dLunge * k * k - dSink, lean * k * k * 1.3 + 0.05);
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  float d = max(sdTorusY(p - vec3(0.0, 0.02, 0.0), 0.5, 0.2), -p.y);
  mat = 2.0;
  float neck = 1e3;
  for (int i = 0; i < 5; i++) {
    float k = float(i) / 4.0;
    neck = smin(neck, length(p - dSeg(k)) - mix(0.4, 0.3, k), 0.1);
  }
  neck = max(neck, -p.y - 0.02);
  if (neck < d) { d = neck; mat = 0.0; }
  vec3 top = dSeg(1.0), up = normalize(dSeg(1.0) - dSeg(0.75));
  vec3 m = p - top - up * 0.2;
  float ang = atan(m.x, m.z), sec = TAU / 3.0;
  float a3 = mod(ang + sec * 0.5, sec) - sec * 0.5, rr = length(m.xz);
  vec3 j = vec3(sin(a3) * rr, m.y, cos(a3) * rr);
  float jaw = sdTaper(j, vec3(0.0, -0.05, 0.2), vec3(0.0, 0.3, 0.2 + 0.2 * dGape - 0.14), 0.08, 0.015);
  jaw = max(jaw, -p.y);
  if (jaw < d) { d = jaw; mat = 1.0; }
  return d * 0.85;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_BARK; s.cover = 0.7; s.ink = step(0.7, vnoise(p.xz * 9.0)) * 0.5; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.9; return; }
  float h = p.y + dSink;
  float front = smoothstep(0.0, 0.25, p.z - 0.05 - 0.4 * h * h * (0.55 * dLunge + 0.1));
  s.albedo = eColA; s.cover = mix(0.84, 0.3, front); s.wrap = 0.3;
  s.ink = penLine((fract(h * 3.4) - 0.5) / 3.4) * 0.7;
  vec3 top = dSeg(1.0);
  if (length(p - top) < 0.33 && p.y > top.y + 0.12) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
}
