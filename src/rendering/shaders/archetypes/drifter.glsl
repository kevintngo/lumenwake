float dRise, dFlap, dPitch, dRoll, dSpin, dWide, dCore, dBob, dDrop;

void entPose() {
  float act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  float beat = sin(uTime * 0.9 + eLook.x * 6.0);
  dRise = 0.0; dRoll = 0.0; dDrop = 0.0;
  dPitch = 0.07 * mv;
  dBob = 0.35 * sin(uTime * 0.6 + eLook.x * 3.0);
  dFlap = 0.16 * beat + 0.08 * mv * sin(uTime * 2.2);
  dSpin = uTime * 0.45; dWide = 6.6; dCore = 0.62 + 0.15 * beat;
  if (act > 0.5 && act < 1.5) {
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    dPitch = (-0.5 * up + 1.25 * down) * (1.0 - rec);
    dFlap = mix(dFlap, 0.55, up * (1.0 - down));
    dRise = (1.6 * up - 4.2 * down) * (1.0 - rec);
    dCore = mix(dCore, 1.0, up * (1.0 - rec));
  } else if (act > 2.5 && act < 3.5) {
    dPitch = -0.15 * (1.0 - at);
  } else if (act > 3.5 && act < 4.5) {
    dRise = -(1.0 - smoothstep(0.05, 0.85, at)) * 16.0;
    dFlap = mix(0.8, dFlap, smoothstep(0.55, 1.0, at));
    dWide = mix(2.4, 6.6, smoothstep(0.6, 1.0, at));
    dPitch = -0.5 * (1.0 - smoothstep(0.3, 0.9, at));
    dCore = smoothstep(0.5, 0.9, at);
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    dFlap = mix(dFlap, -0.1, hold);
    dWide = 6.6 + 2.8 * hold; dSpin += 5.0 * at;
    dPitch = -0.22 * hold; dRoll = 0.04 * sin(uTime * 33.0) * hold;
    dCore = mix(dCore, 1.0, hold);
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.3, at), dn = smoothstep(0.25, 0.8, at), go = smoothstep(0.68, 1.0, at);
    dRoll = 0.5 * st + 0.3 * dn;
    dPitch = 0.4 * dn;
    dFlap = mix(dFlap, 0.5, dn);
    dRise = -3.2 * dn - 10.0 * go;
    dDrop = at;
    dCore *= 1.0 - dn;
  }
}

vec3 dLocal(vec3 p) {
  p.y -= 4.6 + dBob + dRise;
  p.xy = rot2(dRoll) * p.xy;
  p.zy = rot2(dPitch) * p.zy;
  return p;
}

float entMap(vec3 p, out float mat) {
  vec3 q = dLocal(p);
  mat = 0.0;
  float out_ = max(abs(q.x) - 1.6, 0.0);
  float d = sdEllipsoid(q - vec3(0.0, 0.0, 0.3), vec3(2.3, 1.15, 3.9));
  vec3 w = vec3(abs(q.x), q.y - out_ * dFlap, q.z + 0.3 * out_);
  d = smin(d, sdEllipsoid(w - vec3(4.8, 0.0, -0.4), vec3(4.9, 0.32, 2.5)), 0.7);
  d = smin(d, sdTaper(w, vec3(0.9, 0.0, 3.3), vec3(1.5, -0.35, 5.0), 0.5, 0.16), 0.4);
  float wave = 0.5 * sin(uTime * 1.1 + eLook.x * 5.0);
  vec3 t1 = vec3(0.0, -0.1, -3.4), t2 = vec3(wave * 0.6, -0.3, -6.6), t3 = vec3(-wave, -0.2 + 1.2 * dFlap, -9.8);
  d = smin(d, min(sdTaper(q, t1, t2, 0.55, 0.26), sdTaper(q, t2, t3, 0.26, 0.1)), 0.4);
  float lights = min(length(q - t3) - 0.42, length(q - vec3(0.0, 0.95, 0.6)) - 0.75);
  if (lights < d) { d = lights; mat = 3.0; }
  vec3 o = p - vec3(0.0, 4.6 + dBob + max(dRise, -2.5), 0.0);
  float sec = TAU / 5.0, ang = atan(o.x, o.z) - dSpin;
  float k = floor(ang / sec + 0.5), a = ang - k * sec, rr = length(o.xz);
  k = mod(k, 5.0);
  float fall = 7.0 * smoothstep(0.0, 0.35, dDrop - 0.07 * k) * step(0.001, dDrop);
  vec3 sq = vec3(sin(a) * rr, o.y - 0.7 * sin(k * 2.1 + uTime * 0.8) + fall, cos(a) * rr - dWide);
  float shard = (abs(sq.y) / 1.5 + (abs(sq.x) + abs(sq.z)) / 0.6 - 1.0) * 0.38;
  if (shard < d) { d = shard; mat = 2.0; }
  return d * 0.8;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = dLocal(p);
  if (mat > 2.5) { s.albedo = eColC; s.cover = mix(0.8, 0.1, dCore); s.glow = dCore; return; }
  if (mat > 1.5) { s.albedo = eColB; s.cover = 0.88; s.ink = step(0.8, vnoise(p.xy * 3.0 + p.z)) * 0.4; return; }
  float out_ = max(abs(q.x) - 1.6, 0.0);
  float under = smoothstep(0.1, -0.25, q.y - out_ * dFlap);
  float along = q.z * 0.55 + 0.16 * abs(q.x);
  vec2 v = voronoi(q.xz * 0.55 + eLook.x * 20.0);
  float spot = smoothstep(0.24, 0.17, v.x) * step(0.45, v.y) * (1.0 - under);
  s.albedo = mix(eColA, eColC, under); s.wrap = 0.3;
  s.cover = mix(mix(0.66, 0.9, hash12(vec2(floor(along), floor(abs(q.x) * 0.5)))), 0.22, under);
  s.cover = mix(s.cover, 0.06, spot);
  s.ink = max(penLine((abs(fract(along) - 0.5) - 0.5) / 0.55) * 0.6 * (1.0 - under), penLine((v.x - 0.2) / 0.55) * step(0.45, v.y) * (1.0 - under) * 0.5);
  if (length(vec3(abs(q.x) - 0.85, q.y - 0.3, q.z - 3.5)) < 0.3) { s.albedo = eColC; s.cover = 0.12; s.glow = 0.9; s.ink = 0.0; }
}
