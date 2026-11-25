// Shader assembly. GLSL lives in small named chunks; a program is a short main
// file that pulls chunks in with `#include <name>`. Content modules (props,
// creatures, effects) register their own chunks, which is how new content
// reaches the GPU without anyone editing a monolithic shader.

import { WORLD, RENDER } from '../config.js';

const chunks = new Map();

export function registerChunk(name, source) {
  chunks.set(name, typeof source === 'function' ? source : () => source);
}

const HEADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

function defines(extra = {}) {
  const all = {
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
  return Object.entries(all).map(([k, v]) => `#define ${k} ${v}`).join('\n') + '\n';
}

/** Resolves includes (each chunk at most once) and prepends version + defines. */
export function assemble(source, extraDefines) {
  const seen = new Set();
  const expand = (src) => src.replace(/^[ \t]*#include <([\w./-]+)>[ \t]*$/gm, (_, name) => {
    if (seen.has(name)) return '';
    seen.add(name);
    const chunk = chunks.get(name);
    if (!chunk) throw new Error(`Unknown shader chunk <${name}>`);
    return expand(chunk());
  });
  return HEADER + defines(extraDefines) + expand(source);
}
