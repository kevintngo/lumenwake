# Sound effects

Every file here is 24 kHz mono 16-bit WAV, cut and levelled by `tools/sfx/build.mjs` from the sources below
(`tools/sfx/manifest.json` says which file comes from which). `src/audio/audio.js` (`SAMPLED`) says which event plays
which file; events with no file, and the chimes tuned to the music, are still synthesized.

## Kenney (CC0 1.0, public domain)

From [kenney.nl](https://kenney.nl), by Kenney Vleugels, released under
[Creative Commons Zero](http://creativecommons.org/publicdomain/zero/1.0/): free for any use, no credit required
(given here anyway).

- **Impact Sounds**: footsteps on grass, stone and snow; the blows that land (`hit-*`, `crit-*`); being hit (`hurt-*`);
  a shot striking (`shot-hit-*`); a shell's guard; landing from a jump.
- **Sci-fi Sounds**: the pulse rifle (`rifle-*`), bursts (`burst*`), ground slams (`slam*`), volley, a watcher's shot
  (`zap`), spores, the gate.
- **RPG Audio**: jumping (cloth), coins, picking up, equipping, honing (a blade drawn), salvage.
- **Interface Sounds**: the click and the refusal.
- **Digital Audio**: the lumen's bolt.

## Made with ElevenLabs

Made with ElevenLabs sound effects v2 through fal (`fal-ai/elevenlabs/sound-effects/v2`) for this game, where no CC0
recording fitted: the blade of light's swings, hum, hits and switching on (`swing-*`, `saber-*`), the rod's casts, the ember bolt, the frost ring, mend, the dash, creatures
felled and striking, the elders' steps, roar and fall, the rumble of one rising, the shuttle passing and landing, the
teleport, the potion, the lumen's burst. The prompts are in `tools/sfx/generated.json` (`tools/sfx/generate.mjs`
makes them again). These are not CC0: they are covered by ElevenLabs' terms for generated audio.
