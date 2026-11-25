float mSink, mLean, mTilt, mOpen, mBob, mAnger;
vec3 mHandL, mHandR;

void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float breath = sin(uTime * 1.3 + eLook.x * 6.0);
  mSink = 0.0; mLean = 0.03 * breath; mOpen = 1.0; mAnger = 0.0;
  mTilt = sin(w) * 0.07 * mv;
  mBob = abs(cos(w)) * 0.3 * mv + 0.12 * breath;
  mHandL = vec3(-4.7, 3.0 + 0.25 * breath, 1.0 - sin(w) * 1.1 * mv);
  mHandR = vec3(4.7, 3.0 - 0.25 * breath, 1.0 + sin(w) * 1.1 * mv);
  if (act > 0.5 && act < 1.5) {
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    mLean = (-0.2 * up + 0.5 * down) * (1.0 - rec);
    vec3 t = mix(mix(mHandR, vec3(4.2, 9.2, 0.4), up), vec3(3.0, 1.4, 5.4), down);
    t = mix(t, mHandR, rec);
    mHandR = t; mHandL = t * vec3(-1.0, 1.0, 1.0);
    mAnger = up * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    mLean = -0.1 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    mSink = (1.0 - smoothstep(0.05, 0.85, at)) * 13.5;
    mOpen = mix(0.32, 1.0, smoothstep(0.5, 1.0, at));
    float down = smoothstep(0.6, 1.0, at);
    mHandL = mix(vec3(-1.9, 7.0, 0.8), mHandL, down);
    mHandR = mix(vec3(1.9, 7.0, 0.8), mHandR, down);
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    mLean = -0.26 * hold; mAnger = hold;
    mTilt += 0.03 * sin(uTime * 34.0) * hold;
    mHandL = mix(mHandL, vec3(-7.0, 7.6, -0.4), hold);
    mHandR = mix(mHandR, vec3(7.0, 7.6, -0.4), hold);
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    mTilt += 0.1 * sin(uTime * 9.0) * st * (1.0 - dn);
    mLean = -0.14 * st + 1.2 * dn;
    mOpen = 1.0 - 0.5 * dn;
    mSink = go * 8.5;
    mHandL = mix(mHandL, vec3(-3.6, 1.0, 2.6), dn);
    mHandR = mix(mHandR, vec3(3.6, 1.0, 2.6), dn);
  }
}

vec3 mLocal(vec3 p) {
  p.y += mSink;
  float h = smoothstep(0.4, 8.0, p.y);
  p.y -= mBob * h;
  p.xy = rot2(mTilt * h) * p.xy;
  p.zy = rot2(mLean * h) * p.zy;
  return p;
}

