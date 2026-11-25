// Entity pass. Every creature is a small signed-distance model raymarched
// inside a camera-facing quad ("impostor"), instanced per archetype, and drawn
// at full device resolution in the same hand as the world: a bold ballpoint
// contour, pencil hatching that rides with the figure, bare paper for skin and
// light. Figures boil quietly (their hatching is re-laid six times a second)
// and are posed on twos by the view.
//
// An archetype is a GLSL chunk that defines three functions:
//
//   void  entPose();                              once per pixel: set up joints
//   float entMap(vec3 p, out float mat);          distance field; feet at y=0, facing +z
//   void  entSurf(vec3 p, float mat, inout Surf s);   which pencil, how firmly, what pen marks
//
// and may read:  ePose  (walk phase, action id, action progress, movement 0..1)
//                eLook  (seed, hit flash, shade from scenery, flags)
//                eColA / eColB / eColC  (three pencils), eExtra (variant)
//
// registerArchetype() is the only thing a new creature needs to call.

import { Program } from '../gl.js';
import '../glsl/lighting.js';

export const ARCHETYPES = new Map();
export const INSTANCE_FLOATS = 24;

/** def: { id, boundY, boundR, glsl, steps? } — bound = sphere that contains every pose at scale 1 */
export function registerArchetype(def) {
  ARCHETYPES.set(def.id, def);
  return def;
}

const ENTITY_VS = /* glsl */ `
layout(location = 0) in vec4 iPosScale;
layout(location = 1) in vec4 iPose;     // yaw, walk phase, action, action progress
layout(location = 2) in vec4 iLook;     // seed, flash, shade, flags
layout(location = 3) in vec4 iColA;     // rgb, movement
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
`;

