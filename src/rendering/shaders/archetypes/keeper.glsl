vec3 kHandL, kHandR, kFoot, kTop, kCrook, kLamp;
float kSink, kLean, kSway, kBob, kLight;

void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float breath = sin(uTime * 1.0 + eLook.x * 6.0);
  kSink = 0.0; kLean = 0.02 * breath; kLight = 0.78 + 0.12 * sin(uTime * 2.3);
  kSway = sin(w) * 0.06 * mv;
  kBob = abs(cos(w)) * 0.25 * mv + 0.08 * breath;
  kHandL = vec3(-3.3, 5.2 + 0.2 * breath, 0.9 - sin(w) * 0.9 * mv);
  kHandR = vec3(3.5, 6.3 - 0.15 * breath, 1.3 + sin(w) * 0.5 * mv);
  vec3 idle = normalize(vec3(-0.08, 1.0, 0.1)), up = idle;
  float swing = 0.28 * sin(uTime * 1.3 + eLook.x * 9.0) + 0.45 * sin(w) * mv;
  if (act > 0.5 && act < 1.5) {
    float hi = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    vec3 t = mix(mix(kHandR, vec3(2.6, 9.6, 0.4), hi), vec3(1.4, 3.0, 3.4), down);
    kHandR = mix(t, kHandR, rec);
    up = normalize(mix(mix(mix(idle, vec3(0.0, 1.0, -0.25), hi), vec3(0.0, -0.05, 1.0), down), idle, rec));
    kLean = (-0.12 * hi + 0.4 * down) * (1.0 - rec);
    kLight = mix(kLight, 1.0, hi * (1.0 - rec));
    swing *= 1.0 - down * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    kLean = -0.1 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    kSink = (1.0 - smoothstep(0.05, 0.88, at)) * 13.5;
    kLight = smoothstep(0.7, 1.0, at);
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    kHandR = mix(kHandR, vec3(4.4, 8.4, 1.6), hold);
    kHandL = mix(kHandL, vec3(-5.6, 7.4, 0.6), hold);
    kLean = -0.14 * hold;
    kSway += 0.02 * sin(uTime * 36.0) * hold;
    kLight = mix(kLight, 1.0, hold);
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    kLight *= (1.0 - st * (0.5 + 0.5 * step(0.5, fract(uTime * 7.0)))) * (1.0 - dn);
    kLean = -0.1 * st + 0.9 * dn;
    kSway += 0.07 * sin(uTime * 8.0) * st * (1.0 - dn);
    kSink = go * 9.5;
    kHandL = mix(kHandL, vec3(-2.6, 1.6, 2.4), dn);
  }
  kFoot = kHandR - up * 5.7;
  kTop = kHandR + up * 5.0;
  kCrook = kTop + vec3(-0.1, 0.3, 1.5);
  kLamp = kCrook + vec3(sin(swing) * 1.9, -cos(swing) * 1.9, 0.0);
}

vec3 kLocal(vec3 p) {
  p.y += kSink;
  float h = smoothstep(0.3, 9.0, p.y);
  p.y -= kBob * h;
  p.xy = rot2(kSway * h) * p.xy;
  p.zy = rot2(kLean * h) * p.zy;
  return p;
}

