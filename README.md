# Lumenwake

A cel-shaded sky-island action RPG rendered in raw WebGL2 shaders. Arrive by shuttle at Meridian Landing, choose your people and class, take contracts from the dispatcher, and fight across procedurally generated islands, underground vaults, and low-gravity moon shards against packs and towering colossi.

**Play online:** [https://kevintngo.github.io/lumenwake/](https://kevintngo.github.io/lumenwake/)

## Features

- **Three classes & five peoples:** Vanguard (arc blade), Ranger (pulse rifle), and Adept (focus rod), playable as Scout Unit, Human, Veiled, Karn, or Lynd.
- **Nine contract biomes & escalating threat:** Glasswood Terraces, Ember Shelf, The Hush, Rime Steps, The Underhalls, The Shatter, Bloomfall Gardens, Saltglass Flats, and Amberwood Hollow, each with threat ranks, run conditions, meadows and landmarks, and a giant elder colossus.
- **Endless descent:** after a contract's last island, lift out with the haul or go deeper to another generated place below: a level and a threat rank harder each depth, with a titled, upgraded elder (Risen, Wrathful, Ancient, Dread, Undying) and bigger pay. A fall below the first depth costs half the unbanked haul; the deepest depth reached is kept as a record.
- **Sky backdrop:** distant floating islands, some with waterfalls, over a sea of cloud, drawn by direction so they stay put as the camera turns.
- **Ten-slot gear, relics, salvage & honing:** Paper-doll equipment with rarities, affixes, boss relics, salvage parts, honing, and item locks.
- **Evolving Lumen companion:** Shoulder-mounted light companion with three tempers, eight forms, assist bolts, and rechargeable bursts.
- **Procedural music & sound:** Per-biome and per-boss interactive Web Audio score; sound effects synthesized when the game starts, from compact sketches of recorded effects.
- **Custom WebGL2 renderer & Preact UI:** Raymarched pen-and-cel shaders separated into standalone `.glsl`/`.vert`/`.frag` files, live 3D portrait stages, responsive desktop and touch layouts, and local save persistence with export/import.
- **One file, nothing fetched:** the build is a single self-contained `index.html` (under 1 MB). Every picture in the interface (peoples, classes, crew, lumens, places) is drawn by the game's own renderer the first time it is needed, sounds are synthesized, fonts are the device's own, and the icon and web-app manifest are inlined.

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Useful URL parameters during development:
- `?touch` — force touch layout on desktop (`?touch=0` to disable)
- `?new` — start as if no saves exist
- `?nocine` — skip cinematics automatically
- `?firststeps` — force the guided first-steps tutorial

## Production Build & Deployment

```bash
npm run typecheck
npm run build
npm run preview
```

`npm run build` writes `dist/index.html`, the whole game in one file (script, styles, icon and manifest inlined; shaders minified), plus `dist/og.jpg`, the link-preview image, which the game itself never requests. Configured for zero-config static deployment on Vercel (`vercel.json` builds with `npm run build` and serves `dist/`).

## Controls

| Input | Action |
| --- | --- |
| Left click / hold | Move to ground, attack creature, or talk to NPC |
| `W` `A` `S` `D` / Arrows | Move |
| `1` `2` `3` `4` | Cast abilities |
| `Space` | Jump (clears gaps, terraces, and ground slams) |
| `F` / `Tab` | Attack nearest / interact / cycle target |
| `R` / `T` | Drink Red Tonic / Blue Draught |
| `G` | Activate Lumen burst |
| Right drag, `Q` / `E`, Wheel | Orbit, tilt, and zoom camera |
| `C` / `B` / `L` / `J` / `H` | Open Character / Gear / Lumen / Contract / Guide (`Q`/`E` switch tabs) |
| `O` / `N` | After a contract's last island: lift out / go deeper |
| `M` / `V` | Toggle sound / camera preset |
| `Esc` | Close window, clear target, or open pause menu |

## Architecture

```text
public/               og.jpg, the link-preview image (the only file besides index.html)
src/
  main.ts             Application entry point
  config.ts           Shared world, render, camera, and physics constants
  types/              Shared TypeScript domain, entity, world, event, render, and game contracts
  core/               Device detection, typed EventBus, input handler, math, spatial RNG/noise
  data/               Pure readonly game catalogs (classes, abilities, gear, creatures, biomes, props, etc.)
  world/              Procedural zone layout, navigation graph, chunk generation, world collision/queries
  sim/                Headless simulation systems grouped by domain:
    character/        Stats derivation, talents, player movement & attack chain
    inventory/        Gear rolling/honing/salvage & loot system
    combat/           Combat resolution, skills, relics, hazards, monster AI & specials
    companion/        Lumen progression math & companion system
    missions/         Threat calculation, encounters, contract lifecycle, sites, town crew
  rendering/          Raw WebGL2 engine, passes, camera, toroidal world textures, and standalone GLSL shaders
  audio/              Modular Web Audio synth kit, sample map, SFX triggers, procedural music & ambience
  app/                Composition root (Game), controls, environment, FX, view builder, cinematics, portraits & art studio, tutorial, saves
  ui/                 Preact components, imperative 60fps overlays (plates, touch stick, markers), settings & modular CSS
```

## License

MIT. See [LICENSE](LICENSE) for full license and third-party sound/font attributions.
