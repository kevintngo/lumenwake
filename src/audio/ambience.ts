import type { GameContext } from '../types/game-context';
import { areaOf } from './music-data';
import type { MusicPlayer } from './music-player';
import { rand, randInt, type SynthKit } from './synth-kit';

export interface AmbiencePlayer {
  update(now: number, dt: number): void;
}

export function createAmbience(kit: SynthKit, game: GameContext, music: MusicPlayer): AmbiencePlayer {
  const ctx = kit.ctx;

  function bed(rate: number, highpass: number, lowpass: number): { level: AudioParam; tone: AudioParam } {
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const lp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = kit.noiseBuffer;
    src.loop = true;
    src.playbackRate.value = rate;
    hp.type = 'highpass';
    hp.frequency.value = highpass;
    lp.frequency.value = lowpass;
    gain.gain.value = 0;
    src.connect(hp).connect(lp).connect(gain).connect(kit.buses.amb.node);
    src.start();
    return { level: gain.gain, tone: lp.frequency };
  }

  const wind = bed(0.8, 90, 450);
  let bedIn = 0;
  let birdIn = rand(2, 5);
  let cricketIn = rand(1, 4);

  function birdSong(): void {
    const base = rand(1900, 3000);
    const voice = { bus: 'air' as const, pan: rand(-0.8, 0.8), gain: rand(0.018, 0.032), attack: 0.012 };
    const kind = randInt(0, 2);
    if (kind === 0) {
      for (let i = 0, n = randInt(2, 3); i < n; i++) {
        kit.tone({ ...voice, freq: base, to: base * 1.3, glide: 0.07, at: i * 0.17, decay: 0.12 });
      }
    } else if (kind === 1) {
      for (let i = 0, n = randInt(3, 6); i < n; i++) {
        kit.tone({
          ...voice,
          freq: base * (1.2 - i * 0.035),
          to: base * (1.05 - i * 0.035),
          glide: 0.04,
          at: i * 0.08,
          decay: 0.07,
        });
      }
    } else {
      kit.tone({ ...voice, freq: base * 0.85, hold: 0.14, decay: 0.2 });
      kit.tone({ ...voice, freq: base * 0.67, at: 0.34, hold: 0.2, decay: 0.3 });
    }
  }

  function cricket(): void {
    const voice = {
      bus: 'air' as const,
      pan: rand(-0.9, 0.9),
      gain: rand(0.012, 0.02),
      freq: rand(3300, 3800),
      attack: 0.008,
      decay: 0.045,
    };
    for (let chirp = 0, n = randInt(2, 4); chirp < n; chirp++) {
      for (let pulse = 0; pulse < 3; pulse++) {
        kit.tone({ ...voice, at: chirp * 0.36 + pulse * 0.05 });
      }
    }
  }

  return {
    update(now: number, dt: number): void {
      const area = areaOf(game);
      bedIn -= dt;
      if (bedIn <= 0) {
        bedIn = 0.3;
        const gust = 0.5 + 0.3 * Math.sin(now * 0.13) + 0.2 * Math.sin(now * 0.31 + 1.7);
        wind.level.setTargetAtTime(area.wind * (0.32 + 0.5 * gust), now, 0.9);
        wind.tone.setTargetAtTime(330 + 330 * gust, now, 0.9);
      }
      birdIn -= dt * area.birds * (1 - music.unrest());
      if (birdIn <= 0) {
        birdSong();
        birdIn = rand(5, 14);
      }
      cricketIn -= dt * area.crickets;
      if (cricketIn <= 0) {
        cricket();
        cricketIn = rand(4, 11);
      }
    },
  };
}
