// Cinematics: every sequence the director (app/cinema.js) can play, as data.
// Nothing here knows about the renderer or the page; a new cinematic is a row
// in CINEMATICS and, if something in the game should start it, a row in TRIGGERS.
//
// A sequence is a list of shots played one after another, each a cut:
//
//   for      seconds the shot lasts
//   cam      where the camera stands and what it looks at (below)
//   world    how fast the world runs under the shot: 0 holds it still, 1 lets it play (default: the sequence's own)
//   act      what the cast does: [{ who, at?, for?, clip | walk | fly | face | show | hide }]
//            clip   a pose the figure's shader knows: 'emerge', 'roar' (see CLIPS)
//            walk   { from: [x, z], to: [x, z] }: on foot, in step
//            fly    [[x, y, z], ...]: through these points, banking; `land` settles it on its skids at the end
//   cues     things said on the bus for sound and effects: [{ at, emit, on?, ...data }]; `shake` jolts the camera
//   card     lettering over the picture: { kind: 'place' | 'elder' | 'contract', title, sub, at?, for? }
//   caption  one plain line under the picture
//   dip      seconds of fade to bare paper at the end of the shot (and back in at the start of the next)
//
// The camera is an orbit about something, so one shot works on any island a contract rolls:
//
//   on       what it orbits: 'hero', a name from the cast ('boss'), a room by its kind ('room:boss'), or a point [x, z]
//   look     what it looks at (default: the same thing)
//   axis     yaw 0 puts the camera on the side of `on` that faces this ('facing': the way `on` itself faces);
//            without an axis, yaw is a compass bearing
//   by       measure dist, up and aim in heights of this cast member, so one shot fits every size of elder
//   from/to  { yaw, pitch, dist, up, aim, lens }, eased from one to the other over the shot.
//            up: the middle of the orbit above the feet of `on`; aim: the height looked at above the feet of `look`;
//            lens: the field of view in degrees (the game's own is 34: longer flattens, wider towers)
//   ease     'inOut' (default), 'in', 'out', 'linear'
//
// A sequence also says:
//   bars     the black bars of a film frame (default true)       skip    it can be skipped (default true)
//   block    the hero's controls are held (default true)         world   see above (default 0)
//   again    the sequence to play instead once this one has been seen on this visit
//   out      seconds the camera takes to swing back to play (0: a cut)
//   exit     where the play camera should be when it does: { behind: 'hero' } or { facing: 'boss' }
//   cast     figures the sequence brings itself: [{ as, archetype, ...entity fields }]; they leave when it ends
//
// Lettering may name things from the cast and from the event that started the sequence: '{boss.name}'.

/** Poses a clip holds on a figure: the action number its shader reads, taken from start to finish. */
export const CLIPS = { emerge: 4, roar: 5, fall: 6, strike: 1 };

