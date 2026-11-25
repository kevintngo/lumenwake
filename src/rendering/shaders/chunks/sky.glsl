vec2 starFace(vec3 d, out float face) {
  vec3 a = abs(d);
  if (a.x > a.y && a.x > a.z) { face = d.x > 0.0 ? 0.0 : 1.0; return d.yz / a.x; }
  if (a.y > a.z) { face = d.y > 0.0 ? 2.0 : 3.0; return d.xz / a.y; }
  face = d.z > 0.0 ? 4.0 : 5.0; return d.xy / a.z;
}
float starField(vec3 d, float many, float size, float rare) {
  float face;
  vec2 uv = starFace(d, face) * many, cell = floor(uv);
  vec2 so = hash22(cell + face * 31.0 + 3.1) - 0.5;
  return smoothstep(size, size * 0.45, length(fract(uv) - 0.5 - so * 0.6)) * step(rare, hash12(cell + face * 17.0));
}
vec3 spaceLay(vec3 rd, out float cover, out float ink) {
  ink = 0.0;
  vec3 pig = mix(P_INDIGO, INK_BLACK, 0.5);
  cover = 0.95;
  float river = smoothstep(0.42, 0.0, abs(dot(rd, normalize(vec3(0.35, 0.86, -0.36)))));
  cover *= 1.0 - 0.3 * river * smoothstep(0.35, 0.7, fbm(rd.xz * 3.0 + rd.y * 2.0));
  cover *= 1.0 - max(starField(rd, 34.0, 0.075, 0.62 - 0.25 * river), starField(rd, 13.0, 0.06, 0.88));
  vec3 pd = normalize(vec3(-0.5, 0.02, -0.86));
  vec3 px_ = normalize(cross(pd, vec3(0.0, 1.0, 0.0))), py_ = cross(px_, pd);
  vec2 q = vec2(dot(rd, px_), dot(rd, py_)) / 0.34;
  float rr = length(q), front = step(0.0, dot(rd, pd));
  vec2 e = vec2(q.x * 0.94 + q.y * 0.34, (q.y * 0.94 - q.x * 0.34) / 0.3);
  float er = length(e);
  float ring = smoothstep(1.3, 1.34, er) * smoothstep(2.1, 2.05, er) * (0.5 + 0.5 * step(0.4, fract(er * 5.0))) * front;
  if (rr < 1.0 && front > 0.5) {
    float lit = smoothstep(-0.25, 0.35, dot(normalize(vec3(q, sqrt(1.0 - rr * rr))), normalize(vec3(0.5, 0.6, 0.62))));
    float band = vnoise(vec2(q.y * 6.0 + vnoise(q * 2.5) * 1.1, q.x * 0.6));
    vec3 world = mix(P_PEACH, P_ROSE, smoothstep(0.4, 0.62, band));
    pig = mix(pig, world, lit);
    cover = mix(0.95, mix(0.62, 0.3, smoothstep(0.3, 0.7, band)), lit);
    ink = smoothstep(0.02, 0.0, abs(rr - 0.985)) * 0.6;
  }
  bool behind = e.y > 0.0 && rr < 1.0;
  if (!behind && ring > 0.01) { pig = mix(pig, P_TAN, ring); cover = mix(cover, 0.5, ring); }
  float md = dot(rd, normalize(vec3(0.7, 0.32, 0.64)));
  if (md > 0.9985) { pig = P_SLATE; cover = 0.28; ink = max(ink, smoothstep(0.00016, 0.0, abs(md - 0.99858)) * 0.5); }
  float sd = dot(rd, uSunDisk);
  cover *= 1.0 - smoothstep(0.9982, 0.999, sd) - 0.35 * smoothstep(0.99, 0.9982, sd) * (1.0 - smoothstep(0.9982, 0.999, sd));
  return pig;
}

