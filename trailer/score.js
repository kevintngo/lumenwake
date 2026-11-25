// The trailer's own score: 42.5 seconds, 17 bars of four at 96 beats a minute (a bar is 2.5 s, 150 frames), written
// to the picture's cuts. It is played on the game's own instruments (the felt piano, the bowed strings, the choir,
// the horn, the glass and the celesta of audio/audio.js), so it sounds like the game, but it is one piece with a
// shape of its own instead of the game's music answering whatever is on screen:
//
//   bar 1       D             the shuttle flies in and lands: strings, glass, a flute; a timpani as it touches down
//   bars 2-3    A D           walking into the square and about the town: the piano finds the tune
//   bars 4-5    Bm G-A        the first fights: low strings start to drive, a soft drum, the violins
//   bars 6-8    Bm G F#       the Spore Matron wakes: drone, choir, timpani; the whole band on its roar
//   bars 9-12   D A/C# Bm G-A everywhere else: the tune in full
//   bars 13-14  Em A          the menus and the peoples: the piano alone, a music box
//   bars 15-17  G A D         the end: everything, and the last chord left to ring
//
// createScore(ctx) builds a kit of the game's on an (offline) audio context; tick(now) schedules what falls in the
// next half second. The game's audio file is imported as text with its private parts exported, unchanged.

const BPM = 96, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const SCORE_LENGTH = 17 * BAR;

async function gameAudio() {
  const text = await (await fetch('/src/audio/audio.js')).text();
  const url = URL.createObjectURL(new Blob([text + '\nexport { createKit, VOICES, mtof };\n'], { type: 'text/javascript' }));
  return import(url);
}

// chords: the bass (MIDI), the three notes of the middle, and the shape the piano breaks them into
const C = {
  D: { bass: 38, mid: [50, 54, 57] }, Bm: { bass: 35, mid: [47, 50, 54] }, G: { bass: 43, mid: [47, 50, 55] },
  A: { bass: 45, mid: [49, 52, 57] }, Asus: { bass: 45, mid: [50, 52, 57] }, 'A/C#': { bass: 37, mid: [49, 52, 57] },
  Em: { bass: 40, mid: [47, 52, 55] }, 'F#': { bass: 42, mid: [46, 49, 54] },
};
// bar by bar: [chord, beats], and how full the band is (0..1)
const PROG = [
  [['D', 4]],
  [['A', 4]], [['D', 4]],
  [['Bm', 4]], [['G', 2], ['A', 2]],
  [['Bm', 4]], [['G', 4]], [['F#', 4]],
  [['D', 4]], [['A/C#', 4]], [['Bm', 4]], [['G', 2], ['A', 2]],
  [['Em', 4]], [['A', 4]],
  [['G', 4]], [['A', 4]], [['D', 4]],
];
const section = (bar) => (bar < 1 ? 'intro' : bar < 3 ? 'town' : bar < 5 ? 'fight' : bar < 8 ? 'elder' : bar < 12 ? 'theme' : bar < 14 ? 'quiet' : 'end');

