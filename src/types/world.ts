import type { BiomeId, CreatureId, PropDef, PropId, RgbTuple, SiteId } from './domain';

export type RoomKind = 'start' | 'fight' | 'side' | 'cache' | 'stone' | 'boss' | 'exit' | 'hub' | 'town';

interface TerraceSpec {
  x: number;
  z: number;
  r: number;
  h: number;
}

export interface RoomSpec {
  i: number;
  x: number;
  z: number;
  r: number;
  h: number;
  kind: RoomKind;
  main: boolean;
  rag: number;
  clear?: number;
  w: [number, number, number];
  waves: string[][];
  pods: number;
  sites: SiteId[];
  terrace?: TerraceSpec;
  box?: boolean;
}

export interface LinkSpec {
  a: number;
  b: number;
  w: number;
  gate?: boolean;
  gap?: number;
}

interface PavingDisc {
  readonly x: number;
  readonly z: number;
  readonly r: number;
}

interface PavingStreet {
  readonly ax: number;
  readonly az: number;
  readonly bx: number;
  readonly bz: number;
  readonly w: number;
}

export type PavingItem = PavingDisc | PavingStreet;

export interface FixtureSpec {
  readonly id: PropId;
  readonly x: number;
  readonly z: number;
  readonly rot?: number;
  readonly pal?: number;
  readonly scale?: number;
  readonly seed?: number;
  readonly role?: string;
}

export interface ZoneSpec {
  id: string;
  biome: BiomeId;
  seed: number;
  hub?: boolean;
  laid?: boolean;
  rooms: RoomSpec[];
  links: LinkSpec[];
  start: { x: number; z: number; yaw: number };
  paving?: readonly PavingItem[];
  fixtures?: readonly FixtureSpec[];
}

export interface NavLink {
  a: number;
  b: number;
  ax: number;
  az: number;
  ux: number;
  uz: number;
  len: number;
  w: number;
  t0: number;
  t1: number;
  ha: number;
  hb: number;
  ang: number;
  tmin: number;
  tmax: number;
  gate: boolean;
  gap: number;
  part: number;
}

export interface Gate {
  link: number;
  x: number;
  z: number;
  ux: number;
  uz: number;
  w: number;
  shut: boolean;
  st: StructureInstance | null;
}

export interface StructureInstance {
  id: PropId;
  x: number;
  z: number;
  rot: number;
  scale: number;
  seed: number;
  pal: number;
  role?: string;
  room: number;
  site?: SiteId;
  terrace?: boolean;
  core?: boolean;
  fxT?: number;
  fxN?: number;
  def?: PropDef;
  type?: number;
  y?: number;
  linkIndex?: number;
}

export interface ChunkProp {
  def: PropDef;
  x: number;
  y: number;
  z: number;
  rot: number;
  scale: number;
  seed: number;
  pal: number;
}

export interface ChunkData {
  cx: number;
  cz: number;
  height: Float32Array;
  color: Uint8Array;
  mat: Uint8Array;
  propsA: Float32Array;
  propsB: Uint8Array;
  maxH: number;
  props: ChunkProp[];
}

export type LandmarkId = 'circle' | 'grove' | 'crystals' | 'ruins' | 'bigcaps' | 'pines' | 'shards' | 'spires' | 'corals' | 'lanterns';

export interface BiomeDef {
  readonly id: BiomeId;
  readonly name: string;
  readonly mission?: boolean;
  readonly ground: RgbTuple;
  readonly ground2: RgbTuple;
  readonly rock: RgbTuple;
  readonly snow: number;
  readonly grass: number;
  readonly sand: number;
  readonly flowers: number;
  readonly leaf: readonly number[];
  readonly roll: number;
  readonly hour: number;
  readonly cloud: number;
  readonly realm?: number;
  readonly walls?: number;
  readonly gravity?: number;
  readonly hop?: number;
  readonly props: readonly (readonly [PropId, number, number, number?])[];
  /** small plants and stones that gather in meadows across an island: [prop, density, palette] */
  readonly decor?: readonly (readonly [PropId, number, number])[];
  /** the set pieces an island can have, one each, off to one side */
  readonly landmarks?: readonly LandmarkId[];
  /** a third ground color, laid in broad patches */
  readonly ground3?: RgbTuple;
  readonly monsters: readonly (readonly [CreatureId, number])[];
  readonly variant?: { readonly prefix: string; readonly pencil: RgbTuple };
  readonly boss?: CreatureId;
  readonly particles: string;
}

export interface WorldRaycastHit {
  x: number;
  z: number;
}

export interface NavLike {
  readonly rooms: RoomSpec[];
  readonly links: NavLink[];
  readonly gates: Gate[];
  roomAt(x: number, z: number, margin?: number): number;
  linkAt(x: number, z: number, margin?: number): NavLink | null;
  inside(x: number, z: number, margin?: number): boolean;
  shut(x0: number, z0: number, x1: number, z1: number): boolean;
}

export interface WorldLike {
  readonly spec: ZoneSpec;
  readonly nav: NavLike;
  readonly rooms: RoomSpec[];
  readonly gates: Gate[];
  readonly structures: StructureInstance[];
  readonly wall: number;
  chunk(cx: number, cz: number): ChunkData;
  setState(st: StructureInstance, pal: number): [number, number][];
  height(x: number, z: number): number;
  surface(x: number, z: number): number;
  biome(x?: number, z?: number): BiomeDef;
  roomAt(x: number, z: number, margin?: number): number;
  walkable(x: number, z: number): boolean;
  forEachProp(x: number, z: number, radius: number, fn: (pr: ChunkProp) => void): void;
  moveCircle(
    x: number,
    z: number,
    dx: number,
    dz: number,
    radius: number,
    out?: { x: number; z: number },
    feet?: number | null,
  ): { x: number; z: number };
  raycast(ro: readonly number[], rd: readonly number[], maxDist?: number): WorldRaycastHit | null;
}
