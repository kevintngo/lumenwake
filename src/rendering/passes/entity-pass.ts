import type { ArchetypeId } from '../../types/domain';
import type { EntityBatch, RenderFrame } from '../../types/render';
import { ARCHETYPES, type ArchetypeDef } from '../archetypes/archetype-registry';
import { cameraTan } from '../camera';
import { Program, type Target } from '../gl';
import entityFrag from '../shaders/passes/entity.frag?raw';
import entityVert from '../shaders/passes/entity.vert?raw';

export const INSTANCE_FLOATS = 24;

export type EntityFrame = Pick<RenderFrame, 'camera' | 'timeTwos' | 'far'>;

interface EntityProgramEntry {
  program: Program;
  def: ArchetypeDef;
}

export class EntityPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly programs = new Map<ArchetypeId, EntityProgramEntry>();
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private capacity = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) throw new Error('Unable to create entity vertex buffers.');
    this.vao = vao;
    this.vbo = vbo;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    for (let i = 0; i < 6; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, INSTANCE_FLOATS * 4, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
  }

  program(id: ArchetypeId): EntityProgramEntry {
    let entry = this.programs.get(id);
    if (!entry) {
      const def = ARCHETYPES.get(id);
      if (!def) throw new Error(`Unknown archetype "${id}"`);
      const program = new Program(
        this.gl,
        `entity:${id}`,
        entityVert,
        entityFrag,
        { OUTLINE_PX: '1.6', ENT_STEPS: def.steps },
        { archetype: def.glsl },
      );
      entry = { program, def };
      this.programs.set(id, entry);
    }
    return entry;
  }

  render(
    target: Target,
    frame: EntityFrame,
    batches: Map<ArchetypeId, EntityBatch>,
    applyFrame: (p: Program) => void,
  ): void {
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
    const tan = cameraTan(frame.camera);
    for (const [id, batch] of batches) {
      if (!batch.count) continue;
      const { program: p, def } = this.program(id);
      p.use();
      applyFrame(p);
      p.set('uTime', frame.timeTwos);
      p.set('uViewProj', frame.camera.viewProj).set('uBound', [def.boundY, def.boundR]);
      p.set('uFar', frame.far).set('uPixel', (2 * tan[1]) / target.height);
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
