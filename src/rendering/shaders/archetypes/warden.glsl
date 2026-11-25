#include <slab>

vec3 wHip, wChest, wHead, wShL, wShR, wFistL, wFistR, wFootL, wFootR;
float wSink, wEye;

void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float s = sin(w), c = cos(w);
  float breath = sin(uTime * 1.1 + eLook.x * 6.0);
  wSink = 0.0;
  wEye = 0.55 + 0.1 * breath;
  wHip = vec3(0.5 * s * mv, 5.3 + abs(c) * 0.35 * mv + 0.07 * breath, 0.0);
  wChest = wHip + vec3(0.0, 3.3, 0.5 + 0.35 * mv);
  wHead = wChest + vec3(0.0, 2.95, 1.3);
  wFootL = vec3(-2.0, 0.85 + max(c, 0.0) * 1.3 * mv, s * 1.9 * mv);
  wFootR = vec3(2.0, 0.85 + max(-c, 0.0) * 1.3 * mv, -s * 1.9 * mv);
  wFistL = vec3(-5.0, 2.7 + 0.2 * breath, 0.7 - s * 1.7 * mv);
  wFistR = vec3(5.0, 2.7 - 0.2 * breath, 0.7 + s * 1.7 * mv);
  if (act > 0.5 && act < 1.5) {
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    vec3 t = mix(mix(wFistR, vec3(2.6, 14.0, 1.0), up), vec3(2.4, 1.8, 5.8), down);
    t = mix(t, wFistR, rec);
    wFistR = t; wFistL = t * vec3(-1.0, 1.0, 1.0);
    wChest.z += (-0.8 * up + 2.2 * down) * (1.0 - rec);
    wChest.y -= 1.0 * down * (1.0 - rec);
    wHead = wChest + vec3(0.0, 2.95, 1.3 + 0.7 * down * (1.0 - rec));
    wEye = mix(wEye, 1.0, up * (1.0 - rec));
  } else if (act > 2.5 && act < 3.5) {
    wChest.z -= 0.4 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    wSink = (1.0 - smoothstep(0.05, 0.92, at)) * 15.5;
    float down = smoothstep(0.72, 1.0, at);
    wFistL = mix(vec3(-3.0, wChest.y + 6.2, 1.6), wFistL, down);
    wFistR = mix(vec3(3.0, wChest.y + 6.2, 1.6), wFistR, down);
    wChest.x += 0.1 * sin(uTime * 31.0) * (1.0 - down);
    wEye = mix(0.2, 1.0, smoothstep(0.5, 0.9, at));
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    wFistL = mix(wFistL, vec3(-7.4, 8.8, -1.4), hold);
    wFistR = mix(wFistR, vec3(7.4, 8.8, -1.4), hold);
    wChest += vec3(0.12 * sin(uTime * 37.0) * hold, 0.5 * hold, 0.9 * hold);
    wHead = wChest + vec3(0.0, 3.2, 1.5);
    wEye = mix(wEye, 1.0, hold);
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.25, at), dn = smoothstep(0.25, 0.75, at), go = smoothstep(0.68, 1.0, at);
    wHip.y -= 2.5 * dn;
    wChest = wHip + vec3(0.14 * sin(uTime * 23.0) * st * (1.0 - dn), 3.3 - 1.2 * dn, 0.5 - 1.3 * st + 4.2 * dn);
    wHead = wChest + vec3(0.0, 2.95 - 1.7 * dn, 1.3 + 1.8 * dn);
    wFistL = mix(wFistL, vec3(-6.0, 1.4, 3.0), dn);
    wFistR = mix(wFistR, vec3(6.0, 1.4, 3.0), dn);
    wSink = go * 10.5;
    wEye *= 1.0 - dn;
  }
  wShL = wChest + vec3(-3.9, 1.2, 0.0);
  wShR = wChest + vec3(3.9, 1.2, 0.0);
}

