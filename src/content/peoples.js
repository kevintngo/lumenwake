// The peoples of the survey corps: who a figure can be. A people is a build, a
// head and a way of dressing (drawn by gfx/archetypes/humanoid.js, which reads
// `index`), not a set of numbers: any of them can be any class.
//
//   index   the kind the shader draws        scale   how tall they stand beside a human
//   hair    pencils their hair, fur or hide comes in (0-255); a figure takes one

export const PEOPLES = {
  human: { index: 1, name: 'Human', scale: 1.0, blurb: 'Most of the corps. A jacket, a satchel, hair worn four ways.', hair: [[122, 62, 44], [74, 77, 94], [226, 188, 130], [176, 128, 84], [188, 84, 60]] },
  unit: { index: 0, name: 'Scout unit', scale: 1.0, blurb: 'A machine of the corps: white shell, visor, a pack on its back.', hair: [[122, 62, 44]] },
  veiled: { index: 2, name: 'Veiled', scale: 1.13, blurb: 'Tall and quiet, robed to the ground. No one has seen under the mask.', hair: [[74, 77, 94]] },
  karn: { index: 3, name: 'Karn', scale: 1.1, blurb: 'Broad, horned and tusked. Hide the colour of the stone they come from.', hair: [[150, 178, 120], [136, 160, 196], [209, 163, 150], [150, 142, 132]] },
  lynd: { index: 4, name: 'Lynd', scale: 0.92, blurb: 'Slight and quick, with tall ears and a tail.', hair: [[226, 176, 110], [232, 164, 48], [150, 142, 132], [236, 228, 210], [122, 62, 44]] },
};
export const PEOPLE_ORDER = ['unit', 'human', 'veiled', 'karn', 'lynd'];
