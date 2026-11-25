layout(location = 0) in vec4 iPosSize;
layout(location = 1) in vec4 iParams;
layout(location = 2) in vec4 iColor;
layout(location = 3) in vec4 iMore;
uniform mat4 uViewProj;
uniform vec3 uCamPos, uCamRight, uCamUp;
uniform float uFar;
out vec2 vUv;
out float vT;
out vec3 vWorld;
flat out vec4 vParams, vColor, vMore, vPosSize;
#include <common>
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  vec2 c = rot2(iParams.w) * (corner * (iMore.x > 0.5 && iMore.x < 1.5 ? vec2(1.35, 1.35 * iMore.y) : vec2(1.0)));
  vec3 wp = iMore.x > 0.5
    ? iPosSize.xyz + vec3(c.x, 0.0, c.y) * iPosSize.w
    : iPosSize.xyz + (uCamRight * c.x + uCamUp * c.y * iMore.y) * iPosSize.w;
  vUv = corner; vParams = iParams; vColor = iColor; vMore = iMore; vPosSize = iPosSize; vWorld = wp;
  gl_Position = uViewProj * vec4(wp, 1.0);
  vT = length(wp - uCamPos);
  gl_Position.z = (clamp(vT / uFar, 0.0, 0.999) * 2.0 - 1.0) * gl_Position.w;
}
