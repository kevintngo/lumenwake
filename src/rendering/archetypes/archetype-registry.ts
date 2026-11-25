import type { ArchetypeId } from '../../types/domain';
import bristlehogGlsl from '../shaders/archetypes/bristlehog.glsl?raw';
import craglingGlsl from '../shaders/archetypes/cragling.glsl?raw';
import delverGlsl from '../shaders/archetypes/delver.glsl?raw';
import drifterGlsl from '../shaders/archetypes/drifter.glsl?raw';
import dropGlsl from '../shaders/archetypes/drop.glsl?raw';
import gearGlsl from '../shaders/archetypes/gear.glsl?raw';
import houndGlsl from '../shaders/archetypes/hound.glsl?raw';
import humanoidGlsl from '../shaders/archetypes/humanoid.glsl?raw';
import keeperGlsl from '../shaders/archetypes/keeper.glsl?raw';
import lumenGlsl from '../shaders/archetypes/lumen.glsl?raw';
import matronGlsl from '../shaders/archetypes/matron.glsl?raw';
import miteGlsl from '../shaders/archetypes/mite.glsl?raw';
import puffcapGlsl from '../shaders/archetypes/puffcap.glsl?raw';
import sentinelGlsl from '../shaders/archetypes/sentinel.glsl?raw';
import shellsnapGlsl from '../shaders/archetypes/shellsnap.glsl?raw';
import sproutlingGlsl from '../shaders/archetypes/sproutling.glsl?raw';
import striderGlsl from '../shaders/archetypes/strider.glsl?raw';
import wardenGlsl from '../shaders/archetypes/warden.glsl?raw';
import watcherGlsl from '../shaders/archetypes/watcher.glsl?raw';
import wispGlsl from '../shaders/archetypes/wisp.glsl?raw';
import shuttleGlsl from '../shaders/archetypes/shuttle.glsl?raw';

export interface ArchetypeDef {
  readonly id: ArchetypeId;
  readonly boundY: number;
  readonly boundR: number;
  readonly steps: number;
  readonly glsl: string;
}

const DEFS: readonly ArchetypeDef[] = [
  { id: 'humanoid', boundY: 0.8, boundR: 1.08, steps: 60, glsl: humanoidGlsl },
  { id: 'gear', boundY: 0.0, boundR: 0.8, steps: 56, glsl: gearGlsl },
  { id: 'shuttle', boundY: 1.1, boundR: 4.9, steps: 64, glsl: shuttleGlsl },
  { id: 'lumen', boundY: 0.0, boundR: 0.62, steps: 40, glsl: lumenGlsl },
  { id: 'sproutling', boundY: 0.42, boundR: 0.82, steps: 44, glsl: sproutlingGlsl },
  { id: 'puffcap', boundY: 0.48, boundR: 0.85, steps: 44, glsl: puffcapGlsl },
  { id: 'bristlehog', boundY: 0.4, boundR: 0.95, steps: 48, glsl: bristlehogGlsl },
  { id: 'wisp', boundY: 0.85, boundR: 0.75, steps: 40, glsl: wispGlsl },
  { id: 'cragling', boundY: 0.65, boundR: 1.05, steps: 52, glsl: craglingGlsl },
  { id: 'shellsnap', boundY: 0.25, boundR: 0.85, steps: 48, glsl: shellsnapGlsl },
  { id: 'drop', boundY: 0.32, boundR: 0.42, steps: 36, glsl: dropGlsl },
  { id: 'hound', boundY: 0.5, boundR: 1.0, steps: 48, glsl: houndGlsl },
  { id: 'watcher', boundY: 1.25, boundR: 0.85, steps: 44, glsl: watcherGlsl },
  { id: 'delver', boundY: 0.85, boundR: 1.35, steps: 48, glsl: delverGlsl },
  { id: 'strider', boundY: 1.55, boundR: 1.95, steps: 52, glsl: striderGlsl },
  { id: 'mite', boundY: 0.3, boundR: 0.66, steps: 40, glsl: miteGlsl },
  { id: 'warden', boundY: 7.0, boundR: 9.8, steps: 84, glsl: wardenGlsl },
  { id: 'matron', boundY: 6.6, boundR: 9.6, steps: 84, glsl: matronGlsl },
  { id: 'sentinel', boundY: 4.6, boundR: 10.2, steps: 84, glsl: sentinelGlsl },
  { id: 'keeper', boundY: 6.3, boundR: 9.8, steps: 84, glsl: keeperGlsl },
  { id: 'drifter', boundY: 5.0, boundR: 11.2, steps: 84, glsl: drifterGlsl },
];

export const ARCHETYPES: ReadonlyMap<ArchetypeId, ArchetypeDef> = new Map(
  DEFS.map((d) => [d.id, d]),
);