export const CINEMATICS = {
  // ------------------------------------------------------------ the first minute: arriving at Meridian Landing
  arrival: {
    world: 1, out: 1.3, exit: { behind: 'hero' },
    cast: [{ as: 'shuttle', archetype: 'shuttle', radius: 2.4, height: 2.6, colors: [[232, 236, 244], [214, 70, 52], [84, 108, 156]] }],
    shots: [
      { // the station from the air, the ringed world behind it
        for: 5.6, dip: 0.35,
        cam: { on: [0, 4], look: [-9, 0], from: { yaw: 0.5, pitch: 0.07, dist: 78, up: 3, aim: 16, lens: 42 }, to: { yaw: 0.66, pitch: 0.09, dist: 62, up: 3, aim: 13.5, lens: 42 }, ease: 'out' },
        act: [{ who: 'hero', hide: true }, { who: 'shuttle', hide: true }],
        card: { kind: 'place', title: 'Meridian Landing', sub: 'Survey station above the cloud line', at: 0.9, for: 4.2 },
        cues: [{ at: 0, emit: 'cine:open' }],
      },
      { // the shuttle that brings you comes down on the field
        for: 5.0, dip: 0.3,
        cam: { on: [-51.5, -4.5], from: { yaw: 0.25, pitch: 0.02, dist: 13.5, up: 1.1, aim: 8.5, lens: 46 }, to: { yaw: 0.6, pitch: 0.04, dist: 11.5, up: 1.1, aim: 1.6, lens: 46 }, ease: 'inOut' },
        act: [
          { who: 'shuttle', show: true },
          { who: 'shuttle', fly: [[-112, 38, 42], [-86, 26, 24], [-67, 17, 8], [-56, 12.4, -1.5], [-51.5, 10.5, -4.5], [-51.5, 10, -4.5]], land: true, for: 4.4 },
        ],
        cues: [{ at: 0.1, emit: 'craft:pass', on: 'shuttle' }, { at: 4.3, emit: 'craft:land', on: 'shuttle', shake: 0.3 }],
      },
      { // and you walk into the square
        for: 5.4,
        cam: { on: 'hero', axis: 'facing', from: { yaw: 0.55, pitch: 0.02, dist: 5.2, up: 0.9, aim: 1.15, lens: 38 }, to: { yaw: 2.75, pitch: 0.2, dist: 8.6, up: 1.0, aim: 1.7, lens: 36 }, ease: 'inOut' },
        act: [
          { who: 'hero', show: true },
          { who: 'hero', walk: { from: [0, 24.5], to: [0, 16] }, for: 4.6 },
          { who: 'shuttle', at: 0.4, fly: [[-51.5, 10, -4.5], [-51.5, 15, -4.5], [-60, 26, -18], [-84, 44, -44]], for: 5 },
        ],
        caption: 'Contracts are posted at the hall. The pad at the south gate takes you down.',
      },
    ],
  },

  // ------------------------------------------------------------ dropping onto a contract
  descent: {
    world: 0, out: 1.0, exit: { facing: 'room:1' },
    shots: [
      { // from high over the first island, down to the hero's shoulder, the way ahead in front
        for: 4.4,
        cam: { on: 'hero', look: 'hero', axis: 'room:1', from: { yaw: 3.5, pitch: 0.95, dist: 54, up: 1, aim: 1, lens: 46 }, to: { yaw: 3.14, pitch: 0.36, dist: 13, up: 1, aim: 2.4, lens: 36 }, ease: 'inOut' },
        act: [{ who: 'hero', face: 'room:1' }],
        card: { kind: 'contract', title: '{offer.name}', sub: '{biome.name}  ·  {goal.name}', at: 0.5, for: 3.5 },
        cues: [{ at: 0.05, emit: 'arrive:beam', on: 'hero' }],
      },
    ],
  },

  // ------------------------------------------------------------ an elder wakes
  elder: {
    world: 0, out: 1.1, exit: { facing: 'boss' }, again: 'elderAgain',
    shots: [
      { // the hero, and the ground starting to move
        for: 1.7,
        cam: { on: 'hero', axis: 'boss', from: { yaw: 0.5, pitch: 0.03, dist: 4.4, up: 1.0, aim: 1.25, lens: 32 }, to: { yaw: 0.38, pitch: 0.03, dist: 3.7, up: 1.0, aim: 1.3, lens: 32 }, ease: 'out' },
        act: [{ who: 'hero', face: 'boss' }, { who: 'boss', hide: true }],
        cues: [{ at: 0.25, emit: 'cine:rumble', on: 'boss', power: 0.5, shake: 0.4 }, { at: 1.05, emit: 'cine:rumble', on: 'boss', power: 0.8, shake: 0.55 }],
      },
      { // over his shoulder: it comes up out of the island, and the camera has to tilt to keep its head in
        for: 3.9,
        cam: { on: 'hero', look: 'boss', axis: 'boss', by: 'boss', from: { yaw: 3.42, pitch: 0.02, dist: 0.5, up: 0.085, aim: 0.1, lens: 54 }, to: { yaw: 3.3, pitch: 0.0, dist: 0.62, up: 0.08, aim: 0.7, lens: 54 }, ease: 'inOut' },
        act: [{ who: 'boss', show: true }, { who: 'boss', clip: 'emerge', for: 3.5 }],
        cues: [
          { at: 0, emit: 'boss:rise', on: 'boss', shake: 0.7 },
          { at: 0.7, emit: 'cine:rumble', on: 'boss', power: 0.7, shake: 0.5 }, { at: 1.4, emit: 'cine:rumble', on: 'boss', power: 0.8, shake: 0.55 },
          { at: 2.1, emit: 'cine:rumble', on: 'boss', power: 0.9, shake: 0.6 }, { at: 3.4, emit: 'boss:stand', on: 'boss', shake: 0.9 },
        ],
      },
      { // from its feet, looking up, as it gives voice; its name
        for: 3.1,
        cam: { on: 'boss', axis: 'hero', by: 'boss', from: { yaw: 0.62, pitch: 0.0, dist: 1.2, up: 0.2, aim: 0.62, lens: 52 }, to: { yaw: 0.36, pitch: 0.0, dist: 1.42, up: 0.24, aim: 0.66, lens: 52 }, ease: 'out' },
        act: [{ who: 'boss', at: 0.25, clip: 'roar', for: 2.3 }],
        cues: [{ at: 0.75, emit: 'boss:roar', on: 'boss', shake: 1 }],
        card: { kind: 'elder', title: '{boss.name}', sub: '{boss.def.epithet}', at: 0.9, for: 2.2 },
      },
    ],
  },
  // met before: it only stands up and gives voice
  elderAgain: {
    world: 0, out: 0.9, exit: { facing: 'boss' },
    shots: [
      {
        for: 3.6,
        cam: { on: 'hero', look: 'boss', axis: 'boss', by: 'boss', from: { yaw: 3.4, pitch: 0.02, dist: 0.55, up: 0.085, aim: 0.15, lens: 54 }, to: { yaw: 3.3, pitch: 0.0, dist: 0.65, up: 0.08, aim: 0.68, lens: 54 }, ease: 'inOut' },
        act: [{ who: 'hero', face: 'boss' }, { who: 'boss', show: true }, { who: 'boss', clip: 'emerge', for: 2.2 }, { who: 'boss', at: 2.2, clip: 'roar', for: 1.4 }],
        cues: [{ at: 0, emit: 'boss:rise', on: 'boss', shake: 0.7 }, { at: 1.1, emit: 'cine:rumble', on: 'boss', power: 0.8, shake: 0.5 }, { at: 2.5, emit: 'boss:roar', on: 'boss', shake: 0.9 }],
        card: { kind: 'elder', title: '{boss.name}', sub: '{boss.def.epithet}', at: 1.6, for: 1.9 },
      },
    ],
  },

  // ------------------------------------------------------------ an elder comes down
  felled: {
    world: 1, out: 1.2, exit: { facing: 'boss' },
    shots: [
      { // the blow that did it, almost stopped
        for: 1.5, world: 0.14,
        cam: { on: 'hero', look: 'boss', axis: 'boss', by: 'boss', from: { yaw: 3.75, pitch: 0.04, dist: 0.5, up: 0.1, aim: 0.42, lens: 40 }, to: { yaw: 3.65, pitch: 0.04, dist: 0.46, up: 0.1, aim: 0.46, lens: 40 }, ease: 'out' },
        cues: [{ at: 0, emit: 'cine:hush' }],
      },
      { // and all of it, coming down
        for: 4.3,
        cam: { on: 'boss', axis: 'hero', by: 'boss', from: { yaw: 1.05, pitch: 0.1, dist: 1.75, up: 0.16, aim: 0.5, lens: 46 }, to: { yaw: 0.5, pitch: 0.14, dist: 2.05, up: 0.16, aim: 0.22, lens: 46 }, ease: 'out' },
        card: { kind: 'elder', title: '{boss.name}', sub: 'Brought down', at: 2.3, for: 1.9 },
      },
    ],
  },

  // ------------------------------------------------------------ an elder, wounded, turns on you: no cut, the fight only draws breath
  enraged: {
    bars: false, block: false, skip: false, out: 0,
    shots: [{ for: 0.9, world: 0.3 }],
  },
};

/**
 * What in the game starts a sequence. `on` is a bus event; `cast` names the figures the
 * sequence refers to and anything its lettering needs, from the event and the game.
 */
export const TRIGGERS = [
  { on: 'begin', play: 'arrival', when: (_, g) => !g.cinema.quiet },
  { on: 'mission:begin', play: 'descent', cast: (d) => ({ offer: d.offer, biome: d.biome, goal: d.goal }) },
  { on: 'boss:arrive', play: 'elder', cast: (m) => ({ boss: m }), key: (m) => m.defId },
  { on: 'boss:fell', play: 'felled', cast: (m) => ({ boss: m }) },
  { on: 'boss:enrage', play: 'enraged', cast: (m) => ({ boss: m }) },
];
