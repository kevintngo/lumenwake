// Craft that fly: figures the director brings into a cinematic (content/cinematics.js).
// The drop shuttle is the same machine that stands parked on the landing field
// (the model is shared: gfx/glsl/shuttle.js), drawn as a figure so it can bank,
// nose down, fold its skids and light its engines.
//
// Read from the pose:  ePose.x  bank, radians      ePose.z  nose up or down, radians
//                      ePose.w  1 in flight (skids folded, flame out) .. 0 at rest on the ground
// Pencil B is its trim.

import { registerArchetype } from '../passes/entities.js';
import { SHUTTLE_GLSL } from '../glsl/shuttle.js';

registerArchetype({
  id: 'shuttle', boundY: 1.1, boundR: 4.9, steps: 64,
  glsl: SHUTTLE_GLSL + /* glsl */ `
mat2 sRoll, sNose; float sFly;
void entPose() { sRoll = rot2(ePose.x); sNose = rot2(ePose.z); sFly = saturate(ePose.w); }
vec3 craftLocal(vec3 p) {
  vec3 b = p - vec3(0.0, 1.05, 0.0);
  b.xy = sRoll * b.xy;
  b.zy = sNose * b.zy;
  return b;
}
float entMap(vec3 p, out float mat) { return shuttleMap(craftLocal(p), sFly, mat); }
void entSurf(vec3 p, float mat, inout Surf s) { shuttleSurf(craftLocal(p), mat, sFly, eColB, s); }
`,
});
