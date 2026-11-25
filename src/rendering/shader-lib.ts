import { RENDER, WORLD } from '../config';
import commonGlsl from './shaders/chunks/common.glsl?raw';
import eyesGlsl from './shaders/chunks/eyes.glsl?raw';
import frameGlsl from './shaders/chunks/frame.glsl?raw';
import groundGlsl from './shaders/chunks/ground.glsl?raw';
import heldGlsl from './shaders/chunks/held.glsl?raw';
import lightingGlsl from './shaders/chunks/lighting.glsl?raw';
import minimapGlsl from './shaders/chunks/minimap.glsl?raw';
import pencilGlsl from './shaders/chunks/pencil.glsl?raw';
import shuttleGlsl from './shaders/chunks/shuttle.glsl?raw';
import skyGlsl from './shaders/chunks/sky.glsl?raw';
import slabGlsl from './shaders/chunks/slab.glsl?raw';
import terrainGlsl from './shaders/chunks/terrain.glsl?raw';

export type ShaderDefines = Record<string, string | number>;

const chunks = new Map<string, () => string>([
  ['common', () => commonGlsl],
  ['pencil', () => pencilGlsl],
  ['frame', () => frameGlsl],
  ['sky', () => skyGlsl],
  ['lighting', () => lightingGlsl],
  ['terrain', () => terrainGlsl],
  ['ground', () => groundGlsl],
  ['minimap', () => minimapGlsl],
  ['held', () => heldGlsl],
  ['shuttle', () => shuttleGlsl],
  ['eyes', () => eyesGlsl],
  ['slab', () => slabGlsl],
]);

export function registerChunk(name: string, source: string | (() => string)): void {
  chunks.set(name, typeof source === 'function' ? source : () => source);
}

const HEADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

function buildDefines(extra?: ShaderDefines): string {
  const all: ShaderDefines = {
    WORLD_TEX: WORLD.TEX.toFixed(1),
    CELL: WORLD.CELL.toFixed(1),
    CELLS: (WORLD.TEX / WORLD.CELL) | 0,
    SEA: WORLD.SEA.toFixed(2),
    PROP_HMAX: WORLD.PROP_HMAX.toFixed(2),
    VIEW_DIST: WORLD.VIEW.toFixed(1),
    MAX_CASTERS: RENDER.MAX_CASTERS,
    MAX_LIGHTS: RENDER.MAX_LIGHTS,
    MAX_BLIPS: RENDER.MAX_BLIPS,
    ...extra,
  };
  return (
    Object.entries(all)
      .map(([k, v]) => `#define ${k} ${v}`)
      .join('\n') + '\n'
  );
}

export function assemble(
  source: string,
  extraDefines?: ShaderDefines,
  localChunks?: Record<string, string>,
): string {
  const seen = new Set<string>();
  const expand = (src: string): string =>
    src.replace(/^[ \t]*#include <([\w./-]+)>[ \t]*$/gm, (_match, name: string) => {
      if (seen.has(name)) return '';
      seen.add(name);
      if (localChunks && Object.prototype.hasOwnProperty.call(localChunks, name)) {
        return expand(localChunks[name]);
      }
      const chunk = chunks.get(name);
      if (!chunk) throw new Error(`Unknown shader chunk <${name}>`);
      return expand(chunk());
    });
  return HEADER + buildDefines(extraDefines) + expand(source);
}
