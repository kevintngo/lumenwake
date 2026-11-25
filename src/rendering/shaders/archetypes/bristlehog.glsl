float bBob, bCharge, bNod;

void entPose() {
  float mv = ePose.w;
  bBob = abs(cos(ePose.x)) * 0.06 * mv + 0.01 * sin(uTime * 2.2 + eLook.x * 6.0);
  bCharge = 0.0;
  bNod = 0.06 * sin(uTime * 1.3 + eLook.x * 9.0) * (1.0 - mv) + 0.09 * sin(ePose.x * 2.0) * mv;
  if (ePose.y > 0.5 && ePose.y < 1.5) { float k = sin(saturate(ePose.z) * PI); bCharge = k * 0.3; bNod = -k * 0.25; }
  if (ePose.y > 2.5) bCharge = -0.1 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  float s = sin(ePose.x) * ePose.w;
  vec3 lp = p; lp.z -= bCharge * 0.4;
  float sx = sign(lp.x), sz = sign(lp.z);
  float ph = s * sx * sz;
  vec3 hipJ = vec3(0.15 * sx, 0.26 + bBob, 0.2 * sz);
  float lifted = max(cos(ePose.x) * sx * sz, 0.0) * ePose.w;
  vec3 foot = vec3(0.16 * sx, 0.05 + lifted * 0.13, 0.21 * sz + ph * 0.2);
  float legs = sdTaper(lp, hipJ, foot, 0.07, 0.055);
  p.z -= bCharge; p.y -= bBob;
  vec3 br = vec3(0.25, 0.225, 0.37);
  float body = sdEllipsoid(p - vec3(0.0, 0.38, -0.03), br);
  vec3 h = p - vec3(0.0, 0.36, 0.34);
  h.zy = rot2(bNod) * h.zy;
  float head = length(h) - 0.2;
  head = smin(head, sdTaper(h, vec3(0.0, -0.03, 0.1), vec3(0.0, -0.06, 0.3), 0.12, 0.085), 0.08);
  float ears = length(vec3(abs(h.x) - 0.14, h.y - 0.17, h.z + 0.02)) - 0.06;
  float d = smin(body, head, 0.08);
  d = min(d, ears);
  mat = 0.0;
  if (legs < d) { d = legs; mat = 0.0; }
  float tusk = sdTaper(vec3(abs(h.x), h.y, h.z), vec3(0.09, -0.1, 0.22), vec3(0.14, 0.0, 0.3), 0.03, 0.01);
  if (tusk < d) { d = tusk; mat = 2.0; }
  vec3 q = p - vec3(0.0, 0.57, -0.03);
  if (abs(q.z) < 0.34) {
    float qz = mod(q.z + 0.055, 0.11) - 0.055;
    float lift = 0.03 * (1.0 - abs(q.z) / 0.34) - q.z * q.z * 0.5;
    vec3 sp = vec3(q.x, q.y - lift + 0.03, qz);
    sp.zy = rot2(-0.5) * sp.zy;
    float spike = sdConeUp(sp, 0.05, 0.17) * 0.8;
    if (spike < d) { d = spike; mat = 1.0; }
  }
  float tail = sdCapsule(p, vec3(0.0, 0.42, -0.38), vec3(0.0, 0.52 + 0.03 * sin(uTime * 6.0), -0.47), 0.025);
  if (tail < d) { d = tail; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.9; return; }
  p.z -= bCharge; p.y -= bBob;
  float belly = smoothstep(0.34, 0.2, p.y);
  float stripe = smoothstep(0.1, 0.04, abs(p.x)) * smoothstep(0.4, 0.5, p.y);
  s.albedo = eColA;
  s.cover = mix(mix(0.82, 0.98, stripe), 0.12, belly);
  s.ink = step(0.72, vnoise(p.xz * 26.0 + p.y * 17.0)) * (1.0 - belly) * 0.5;
  s.wrap = 0.25;
  vec3 h = p - vec3(0.0, 0.36, 0.34);
  h.zy = rot2(bNod) * h.zy;
  if (h.z > 0.02) {
    float snout = smoothstep(0.1, 0.085, length(vec2(h.x, h.y + 0.06))) * step(0.26, h.z);
    if (snout > 0.5) { s.albedo = eColC; s.cover = 0.6; s.ink = 0.0; }
    float nostril = smoothstep(0.02, 0.012, length(vec2(abs(h.x) - 0.035, h.y + 0.055))) * step(0.3, h.z);
    vec2 e = vec2(abs(h.x) - 0.105, h.y - 0.055);
    float eye = smoothstep(0.034, 0.026, length(e));
    float glint = smoothstep(0.014, 0.008, length(vec2(h.x - sign(h.x) * 0.105 + 0.01, e.y - 0.012)));
    if (max(eye, nostril) > 0.5) { s.albedo = INK_BLACK; s.cover = 1.0 - glint * eye; s.solid = 1.0; s.ink = 0.0; }
    else s.ink = max(s.ink, penLine(e.y - 0.045 + e.x * 0.5) * step(abs(e.x), 0.055));
  }
}
