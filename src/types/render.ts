import type { ArchetypeId, QualitySetting, RenderQuality, RgbTuple } from './domain';
import type { WorldLike } from './world';

export interface RenderEnv {
  night: number;
  gold: number;
  cloud: number;
  wind: [number, number];
  keyDir: [number, number, number];
  sunDir: [number, number, number];
  moonDir: [number, number, number];
  rockCol: RgbTuple;
  pave?: number;
  realm?: number;
  wall?: number;
  /** the far islands behind a place: x picks their layout, y how many show (0 for none) */
  sky?: [number, number];
  /** the color of the far islands' tops */
  skyTop?: RgbTuple;
}

export interface LookState {
  hurt: number;
  fade: number;
  fadeGoal: number;
  veil: number;
}

export interface CameraRail {
  pos: [number, number, number];
  look: [number, number, number];
  lens: number;
  mix: number;
}

export interface CameraGoal {
  yaw: number;
  pitch: number;
  distance: number;
}

export interface CameraStage {
  lift: number;
  pull: number;
  wide: number;
}

export interface CameraRay {
  origin: [number, number, number];
  dir: [number, number, number];
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

export interface EntityBatch {
  data: Float32Array;
  count: number;
}

export interface FxRenderSource {
  readonly data: Float32Array;
  readonly count: number;
}

export interface RenderFrame {
  camera: CameraLike;
  env: RenderEnv;
  focus: [number, number, number];
  time: number;
  timeTwos: number;
  far: number;
  dpr: number;
  look: LookState;
  casters: Float32Array;
  casterCount: number;
  lightPos: Float32Array;
  lightCol: Float32Array;
  lightCount: number;
  batches: Map<ArchetypeId, EntityBatch>;
  fx: FxRenderSource;
  reveal: [number, number, number, number];
}

export interface FigureRequest {
  width: number;
  height: number;
  dpr: number;
  camera: CameraLike;
  env: RenderEnv;
  time: number;
  batches: Map<ArchetypeId, EntityBatch>;
}

export interface CameraLike {
  yaw: number;
  pitch: number;
  distance: number;
  fov: number;
  goal: CameraGoal;
  stage: CameraStage;
  lift: number;
  pull: number;
  wide: number;
  pos: [number, number, number];
  target: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
  forward: [number, number, number];
  readonly tan: [number, number];
  view: Float32Array;
  proj: Float32Array;
  viewProj: Float32Array;
  shake: number;
  shakeScale: number;
  still: boolean;
  rail: CameraRail | null;
  rotate(dYaw: number, dPitch: number): void;
  zoom(factor: number): void;
  update(
    dt: number,
    target: [number, number, number],
    aspect: number,
    groundAt: ((x: number, z: number) => number) | null,
  ): void;
  ray(nx: number, ny: number): CameraRay;
  project(x: number, y: number, z: number): ProjectedPoint | null;
}

export interface MinimapLike {
  rect: [number, number, number, number];
  player: [number, number, number];
  clear(): void;
  add(x: number, z: number, kind: number, size?: number): void;
}

export interface WorldTexturesLike {
  update(x: number, z: number, budget?: number): number;
  setWorld(world: WorldLike): void;
  refresh(cx: number, cz: number): void;
}

export interface RendererSize {
  cssW: number;
  cssH: number;
  dpr: number;
}

export interface RendererPaper {
  a: unknown;
  b: unknown;
  mix: number;
}

export interface RendererLike {
  size: RendererSize;
  scale: number;
  quality: RenderQuality;
  paper: RendererPaper;
  worldTex: WorldTexturesLike;
  minimap: MinimapLike;
  autoAdapt: boolean;
  resize(cssW: number, cssH: number, dpr: number): void;
  setWorld(world: WorldLike): void;
  adapt(dtMs: number): void;
  warm(): boolean;
  figure(spec: FigureRequest): Uint8Array;
  render(frame: RenderFrame): void;
  withWorld<T>(world: WorldLike, fn: (tex: WorldTexturesLike) => T): T;
}

export interface UiSettings {
  quality: QualitySetting;
  shake: number;
  numbers: boolean;
  master: number;
  music: number;
  sfx: number;
  ambience: number;
  mute: boolean;
  calm: boolean;
  text: number;
  skip: boolean;
  contrast: boolean;
}

export type SettingsKey = keyof UiSettings;

export interface SettingsStore {
  readonly values: UiSettings;
  set<K extends SettingsKey>(key: K, value: UiSettings[K]): void;
  reset(): void;
}
