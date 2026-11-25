uniform sampler2D uHeightTex;
uniform sampler2D uColorTex;
uniform sampler2D uMatTex;
uniform sampler2D uPropTexA;
uniform sampler2D uPropTexB;
uniform float uMaxY;
uniform float uWall;

const float INV_T = 1.0 / WORLD_TEX;
float hAt(vec2 xz) {
  vec4 h = textureLod(uHeightTex, (xz + 0.5) * INV_T, 0.0);
  return uWall > 0.0 ? h.r + uWall * smoothstep(0.0, 0.1, h.a) - 40.0 * step(h.b, 0.0) : h.r;
}
vec3 terrainNormal(vec2 xz) {
  const float e = 0.7;
  return normalize(vec3(hAt(xz - vec2(e, 0.0)) - hAt(xz + vec2(e, 0.0)), 2.0 * e,
                        hAt(xz - vec2(0.0, e)) - hAt(xz + vec2(0.0, e))));
}

bool cellProp(ivec2 cell, out Prop pr) {
  ivec2 tc = cell & (CELLS - 1);
  vec4 a = texelFetch(uPropTexA, tc, 0);
  pr.type = int(a.w + 0.5);
  if (pr.type == 0) return false;
  vec4 b = texelFetch(uPropTexB, tc, 0);
  vec2 c = (vec2(cell) + 0.5) * CELL + a.xy;
  pr.base = vec3(c.x, a.z, c.y);
  pr.rot = b.x * TAU; pr.scale = b.y * 2.0; pr.seed = b.z; pr.pal = b.w * 255.0;
  return true;
}
mat2 propRot(Prop pr) { return rot2(pr.rot); }
vec3 toProp(vec3 p, Prop pr, mat2 r) { vec3 q = p - pr.base; q.xz = r * q.xz; return q / pr.scale; }

float cellExit(vec2 xz, vec2 dir) {
  vec2 f = fract(xz / CELL);
  vec2 e = mix(f, 1.0 - f, step(0.0, dir)) * CELL / (abs(dir) + 1e-5);
  return min(e.x, e.y) + 0.02;
}

struct Hit { float t; int kind; float mat; Prop pr; ivec2 cell; };

bool gReveal = false;
float gRevealT = 0.0;

void marchScene(vec3 ro, vec3 rd, float tMin, float tMax, out Hit hit) {
  hit.kind = 0; hit.t = tMax; hit.mat = 0.0; hit.cell = ivec2(0);
  float t = tMin, tPrev = tMin;
  ivec2 last = ivec2(-99999);
  bool has = false;
  Prop pr; mat2 pm;
  for (int i = 0; i < MARCH_STEPS; i++) {
    vec3 p = ro + rd * t;
    float above = p.y - hAt(p.xz);
    float eps = 0.0016 * t + 0.003;
    if (above < eps) {
      float a = tPrev, b = t;
      for (int k = 0; k < 5; k++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - hAt(q.xz) < eps) b = m; else a = m;
      }
      hit.t = b; hit.kind = 1;
      return;
    }
    float d;
    if (above < PROP_HMAX) {
      d = above * 0.5;
      ivec2 cell = ivec2(floor(p.xz / CELL));
      if (cell != last) { last = cell; has = cellProp(cell, pr); if (has) pm = propRot(pr); }
      if (has) {
        float m;
        float dp = propSdf(toProp(p, pr, pm), pr, m) * pr.scale;
        if (dp < eps) {
          if (!(gReveal && t < gRevealT && propSeeThrough(pr.type, m))) {
            hit.t = t; hit.kind = 2; hit.mat = m; hit.pr = pr; hit.cell = cell;
            return;
          }
          dp = 0.3;
        }
        d = min(d, dp);
      }
      d = min(d, cellExit(p.xz, rd.xz));
    } else {
      d = (above - PROP_HMAX) * 0.5 + 0.35;
    }
    tPrev = t;
    t += max(d, 0.02);
    if (t > tMax) break;
  }
}

float shadowMarch(vec3 p, vec3 L) {
  float res = 1.0, t = 0.1;
  ivec2 last = ivec2(-99999);
  bool has = false;
  Prop pr; mat2 pm;
  for (int i = 0; i < SHADOW_STEPS; i++) {
    vec3 q = p + L * t;
    float above = q.y - hAt(q.xz);
    if (above < -0.03) return 0.0;
    float d = above * 0.6 + 0.06;
    if (t > 1.5) res = min(res, 16.0 * above / t);
    if (above < PROP_HMAX) {
      ivec2 cell = ivec2(floor(q.xz / CELL));
      if (cell != last) { last = cell; has = cellProp(cell, pr); if (has) pm = propRot(pr); }
      if (has) {
        float m;
        float dp = propSdf(toProp(q, pr, pm), pr, m) * pr.scale;
        if (dp < 0.01) return 0.0;
        res = min(res, 11.0 * dp / t);
        d = min(d, dp);
      }
      d = min(d, cellExit(q.xz, L.xz));
    }
    t += clamp(d, 0.07, 5.0);
    if (res < 0.02 || q.y > uMaxY || t > 46.0) break;
  }
  return saturate(res);
}

float cloudShadow(vec2 xz) {
  float d = fbm(xz * 0.011 + uWind * uTime * 0.02);
  float edge = 0.66 - uCloud * 0.3;
  return 1.0 - 0.3 * smoothstep(edge - 0.08, edge + 0.08, d) * (1.0 - uNight * 0.6);
}
