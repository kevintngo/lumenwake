struct Surf { vec3 albedo; float cover; float ink; float soft; float solid; float glow; float wrap; float leafy; float moss; float occ; };
Surf newSurf() { return Surf(P_STONE, 0.8, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0); }

uniform vec4 uLightPos[MAX_LIGHTS];
uniform vec3 uLightCol[MAX_LIGHTS];
uniform int uLightCount;

float gSun = 1.0;

float gPen = 0.02;
float penLine(float d) { return 1.0 - smoothstep(gPen * 0.55, gPen * 1.15, abs(d)); }

float lightPool(vec3 p, vec3 N) {
  float acc = 0.0;
  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= uLightCount) break;
    vec3 d = uLightPos[i].xyz - p;
    float r = uLightPos[i].w, d2 = dot(d, d);
    if (d2 < r * r) {
      float att = 1.0 - d2 / (r * r);
      float nl = dot(N, d * inversesqrt(d2 + 1e-4)) * 0.5 + 0.5;
      acc += uLightCol[i].r * att * att * mix(0.5, 1.0, nl);
    }
  }
  return saturate(acc);
}

float shadeAmount(Surf s, vec3 N, float shadow, float ao) {
  float ndl = dot(N, uSunDir);
  float i = saturate((ndl + s.wrap) / (1.0 + s.wrap)) * shadow;
  float lit = 0.45 * smoothstep(0.015, 0.075, i) + 0.55 * smoothstep(0.3, 0.38, i);
  float sh = max(1.0 - lit, (1.0 - ao) * 0.85);
  return max(sh, (1.0 - gSun) * 0.9);
}

float sphereShadow(vec3 ro, vec3 rd, vec4 sph, float k) {
  vec3 oc = ro - sph.xyz;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - sph.w * sph.w;
  float h = b * b - c;
  return (b > 0.0) ? step(-0.0001, c) : smoothstep(0.0, 1.0, h * k / b);
}
