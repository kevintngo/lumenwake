#include <shuttle>

mat2 sRoll, sNose;
float sFly;

void entPose() {
  sRoll = rot2(ePose.x);
  sNose = rot2(ePose.z);
  sFly = saturate(ePose.w);
}

vec3 craftLocal(vec3 p) {
  vec3 b = p - vec3(0.0, 1.05, 0.0);
  b.xy = sRoll * b.xy;
  b.zy = sNose * b.zy;
  return b;
}

float entMap(vec3 p, out float mat) { return shuttleMap(craftLocal(p), sFly, mat); }

void entSurf(vec3 p, float mat, inout Surf s) { shuttleSurf(craftLocal(p), mat, sFly, eColB, s); }