const entityFS = (def) => /* glsl */ `
in vec3 vWorld;
flat in vec4 vPosScale, vPose, vLook, vColA, vColB, vColC;
layout(location = 0) out vec4 oColor;   // premultiplied, already drawn (paper, pencil, pen)
layout(location = 1) out vec4 oAux;     // ray distance, hero flag, how much of this pixel is contour
uniform vec2 uBound;
uniform float uFar, uPixel;             // uPixel: world size of one pixel at distance 1

#include <common>
#include <frame>
#include <pencil>
#include <lighting>

vec4 ePose, eLook;
vec3 eColA, eColB, eColC;
float eMove, eExtra, eSpare;
vec3 gNormal = vec3(0.0, 1.0, 0.0), gRay = vec3(0.0, 0.0, 1.0);    // at the point being drawn (entSurf): its normal and the ray, in the figure's own space
${def.glsl}

vec3 entNormal(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.006;
  float m;
  return normalize(e.xyy * entMap(p + e.xyy, m) + e.yyx * entMap(p + e.yyx, m) +
                   e.yxy * entMap(p + e.yxy, m) + e.xxx * entMap(p + e.xxx, m));
}

void main() {
  ePose = vec4(vPose.yzw, vColA.w); eLook = vLook;
  eColA = vColA.rgb; eColB = vColB.rgb; eColC = vColC.rgb;
  eMove = vColA.w; eExtra = vColB.w; eSpare = vColC.w;
  float scale = vPosScale.w;
  mat2 R = rot2(vPose.x);
  vec3 rdW = normalize(vWorld - uCamPos);
  vec3 lo = (uCamPos - vPosScale.xyz) / scale;
  lo.xz = R * lo.xz;
  vec3 ld = rdW;
  ld.xz = R * ld.xz;

  vec3 oc = lo - vec3(0.0, uBound.x, 0.0);
  float b = dot(oc, ld), h = b * b - (dot(oc, oc) - uBound.y * uBound.y * 1.21);
  if (h < 0.0) discard;
  h = sqrt(h);
  float t = max(-b - h, 0.0), tEnd = -b + h;

  entPose();
  float pix = uPixel / scale;                 // local size of a pixel per unit distance
  float mat = 0.0, minD = 1e3, tEdge = t, inner = 0.0, matEdge = 0.0;
  bool hit = false;
  // the contour: a bold line about a fiftieth of the figure's height, never thinner than the pen
  float w = max(OUTLINE_PX * pix * t, 0.03);
  for (int i = 0; i < ${def.steps || 56}; i++) {
    float d = entMap(lo + ld * t, mat);
    if (d < 0.5 * pix * t) { hit = true; break; }
    if (d < minD) { minD = d; tEdge = t; matEdge = mat; }
    else if (minD < w * 0.6 && d > minD + w * 0.5) inner = max(inner, smoothstep(w * 0.6, w * 0.25, minD));   // a part in front of another
    t += d * 0.92;
    if (t > tEnd) break;
  }
  vec3 pe = lo + ld * tEdge;
  float press = mix(mix(0.72, 1.0, vnoise(pe.xy * 5.0 + eLook.x * 31.0)), 1.0, CEL);          // the hand presses unevenly
  float contour = hit ? 0.0 : smoothstep(w, w * 0.5, minD);
  // now and then the pen goes round twice, a little outside the first line
  float again = hit ? 0.0 : smoothstep(1.85 * w, 1.65 * w, minD) * smoothstep(1.2 * w, 1.35 * w, minD)
    * step(0.76, vnoise(pe.xy * 1.6 + eLook.x * 9.0)) * 0.3 * (1.0 - CEL);
  float edge = max(max(contour, inner) * press, again);
  // A part that gives light (an archetype that defines ENT_EDGE_GLOW says which, and in what colour) has no pen line
  // round it: a soft band of its own colour instead, wider than the line, against whatever is behind the figure.
  vec4 glowEdge = vec4(0.0);
  float halo = 0.0;
#ifdef ENT_EDGE_GLOW
  if (!hit) { glowEdge = entEdgeGlow(matEdge); halo = glowEdge.a * pow(smoothstep(w * 3.6, w * 0.15, minD), 1.6); }
#endif
  if (!hit && edge < 0.02 && halo < 0.02) discard;

  float flags = eLook.w;
  bool hover = mod(flags, 4.0) >= 2.0;
  vec3 ink = hover ? P_VERMILION * 0.85 : INK_DARK;
  vec3 col = ink;
  float alpha = edge, tOut = tEdge, lineOut = edge;
  if (!hit && glowEdge.a > 0.0) { col = glowEdge.rgb; alpha = halo; lineOut = 0.0; edge = 0.0; }
  if (hit) {
    vec3 p = lo + ld * t;
    vec3 n = entNormal(p);
    Surf s = newSurf();
    gPen = max(pix * t * 1.5 * uPencil.w, 0.006);     // inner pen lines: finer than the contour
    gNormal = n; gRay = ld;
    entSurf(p, mat, s);
    mat2 back = transpose(R);
    vec3 N = vec3(back * n.xz, n.y).xzy;
    vec3 wp = uCamPos + rdW * (t * scale);

    // form shadow: one hatched piece along the underside (light from straight above),
    // plus whatever shade the scenery throws over the figure
    float shade = celShade(max(smoothstep(0.2, -0.45, N.y) * 0.85, (1.0 - eLook.z) * 0.75)) * s.occ;
    // by lamplight a figure keeps its own pencils; away from it, the night's
    float pool = lightPool(wp, N);
    float lift = max(s.glow, eLook.y);                         // its own light, and the flash of a blow, are paper
    vec3 pig = mix(s.albedo, nightPencil(s.albedo), uNight * (1.0 - max(pool, s.glow)) * 0.8);
    float cover = s.cover * (1.0 - 0.9 * lift);
    shade *= (1.0 - lift) * (1.0 - 0.5 * pool);

    // the hatching rides with the figure, and is laid afresh six times a second
    // (on a sheet facing the camera through the figure's feet, so strokes stay straight on the page)
    float sheet = max(dot(vPosScale.xyz - uCamPos, uCamFwd), 0.5);
    vec3 rel = uCamPos + rdW * (sheet / dot(rdW, uCamFwd)) - vPosScale.xyz;
    vec2 boil = (hash22(vec2(uPencil.z, eLook.x * 91.0)) - 0.5) * 0.01 * (1.0 - CEL);
    vec2 uv = vec2(dot(rel, uCamRight), dot(rel, uCamUp)) + vec2(eLook.x * 7.3, eLook.x * 3.1) + boil;
    vec2 lod = pencilLod(sheet);
    vec3 page = paperSheet(gl_FragCoord.xy);
    float m1 = mix(pencilLay(uv, lod, cover, s.soft, SLANT, eLook.x), step(0.02, cover), s.solid);
    col = layOn(page, pig, m1);
    float m2 = mix(pencilLay(uv, lod, shade * 0.8, 0.0, SLANT - 0.105, eLook.x + 5.0), pencilLay(uv, lod, shade * 0.8, 1.0, SLANT - 0.105, eLook.x + 5.0), 0.5) * (1.0 - s.solid);
    col = shadeOn(col, shadowPencil(pig), m2);
    float marks = max(inner * press, smoothstep(0.25, 0.5, s.ink) * 0.85);
    col = inkOn(col, ink, marks);
    alpha = 1.0; tOut = t; lineOut = marks;
  }
  float tw = tOut * scale;
  oColor = vec4(col * alpha, alpha);
  oAux = vec4(tw, mod(flags, 2.0), hit ? lineOut * 0.5 : edge, 1.0);
  gl_FragDepth = clamp(tw / uFar, 0.0, 0.9999);
}
`;

export class EntityPass {
  constructor(gl) {
    this.gl = gl;
    this.programs = new Map();
    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    this.capacity = 0;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    for (let i = 0; i < 6; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, INSTANCE_FLOATS * 4, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
  }

  /** Compiles on first use, so an archetype nobody has met costs nothing. */
  program(id) {
    let p = this.programs.get(id);
    if (!p) {
      const def = ARCHETYPES.get(id);
      if (!def) throw new Error(`Unknown archetype "${id}"`);
      p = new Program(this.gl, 'entity:' + id, ENTITY_VS, entityFS(def), { OUTLINE_PX: '1.6' });
      p.def = def;
      this.programs.set(id, p);
    }
    return p;
  }

  /** batches: Map(archetypeId -> { data: Float32Array, count }) */
  render(target, frame, batches, applyFrame) {
    const gl = this.gl;
    target.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    for (const [id, batch] of batches) {
      if (!batch.count) continue;
      const p = this.program(id).use();
      applyFrame(p);
      p.set('uTime', frame.timeTwos);       // figures move on twos
      p.set('uViewProj', frame.camera.viewProj).set('uBound', [p.def.boundY, p.def.boundR]);
      p.set('uFar', frame.far).set('uPixel', 2 * frame.camera.tan[1] / target.height);
      const bytes = batch.count * INSTANCE_FLOATS * 4;
      if (bytes > this.capacity) {
        this.capacity = bytes * 2;
        gl.bufferData(gl.ARRAY_BUFFER, this.capacity, gl.DYNAMIC_DRAW);
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.data, 0, batch.count * INSTANCE_FLOATS);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, batch.count);
    }
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }
}
