const vec3 SLAB_N[5] = vec3[5](vec3(0.83, 0.52, 0.21), vec3(-0.61, 0.61, 0.51), vec3(0.1, 0.7, -0.71), vec3(-0.5, 0.31, -0.81), vec3(0.3, -0.9, 0.31));
float slab(vec3 c, float r, float seed) {
  float d = length(c) - r;
  if (d > r * 0.6) return d;
  for (int i = 0; i < 5; i++) d = max(d, dot(c, SLAB_N[i]) - r * (0.68 + 0.2 * fract(seed * (5.0 + float(i) * 2.7))));
  return d - 0.06 * r;
}