// the tune: [bar (from 0), beat, MIDI, beats long, how strongly]
const FLUTE = [[0, 0, 78, 2, 0.8], [0, 2, 81, 2, 0.8]];
const PIANO_TUNE = [
  [1, 0, 73, 1, 1], [1, 1, 76, 1, 1], [1, 2, 81, 2, 1.1],
  [2, 0, 78, 1, 1.05], [2, 1, 76, 1, 1], [2, 2, 74, 2, 1.05],
  [12, 0, 71, 1, 0.9], [12, 1, 67, 1, 0.85], [12, 2, 76, 2, 0.95],
  [13, 0, 73, 1, 0.9], [13, 1, 76, 1, 0.9], [13, 2, 69, 2, 0.9],
];
const VIOLIN = [
  [3, 0, 71, 1.5, 0.9], [3, 1.5, 74, 0.5, 0.85], [3, 2, 78, 2, 1],
  [4, 0, 79, 1, 1], [4, 1, 78, 1, 0.95], [4, 2, 76, 1, 0.95], [4, 3, 73, 1, 1],
  [8, 0, 78, 1.5, 1.05], [8, 1.5, 76, 0.5, 0.95], [8, 2, 74, 1, 1], [8, 3, 81, 1, 1.05],
  [9, 0, 79, 1, 1], [9, 1, 78, 1, 1], [9, 2, 76, 2, 1.05],
  [10, 0, 74, 1.5, 1], [10, 1.5, 73, 0.5, 0.95], [10, 2, 71, 1, 1], [10, 3, 78, 1, 1.05],
  [11, 0, 79, 1, 1.05], [11, 1, 81, 1, 1.05], [11, 2, 83, 1, 1.1], [11, 3, 85, 1, 1.15],
  [14, 0, 83, 2, 1.1], [14, 2, 81, 1, 1.05], [14, 3, 79, 1, 1.05],
  [15, 0, 81, 2, 1.1], [15, 2, 85, 1, 1.1], [15, 3, 88, 1, 1.1],
  [16, 0, 86, 6, 1.15],
];
// the horn: long notes under the fights, the theme and the end
const HORN = [[3, 0, 59, 4, 0.8], [4, 0, 55, 2, 0.8], [4, 2, 57, 2, 0.85], [6, 0, 43, 4, 0.9], [7, 0, 54, 4, 1.1],
  [8, 0, 57, 4, 0.9], [9, 0, 57, 4, 0.9], [10, 0, 54, 4, 0.9], [11, 0, 55, 2, 0.9], [11, 2, 57, 2, 0.95],
  [14, 0, 59, 4, 1], [15, 0, 61, 4, 1], [16, 0, 62, 6, 1.05], [16, 0, 57, 6, 0.95]];

