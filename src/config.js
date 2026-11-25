// Tunables shared by every layer. Shaders receive the WORLD block as #defines
// (see gfx/shaderlib.js), so a number changed here changes on both sides.

export const WORLD = {
  TEX: 256,          // world-data texture size in texels (1 texel = 1 world unit)
  CHUNK: 32,         // chunk edge in texels; TEX must be a multiple of it
  CELL: 4,           // prop cell edge; one prop per cell
  SEA: 0,            // sea level
  PROP_HMAX: 9.5,    // tallest prop above its base
  VIEW: 108,         // how far rays travel before they dissolve into haze
  ROAD_L: 256,       // spacing of the road lattice; sites sit on its crossings
};

export const RENDER = {
  FOV: 34,                 // vertical field of view, degrees
  SCALE_MIN: 0.45,         // internal resolution as a fraction of CSS pixels
  SCALE_MAX: 1.5,         // above 1 = supersampling toward device pixels when the GPU has room
  SCALE_START: 0.8, SCALE_LITE: 0.62,
  ENTITY_DPR_MAX: 2,       // figures are drawn at device resolution, up to this pixel ratio
  MAX_CASTERS: 24,         // analytic entity shadows
  MAX_LIGHTS: 8,           // point lights (lamps, spells)
  MAX_BLIPS: 32,           // minimap dots
};

// The two ready-made views: [pitch above the horizon in radians, distance]. A journey
// starts in the first: low behind the hero, looking to the horizon.
export const VIEWS = { behind: [0.36, 10.5], above: [0.8, 15.5] };

export const GAME = {
  SEED: 20261123,
  DAY_SECONDS: 720,        // one full day/night cycle
  START_HOUR: 9.5,
  SAVE_KEY: 'lumenwake.save.v1',
  MAX_MONSTERS: 26,
  PLAYER_SPEED: 5.4,
};
