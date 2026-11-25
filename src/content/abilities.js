// Abilities: what goes on the bar. Each is a row of numbers and an `effect`,
// the kind of thing it does; the kinds themselves are a short list of functions
// in sim/systems/skills.js (an arc, a bolt, a volley, a ring, a mend, a dash).
// A new ability that is a variation on one of those is a row here and nothing
// else; a new kind is one function there. Which class carries which, and when
// each bar slot opens, is in classes.js.
//
//   scales   which of the hero's numbers it grows with: 'attack' or 'power'
//   mult     how many attacks' worth it hits for;  flat: added on top
//   color    the colour it is drawn in ([r, g, b], 0..1)

export const ABILITIES = {
  cleave: {
    name: 'Cleave', icon: 'cleave', cooldown: 4, focus: 8, effect: 'arc',
    reach: 2.9, mult: 1.7, scales: 'attack', color: [0.96, 0.75, 0.24],
    desc: 'A wide cut that hits everything in front of you.',
  },
  slam: {
    name: 'Ground Slam', icon: 'slam', cooldown: 9, focus: 14, effect: 'ring',
    radius: 3.6, mult: 2.0, scales: 'attack', shove: 5, color: [0.96, 0.75, 0.24],
    desc: 'Drive the blade into the ground: everything round you is struck and thrown back.',
  },
  bolt: {
    name: 'Ember Bolt', icon: 'bolt', cooldown: 2.6, focus: 10, effect: 'bolt',
    speed: 17, life: 0.85, radius: 0.5, mult: 0.9, flat: 8, scales: 'power', splash: 1.6, splashMult: 0.5, color: [0.94, 0.48, 0.2],
    desc: 'Hurl a mote of fire that bursts on the first thing it meets.',
  },
  volley: {
    name: 'Volley', icon: 'volley', cooldown: 5, focus: 12, effect: 'volley',
    shots: 4, gap: 0.09, speed: 28, life: 0.55, radius: 0.35, mult: 0.75, scales: 'attack', color: [0.55, 0.85, 1.0],
    desc: 'Four quick shots, each at the nearest thing still standing.',
  },
  nova: {
    name: 'Frost Ring', icon: 'nova', cooldown: 8, focus: 16, effect: 'ring',
    radius: 4.4, mult: 1.1, flat: 6, scales: 'power', slow: { factor: 0.45, seconds: 3.5 }, color: [0.55, 0.8, 1.0],
    desc: 'A ring of cold bursts from you: it bites everything close and slows it.',
  },
  mend: {
    name: 'Mend', icon: 'mend', cooldown: 14, focus: 16, effect: 'heal',
    portion: 0.34, seconds: 3,
    desc: 'Knit your plating: restores a third of your health over a few moments.',
  },
  step: {
    name: 'Gale Step', icon: 'step', cooldown: 6, focus: 8, effect: 'dash',
    speed: 26, seconds: 0.22, invuln: 0.35,
    desc: 'Dash a short way, untouchable while you move: the way through a charge or out of a slam.',
  },
};
