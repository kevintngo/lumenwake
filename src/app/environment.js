// Hour of the day -> where the light comes from and which pencils the page is
// drawn with. Pure function of time, so weather or seasons can be layered on
// without touching shaders. There are no light colours here: in this style
// light is bare paper and each hour only changes which pencils are used.

import { smoothstep, v3 } from '../core/math.js';

export function createEnv() {
  return {
    hour: 12, night: 0, gold: 0, cloud: 0.36, wind: [0.8, 0.45],
    keyDir: [0.4, 0.8, 0.3], sunDir: [0.4, 0.8, 0.3], moonDir: [-0.4, 0.6, -0.3],
    rockCol: [0.59, 0.56, 0.52],
  };
}

/** hour: 0..24. rockTint: the pencil for bare rock in the biome under the player. */
export function updateEnv(env, hour, rockTint) {
  env.hour = hour;
  // sun rides from east at 5:30 to west at 20:30
  const d = (hour - 5.5) / 15;
  const ang = d * Math.PI;
  const up = d >= 0 && d <= 1;
  env.sunDir = v3.norm([Math.cos(ang) * 0.9, up ? Math.sin(ang) * 1.05 : -0.3, up ? 0.42 * Math.cos(ang * 0.5) + 0.2 : 0.4]);
  const sy = up ? env.sunDir[1] : -0.3;
  const m = ((hour + 24 - 20.5) % 24) / 9;
  env.moonDir = v3.norm([-Math.cos(m * Math.PI) * 0.8, Math.max(0.08, Math.sin(m * Math.PI)) * 0.9 + 0.2, -0.45]);

  env.night = 1 - smoothstep(-0.08, 0.12, sy);
  env.gold = (1 - smoothstep(0.1, 0.5, sy)) * (1 - env.night);
  // never let shadows run to the horizon: clamp the key light's elevation
  const src = env.night > 0.5 ? env.moonDir : env.sunDir;
  env.keyDir = v3.norm([src[0], Math.max(src[1], 0.34), src[2]]);
  env.rockCol = rockTint;
  return env;
}
