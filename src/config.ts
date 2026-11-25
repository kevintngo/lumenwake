export const WORLD = {
  TEX: 256,
  CHUNK: 32,
  CELL: 4,
  SEA: 0,
  PROP_HMAX: 9.5,
  VIEW: 108,
} as const;

export const RENDER = {
  FOV: 34,
  SCALE_MIN: 0.45,
  SCALE_MAX: 1.5,
  SCALE_START: 0.8,
  SCALE_LITE: 0.62,
  ENTITY_DPR_MAX: 2,
  MAX_CASTERS: 24,
  MAX_LIGHTS: 8,
  MAX_BLIPS: 32,
} as const;

export const VIEWS = {
  behind: [0.36, 10.5] as readonly [number, number],
  above: [0.8, 15.5] as readonly [number, number],
} as const;

export const GAME = {
  PLAYER_SPEED: 6.6,
  JUMP_SPEED: 7.6,
  GRAVITY: 21,
  STEEP: 0.7,
} as const;