float entMap(vec3 p, out float mat) {
  vec3 q = kLocal(p);
  mat = 0.0;
  float fold = 0.12 * cos(atan(q.x, q.z) * 9.0 + 1.5 * sin(q.y * 0.5)) * smoothstep(8.0, 1.0, q.y);
  float d = max(sdTaper(q, vec3(0.0, 0.3, 0.0), vec3(0.0, 8.0, 0.0), 3.1, 1.7) + fold, -q.y);
  d = smin(d, sdEllipsoid(q - vec3(0.0, 8.2, 0.0), vec3(3.2, 1.1, 1.9)), 0.6);
  float arms = min(sdTaper(q, vec3(-2.7, 8.3, 0.2), kHandL, 0.85, 0.75), sdTaper(q, vec3(2.7, 8.3, 0.2), kHandR, 0.85, 0.75));
  d = smin(d, arms, 0.35);
  vec3 hp = q - vec3(0.0, 9.9, 0.25);
  float hood = max(length(hp) - 1.55, -(length(hp - vec3(0.0, -0.1, 0.9)) - 1.12));
  hood = smin(hood, sdTaper(hp, vec3(0.0, 0.9, -0.7), vec3(0.0, 0.2, -2.2), 0.7, 0.15), 0.4);
  d = smin(d, hood, 0.3);
  float mask = sdEllipsoid(hp - vec3(0.0, -0.15, 0.5), vec3(0.8, 0.98, 0.55));
  if (mask < d) { d = mask; mat = 1.0; }
  float hands = min(length(q - kHandL), length(q - kHandR)) - 0.95;
  if (hands < d) { d = hands; mat = 2.0; }
  vec3 l = q - kLamp;
  float iron = min(sdCapsule(q, kFoot, kTop, 0.2), sdCapsule(q, kTop, kCrook, 0.17));
  iron = min(iron, sdCapsule(q, kCrook, kLamp + vec3(0.0, 0.95, 0.0), 0.06));
  iron = min(iron, min(sdRoundBox(l - vec3(0.0, 0.85, 0.0), vec3(0.62, 0.12, 0.62), 0.08), sdRoundBox(l + vec3(0.0, 0.85, 0.0), vec3(0.55, 0.1, 0.55), 0.08)));
  iron = min(iron, sdCapsule(vec3(abs(l.x) - 0.62, l.y, abs(l.z) - 0.62), vec3(0.0, -0.8, 0.0), vec3(0.0, 0.8, 0.0), 0.07));
  if (iron < d) { d = iron; mat = 3.0; }
  float ball = length(l) - 0.72;
  if (ball < d) { d = ball; mat = 4.0; }
  return d * 0.8;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = kLocal(p);
  vec3 hp = q - vec3(0.0, 9.9, 0.25);
  if (mat > 3.5) { s.albedo = eColB; s.cover = mix(0.9, 0.1, kLight); s.glow = kLight; return; }
  if (mat > 2.5) {
    s.albedo = P_CHARCOAL; s.cover = 0.88;
    s.ink = penLine((fract(q.y * 0.8) - 0.5) / 0.8) * 0.4;
    return;
  }
  if (mat > 1.5) { s.albedo = eColC; s.cover = 0.34; s.wrap = 0.3; s.ink = step(0.7, vnoise(q.xy * 3.0)) * 0.3; return; }
  if (mat > 0.5) {
    s.albedo = P_CREAM; s.cover = 0.1; s.wrap = 0.3;
    s.ink = penLine(hp.y - 0.42) * step(abs(hp.x), 0.5) * 0.6;
    if (abs(hp.x) < 0.085 && abs(hp.y + 0.2) < 0.5) { s.albedo = eColB; s.cover = mix(0.9, 0.15, kLight); s.glow = kLight; s.ink = 0.0; }
    return;
  }
  s.albedo = eColA; s.cover = 0.88;
  float ang = atan(q.x, q.z);
  s.ink = penLine((abs(fract(ang * 9.0 / TAU + 0.24 * sin(q.y * 0.5)) - 0.5) - 0.22) * 2.0) * 0.45 * smoothstep(8.0, 5.5, q.y);
  if (q.y < 1.25 && length(hp) > 2.0) {
    s.albedo = eColC; s.cover = 0.3;
    float key = step(0.5, fract(ang * 22.0 / TAU)) * step(0.45, q.y) * step(q.y, 0.9);
    if (key > 0.5) { s.albedo = eColA; s.cover = 0.86; }
    s.ink = max(penLine(q.y - 1.25), penLine(q.y - 0.32)) * 0.7;
  }
  if (hp.z > 0.25 && length(hp - vec3(0.0, -0.1, 0.9)) < 1.2) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
}
