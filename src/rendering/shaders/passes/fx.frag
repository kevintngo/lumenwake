in vec2 vUv;
in float vT;
in vec3 vWorld;
flat in vec4 vParams, vColor, vMore, vPosSize;
layout(location = 0) out vec4 oColor;
uniform sampler2D uGbuf;
uniform vec2 uInvRes;
uniform vec3 uCamPos;
uniform float uTime, uDpr;
#include <common>
const vec3 FX_PAPER = vec3(0.910, 0.886, 0.831);
const vec3 FX_INK = vec3(0.384, 0.235, 0.118);
float gPx = 0.01;
vec2 gPx2 = vec2(0.01);
float pen(float d) { return 1.0 - smoothstep(1.1 * gPx, 2.1 * gPx, abs(d)); }
float body(float d) { return 1.0 - smoothstep(-gPx, gPx, d); }
vec4 mark(vec3 c, float a) { return vec4(c * a, a); }
vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }
float hatch(vec2 uv, float seed) {
  float s = dot(uv, vec2(-0.883, 0.469)) / (4.2 * gPx);
  return smoothstep(0.3, 0.5, 0.5 + 0.5 * sin(s * 6.2832)) * (0.75 + 0.25 * hash12(floor(uv / (2.0 * gPx)) + seed));
}
float wobbly(vec2 uv, float seed) {
  float a = atan(uv.y, uv.x);
  return length(uv) * (1.0 - 0.035 * sin(a * 3.0 + seed * 20.0) - 0.02 * sin(a * 7.0 + seed * 9.0));
}
#include <fx-effects>
void main() {
  float sceneT = texture(uGbuf, gl_FragCoord.xy * uInvRes).z;
  float soft = saturate((sceneT - vT) * 1.6 + 0.7);
  vec2 uv = vUv;
  if (vMore.x > 0.5 && vMore.x < 1.5) {
    vec3 at = uCamPos + normalize(vWorld - uCamPos) * sceneT;
    vec2 d = at.xz - vPosSize.xz;
    if (abs(at.y - vPosSize.y) > 0.9 + 0.6 * length(d)) discard;
    float c = cos(vParams.w), s = sin(vParams.w);
    uv = vec2(c * d.x - s * d.y, s * d.x + c * d.y) / (vPosSize.w * vec2(1.0, vMore.y));
    if (max(abs(uv.x), abs(uv.y)) > 1.0) discard;
    soft = 1.0;
  }
  if (soft <= 0.0) discard;
  gPx2 = min(fwidth(uv) * uDpr, vec2(0.12));
  gPx = min(length(gPx2) * 0.7, 0.09);
  float steps = max(vMore.z * 12.0, 2.0);
  float life = floor(vParams.y * steps) / steps;
  vec4 c = vec4(0.0);
  switch (int(vParams.x + 0.5)) {
    case 0: c = fx_mote(uv, life, vParams.z, vColor); break;
    case 1: c = fx_leaf(uv, life, vParams.z, vColor); break;
    case 2: c = fx_spark(uv, life, vParams.z, vColor); break;
    case 3: c = fx_burst(uv, life, vParams.z, vColor); break;
    case 4: c = fx_slash(uv, life, vParams.z, vColor); break;
    case 5: c = fx_ring(uv, life, vParams.z, vColor); break;
    case 6: c = fx_halo(uv, life, vParams.z, vColor); break;
    case 7: c = fx_orb(uv, life, vParams.z, vColor); break;
    case 8: c = fx_puff(uv, life, vParams.z, vColor); break;
    case 9: c = fx_heal(uv, life, vParams.z, vColor); break;
    case 10: c = fx_mark(uv, life, vParams.z, vColor); break;
    case 11: c = fx_click(uv, life, vParams.z, vColor); break;
    case 12: c = fx_beam(uv, life, vParams.z, vColor); break;
    case 13: c = fx_zone(uv, life, vParams.z, vColor); break;
    case 14: c = fx_lane(uv, life, vParams.z, vColor); break;
    case 15: c = fx_cloud(uv, life, vParams.z, vColor); break;
    case 16: c = fx_ripple(uv, life, vParams.z, vColor); break;
  }
  c *= step(0.5, soft);
  if (c.a < 0.01) discard;
  oColor = c;
}
