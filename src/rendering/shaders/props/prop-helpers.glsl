void leafSurf(vec3 q, Prop pr, inout Surf s, float lo, float hi) {
  vec3 leaf = uLeafPal[int(pr.pal + 0.5)];
  float clump = vnoise3(q * 2.3 + pr.seed * 10.0);
  float lift = smoothstep(lo, hi, q.y);
  s.albedo = mix(leaf, mix(leaf, P_BUTTER, 0.45), smoothstep(0.56, 0.66, clump) * mix(0.35, 0.9, lift));
  s.cover = mix(0.62, 0.9, clump);
  s.soft = 1.0;
  s.ink = penLine((clump - 0.44) / 1.9) * 0.42;
  s.wrap = 0.5; s.leafy = 1.0;
  s.occ = mix(0.55, 1.0, lift) * mix(0.72, 1.0, smoothstep(0.22, 0.42, clump));
}
void barkSurf(vec3 q, Prop pr, inout Surf s) {
  float a = atan(q.z, q.x);
  float streak = vnoise(vec2(a * 3.0, q.y * 1.6 + pr.seed * 10.0));
  s.albedo = mix(P_BARK, P_UMBER, streak * 0.55);
  s.cover = 0.78;
  s.ink = penLine((abs(fract(a * 1.3 + vnoise(vec2(q.y * 2.0, pr.seed * 7.0)) * 0.8) - 0.5)) / 1.3 * 0.18) * step(0.55, streak) * 0.5;
}
const vec3 ROCK_N[5] = vec3[5](vec3(0.83, 0.52, 0.21), vec3(-0.61, 0.61, 0.51), vec3(0.1, 0.7, -0.71),
                              vec3(-0.5, 0.31, -0.81), vec3(0.3, 0.9, 0.31));
float rockBody(vec3 c, float r, float seed) {
  float d = length(c * vec3(1.0, 1.2, 1.0)) - r;
  for (int i = 0; i < 5; i++) d = max(d, dot(c, ROCK_N[i]) - r * (0.62 + 0.25 * fract(seed * (7.0 + float(i) * 3.3))));
  return d - 0.04;
}
float crystalShard(vec3 q, float r, float h) {
  float hx = max(abs(q.x) * 0.866 + abs(q.z) * 0.5, abs(q.z));
  float d = max(hx - r, -q.y);
  return max(d, (q.y - h) * 0.55 + hx * 0.85) * 0.8;
}
float urnOne(vec3 q, float sc) {
  q /= sc;
  float body = sdEllipsoid(q - vec3(0.0, 0.42, 0.0), vec3(0.3, 0.42, 0.3));
  float neck = sdCylinder(q - vec3(0.0, 0.74, 0.0), 0.13, 0.2);
  float lip = sdTorusY(q - vec3(0.0, 0.95, 0.0), 0.14, 0.035);
  return min(smin(body, neck, 0.08), lip) * sc;
}
