import { registerChunk } from '../shaderlib.js';

// The drawing hand: cream paper, one ballpoint, one box of dry pencils, and how
// far it leans toward flat cel colour (CEL below: 0 is all pencil, 1 is flat
// fills, hard-edged shade and a steady line; the pencil is still there, quieter).
//
// Rules carried over from Valsera's style guide (valsera/notes/STYLE.md, COLOUR.md):
//  - three multiply layers: paper, a pencil lay, a pen line; nothing is lighter
//    than the paper and nothing reaches black;
//  - one hatch slant for the whole page (a right hand's "/"), strokes visible,
//    a quarter or more of every fill left as bare paper;
//  - shade is a second lay of a deeper pencil of the same hue, never grey;
//  - light is reserved paper; distance is a paler, thinner lay, never blur.
//
// Hatching is laid in "paper coordinates": world positions projected on the
// right and up axes of a held view direction, the "paper direction". The
// renderer holds it still while the camera turns, so strokes stay glued to the
// world (a turning view never makes them swim), and lets a fresh direction fade
// in when the view has turned some way or has come to rest. Strokes therefore
// keep the page's one slant to within a few degrees, exactly so at rest.
registerChunk('pencil', /* glsl */ `
const vec3 PAPER = vec3(0.945, 0.933, 0.898);          // the page (241,238,229)
const vec3 INK_SEPIA = vec3(0.220, 0.175, 0.200);      // the pen on scenery: near black, a little warm
const vec3 INK_SOFT = vec3(0.440, 0.400, 0.430);       // far lines
const vec3 INK_DARK = vec3(0.120, 0.100, 0.130);       // a figure's contour
const vec3 INK_BLACK = vec3(0.141, 0.137, 0.180);      // eyes and brows only
const vec3 INK_LEAF = vec3(0.180, 0.478, 0.275);
const vec3 INK_WET = vec3(0.227, 0.502, 0.659);

// the pencil box (colours as they sit, well laid, on cream)
const vec3 P_BUTTER = vec3(0.973, 0.816, 0.361), P_SUN = vec3(0.957, 0.745, 0.243), P_HONEY = vec3(0.910, 0.643, 0.188);
const vec3 P_APRICOT = vec3(0.941, 0.620, 0.290), P_POPPY = vec3(0.878, 0.361, 0.275), P_TAN = vec3(0.886, 0.737, 0.510);
const vec3 P_BARK = vec3(0.690, 0.502, 0.329), P_UMBER = vec3(0.478, 0.243, 0.173), P_CREAM = vec3(0.973, 0.910, 0.745);
const vec3 P_BRICK = vec3(0.737, 0.329, 0.235), P_LEAF = vec3(0.455, 0.659, 0.353), P_GREEN = vec3(0.376, 0.620, 0.329);
const vec3 P_SAGE = vec3(0.588, 0.698, 0.471), P_PINE = vec3(0.455, 0.612, 0.541), P_TEAL = vec3(0.275, 0.588, 0.588);
const vec3 P_SKY = vec3(0.533, 0.706, 0.847), P_SLATE = vec3(0.329, 0.424, 0.612), P_DUSK = vec3(0.259, 0.298, 0.612);
const vec3 P_INDIGO = vec3(0.157, 0.196, 0.502), P_STONE = vec3(0.588, 0.557, 0.518), P_WOOD = vec3(0.871, 0.698, 0.431);
const vec3 P_ROSE = vec3(0.878, 0.439, 0.502), P_PEACH = vec3(0.925, 0.780, 0.690), P_CLAY = vec3(0.820, 0.640, 0.590);
const vec3 P_MUSTARD = vec3(0.886, 0.690, 0.204), P_VERMILION = vec3(0.839, 0.275, 0.204), P_CHARCOAL = vec3(0.290, 0.300, 0.370);

uniform vec4 uPencil;        // world size of a pixel per unit of view depth, stroke pitch in px, boil seed, device pixel ratio
uniform vec3 uPaperAnchor;   // paper coordinates are measured from here (keeps the numbers small)
uniform vec3 uPaperRight, uPaperUp, uPaperFwd;        // the held paper direction
uniform vec3 uPaperRightB, uPaperUpB, uPaperFwdB;     // the one fading in over it
uniform float uPaperMix;                              // 0 = only the first .. 1 = only the second

const float CEL = 0.68;      // how far the hand leans to cel shading: 0 = Brushwild's pencil, 1 = flat colour
const float SLANT = 1.082;   // 62 degrees up from the horizontal: Valsera's 118, y down
const float PITCH0 = 1.0 / 64.0;

// Which stroke size keeps hatching the same width on screen at this depth: (level, blend to next).
vec2 pencilLod(float viewDepth) {
  float l = max(log2(max(uPencil.x * uPencil.y * viewDepth, 1e-5) / PITCH0), 0.0);
  return vec2(floor(l), fract(l));
}
vec2 paperCoords(vec3 worldPos, vec3 right, vec3 up) {
  vec3 d = worldPos - uPaperAnchor;
  return vec2(dot(d, right), dot(d, up));
}

// One pointed stroke, row i: how hard the hand pressed at this point along it.
// In-between strokes thin out with distance, so the next level takes over unseen.
float pullPressure(float i, float along, vec2 lod, float seed) {
  float id = i * exp2(lod.x);
  float rh = hash11(id * 0.731 + seed * 57.0);
  float pa = vnoise(vec2(along * 0.06, id * 0.37 + seed));
  float pb = vnoise(vec2(along * 0.03, id * 0.37 + seed));
  float keep = 1.0 - mod(i, 2.0) * smoothstep(0.2, 0.95, lod.y);
  return mix(0.82, 1.06, rh) * mix(0.66, 1.12, mix(pa, pb, lod.y)) * keep;
}
// A broad pull's own weight (each pass of the side of the pencil is a little lighter or heavier).
float pullWeight(float i, vec2 lod, float seed) {
  return mix(0.84, 1.1, hash11(i * exp2(lod.x) * 0.731 + seed * 57.0));
}

// Density (0..1) of one lay of pencil.
//   uv     paper coordinates          lod   from pencilLod()
//   cover  how firmly it is laid      soft  0 = pointed hatch, 1 = broad side-of-the-pencil pulls
//   ang    slant in radians           seed  re-seeds the hand
float pencilHand(vec2 uv, vec2 lod, float cover, float soft, float ang, float seed) {
  if (cover < 0.015) return 0.0;
  float pitch = PITCH0 * exp2(lod.x);
  float w = lod.y, wide = mix(1.0, 2.0, w);
  // the paper's tooth catches the pigment (two grains, each carried across detail levels)
  float tooth = 0.6 * mix(vnoise(uv / (pitch * 0.45) + seed * 3.1), vnoise(uv / (pitch * 0.9) + seed * 3.1), w)
              + 0.4 * mix(vnoise(uv / (pitch * 0.19) + 7.7), vnoise(uv / (pitch * 0.38) + 7.7), w);
  vec2 wander = (vec2(vnoise(uv * 1.3 + seed), vnoise(uv * 1.3 + seed + 31.7)) - 0.5) * 0.022;
  vec2 dir = vec2(cos(ang), sin(ang));
  float along = dot(uv + wander, dir) / pitch;
  float across = (dot(uv + wander, vec2(-dir.y, dir.x)) + seed * 0.37) / pitch;

  if (soft > 0.5) {
    // Broad overlapping pulls: tone runs from one stroke into the next, so a
    // lawn is an even veil with faint streaks, never stripes. The odd pulls
    // settle into the mean of their neighbours as the level hands over.
    float i0 = floor(across), f = across - i0;
    float odd0 = mod(i0, 2.0);
    float iE = i0 + odd0, iO = i0 + 1.0 - odd0, iE2 = 2.0 * iO - iE;
    float pE = pullWeight(iE, lod, seed), pE2 = pullWeight(iE2, lod, seed);
    float pO = mix(pullWeight(iO, lod, seed), 0.5 * (pE + pE2), smoothstep(0.2, 0.95, w));
    float t = f * f * (3.0 - 2.0 * f);
    float streak = odd0 < 0.5 ? mix(pE, pO, t) : mix(pO, pE, t);
    // pressure drifts slowly over the page too
    float drift = mix(0.78, 1.12, vnoise(uv * vec2(0.9, 0.9) + dir * dot(uv, dir) * 0.6 + seed * 5.0));
    float p = mix(0.36, 1.0, cover) * streak * drift;
    return smoothstep(tooth - 0.42, tooth + 0.3, p * 0.86);
  }
  // Pointed hatch: separate strokes sitting on the row lines (so levels nest), slivers of paper between.
  float i = floor(across + 0.5), fy = across - i;
  float rh = hash11(i * exp2(lod.x) * 0.317 + seed * 11.0);
  // strokes a little wider than their spacing: they overlap into a fill with only slivers of paper,
  // so a shape reads as coloured in, not as a set of lines
  float halfW = 0.5 * mix(0.6, 1.5, cover) * wide * (1.0 - 0.45 * mod(i, 2.0) * w);
  float centre = (rh - 0.5) * 0.3 * wide;
  float shape = 1.0 - smoothstep(halfW - 0.3 * wide, halfW, abs(fy - centre));
  float p = mix(0.45, 1.0, cover) * pullPressure(i, along, lod, seed);
  return max(shape, 0.3 * step(0.6, cover)) * smoothstep(tooth - 0.34, tooth + 0.22, p * 0.88);
}

// A lay as it is drawn: the pencil's own strokes, leaning by CEL toward the same tone filled in flat.
// Flat tone comes in a few steps (a cel has no gradients), with the faintest grain so it still sits on paper.
float pencilLay(vec2 uv, vec2 lod, float cover, float soft, float ang, float seed) {
  if (cover < 0.015) return 0.0;
  float hand = pencilHand(uv, lod, cover, soft, ang, seed);
  float steps = cover * 4.0;
  float tone = (floor(steps) + smoothstep(0.4, 0.6, fract(steps))) / 4.0;
  float pitch = PITCH0 * exp2(lod.x);
  float grain = mix(vnoise(uv / (pitch * 0.6) + seed), vnoise(uv / (pitch * 1.2) + seed), lod.y);
  return mix(hand, saturate(pow(tone, 0.62) * 1.1) * mix(0.94, 1.0, grain), CEL);       // a filled tone sits denser than a hatched one
}
// Shade as a cel has it: two hard-edged bands (half-tone, shadow) instead of a soft ramp.
float celShade(float shade) {
  return mix(shade, 0.5 * smoothstep(0.2, 0.27, shade) + 0.5 * smoothstep(0.68, 0.75, shade), CEL);
}

// The deeper pencil that shades a colour: same hue a step down; warm colours
// lean to brick, near-neutrals (stone, paper, snow) take slate, never grey.
vec3 shadowPencil(vec3 c) {
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float sat = (mx - mn) / max(mx, 1e-3);
  vec3 deep = mix(c, c * c * 1.15, 0.62);
  float warm = saturate((c.r - c.b) * 2.4 - max(c.g - c.r, 0.0) * 6.0);
  deep = mix(deep, P_BRICK * (0.62 + 0.45 * mx), warm * 0.5);
  // pale things (paving, plaster, sand, snow, paper) are shaded in a greyed slate;
  // a green keeps its own deeper green even when it is a quiet one
  float own = mix(smoothstep(0.12, 0.34, sat), smoothstep(0.3, 0.55, sat), warm);
  return mix(vec3(0.50, 0.55, 0.69), deep, own);
}

// Night is drawn with other pencils (indigo family), not washed over the page.
vec3 nightPencil(vec3 c) {
  return mix(P_INDIGO * 1.15, c * vec3(0.62, 0.72, 0.95), 0.42);
}

// The sheet itself: tooth and a little fibre, fixed to the screen like real paper.
vec3 paperSheet(vec2 px) {
  float g = vnoise(px * 0.55) * 0.5 + vnoise(px * 0.13) * 0.3 + hash12(floor(px)) * 0.2;
  return PAPER * (1.0 + (g - 0.5) * mix(0.07, 0.02, CEL));
}

// Lay pencil over what is already on the page.
vec3 layOn(vec3 page, vec3 pigment, float density) { return mix(page, pigment * (page / PAPER), density); }
vec3 shadeOn(vec3 page, vec3 pigment, float density) { return page * mix(vec3(1.0), pigment, density); }
vec3 inkOn(vec3 page, vec3 ink, float amount) { return mix(page, ink, amount); }
`);