vec3 skyLay(vec3 rd, out float cover, out float ink) {
  float h = max(rd.y, 0.0);
  ink = 0.0;
  if (uRealm > 0.5 && uRealm < 1.5) { cover = 0.97; return mix(P_INDIGO, INK_BLACK, 0.66); }
  if (uRealm > 1.5) return spaceLay(rd, cover, ink);
  vec3 pig = P_SKY;
  cover = mix(0.1, 0.5, smoothstep(0.02, 0.5, h));
  float low = exp(-h * 6.0);
  pig = mix(pig, mix(P_APRICOT, P_ROSE, 0.3), uGold * low * 0.9);
  cover = mix(cover, 0.4, uGold * low);
  pig = mix(pig, mix(P_INDIGO, P_DUSK, 0.4), uNight);
  cover = mix(cover, mix(0.6, 0.86, smoothstep(0.0, 0.5, h)), uNight);

  vec3 pd = normalize(vec3(-0.55, 0.4, -0.73));
  float planet = 0.0;
  if (dot(rd, pd) > 0.0) {
    vec3 px_ = normalize(cross(pd, vec3(0.0, 1.0, 0.0))), py_ = cross(px_, pd);
    vec2 q = vec2(dot(rd, px_), dot(rd, py_)) / 0.2;
    float rr = length(q);
    vec2 e = vec2(q.x * 0.94 + q.y * 0.34, (q.y * 0.94 - q.x * 0.34) / 0.28);
    float er = length(e);
    float ring = smoothstep(1.36, 1.4, er) * smoothstep(2.25, 2.2, er) * (0.55 + 0.45 * step(0.45, fract(er * 4.2)));
    if (rr < 1.0) {
      float lit = smoothstep(-0.15, 0.3, dot(normalize(vec3(q, sqrt(1.0 - rr * rr))), normalize(vec3(0.55, 0.45, 0.7))));
      float band = vnoise(vec2(q.y * 5.0 + vnoise(q * 3.0) * 0.9, q.x * 0.7));
      vec3 world = mix(P_PEACH, P_ROSE, smoothstep(0.42, 0.6, band));
      pig = mix(world, nightPencil(world), uNight * 0.5);
      cover = mix(0.72, 0.4, lit);
      ink = max(ink, smoothstep(0.035, 0.0, abs(rr - 0.98)) * 0.55);
      planet = 1.0;
    }
    bool behind = e.y > 0.0 && rr < 1.0;
    if (!behind && ring > 0.01) { pig = mix(pig, mix(P_TAN, P_SLATE, uNight * 0.6), ring); cover = mix(cover, 0.55, ring); planet = max(planet, ring); }
  }
  float md2 = dot(rd, normalize(vec3(0.72, 0.2, 0.66)));
  if (md2 > 0.9992) { pig = P_SLATE; cover = 0.3 * smoothstep(0.9992, 0.9995, md2); ink = max(ink, smoothstep(0.00012, 0.0, abs(md2 - 0.99925)) * 0.4); }
  if (rd.y > 0.01) {
    vec2 uv = rd.xz / (rd.y + 0.16) * 1.1 + uWind * uTime * 0.012;
    float edge = 0.6 - uCloud * 0.28;
    float cloud = smoothstep(edge - 0.02, edge + 0.06, fbm(uv)) * smoothstep(0.01, 0.14, rd.y);
    cover *= 1.0 - cloud * mix(0.96, 0.5, uNight) * (1.0 - 0.72 * planet);
    if (uNight > 0.05) {
      vec2 sp = rd.xz / (rd.y + 0.35) * 42.0;
      vec2 cell = floor(sp);
      float star = hash12(cell);
      vec2 so = hash22(cell + 3.1) - 0.5;
      cover *= 1.0 - smoothstep(0.1, 0.04, length(fract(sp) - 0.5 - so * 0.6)) * step(0.8, star) * uNight;
    }
  }
  cover *= 1.0 - smoothstep(0.9984, 0.9990, dot(rd, uSunDisk)) * (1.0 - uNight) * step(0.0, rd.y);
  float md = dot(rd, uMoonDisk);
  float moon = smoothstep(0.9986, 0.9991, md) * (1.0 - 0.9 * smoothstep(0.9986, 0.9991, dot(rd, normalize(uMoonDisk + vec3(0.022, 0.013, 0.0)))));
  cover *= 1.0 - moon * uNight;

  vec2 az = normalize(rd.xz + 1e-5);
  float r1 = 0.02 + 0.1 * fbm(az * 2.2 + 4.0);
  float r2 = 0.01 + 0.06 * fbm(az * 3.6 + 11.0);
  float m1 = smoothstep(r1 + 0.002, r1, rd.y), m2 = smoothstep(r2 + 0.002, r2, rd.y);
  vec3 far1 = mix(P_SKY, P_SAGE, 0.4), far2 = mix(P_SAGE, P_PINE, 0.45);
  far1 = mix(far1, nightPencil(far1), uNight); far2 = mix(far2, nightPencil(far2), uNight);
  pig = mix(pig, far1, m1); cover = mix(cover, mix(0.26, 0.6, uNight), m1);
  pig = mix(pig, far2, m2); cover = mix(cover, mix(0.36, 0.72, uNight), m2);
  ink = max(smoothstep(0.003, 0.0, abs(rd.y - r1)), smoothstep(0.003, 0.0, abs(rd.y - r2))) * 0.3;
  float mist = smoothstep(-0.005, 0.03, rd.y);
  cover *= mist; ink *= mist;
  return pig;
}