float entMap(vec3 p, out float mat) {
  p.y += wSink;
  float sd = eLook.x;
  mat = 0.0;
  float d = slab(p - wHip, 2.3, sd);
  vec3 hL = wHip + vec3(-1.6, -0.7, 0.0), hR = wHip + vec3(1.6, -0.7, 0.0);
  d = min(d, min(slab(p - mix(hL, wFootL, 0.28), 1.5, sd + 0.11), slab(p - mix(hR, wFootR, 0.28), 1.5, sd + 0.17)));
  d = min(d, min(slab(p - mix(hL, wFootL, 0.72), 1.35, sd + 0.23), slab(p - mix(hR, wFootR, 0.72), 1.35, sd + 0.29)));
  d = min(d, min(sdRoundBox(p - wFootL - vec3(0.0, -0.2, 0.5), vec3(1.5, 0.65, 2.0), 0.3), sdRoundBox(p - wFootR - vec3(0.0, -0.2, 0.5), vec3(1.5, 0.65, 2.0), 0.3)));
  d = min(d, slab(p - mix(wHip, wChest, 0.48), 2.5, sd + 0.37));
  d = min(d, slab(p - wChest, 3.5, sd + 0.31));
  d = min(d, min(slab(p - wShL, 2.0, sd + 0.41), slab(p - wShR, 2.0, sd + 0.47)));
  d = min(d, min(slab(p - mix(wShL, wFistL, 0.36) - vec3(-0.5, 0.0, 0.0), 1.3, sd + 0.61), slab(p - mix(wShR, wFistR, 0.36) - vec3(0.5, 0.0, 0.0), 1.3, sd + 0.67)));
  d = min(d, min(slab(p - mix(wShL, wFistL, 0.7), 1.45, sd + 0.71), slab(p - mix(wShR, wFistR, 0.7), 1.45, sd + 0.79)));
  float head = slab(p - wHead, 1.3, sd + 0.53);
  if (head < d) { d = head; mat = 3.0; }
  float fists = min(slab(p - wFistL, 1.95, sd + 0.83), slab(p - wFistR, 1.95, sd + 0.89));
  if (fists < d) { d = fists; mat = 1.0; }
  vec3 b = p - wChest - vec3(0.0, 1.6, -2.4);
  b.zy = rot2(-0.5) * b.zy;
  float cr = min(sdConeUp(b, 0.9, 4.6), min(sdConeUp(b - vec3(-1.6, -0.6, 0.2), 0.7, 3.2), sdConeUp(b - vec3(1.5, -0.9, 0.1), 0.65, 2.8)));
  if (cr < d) { d = cr; mat = 2.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  p.y += wSink;
  vec2 pv = pavers(p.xy * 0.6 + p.z * 0.41 + eLook.x * 20.0);
  s.albedo = eColA; s.cover = mix(0.52, 0.84, pv.y);
  s.ink = max(penLine(0.5 * pv.x / 0.6) * 0.8, penLine((fract(p.y * 0.5 + 0.35 * vnoise(p.xz * 0.5)) - 0.5) / 0.5) * 0.3);
  if (mat > 2.5) {
    vec3 f = p - wHead;
    if (f.z > 0.2 && abs(f.y - 0.1) < 0.17 && abs(f.x) < 0.85) { s.albedo = eColB; s.cover = 0.9 - 0.8 * wEye; s.glow = wEye; s.ink = 0.0; }
    else s.ink = max(s.ink, penLine(abs(f.y - 0.1) - 0.24) * step(0.2, f.z) * step(abs(f.x), 0.95) * 0.7);
  } else if (mat > 1.5) {
    float facet = vnoise(vec2(atan(p.x - wChest.x, p.z - wChest.z) * 3.0, p.y * 0.8));
    s.albedo = eColC; s.cover = mix(0.25, 0.86, step(0.5, facet)); s.glow = 0.25; s.ink = 0.0;
  } else if (mat > 0.5) {
    s.albedo = eColB; s.cover = mix(0.72, 0.94, pv.y);
  } else {
    float high = max(max(p.y - wShL.y, p.y - wShR.y) - 0.9, p.y - wChest.y - 2.6);
    if (high > 0.0 && vnoise(p.xz * 1.1 + eLook.x * 9.0) > 0.42) { s.albedo = P_SAGE; s.cover = 0.84; s.ink = step(0.7, vnoise(p.xz * 6.0)) * 0.5; }
  }
}
