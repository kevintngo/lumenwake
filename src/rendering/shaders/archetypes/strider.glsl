vec3 sPod, sFootL, sFootR;
float sAim, sGlow;

void entPose() {
  float w = ePose.x, mv = ePose.w, s = sin(w), c = cos(w);
  float breath = sin(uTime * 1.4 + eLook.x * 6.0);
  sPod = vec3(0.05 * s * mv, 2.2 + abs(c) * 0.1 * mv + 0.03 * breath, 0.0);
  sFootL = vec3(-0.5, 0.1 + max(c, 0.0) * 0.5 * mv, s * 0.7 * mv);
  sFootR = vec3(0.5, 0.1 + max(-c, 0.0) * 0.5 * mv, -s * 0.7 * mv);
  sAim = 0.0;
  sGlow = 0.3;
  if (ePose.y > 0.5 && ePose.y < 1.5) {
    float k = saturate(ePose.z), set = smoothstep(0.0, 0.3, k), rec = smoothstep(0.6, 1.0, k);
    sPod.y -= 0.35 * set * (1.0 - rec);
    sAim = 0.3 * set * (1.0 - rec);
    sGlow = mix(0.3, 1.0, smoothstep(0.05, 0.45, k) * (1.0 - rec));
    sPod.z -= 0.2 * smoothstep(0.45, 0.52, k) * (1.0 - rec);
  }
  if (ePose.y > 2.5) sPod.z -= 0.15 * (1.0 - ePose.z);
}

float entMap(vec3 p, out float mat) {
  mat = 0.0;
  vec3 q = p - sPod;
  q.zy = rot2(sAim) * q.zy;
  float pod = sdRoundBox(q, vec3(0.46, 0.3, 0.56), 0.16);
  pod = smin(pod, sdEllipsoid(q - vec3(0.0, 0.24, -0.1), vec3(0.36, 0.2, 0.42)), 0.1);
  float d = pod;
  d = min(d, sdCapsule(q, vec3(-0.22, 0.4, -0.3), vec3(-0.28, 0.9, -0.42), 0.016));
  vec3 hipL = sPod + vec3(-0.5, -0.1, -0.05), hipR = sPod + vec3(0.5, -0.1, -0.05);
  vec3 kneeL = mix(hipL, sFootL, 0.45) + vec3(-0.08, 0.2, -0.55), kneeR = mix(hipR, sFootR, 0.45) + vec3(0.08, 0.2, -0.55);
  float legs = min(min(sdTaper(p, hipL, kneeL, 0.1, 0.075), sdTaper(p, kneeL, sFootL + vec3(0.0, 0.08, 0.0), 0.075, 0.055)),
                   min(sdTaper(p, hipR, kneeR, 0.1, 0.075), sdTaper(p, kneeR, sFootR + vec3(0.0, 0.08, 0.0), 0.075, 0.055)));
  legs = min(legs, min(length(p - kneeL), length(p - kneeR)) - 0.11);
  float feet = min(sdRoundBox(p - sFootL - vec3(0.0, -0.02, 0.08), vec3(0.16, 0.06, 0.26), 0.04), sdRoundBox(p - sFootR - vec3(0.0, -0.02, 0.08), vec3(0.16, 0.06, 0.26), 0.04));
  legs = min(legs, feet);
  if (legs < d) { d = legs; mat = 2.0; }
  float barrel = sdCapsule(q, vec3(0.0, -0.3, 0.2), vec3(0.0, -0.34, 0.95), 0.07);
  if (barrel < d) { d = barrel; mat = 2.0; }
  float mouth = length(q - vec3(0.0, -0.34, 1.0)) - 0.1;
  if (mouth < d) { d = mouth; mat = 1.0; }
  return d * 0.9;
}

void entSurf(vec3 p, float mat, inout Surf s) {
  if (mat > 1.5) { s.albedo = P_CHARCOAL; s.cover = 0.84; s.ink = penLine(fract(p.y * 5.0) - 0.5) * 0.3; return; }
  if (mat > 0.5) { s.albedo = eColB; s.cover = mix(0.9, 0.2, sGlow); s.glow = sGlow; return; }
  vec3 q = p - sPod;
  q.zy = rot2(sAim) * q.zy;
  s.albedo = P_SKY; s.cover = 0.12; s.wrap = 0.25;
  if (abs(q.y + 0.08) < 0.07) { s.albedo = eColA; s.cover = 0.84; }
  s.ink = max(penLine(abs(q.y + 0.08) - 0.07), penLine(q.x) * step(0.1, q.y)) * 0.6;
  if (q.z > 0.3 && abs(q.y - 0.12) < 0.06 && abs(q.x) < 0.34) {
    s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0;
    if (abs(q.x - 0.12 * sin(uTime * 0.9 + eLook.x * 6.0)) < 0.045) { s.albedo = eColB; s.cover = 0.3; s.solid = 0.0; s.glow = 0.9; }
  }
}
