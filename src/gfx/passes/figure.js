// Figures alone, on nothing. The entity pass already draws a figure finished
// (paper, pencil, pen) on a layer of its own; this draws that layer for a few
// figures, seen by a camera of their own, into a small picture, and hands back
// its pixels: the hero turning in the menu, a lumen, the drawing of a piece of
// gear on its tile. Where there is no figure the picture is clear.

import { Program, Target, createTexture, drawFullscreen } from '../gl.js';
import { FULLSCREEN_VS } from '../glsl/common.js';
import '../glsl/lighting.js';
import '../glsl/pencil.js';

const OUT_FS = /* glsl */ `
in vec2 vUv;
out vec4 oColor;
uniform sampler2D uEnt;
#include <common>
#include <frame>
#include <pencil>
void main() {
  vec4 e = texture(uEnt, vec2(vUv.x, 1.0 - vUv.y));       // the page reads a picture from its top row down
  vec3 col = e.a > 0.002 ? e.rgb / e.a : vec3(0.0);
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.0 + 0.26 * CEL);      // (as the final pass does)
  oColor = vec4(saturate(col), saturate(e.a));
}
`;

export class FigurePass {
  constructor(gl) {
    this.gl = gl;
    this.layer = new Target(gl, [{}, { filter: 'nearest' }], true);
    this.fbo = null; this.tex = null; this.width = 0; this.height = 0;
    this.program = null;
    this.bytes = null;
  }

  size(width, height) {
    const gl = this.gl;
    this.layer.resize(width, height);
    if (width === this.width && height === this.height) return;
    if (this.tex) { gl.deleteTexture(this.tex); gl.deleteFramebuffer(this.fbo); }
    this.width = width; this.height = height;
    this.tex = createTexture(gl, { width, height, internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE });
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.bytes = new Uint8Array(width * height * 4);
  }

  /** Draws `batches` and returns the picture's bytes: RGBA, straight alpha, top row first. `vao`: the attribute-less one full-screen passes use. */
  render(entityPass, frame, batches, applyFrame, vao) {
    const gl = this.gl;
    entityPass.render(this.layer, frame, batches, applyFrame);
    if (!this.program) this.program = new Program(gl, 'figure', FULLSCREEN_VS, OUT_FS);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.bindVertexArray(vao);
    this.program.use().tex('uEnt', this.layer.textures[0]);
    drawFullscreen(gl);
    gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.bytes);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return this.bytes;
  }
}
