import { PROPS } from '../../data/props';
import { registerChunk } from '../shader-lib';
import decorGlsl from '../shaders/props/decor.glsl?raw';
import propHelpersGlsl from '../shaders/props/prop-helpers.glsl?raw';
import rocksGlsl from '../shaders/props/rocks.glsl?raw';
import sitesGlsl from '../shaders/props/sites.glsl?raw';
import structuresGlsl from '../shaders/props/structures.glsl?raw';
import vegetationGlsl from '../shaders/props/vegetation.glsl?raw';

const PROP_STRUCT = `struct Prop { int type; vec3 base; float rot; float scale; float seed; float pal; };`;

function buildPropsChunk(): string {
  const sdfCases = PROPS.map((p) => `    case ${p.type}: return sdf_${p.id}(q, pr, m);`).join('\n');
  const matCases = PROPS.map((p) => `    case ${p.type}: mat_${p.id}(q, m, pr, s); break;`).join('\n');
  const seeCases = PROPS.filter((p) => p.seeThrough)
    .map((p) => `type == ${p.type}`)
    .join(' || ');

  return [
    PROP_STRUCT,
    propHelpersGlsl,
    vegetationGlsl,
    rocksGlsl,
    structuresGlsl,
    sitesGlsl,
    decorGlsl,
    `float propSdf(vec3 q, Prop pr, out float m) {\n  m = 0.0;\n  switch (pr.type) {\n${sdfCases}\n  }\n  return 1e3;\n}`,
    `bool propSeeThrough(int type, float mat) {\n  if (mat < 0.5 || mat > 1.5) return false;\n  return ${seeCases || 'false'};\n}`,
    `void propMat(vec3 q, float m, Prop pr, inout Surf s) {\n  switch (pr.type) {\n${matCases}\n  }\n}`,
  ].join('\n');
}

function registerPropShaders(): void {
  registerChunk('props', buildPropsChunk);
}

registerPropShaders();
