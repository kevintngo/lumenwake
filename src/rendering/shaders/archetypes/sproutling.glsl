#include <eyes>

float sHop, sSq, sLunge, sAir;

void entPose() {
  float mv = ePose.w, at = ePose.z;
  float ht = fract(ePose.x / TAU);
  sAir = sin(ht * PI) * mv;
  sHop = sAir * 0.24;
  sSq = 1.0 - 0.15 * cos(ht * TAU) * mv + 0.03 * sin(uTime * 2.4 + eLook.x * 6.0);
  sLunge = 0.0;
  if (ePose.y > 0.5 && ePose.y < 1.5) { sLunge = sin(saturate(at) * PI) * 0.34; sSq += 0.2 * sin(saturate(at) * PI); }
  if (ePose.y > 2.5) sSq -= 0.25 * (1.0 - at);
}

float entMap(vec3 p, out float mat) {
  p.z -= sLunge; p.y -= sHop;
  vec3 r = vec3(0.33 * (1.0 + (1.0 - sSq) * 0.55), 0.3 * sSq, 0.33 * (1.0 + (1.0 - sSq) * 0.55));
  vec3 b = p - vec3(0.0, r.y + 0.03, 0.0);
  float d = sdEllipsoid(b, r);
  mat = 0.0;
  float feet = min(length(p - vec3(-0.14, 0.05 - sAir * 0.03, 0.06)), length(p - vec3(0.14, 0.05 - sAir * 0.03, 0.06))) - 0.085;
  if (feet < d) { d = feet; mat = 2.0; }
  vec3 top = vec3(0.0, r.y * 2.0 + 0.02, 0.0);
  float stem = sdCapsule(p, top, top + vec3(0.0, 0.15, 0.0), 0.028);
  vec3 l = p - top - vec3(0.0, 0.15, 0.0);
  l.x = abs(l.x);
  l.xy = rot2(0.55 - sAir * 0.5 + 0.08 * sin(uTime * 3.0 + eLook.x * 5.0)) * l.xy;
  vec3 lr = vec3(0.17, 0.035, 0.095);
  float leaf = sdEllipsoid(l - vec3(0.15, 0.0, 0.0), lr);
  leaf = min(leaf, stem);
  if (leaf < d) { d = leaf; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  p.z -= sLunge; p.y -= sHop;
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.88; return; }
  if (mat > 0.5) {
    s.albedo = eColB; s.cover = 0.84; s.wrap = 0.4;
    s.ink = penLine(p.z) * 0.7;
    return;
  }
  vec3 f = p - vec3(0.0, 0.33 * sSq + 0.03, 0.0);
  float belly = smoothstep(0.02, -0.16, f.y) * step(0.0, f.z);
  s.albedo = eColA; s.cover = mix(0.82, 0.12, belly); s.wrap = 0.35;
  if (f.z > 0.0) {
    paintEyes(s, f - vec3(0.0, 0.05, 0.0), 0.115, vec2(0.042, 0.06), eLook.x);
    if (s.solid < 0.5) {
      float lid = penLine(f.y - 0.115) * step(abs(abs(f.x) - 0.115), 0.06);
      float mouth = penLine(f.y + 0.03) * step(abs(f.x), 0.03);
      s.ink = max(lid, mouth);
    }
  }
}
