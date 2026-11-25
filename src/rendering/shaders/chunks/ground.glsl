uniform float uPave;
float gGrass = 0.0;
float gSolid = 0.0;

void groundSurf(vec3 p, float t, inout vec3 N, out Surf s, out float canopy) {
  s = newSurf();
  vec2 uv = (p.xz + 0.5) * INV_T;
  vec4 ct = textureLod(uColorTex, uv, 0.0);
  vec4 mt = textureLod(uMatTex, uv, 0.0);
  vec4 hs = textureLod(uHeightTex, uv, 0.0);
  canopy = hs.g;
  float grass = mt.r, sand = mt.g, snow = mt.b, rock = mt.a, path = ct.a;
  float lod = smoothstep(85.0, 24.0, t);
  vec3 col = ct.rgb;

  gSolid = 0.0;
  float swatch = fbm(p.xz * 0.07);
  float swatch2 = fbm(p.xz * 0.023 + 40.0);
  col = mix(col, mix(col, P_BUTTER, 0.42), smoothstep(0.5, 0.78, swatch2) * grass * 0.75);
  col = mix(col, mix(col, P_PINE, 0.5), smoothstep(0.45, 0.2, swatch2) * grass * 0.6);
  s.soft = 1.0;
  s.cover = mix(0.4, 0.68, swatch) * mix(0.75, 1.0, grass);
  gGrass = grass * lod;

  float fl = hs.b * grass * lod;
  if (fl > 0.02) {
    vec2 fv = voronoi(p.xz * 1.9 + 31.0);
    float bloom = smoothstep(0.14, 0.1, fv.x) * step(1.0 - fl * 0.3, fract(fv.y * 3.7));
    col = mix(col, fv.y < 0.66 ? P_ROSE : P_SUN, bloom);
    s.cover = mix(s.cover, fv.y < 0.33 ? 0.0 : 0.95, bloom);
    s.ink = max(s.ink, smoothstep(0.04, 0.02, fv.x) * step(fv.y, 0.33) * bloom * 0.7);
    gGrass *= 1.0 - bloom;
  }
  if (path > 0.03) {
    float cob = smoothstep(0.6, 0.85, path);
    float on = smoothstep(0.03, 0.3, path);
    float pf = mix(2.4, 1.2, cob);
    vec2 pv = pavers(p.xz * pf);
    float joint = penLine(0.5 * pv.x / pf);
    vec3 dirt = mix(P_TAN, P_BARK, 0.25 * pv.y);
    float dirtCover = mix(0.16, 0.34, swatch);
    float dirtInk = joint * step(0.82, pv.y) * 0.55;
    float tone = fract(pv.y * 7.31);
    vec3 stone = tone < 0.4 ? P_PEACH : (tone < 0.75 ? P_CLAY : mix(P_STONE, P_CREAM, 0.5));
    float stoneCover = mix(0.36, 0.8, fract(pv.y * 3.17));
    if (uPave > 0.5) {
      vec2 gc = p.xz / 1.8, gi = floor(gc), gf = fract(gc) - 0.5;
      float tone2 = hash12(gi + 3.7);
      stone = tone2 < 0.5 ? mix(P_STONE, P_CREAM, 0.72) : (tone2 < 0.965 ? mix(P_SKY, P_CREAM, 0.6) : mix(P_SLATE, P_SKY, 0.35));
      stoneCover = tone2 < 0.965 ? mix(0.14, 0.32, fract(tone2 * 7.0)) : 0.5;
      joint = penLine((0.5 - max(abs(gf.x), abs(gf.y))) * 1.8);
    }
    col = mix(col, mix(dirt, stone, cob), on);
    s.cover = mix(s.cover, mix(dirtCover, stoneCover, cob), on);
    s.ink = max(s.ink, mix(dirtInk, joint * 0.8, cob) * on * mix(0.4, 1.0, lod));
    gGrass *= 1.0 - smoothstep(0.08, 0.35, path);
  }
  if (sand > 0.04) {
    vec2 sv = voronoi(p.xz * 3.1);
    col = mix(col, mix(P_TAN, P_CREAM, 0.45), sand);
    s.cover = mix(s.cover, 0.14 + 0.3 * hs.a + 0.1 * swatch, sand);
    s.ink = max(s.ink, smoothstep(0.07, 0.035, sv.x) * step(0.8, sv.y) * 0.5 * sand * lod);
  }
  if (rock > 0.04) {
    float strata = vnoise(vec2(p.y * 3.2 + vnoise(p.xz * 0.5) * 3.0, dot(p.xz, vec2(0.4, 0.3))));
    col = mix(col, uRockCol, rock * 0.85);
    s.cover = mix(s.cover, mix(0.5, 0.78, strata), rock);
    s.ink = max(s.ink, smoothstep(0.05, 0.0, abs(fract(strata * 3.0) - 0.5)) * 0.6 * rock * lod);
    N = normalize(N + vec3(strata - 0.5, 0.0, 0.5 - strata) * 0.5 * rock);
  }
  if (snow > 0.04) {
    float drift = vnoise(vec2(dot(p.xz, vec2(0.8, 0.6)) * 0.22, dot(p.xz, vec2(-0.6, 0.8)) * 1.3));
    col = mix(col, mix(P_SKY, P_SLATE, 0.2), snow);
    s.cover = mix(s.cover, 0.015 + 0.13 * smoothstep(0.5, 0.15, drift * 0.6 + swatch * 0.6), snow);
  }
  if (uWall > 0.0 && (hs.a > 0.0 || hs.b < 0.5)) {
    if (N.y < 0.6) {
      float course = (p.y - hs.r) / 0.58, row = floor(course);
      float along = dot(p.xz, normalize(vec2(-N.z, N.x) + 1e-4)) / 1.15 + 0.5 * mod(row, 2.0);
      float block = hash12(vec2(row * 3.0 + 1.0, floor(along)));
      col = mix(P_STONE, mix(P_CREAM, P_PEACH, 0.35), 0.25 + 0.5 * block);
      s.cover = mix(0.42, 0.74, fract(block * 7.3));
      s.ink = max(penLine((abs(fract(course) - 0.5) - 0.5) * 0.58), penLine((abs(fract(along) - 0.5) - 0.5) * 1.15) * 0.8) * 0.85 * mix(0.5, 1.0, lod);
      s.soft = 0.0;
      gSolid = saturate((hs.r - p.y) / 1.5);
    } else if (hs.a > 0.12 && hs.b > 0.0) gSolid = 1.0;
  }
  if (uRealm > 1.5) {
    vec2 cv = voronoi(p.xz * 0.3 + 17.0);
    float crater = step(0.62, fract(cv.y * 5.3)), cr = cv.x / 0.3;
    float rim = crater * smoothstep(0.16, 0.0, abs(cr - 1.05 - 0.9 * fract(cv.y * 9.1)));
    float bowl = crater * smoothstep(1.05 + 0.9 * fract(cv.y * 9.1), 0.2, cr);
    s.cover = mix(s.cover, min(1.0, s.cover + 0.16), bowl * (1.0 - rock));
    s.ink = max(s.ink, rim * 0.5 * (1.0 - rock) * lod);
    s.ink = max(s.ink, step(0.93, vnoise(p.xz * 6.0)) * 0.35 * (1.0 - rock) * lod);
  }
  s.albedo = col;
}