float entMap(vec3 p, out float mat) {
  vec3 q = mLocal(p);
  mat = 0.0;
  float d = sdTaper(q, vec3(0.0, 1.0, 0.0), vec3(0.0, 7.6, 0.0), 2.5, 1.5);
  d = smin(d, sdEllipsoid(q - vec3(0.0, 0.5, 0.0), vec3(3.5, 0.9, 3.5)), 0.8);
  float sec = TAU / 6.0, ang = mod(atan(q.x, q.z) + eLook.x * 6.0 + sec * 0.5, sec) - sec * 0.5, rr = length(q.xz);
  d = smin(d, sdTaper(vec3(sin(ang) * rr, q.y, cos(ang) * rr), vec3(0.0, 0.9, 2.4), vec3(0.0, 0.12, 5.0), 0.75, 0.2), 0.5);
  float arms = min(sdTaper(q, vec3(-1.5, 6.3, 0.3), mHandL, 0.62, 0.42), sdTaper(q, vec3(1.5, 6.3, 0.3), mHandR, 0.62, 0.42));
  d = smin(d, arms, 0.3);
  vec3 c = q - vec3(0.0, 8.1, 0.0);
  c.xz /= mOpen; c.y -= (1.0 - mOpen) * 1.4;
  float cap = max(sdEllipsoid(c, vec3(5.8, 3.0, 5.8)), -c.y - 0.3);
  cap = smin(cap, sdTorusY(c, 5.45, 0.55), 0.4);
  vec3 k1 = c - vec3(2.4, 2.75, -0.9), k2 = c - vec3(-2.9, 2.2, 0.8), k3 = c - vec3(-0.4, 3.1, -2.6);
  float small = min(min(max(sdEllipsoid(k1, vec3(1.2, 0.8, 1.2)), -k1.y), max(sdEllipsoid(k2, vec3(0.95, 0.65, 0.95)), -k2.y)), max(sdEllipsoid(k3, vec3(0.8, 0.55, 0.8)), -k3.y));
  small = min(small, min(sdCapsule(k1, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.3), min(sdCapsule(k2, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.25), sdCapsule(k3, vec3(0.0, -1.0, 0.0), vec3(0.0), 0.22))));
  cap = min(cap, small) * min(mOpen, 0.85);
  if (cap < d) { d = cap; mat = 1.0; }
  float sec8 = TAU / 8.0, a8 = mod(atan(c.x, c.z) + sec8 * 0.5, sec8) - sec8 * 0.5, r8 = length(c.xz);
  vec3 sq = vec3(sin(a8) * r8, c.y, cos(a8) * r8);
  float swing = 0.25 * sin(uTime * 2.1 + floor((atan(c.x, c.z) + PI) / sec8) * 1.7) + mAnger * 0.25 * sin(uTime * 30.0);
  float sac = length(sq - vec3(swing, -1.75, 4.5)) - 0.62;
  sac = min(sac, sdCapsule(sq, vec3(0.0, -0.4, 4.7), vec3(swing, -1.3, 4.5), 0.07)) * min(mOpen, 0.85);
  float clubs = min(length(q - mHandL), length(q - mHandR)) - 1.2;
  float hurt = min(sac, clubs);
  if (hurt < d) { d = hurt; mat = 2.0; }
  return d * 0.8;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = mLocal(p);
  vec3 c = q - vec3(0.0, 8.1, 0.0);
  c.xz /= mOpen; c.y -= (1.0 - mOpen) * 1.4;
  if (mat > 1.5) {
    s.albedo = eColB; s.cover = 0.88;
    s.ink = step(0.84, vnoise(q.xz * 5.0 + q.y * 3.0)) * 0.6;
    return;
  }
  if (mat > 0.5) {
    if (c.y < -0.05 && length(c.xz) < 5.3) {
      s.albedo = P_TAN; s.cover = 0.45;
      s.ink = smoothstep(0.22, 0.0, abs(fract(atan(c.z, c.x) * 9.0) - 0.5)) * 0.5;
      return;
    }
    vec2 v = voronoi(c.xz * 0.5 + eLook.x * 20.0);
    float spot = smoothstep(0.3, 0.24, v.x) * step(0.35, v.y);
    float rim = step(c.y, 0.5) * step(5.0, length(c.xz));
    s.albedo = mix(eColA, eColB, rim);
    s.cover = mix(0.86, 0.04, spot * (1.0 - rim));
    s.ink = penLine((v.x - 0.27) / 0.5) * step(0.35, v.y) * (1.0 - rim) * 0.6;
    return;
  }
  s.albedo = mix(eColC, P_TAN, smoothstep(2.4, 0.4, q.y)); s.cover = mix(0.26, 0.62, smoothstep(2.4, 0.4, q.y)); s.wrap = 0.3;
  s.ink = step(0.62, vnoise(vec2(atan(q.x, q.z) * 9.0, q.y * 0.35))) * 0.3 * smoothstep(7.4, 6.0, q.y);
  vec3 f = q - vec3(0.0, 5.3, 0.0);
  if (f.z > 0.6 && abs(f.y) < 1.4 && abs(f.x) < 1.7) {
    float blink = step(0.97, fract(uTime * 0.17 + eLook.x));
    float side = f.x < 0.0 ? -1.0 : 1.0;
    vec2 e = vec2(f.x - side * 0.72, f.y - 0.1);
    vec2 sz = vec2(0.3, mix(0.44, 0.05, blink));
    float eye = smoothstep(1.0, 0.9, length(e / sz));
    eye *= step(e.y, 0.2 + (abs(f.x) - 0.72) * (0.5 + 0.5 * mAnger));
    float glint = smoothstep(0.1, 0.07, length(e - vec2(-0.1, 0.12))) * (1.0 - blink);
    float brow = penLine(e.y - 0.5 + (abs(f.x) - 0.72) * (0.5 + 0.5 * mAnger)) * step(abs(e.x), 0.5);
    float mouth = penLine(f.y + 0.75 - 0.12 * abs(sin(f.x * 6.0))) * step(abs(f.x), 0.62);
    s.ink = max(s.ink, max(brow, mouth));
    if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0 - glint; s.solid = 1.0; s.ink = 0.0; }
  }
}
