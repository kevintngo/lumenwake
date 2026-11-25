float tSink, tDrop, tRear, tSnap, tTuck, tWide, tSway, tBob;

void entPose() {
  float w = ePose.x, act = ePose.y, at = saturate(ePose.z), mv = ePose.w;
  tSink = 0.0; tDrop = 0.0; tRear = 0.0; tSnap = 0.0; tTuck = 0.0; tWide = 0.0;
  tSway = sin(w * 2.0) * 0.18 * mv;
  tBob = 0.1 * sin(uTime * 1.2 + eLook.x * 6.0) + abs(sin(w * 2.0)) * 0.15 * mv;
  if (act > 0.5 && act < 1.5) {
    float up = smoothstep(0.0, 0.38, at), down = smoothstep(0.4, 0.52, at), rec = smoothstep(0.72, 1.0, at);
    tRear = 0.22 * up * (1.0 - down);
    tWide = up * (1.0 - down);
    tSnap = down * (1.0 - rec);
  } else if (act > 2.5 && act < 3.5) {
    tTuck = 1.0 - smoothstep(0.25, 1.0, at);
  } else if (act > 3.5 && act < 4.5) {
    tSink = (1.0 - smoothstep(0.05, 0.85, at)) * 11.0;
    tRear = 0.4 * sin(at * PI);
    tWide = sin(at * PI);
  } else if (act > 4.5 && act < 5.5) {
    float hold = smoothstep(0.0, 0.22, at) * (1.0 - smoothstep(0.8, 1.0, at));
    tRear = 0.42 * hold; tWide = hold;
    tSway += 0.06 * sin(uTime * 33.0) * hold;
  } else if (act > 5.5) {
    float st = smoothstep(0.0, 0.25, at), dn = smoothstep(0.25, 0.7, at), go = smoothstep(0.66, 1.0, at);
    tSway += 0.2 * sin(uTime * 17.0) * st * (1.0 - dn);
    tDrop = 2.7 * dn; tRear = 0.2 * st * (1.0 - dn) - 0.12 * dn;
    tSink = go * 7.0;
  }
}

vec3 tBody(vec3 p) {
  p.y += tSink;
  vec3 q = p - vec3(tSway, tBob - tTuck * 2.1 - tDrop, 0.0);
  q.zy = rot2(-tRear) * (q.zy - vec2(-3.4, 3.2)) + vec2(-3.4, 3.2);
  return q;
}

