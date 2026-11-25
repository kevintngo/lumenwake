float hBob, hLunge, hNod, hCrouch;

void entPose() {
  float mv = ePose.w;
  hBob = abs(sin(ePose.x)) * 0.07 * mv + 0.012 * sin(uTime * 2.4 + eLook.x * 6.0);
  hLunge = 0.0;
  hCrouch = 0.0;
  hNod = 0.05 * sin(uTime * 1.5 + eLook.x * 9.0) * (1.0 - mv);
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = sin(saturate(ePose.z) * PI);
    hLunge = k * 0.34;
    hNod = -k * 0.3;
    hCrouch = 0.1 * smoothstep(0.0, 0.2, ePose.z) * (1.0 - smoothstep(0.2, 0.5, ePose.z));
  }
  if (ePose.y > 2.5) hLunge = -0.1 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  float s = sin(ePose.x) * ePose.w;
  float sx = p.x < 0.0 ? -1.0 : 1.0, sz = p.z < 0.0 ? -1.0 : 1.0, ph = s * sx * sz;
  float lifted = max(cos(ePose.x) * sx * sz, 0.0) * ePose.w;
  vec3 hip = vec3(0.12 * sx, 0.44 + hBob - hCrouch, 0.27 * sz + hLunge * 0.5);
  vec3 foot = vec3(0.13 * sx, 0.04 + lifted * 0.16, 0.3 * sz + ph * 0.3 + hLunge * 0.3);
  vec3 knee = mix(hip, foot, 0.5) + vec3(0.0, 0.0, -0.09 * sz);
  float legs = min(sdTaper(p, hip, knee, 0.06, 0.04), sdTaper(p, knee, foot, 0.04, 0.03));
  float paws = length((p - foot - vec3(0.0, 0.0, 0.03)) * vec3(1.0, 1.4, 0.8)) - 0.05;
  vec3 q = p - vec3(0.0, hBob - hCrouch, hLunge);
  float body = sdEllipsoid(q - vec3(0.0, 0.5, -0.02), vec3(0.17, 0.17, 0.4));
  body = smin(body, sdEllipsoid(q - vec3(0.0, 0.53, 0.22), vec3(0.19, 0.2, 0.2)), 0.08);
  vec3 h = q - vec3(0.0, 0.62, 0.44);
  h.zy = rot2(hNod) * h.zy;
  float head = sdEllipsoid(h, vec3(0.13, 0.12, 0.15));
  head = smin(head, sdTaper(h, vec3(0.0, -0.03, 0.08), vec3(0.0, -0.06, 0.3), 0.085, 0.05), 0.06);
  vec3 e = vec3(abs(h.x) - 0.08, h.y - 0.08, h.z + 0.02);
  float ears = sdTaper(e, vec3(0.0), vec3(0.06, 0.2, -0.24), 0.05, 0.012);
  float tail = sdTaper(q, vec3(0.0, 0.56, -0.38), vec3(0.03 * sin(uTime * 5.0 + eLook.x), 0.74 - 0.2 * ePose.w, -0.72), 0.05, 0.02);
  float d = smin(body, head, 0.07);
  d = min(d, min(min(legs, ears), tail));
  float fang = sdTaper(vec3(abs(h.x) - 0.045, h.y, h.z), vec3(0.0, -0.09, 0.24), vec3(0.0, -0.17, 0.25), 0.02, 0.004);
  vec3 c = q - vec3(0.0, 0.68, -0.02);
  float cz = mod(c.z + 0.07, 0.14) - 0.07;
  vec3 sp = vec3(c.x, c.y, cz); sp.zy = rot2(-0.55) * sp.zy;
  float crest = abs(c.z) < 0.34 ? sdConeUp(sp, 0.04, 0.13) * 0.8 : 1e3;
  float hurt = min(min(fang, crest), paws);
  if (hurt < d) { d = hurt; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 0.5) { s.albedo = eColB; s.cover = 0.9; return; }
  vec3 q = p - vec3(0.0, hBob - hCrouch, hLunge);
  float belly = smoothstep(0.46, 0.36, q.y) * step(0.3, q.y);
  s.albedo = eColA; s.cover = mix(0.84, 0.14, belly); s.wrap = 0.25;
  s.ink = step(0.74, vnoise(q.xz * 24.0 + q.y * 16.0)) * (1.0 - belly) * 0.45;
  vec3 h = q - vec3(0.0, 0.62, 0.44);
  h.zy = rot2(hNod) * h.zy;
  if (h.z > 0.0 && length(h) < 0.4) {
    vec2 e = vec2(abs(h.x) - 0.075, h.y - 0.03);
    float eye = smoothstep(0.03, 0.022, length(e * vec2(1.0, 1.3)));
    float nose = smoothstep(0.035, 0.025, length(vec3(h.x, h.y + 0.05, h.z - 0.3)));
    if (max(eye, nose) > 0.5) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
    else s.ink = max(s.ink, penLine(e.y - 0.04 + e.x * 0.6) * step(abs(e.x), 0.05));
  }
}
