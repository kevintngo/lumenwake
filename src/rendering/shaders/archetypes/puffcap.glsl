#include <eyes>

float pTilt, pLean, pBob;

vec3 puffLocal(vec3 p) {
  p.y -= pBob;
  p.xy = rot2(pTilt) * p.xy;
  p.zy = rot2(pLean) * p.zy;
  return p;
}

void entPose() {
  float mv = ePose.w;
  pTilt = sin(ePose.x) * 0.13 * mv;
  pBob = abs(cos(ePose.x)) * 0.04 * mv + 0.012 * sin(uTime * 2.0 + eLook.x * 6.0);
  pLean = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) pLean = sin(saturate(ePose.z) * PI) * 0.75;
  if (ePose.y > 2.5) pLean = -0.35 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  float s = sin(ePose.x) * ePose.w;
  float up = cos(ePose.x) * ePose.w;
  float feet = min(length(p - vec3(-0.12, 0.06 + max(up, 0.0) * 0.09, 0.04 + s * 0.12)),
                   length(p - vec3(0.12, 0.06 + max(-up, 0.0) * 0.09, 0.04 - s * 0.12))) - 0.085;
  vec3 q = puffLocal(p);
  float body = sdTaper(q, vec3(0.0, 0.14, 0.0), vec3(0.0, 0.42, 0.0), 0.2, 0.165);
  vec3 c = q - vec3(0.0, 0.5, 0.0);
  float cap = max(length(c * vec3(1.0, 1.4, 1.0)) - 0.46, -c.y - 0.03) * 0.68;
  cap = smin(cap, sdTorusY(c, 0.43, 0.05), 0.05);
  float arms = min(sdCapsule(q, vec3(-0.19, 0.33, 0.02), vec3(-0.3, 0.24 + 0.05 * s, 0.08), 0.04),
                   sdCapsule(q, vec3(0.19, 0.33, 0.02), vec3(0.3, 0.24 - 0.05 * s, 0.08), 0.04));
  float d = min(body, arms);
  mat = 0.0;
  if (cap < d) { d = cap; mat = 1.0; }
  if (feet < d) { d = feet; mat = 2.0; }
  return d;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_TAN; s.cover = 0.7; return; }
  vec3 q = puffLocal(p);
  if (mat > 0.5) {
    vec3 c = q - vec3(0.0, 0.5, 0.0);
    float under = step(c.y, 0.005);
    float rim = step(c.y, 0.07) * step(0.36, length(c.xz)) * (1.0 - under);
    vec2 v = voronoi(c.xz * 4.2 + eLook.x * 20.0);
    float spot = smoothstep(0.24, 0.18, v.x) * (1.0 - under) * (1.0 - rim);
    s.albedo = mix(eColA, eColB, rim);
    s.cover = mix(0.86, 0.0, spot);
    s.ink = penLine((v.x - 0.21) / 4.2) * (1.0 - under) * (1.0 - rim) * 0.6;
    if (under > 0.5) {
      s.albedo = P_TAN; s.cover = 0.4;
      s.ink = smoothstep(0.2, 0.0, abs(fract(atan(c.z, c.x) * 3.5) - 0.5)) * 0.5;
    }
    return;
  }
  s.albedo = eColC; s.cover = 0.22; s.wrap = 0.3;
  vec3 f = q - vec3(0.0, 0.31, 0.0);
  if (f.z > 0.0) {
    paintEyes(s, f, 0.085, vec2(0.034, 0.05), eLook.x);
    if (s.solid < 0.5) {
      float brow = penLine(f.y - 0.075 - 0.3 * (abs(f.x) - 0.085)) * step(abs(abs(f.x) - 0.085), 0.055);
      float mouth = penLine(f.y + 0.085 + f.x * f.x * 3.0) * step(abs(f.x), 0.04);
      s.ink = max(brow, mouth);
    }
  }
}
