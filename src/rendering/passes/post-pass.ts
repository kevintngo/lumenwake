import type { RenderFrame } from '../../types/render';
import { bindScreen, drawFullscreen, Program, type Target } from '../gl';
import finalFrag from '../shaders/passes/final.frag?raw';
import fullscreenVert from '../shaders/passes/fullscreen.vert?raw';
import inkFrag from '../shaders/passes/ink.frag?raw';
import type { Minimap } from './minimap-pass';

export interface RenderTargets {
  scene: Target;
  edge: Target;
  ent: Target;
}

export class PostChain {
  private readonly gl: WebGL2RenderingContext;
  private readonly ink: Program;
  private readonly final: Program;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.ink = new Program(gl, 'ink', fullscreenVert, inkFrag);
    this.final = new Program(gl, 'final', fullscreenVert, finalFrag);
  }

  runInk(targets: RenderTargets, applyFrame: (p: Program) => void): void {
    const gl = this.gl;
    const p = this.ink.use();
    targets.edge.bind();
    applyFrame(p);
    p.tex('uGbuf', targets.scene.textures[1]);
    p.set('uTexel', [1 / targets.scene.width, 1 / targets.scene.height]);
    drawFullscreen(gl);
  }

  runFinal(
    targets: RenderTargets,
    frame: RenderFrame,
    width: number,
    height: number,
    minimap: Minimap,
    applyFrame: (p: Program) => void,
  ): void {
    const gl = this.gl;
    const p = this.final.use();
    bindScreen(gl, width, height);
    applyFrame(p);
    p.tex('uLay', targets.scene.textures[0])
      .tex('uGbuf', targets.scene.textures[1])
      .tex('uMark', targets.scene.textures[2])
      .tex('uSheet', targets.scene.textures[3])
      .tex('uEdge', targets.edge.textures[0])
      .tex('uEnt', targets.ent.textures[0])
      .tex('uEntAux', targets.ent.textures[1]);
    p.set('uRes', [width, height])
      .set('uInner', [targets.scene.width, targets.scene.height])
      .set('uHurt', frame.look.hurt)
      .set('uFade', frame.look.fade * (1 - (frame.look.veil || 0)));
    minimap.bind(p, frame, width, height);
    drawFullscreen(gl);
  }
}