export async function createScore(ctx) {
  const { createKit, VOICES, mtof } = await gameAudio();
  const kit = createKit(ctx, { player: null, settings: {} });
  kit.master.gain.value = 1;
  kit.buses.music.node.gain.value = 1;
  kit.buses.music.pool.max = kit.buses.chime.pool.max = 400;
  const notes = [];          // { t, play() }, in time order once sorted
  const at = (bar, beat) => bar * BAR + beat * BEAT;
  const add = (t, play) => notes.push({ t, play });
  const voice = (name, t, midi, beats, gain, bus = 'music') => add(t, () => VOICES[name].play(kit, { midi, when: t, len: beats * BEAT, gain, bus }));
  // a held chord of bowed strings: two players a note, slow to come and slow to go
  const bed = (t, midis, beats, gain, top = 1500, attack = 0.9) => {
    for (const m of midis) for (const detune of [-6, 6]) add(t, () => kit.tone({ bus: 'music', type: 'sawtooth', freq: mtof(m), detune, when: t, gain, attack, hold: Math.max(0.2, beats * BEAT - attack), decay: 1.6, cutoff: Math.min(top, mtof(m) * 3) }));
  };
  const choir = (t, midis, beats, gain) => { for (const m of midis) voice('choir', t, m, beats, gain); };
  // a soft low drum: a sine that drops, and a breath of noise on its skin
  const drum = (t, gain) => add(t, () => {
    kit.tone({ bus: 'music', freq: 96, to: 46, glide: 0.16, when: t, attack: 0.003, decay: 0.42, gain: 0.3 * gain });
    kit.noise({ bus: 'music', filter: 'lowpass', freq: 700, to: 180, when: t, attack: 0.002, decay: 0.1, gain: 0.035 * gain });
  });
  const timpani = (t, midi, gain, decay = 1.8) => add(t, () => {
    kit.tone({ bus: 'music', freq: mtof(midi) * 1.02, to: mtof(midi), glide: 0.05, when: t, attack: 0.004, decay, gain: 0.32 * gain });
    kit.tone({ bus: 'music', freq: mtof(midi) * 1.5, when: t, attack: 0.004, decay: decay * 0.3, gain: 0.06 * gain });
    kit.noise({ bus: 'music', filter: 'lowpass', freq: 500, when: t, attack: 0.002, decay: 0.08, gain: 0.03 * gain });
  });
  const roll = (t, midi, beats, gain) => { const n = Math.round(beats * 6); for (let k = 0; k < n; k++) timpani(t + k * BEAT / 6, midi, gain * (0.35 + 0.65 * k / n) * (0.85 + 0.3 * ((k * 7) % 3) / 3), 0.5); };

  // ---- bar by bar: the bed, the bass, the piano's broken chords, the low strings, the drum
  PROG.forEach((chords, bar) => {
    const s = section(bar);
    let beat = 0;
    for (const [name, beats] of chords) {
      const c = C[name], t = at(bar, beat), up = c.mid.map((m) => m + 12);
      // the bed: high and thin to begin with, full under the theme and the end, almost nothing in the quiet
      const bedGain = { intro: 0.016, town: 0.014, fight: 0.017, elder: 0.02, theme: 0.02, quiet: 0.008, end: 0.024 }[s];
      bed(t, s === 'intro' ? up.map((m) => m + 12) : s === 'end' || s === 'theme' ? [...c.mid, ...up] : up, beats, bedGain, s === 'intro' ? 2600 : 1600, s === 'intro' && bar === 0 ? 0.5 : 0.9);
      // the bass: cellos (and the piano's left hand where it plays)
      if (s !== 'intro') voice('cello', t, c.bass + 12, beats, s === 'quiet' ? 0.5 : 0.85);
      if (s === 'end' || s === 'elder') voice('lowstring', t, c.bass, beats, 1.0);
      // the piano: broken chords in eighths (quarters in the quiet), from the town on
      if (s === 'town' || s === 'fight' || s === 'theme' || s === 'quiet' || s === 'end') {
        const shape = [c.bass + 12, c.mid[1], c.mid[2], c.mid[0] + 12, c.mid[2] + 12 > 81 ? c.mid[1] + 12 : c.mid[2] + 12, c.mid[0] + 12, c.mid[2], c.mid[1]];
        const step = s === 'quiet' ? 1 : 0.5;
        for (let b = 0; b < beats; b += step) {
          const k = Math.round(b / 0.5);
          voice('piano', at(bar, beat + b), shape[k % 8], 1, (k % 4 === 0 ? 0.62 : 0.46) * (s === 'quiet' ? 0.8 : s === 'end' ? 0.95 : 0.85));
        }
      }
      // low strings that drive: eighths on the bass in the fights and the theme
      if (s === 'fight' || s === 'theme') for (let b = 0; b < beats; b += 0.5) voice('lowstring', at(bar, beat + b), c.bass + (b % 2 === 1 ? 12 : 0), 0.5, (b % 1 === 0 ? 1.05 : 0.8) * (s === 'theme' ? 1.1 : 0.95));
      if ((s === 'fight' || s === 'theme') && beat === 0) {
        drum(at(bar, 0), 1); drum(at(bar, 2), 0.85);
        if (s === 'theme') { drum(at(bar, 2.5), 0.45); drum(at(bar, 3.5), 0.55); }
      }
      // glass in the air over the opening, and again at the end
      if (s === 'intro' || s === 'end') {
        const hi = [...up.map((m) => m + 12), up[0] + 24];
        [[0, 0], [1.5, 1], [2.5, 2], [3.25, 3]].filter(([b]) => b < beats).forEach(([b, k]) => voice('glass', at(bar, beat + b), hi[k % hi.length], 1.5, 0.75));
      }
      if (s === 'quiet') [[0.5, c.mid[2] + 24], [2.5, c.mid[1] + 24]].forEach(([b, m]) => voice('musicbox', at(bar, beat + b), m, 1, 0.8));
      beat += beats;
    }
  });

  // ---- the tunes
  for (const [bar, beat, m, len, g] of FLUTE) voice('flute', at(bar, beat), m, len, g);
  for (const [bar, beat, m, len, g] of PIANO_TUNE) voice('piano', at(bar, beat), m, len, 1.25 * g);
  for (const [bar, beat, m, len, g] of VIOLIN) { voice('violin', at(bar, beat), m, len, 1.1 * g); if (bar >= 8) voice('strings', at(bar, beat), m - 12, len, 0.9 * g); }
  for (const [bar, beat, m, len, g] of HORN) voice('horn', at(bar, beat), m, len, g);
  // the flute doubles the theme an octave up where it climbs, and the end
  for (const [bar, beat, m, len, g] of VIOLIN) if (bar === 11 || bar >= 14) voice('flute', at(bar, beat), m + 12 > 96 ? m : m + 12, len, 0.45 * g);

  // ---- the very first moment: the piano's low D under the first chord, so the film does not open on silence
  voice('piano', 0.02, 38, 4, 0.7); voice('piano', 0.04, 45, 4, 0.55); voice('glass', 0.05, 74, 2, 0.8);

  // ---- the shuttle touches down (bar 1, 1.75 s): a soft timpani and the piano's low D
  timpani(1.75, 38, 0.65); voice('piano', 1.75, 26, 4, 0.8);

  // ---- the Spore Matron (bars 6-8): it rises at 12.85 s, the ground goes at 13.55, 14.25, 14.95, it stands at
  // 16.25 and gives voice on the downbeat of bar 8 (17.5 s)
  choir(at(5, 0), [59, 62, 66], 8, 0.9);
  voice('metal', at(5, 0), 83, 8, 0.8);
  for (const t of [13.55, 14.25, 14.95]) timpani(t, 35, 0.75);
  roll(at(6, 2.5), 35, 1.5, 0.9);
  timpani(16.25, 30, 1);
  // the roar: the whole band on an F# major chord, and a run of celesta up into the theme
  const ROAR = at(7, 0);
  timpani(ROAR, 30, 1.25, 2.6); voice('piano', ROAR, 30, 4, 1); voice('piano', ROAR, 42, 4, 0.9);
  choir(ROAR, [54, 58, 61, 66], 4, 1.1);
  bed(ROAR, [54, 58, 61, 66, 70, 73], 4, 0.03, 2000, 0.25);
  voice('lowstring', ROAR, 30, 4, 1.3);
  [66, 68, 70, 71, 73, 75, 77, 78, 80, 82, 83, 85].forEach((m, k) => voice('celesta', at(7, 3) + k * BEAT / 12, m, 0.5, 0.6 + 0.03 * k));
  timpani(at(8, 0), 38, 1.0);

  // ---- the end: a celesta run into the last chord, and the chord rolled wide and left to ring
  [62, 64, 66, 67, 69, 71, 73, 74, 76, 78, 79, 81, 83, 85].forEach((m, k) => voice('celesta', at(15, 3) + k * BEAT / 14, m, 0.5, 0.55 + 0.03 * k));
  roll(at(15, 2), 38, 2, 0.8);
  const END = at(16, 0);
  timpani(END, 38, 0.8, 3.2);
  [26, 38, 45, 50, 54, 57, 62, 66, 69, 74].forEach((m, k) => voice('piano', END + k * 0.02, m, 8, m < 50 ? 0.75 : 0.62));
  choir(END, [62, 66, 69, 74], 7, 0.8);
  bed(END, [50, 57, 62, 66, 69, 74, 78], 7, 0.019, 1800, 0.6);
  voice('lowstring', END, 26, 7, 0.8);

  notes.sort((a, b) => a.t - b.t);
  let next = 0;
  return {
    /** Schedules every note that starts in the next half second of the context's clock. */
    tick(now) {
      while (next < notes.length && notes[next].t < now + 0.5) { const n = notes[next++]; if (n.t >= now - 0.01) n.play(); }
    },
  };
}