float entMap(vec3 p, out float mat) {
  vec3 q = tBody(p);
  p.y += tSink;
  float low = tTuck * 2.1 + tDrop;
  mat = 0.0;
  vec3 sc = q - vec3(0.0, 4.4, -0.2);
  float shell = max(sdEllipsoid(sc, vec3(5.4, 3.3, 4.6)), -sc.y - 0.9);
  shell = smin(shell, sdTorusY(sc * vec3(1.0, 1.0, 1.17) + vec3(0.0, 0.85, 0.0), 5.0, 0.42), 0.3);
  float belly = sdEllipsoid(q - vec3(0.0, 3.4, 0.0), vec3(4.7, 1.3, 3.9));
  float d = min(shell, belly);
  mat = shell < belly ? 0.0 : 2.0;
  vec3 t1 = sc - vec3(-1.9, 2.3, -0.7), t2 = sc - vec3(1.6, 2.5, -1.5), t3 = sc - vec3(0.4, 2.7, 1.3);
  float tw = min(min(max(sdConeUp(t1, 1.35, 4.2), t1.y - 2.7), max(sdConeUp(t2, 1.05, 3.2), t2.y - 2.0)), max(sdConeUp(t3, 0.85, 2.4), t3.y - 1.45));
  if (tw < d) { d = tw; mat = 4.0; }
  vec3 a = vec3(abs(p.x), p.y, p.z);
  float sgn = p.x < 0.0 ? -1.0 : 1.0, legs = 1e3;
  for (int i = 0; i < 3; i++) {
    float z = -3.0 + 2.7 * float(i);
    float ph = sin(ePose.x * 2.0 + float(i) * 2.1 + sgn * 1.2) * ePose.w;
    vec3 root = vec3(4.0, 3.5 - low + tBob, z * 0.9);
    vec3 knee = vec3(6.7 - tTuck * 1.0 + tDrop * 0.5, 5.7 - low * 0.75 + max(ph, 0.0) * 0.5, z * 1.35);
    vec3 tip = vec3(8.1 - tTuck * 1.9 + tDrop * 0.9, 0.12 + max(ph, 0.0) * 0.95, z * 1.7 + ph * 0.8);
    legs = min(legs, min(sdTaper(a, root, knee, 0.64, 0.52), sdTaper(a, knee, tip, 0.52, 0.15)));
  }
  if (legs < d) { d = legs; mat = 2.0; }
  vec3 qa = vec3(abs(q.x), q.y, q.z);
  vec3 cl = vec3(4.9, 3.5, 5.6);
  cl = mix(cl, vec3(6.3, 8.2, 4.6), tWide);
  cl = mix(cl, vec3(2.6, 2.6, 7.6), tSnap);
  cl = mix(cl, vec3(2.9, 2.5, 4.4), tTuck);
  float gape = 0.25 + 0.75 * tWide - 0.2 * tSnap;
  vec3 cq = qa - cl;
  float claw = sdEllipsoid(cq, vec3(1.75, 1.5, 2.4));
  claw = max(claw, -sdBox(cq - vec3(0.0, 0.1, 1.7), vec3(2.6, 0.1 + 0.5 * gape, 1.7)));
  claw = min(claw, sdTaper(qa, vec3(3.3, 3.6, 3.0), cl - vec3(0.0, 0.0, 1.6), 0.72, 0.62));
  if (claw < d) { d = claw; mat = 1.0; }
  vec3 eyeAt = vec3(1.25, 7.5 - 1.9 * tTuck, 4.2);
  float stalk = sdCapsule(qa, vec3(1.0, 5.4, 3.5), eyeAt, 0.2);
  float eye = length(qa - eyeAt) - 0.62;
  if (stalk < d) { d = stalk; mat = 2.0; }
  if (eye < d) { d = eye; mat = 3.0; }
  return d * 0.82;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  vec3 q = tBody(p);
  if (mat > 3.5) {
    s.albedo = P_STONE; s.cover = 0.62;
    s.ink = penLine((fract(q.y * 1.3) - 0.5) / 1.3) * 0.5;
    return;
  }
  if (mat > 2.5) {
    s.albedo = P_CREAM; s.cover = 0.06;
    vec3 e = vec3(abs(q.x), q.y, q.z) - vec3(1.25, 7.5 - 1.9 * tTuck, 4.2);
    if (length(e.xy - vec2(0.0, 0.03)) < 0.34 && e.z > 0.0) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; }
    return;
  }
  if (mat > 1.5) {
    s.albedo = eColC; s.cover = 0.72;
    s.ink = penLine((fract(length(vec2(abs(p.x), p.y + tSink)) * 0.6) - 0.5) / 0.6) * 0.45;
    return;
  }
  if (mat > 0.5) {
    s.albedo = eColB; s.cover = 0.88;
    s.ink = step(0.8, vnoise(q.xy * 2.2 + q.z * 1.3)) * 0.5;
    return;
  }
  vec3 sc = q - vec3(0.0, 4.4, -0.2);
  float r = length(sc.xz / vec2(5.4, 4.6));
  vec2 v = voronoi(sc.xz * 0.7 + eLook.x * 20.0);
  float freckle = smoothstep(0.2, 0.14, v.x) * step(0.5, v.y);
  s.albedo = eColA;
  s.cover = mix(mix(0.78, 0.93, smoothstep(0.5, 1.0, r)), 0.04, freckle);
  s.ink = penLine((abs(fract(r * 3.5) - 0.5)) / 3.5 * 5.0) * 0.6;
  if (sc.y < -0.45) s.ink = max(s.ink, penLine((fract(atan(sc.x, sc.z) * 3.0) - 0.5) / 3.0 * 5.0) * 0.6);
}
