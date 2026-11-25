#include <eyes>

vec3 wCore;
float wFlap, wPuff;

void entPose() {
  float t = uTime * 2.0 + eLook.x * 6.28;
  wCore = vec3(0.04 * sin(t * 0.7), 0.88 + 0.1 * sin(t), 0.0);
  wFlap = sin(t * 2.4) * 0.35;
  wPuff = 1.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) { float k = sin(saturate(ePose.z) * PI); wCore.z += k * 0.3; wPuff += k * 0.3; }
  if (ePose.y > 2.5) wPuff -= 0.25 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  vec3 c = p - wCore;
  float d = length(c) - 0.22 * wPuff;
  float t = uTime * 3.0 + eLook.x * 6.28;
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    vec3 b = vec3(0.07 * sin(t - fi * 0.9), -0.15 * fi, -0.06 * fi - 0.08 * ePose.w * fi);
    d = smin(d, length(c - b) - (0.17 - 0.036 * fi) * wPuff, 0.12);
  }
  mat = 0.0;
  vec3 f = c; f.x = abs(f.x);
  f.xy = rot2(-0.3 + wFlap) * (f.xy - vec2(0.18, 0.0));
  vec3 fr = vec3(0.17, 0.035, 0.085);
  float fin = sdEllipsoid(f - vec3(0.14, 0.0, 0.0), fr);
  if (fin < d) { d = fin; mat = 1.0; }
  float halo = sdTorusY(c - vec3(0.0, 0.34 + 0.02 * sin(t), 0.0), 0.15, 0.018);
  if (halo < d) { d = halo; mat = 2.0; }
  return d * 0.85;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 c = p - wCore;
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.9; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.72; s.wrap = 0.6; s.ink = penLine(c.z) * 0.5; return; }
  float fall = smoothstep(-0.6, 0.15, c.y);
  s.albedo = mix(eColB, eColA, fall);
  s.cover = mix(0.7, 0.06, fall);
  s.glow = fall * 0.6;
  s.wrap = 0.8;
  if (c.z > 0.0 && length(c) < 0.3) paintEyes(s, c - vec3(0.0, 0.02, 0.0), 0.085, vec2(0.032, 0.055), eLook.x);
}
