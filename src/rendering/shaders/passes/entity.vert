layout(location = 0) in vec4 iPosScale;
layout(location = 1) in vec4 iPose;
layout(location = 2) in vec4 iLook;
layout(location = 3) in vec4 iColA;
layout(location = 4) in vec4 iColB;
layout(location = 5) in vec4 iColC;
uniform mat4 uViewProj;
uniform vec3 uCamRight, uCamUp;
uniform vec2 uBound;
out vec3 vWorld;
flat out vec4 vPosScale, vPose, vLook, vColA, vColB, vColC;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  float s = iPosScale.w;
  vec3 c = iPosScale.xyz + vec3(0.0, uBound.x * s, 0.0);
  vec3 wp = c + (uCamRight * corner.x + uCamUp * corner.y) * (uBound.y * s * 1.22 + 0.12);
  vWorld = wp;
  vPosScale = iPosScale; vPose = iPose; vLook = iLook; vColA = iColA; vColB = iColB; vColC = iColC;
  gl_Position = uViewProj * vec4(wp, 1.0);
}
