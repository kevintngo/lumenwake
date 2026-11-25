// The people of the game: the player and everyone in town, on one set of joints.
// Which people a figure is of (eExtra) changes its head, its build and what it wears:
//   0 scout unit   a machine of the corps: helmet, visor, plates, a pack
//   1 human        a bare head, hair worn one of four ways, a jacket
//   2 veiled       tall and narrow: a long robe, a deep hood, a pale mask
//   3 karn         broad and heavy: horns, tusks, bare arms, one shoulder plate
//   4 lynd         slight: tall ears, a tail, a short cape
// Hair style and skin differ from one figure to the next (by its seed).
// Pencils: A what is worn, B the accent (scarf, hood, cape, plate), C hair, fur or hide.
// What is in the hand (eSpare), the frame over the clothes and the unit on the back (the fraction of eExtra)
// are the same shapes for all of them, and the same ones the interface draws on its gear tiles: glsl/held.js.

import { registerArchetype } from '../passes/entities.js';
import { HELD_GLSL } from '../glsl/held.js';

registerArchetype({
  id: 'humanoid', boundY: 0.8, boundR: 1.08, steps: 60,
  glsl: /* glsl */ `
${HELD_GLSL}
vec3 hHip, hChest, hHead, hHandL, hHandR, hFootL, hFootR, hBlade, hSide;
float kind;      // which people this figure is of (eExtra): 0 scout unit, 1 human, 2 veiled, 3 karn, 4 lynd
float hKit, hLook, hFrame, hUnit;      // what is in the hand and which of its shapes; the frame worn; the unit on the back

void entPose() {
  float w = ePose.x, act = ePose.y, at = ePose.z, mv = ePose.w;
  kind = floor(eExtra + 0.5);
  // eSpare: the kit in the hand, + 0.1 for each step along a chain of blows, + 0.5 for the kit's second look.
  // eExtra, past the people: + 0.1 for a heavy frame, + 0.01 or 0.02 for the unit on the back.
  float kf = fract(eSpare + 0.01), wr = eExtra - kind;
  hKit = floor(eSpare + 0.01); hLook = step(0.5, kf);
  hFrame = floor(wr * 10.0 + 0.05); hUnit = floor((wr - hFrame * 0.1) * 100.0 + 0.5);
  float s = sin(w), c = cos(w);
  float idle = sin(uTime * 2.0 + eLook.x * 6.28);
  // Walk and run are two different cycles. A walk rises as the legs pass under the
  // body. A run sinks onto the planted foot and is thrown clear of the ground with
  // the feet wide apart, leans into it, lifts the knees and pumps the arms. The
  // stride (see systems/player.js) is long enough that twelve drawings a second
  // show every stage of it.
  float run = smoothstep(0.8, 1.0, mv);
  float apart = s * s;                                       // 1 with the feet wide, 0 as they pass
  float bob = mix(abs(c) * 0.05, apart * 0.15 - 0.04, run) * mv + 0.01 * idle * (1.0 - mv);
  float lean = mv * mix(0.05, 0.14, run);
  hHip = vec3(0.0, 0.4 + bob, 0.0);          // short legs: about a fifth of the figure
  hChest = hHip + vec3(0.0, 0.27 - 0.015 * run, lean);
  hHead = hChest + vec3(0.0, 0.43 - 0.01 * run, lean * 0.6 - 0.02 * run * apart);
  // a foot swings forward lifted and comes back planted; in a run the lift starts
  // early (the heel kicks up behind) and both feet leave the ground at full stretch
  float reach = 0.4 * mv;
  float lift = mix(0.1, 0.25, run) * min(1.0, mv * 1.5);
  float air = run * mv * apart * 0.11;
  float early = 0.6 * run;
  hFootL = vec3(-0.12, 0.07 + max(cos(w - early), 0.0) * lift + air, s * reach - 0.05 * run);
  hFootR = vec3(0.12, 0.07 + max(-cos(w - early), 0.0) * lift + air, -s * reach - 0.05 * run);
  if (kind > 1.5 && kind < 2.5) {
    // under a robe the steps are short and the feet stay low: nothing kicks out through the cloth
    hFootL = vec3(hFootL.x, mix(0.07, hFootL.y, 0.12), hFootL.z * 0.3);
    hFootR = vec3(hFootR.x, mix(0.07, hFootR.y, 0.12), hFootR.z * 0.3);
  }
  // arms swing against the legs, hands rising as they come forward; the sword arm swings shorter
  float pump = mix(0.2, 0.32, run) * mv;
  float rise = 0.09 * run * mv;
  hHandL = hChest + vec3(-0.3 + 0.04 * run, -0.24 + 0.01 * idle + rise * max(-s, 0.0), -s * pump + 0.02);
  hHandR = hChest + vec3(0.3 - 0.03 * run, -0.24 + 0.01 * idle + rise * max(s, 0.0), s * pump * 0.7 + 0.02);
  hBlade = normalize(vec3(0.25, 0.85 - 0.2 * run, 0.45 - 0.5 * run));
  if (act > 0.5 && act < 1.5) {
    // swing: wind up over the right shoulder, cut across the front, recover
    float wind = smoothstep(0.0, 0.22, at), cut = smoothstep(0.22, 0.5, at), rec = smoothstep(0.62, 1.0, at);
    float ang = mix(mix(0.4, 2.2, wind), -1.1, cut);
    float lift = wind * (1.0 - cut);
    // the chain: the second cut comes back the other way, the third comes down from overhead
    float link = floor((kf - 0.5 * hLook) * 10.0 + 0.2);
    if (link > 0.5 && link < 1.5) ang = 0.9 - ang;
    vec3 strike = hChest + vec3(sin(ang) * 0.46, 0.12 + 0.28 * lift, cos(ang) * 0.46);
    vec3 edge = normalize(vec3(sin(ang), 0.25 + 0.6 * lift, cos(ang)));
    if (link > 1.5) {
      strike = hChest + vec3(0.14, 0.1 + 0.42 * lift - 0.16 * cut, 0.14 + 0.36 * cut);
      edge = normalize(mix(vec3(0.1, 1.0, -0.45), vec3(0.0, -0.05, 1.0), cut));
    }
    hBlade = normalize(mix(edge, hBlade, rec));
    hHandR = mix(strike, hHandR, rec);
    hChest.x += 0.04 * (cut - rec);
    hHead.z += 0.04 * cut * (1.0 - rec);
  } else if (act > 1.5 && act < 2.5) {
    float k = sin(saturate(at) * PI);
    hHandL = mix(hHandL, hChest + vec3(-0.16, 0.12, 0.38), k);
    hHandR = mix(hHandR, hChest + vec3(0.16, 0.12, 0.38), k);
    hBlade = normalize(mix(hBlade, vec3(0.0, 0.5, 0.86), k));
  } else if (act > 2.5 && act < 3.5) {
    float k = 1.0 - at;
    hChest.z -= 0.08 * k; hHead.z -= 0.14 * k;
    hHandL.y += 0.1 * k; hHandR.y += 0.1 * k;
  } else if (act > 3.5 && act < 4.5) {
    // a dash is one held drawing: a long low lunge, arms and blade trailing
    hHip = vec3(0.0, 0.33, 0.0);
    hChest = hHip + vec3(0.0, 0.24, 0.17);
    hHead = hChest + vec3(0.0, 0.4, 0.13);
    hFootL = vec3(-0.11, 0.09, 0.46);
    hFootR = vec3(0.11, 0.24, -0.5);
    hHandL = hChest + vec3(-0.27, -0.08, -0.34);
    hHandR = hChest + vec3(0.3, -0.14, -0.3);
    hBlade = normalize(vec3(0.2, 0.22, -0.95));
  } else if (act > 4.5 && act < 5.5) {
    // a jump: knees up and arms out on the way up, feet reaching for the ground on the way down
    float up = sin(saturate(at) * PI), down = smoothstep(0.55, 1.0, at);
    hFootL = vec3(-0.13, 0.07 + 0.15 * up * (1.0 - down), 0.1 * up);
    hFootR = vec3(0.13, 0.07 + 0.19 * up * (1.0 - down), -0.07 * up);
    hHandL = hChest + vec3(-0.33, -0.06 + 0.22 * up, 0.02);
    hHandR = hChest + vec3(0.33, -0.06 + 0.2 * up, 0.04);
    hChest.z += 0.04 * up; hHead.y += 0.02 * up;
  } else if (act > 6.5 && act < 7.5) {
    // at ease, sitting for a portrait: breathing, the weight going from one foot to the other, and now and
    // then what is in the hand brought up and looked over
    float br = sin(uTime * 1.9), sh = sin(uTime * 0.7 + 1.0);
    hHip += vec3(0.016 * sh, 0.004 * br, 0.0);
    hChest += vec3(0.024 * sh, 0.014 * br, 0.0);
    hHead += vec3(0.03 * sh, 0.017 * br, 0.0);
    hHandL += vec3(0.022 * sh - 0.012 * br, 0.012 * br, 0.0);
    hHandR += vec3(0.022 * sh + 0.012 * br, 0.012 * br, 0.0);
    float every = fract(uTime / 7.0);
    float show = smoothstep(0.0, 0.1, every) * smoothstep(0.34, 0.22, every);
    hHandR = mix(hHandR, hChest + vec3(0.27, 0.02, 0.2), show);
    hBlade = normalize(mix(hBlade, vec3(-0.12, 0.96, 0.25), show));
  }
  hSide = normalize(cross(hBlade, vec3(0.0, 1.0, 0.0)) + vec3(1e-3, 0.0, 0.0));
}

// How the peoples differ in build (kind: 0 scout unit, 1 human, 2 veiled, 3 karn, 4 lynd).
float kWide() { return kind > 2.5 && kind < 3.5 ? 1.36 : (kind > 1.5 && kind < 2.5 ? 0.86 : (kind > 3.5 ? 0.9 : 1.0)); }

float entMap(vec3 p, out float mat) {
  vec3 hp = p - hHead;
  float wide = kWide();
  float d = 1e3;
  mat = 0.0;
  float hair = 1e3, accent = 1e3, wood = 1e3, metal = 1e3, glow = 1e3, plate = 1e3, bone = 1e3, fur = 1e3, skin = 1e3, dark = 1e3;
  vec3 neck = hChest + vec3(0.0, 0.15, 0.0);
  float sway = sin(uTime * 3.0 + eLook.x * 9.0);

  if (kind < 0.5) {
    // The scout unit: its head is its helmet. A smooth white shell, a crest over the top,
    // a pod at each ear with an aerial on the right one. (The visor and its two lamps are drawn in entSurf.)
    d = length(hp * vec3(1.0, 1.05, 1.0)) - 0.345;
    mat = 10.0;
    // scarf: a ring at the neck and a tail that trails behind
    accent = sdTorusY(p - neck, 0.13, 0.06);
    vec3 ta = neck + vec3(0.06, 0.0, -0.13);
    vec3 tb = ta + vec3(0.05 + 0.05 * sway, -0.14 + 0.1 * ePose.w, -0.26 - 0.14 * ePose.w);
    accent = smin(accent, sdTaper(p, ta, tb, 0.055, 0.035), 0.05);
    // ear pods, and the aerial
    metal = length(vec3(abs(hp.x) - 0.34, hp.y + 0.02, hp.z + 0.02) * vec3(1.6, 1.0, 1.0)) - 0.1;
    metal = min(metal, sdCapsule(hp, vec3(0.36, 0.04, -0.02), vec3(0.45, 0.4, -0.12), 0.016));
    // the crest, and the aerial's tip, in the corps' red
    accent = min(accent, sdCapsule(hp, vec3(0.0, 0.325, 0.13), vec3(0.0, 0.3, -0.2), 0.045));
    accent = min(accent, length(hp - vec3(0.45, 0.42, -0.12)) - 0.032);
    // shoulder plates, and a pack on the back with two small fins
    plate = length(vec3(abs(p.x - hChest.x) - 0.205, p.y - hChest.y - 0.085, p.z - hChest.z)) - 0.108;
    vec3 bk = p - hChest - vec3(0.0, -0.02, -0.17);
    plate = min(plate, sdRoundBox(bk, vec3(0.115, 0.13, 0.06), 0.03));
    plate = min(plate, sdRoundBox(vec3(abs(bk.x) - 0.1, bk.y - 0.12, bk.z + 0.05), vec3(0.015, 0.09, 0.05), 0.01));
  } else if (kind < 1.5) {
    // A human of the corps: a bare head, hair worn one of four ways, a collar in the accent colour.
    d = length(hp) - 0.31;
    float style = floor(fract(eLook.x * 7.31) * 4.0);
    hair = length(hp - vec3(0.0, 0.035, -0.035)) - 0.348;
    if (style > 0.5 && style < 1.5) hair = smin(hair, sdEllipsoid(hp - vec3(0.0, -0.13, -0.1), vec3(0.335, 0.2, 0.25)), 0.06);       // a bob to the jaw
    hair = max(hair, hp.z * 0.85 - hp.y * 0.55 - 0.16 - 0.025 * sin(hp.x * 24.0));                                                    // the fringe
    if (style > 1.5 && style < 2.5) hair = smin(hair, sdTaper(hp, vec3(0.0, 0.16, -0.3), vec3(0.07 * sway, -0.22 + 0.1 * ePose.w, -0.44 - 0.12 * ePose.w), 0.1, 0.04), 0.07);   // a tail tied high
    if (style > 2.5) hair = smin(hair, length(hp - vec3(0.02, 0.34, -0.1)) - 0.1, 0.08);                                             // a knot on top
    accent = sdTorusY(p - neck + vec3(0.0, 0.02, 0.0), 0.125, 0.05);
    if (fract(eLook.x * 3.71) > 0.5) {
      vec3 ta = neck + vec3(-0.07, -0.02, -0.12);
      accent = smin(accent, sdTaper(p, ta, ta + vec3(-0.04 - 0.05 * sway, -0.16 + 0.1 * ePose.w, -0.22 - 0.14 * ePose.w), 0.05, 0.03), 0.05);
    }
    // a satchel on the hip
    plate = sdRoundBox(p - hHip - vec3(-0.2, 0.02, -0.06), vec3(0.05, 0.08, 0.09), 0.03);
  } else if (kind < 2.5) {
    // The veiled: tall and narrow in a long robe, a deep hood with a point that droops behind, and where a
    // face would be, a pale mask. (Its eyes and the mark on its brow are drawn in entSurf.)
    dark = length(hp - vec3(0.0, 0.0, -0.02)) - 0.3;
    bone = sdEllipsoid(hp - vec3(0.0, -0.02, 0.2), vec3(0.17, 0.215, 0.11));
    float hood = length(hp - vec3(0.0, 0.03, -0.05)) - 0.39;
    hood = max(hood, hp.z * 0.9 - hp.y * 0.18 - 0.2);
    hood = smin(hood, sdTaper(hp, vec3(0.0, 0.27, -0.16), vec3(0.03 * sway, 0.3 - 0.06 * ePose.w, -0.5), 0.13, 0.03), 0.1);
    // a mantle over the shoulders
    accent = smin(hood, sdEllipsoid(p - hChest - vec3(0.0, 0.07, -0.01), vec3(0.27, 0.13, 0.2)), 0.06);
  } else if (kind < 3.5) {
    // The karn: broad and heavy. A wide head on no neck to speak of, a jaw with two tusks, a pair of horns,
    // bare arms the colour of their hide, one shoulder under a plate.
    skin = sdEllipsoid(hp, vec3(0.35, 0.3, 0.325));
    skin = smin(skin, length(hp - vec3(0.0, -0.13, 0.07)) - 0.245, 0.08);
    vec3 a = vec3(abs(hp.x), hp.y, hp.z);
    bone = min(sdTaper(a, vec3(0.25, 0.17, -0.02), vec3(0.43, 0.36, -0.02), 0.085, 0.055), sdTaper(a, vec3(0.43, 0.36, -0.02), vec3(0.39, 0.57, 0.05), 0.055, 0.012));
    bone = min(bone, sdTaper(a, vec3(0.13, -0.24, 0.24), vec3(0.155, -0.08, 0.31), 0.036, 0.01));
    skin = min(skin, length(a - vec3(0.36, 0.02, -0.03)) - 0.07);                              // small round ears
    plate = length((p - hChest - vec3(-0.26, 0.12, 0.0)) * vec3(1.0, 1.15, 1.0)) - 0.16;
    accent = sdTorusY(p - hHip - vec3(0.0, 0.07, 0.0), 0.2, 0.04);                              // a heavy belt
  } else {
    // The lynd: slight and quick. Tall ears that turn, a brush of a tail, a short cape.
    d = length(hp) - 0.3;
    hair = length(hp - vec3(0.0, 0.04, -0.04)) - 0.335;
    hair = max(hair, hp.z * 0.85 - hp.y * 0.6 - 0.15 - 0.03 * sin(hp.x * 20.0));
    vec3 a = vec3(abs(hp.x), hp.y, hp.z);
    float twitch = 0.04 * sin(uTime * 1.3 + eLook.x * 20.0) * step(0.8, fract(uTime * 0.23 + eLook.x));
    // ears: tall leaves that stand up and a little out, flattened front to back
    vec3 er = a - vec3(0.17, 0.2, -0.03);
    er.z *= 1.9;
    fur = sdTaper(er, vec3(0.0), vec3(0.15 + twitch, 0.46, -0.06), 0.13, 0.025) * 0.6;
    vec3 t0 = hHip + vec3(0.0, -0.02, -0.15), t1 = hHip + vec3(0.08 * sway, 0.0 + 0.06 * ePose.w, -0.42), t2 = hHip + vec3(0.16 * sway, 0.24 - 0.14 * ePose.w, -0.62);
    fur = min(fur, smin(sdTaper(p, t0, t1, 0.06, 0.11), sdTaper(p, t1, t2, 0.11, 0.05), 0.08));
    accent = sdTaper(p, hChest + vec3(0.0, 0.15, 0.0), hChest + vec3(0.0, -0.1, -0.02), 0.17, 0.3);
    accent = max(accent, -(p.y - hChest.y + 0.12));
  }

  // what is in the hand, the frame over the clothes, the unit on the back (glsl/held.js)
  heldMap(p, hHandR, hBlade, hSide, hKit, hLook, wood, glow);
  float worn = frameMap(p - hChest, wide, hFrame);
  float packLit, pack = unitMap(p - hChest - vec3(0.0, 0.0, kind < 0.5 ? -0.275 : -0.2 * max(wide, 1.0)), hUnit, packLit);

  if (skin < d) { d = skin; mat = 0.0; }
  if (dark < d) { d = dark; mat = 13.0; }
  if (hair < d) { d = hair; mat = 1.0; }

  // the body. Chest to waist is what they wear; below it a people's own lower half: a jacket's short
  // skirt over trousers, a robe to the ankle, a karn's kilt, the unit's hip plates. Then legs that
  // narrow to the ankle, and feet: boots, or a lynd's bare paws.
  float karn = step(2.5, kind) * step(kind, 3.5), veiled = step(1.5, kind) * step(kind, 2.5), unit = step(kind, 0.5), lynd = step(3.5, kind);
  vec3 waist = hHip + vec3(0.0, 0.05, 0.0);
  float tunic = sdTaper(p, waist, hChest + vec3(0.0, 0.04, 0.0), 0.168 * wide - 0.035 * karn, 0.15 * wide + 0.06 * karn);
  if (veiled > 0.5) {
    // the robe hangs straight from the hip, swings a little with the stride, and is cut square at the ankle
    vec3 hem = vec3(hHip.x, 0.1, mix(hHip.z, 0.5 * (hFootL.z + hFootR.z), 0.4));
    tunic = smin(tunic, max(sdTaper(p, hHip + vec3(0.0, 0.03, 0.0), hem, 0.175, 0.235), 0.07 - p.y), 0.05);
  } else if (karn > 0.5) {
    // a kilt of two hide flaps, front and back, under the belt
    vec3 fl = p - hHip - vec3(0.0, -0.1, 0.0);
    accent = min(accent, sdRoundBox(vec3(fl.x, fl.y, abs(fl.z) - 0.155), vec3(0.125, 0.13, 0.018), 0.018));
  } else if (unit < 0.5) {
    // the jacket's skirt: short, flared a little, cut square
    tunic = min(tunic, max(sdTaper(p, waist, hHip + vec3(0.0, -0.11, 0.0), 0.172 * wide, 0.205 * wide), hHip.y - 0.07 - p.y));
  }
  float armR = 0.068 + 0.032 * karn, wrist = 0.055 + 0.032 * karn + 0.03 * veiled;
  float arms = min(sdTaper(p, hChest + vec3(-0.17 * wide, 0.05, 0.0), hHandL, armR, wrist), sdTaper(p, hChest + vec3(0.17 * wide, 0.05, 0.0), hHandR, armR, wrist));
  if (karn > 0.5) { if (arms < d) { d = arms; mat = 0.0; } } else tunic = min(tunic, arms);
  if (tunic < d) { d = tunic; mat = 2.0; }
  float hands = min(length(p - hHandL), length(p - hHandR)) - 0.072 - 0.024 * karn;
  if (hands < d) { d = hands; mat = 12.0; }
  float thigh = 0.084 + 0.03 * karn, ankle = 0.062 + 0.024 * karn - 0.008 * lynd;
  vec3 hipL = hHip + vec3(-0.092 * wide, -0.05, 0.0), hipR = hHip + vec3(0.092 * wide, -0.05, 0.0);
  float legs = min(sdTaper(p, hipL, hFootL + vec3(0.0, 0.09, -0.015), thigh, ankle), sdTaper(p, hipR, hFootR + vec3(0.0, 0.09, -0.015), thigh, ankle));
  legs = smin(legs, sdEllipsoid(p - hHip - vec3(0.0, -0.02, 0.0), vec3(0.158 * wide, 0.095, 0.125 + 0.02 * karn)), 0.05);
  if (legs < d) { d = legs; mat = 3.0; }
  // feet: a rounded toe and a short shaft up the ankle
  vec3 bl = p - hFootL, br = p - hFootR;
  float toe = (min(length((bl - vec3(0.0, 0.0, 0.045)) * vec3(1.0, 1.25, 0.7)), length((br - vec3(0.0, 0.0, 0.045)) * vec3(1.0, 1.25, 0.7))) - 0.098 - 0.024 * karn) * 0.75;
  float shaft = min(sdCapsule(bl, vec3(0.0, 0.02, -0.015), vec3(0.0, 0.115, -0.015), 0.079 + 0.024 * karn), sdCapsule(br, vec3(0.0, 0.02, -0.015), vec3(0.0, 0.115, -0.015), 0.079 + 0.024 * karn));
  float boots = lynd > 0.5 ? toe : smin(toe, shaft, 0.03);
  if (boots < d) { d = boots; mat = 4.0; }
  if (accent < d) { d = accent; mat = 5.0; }
  if (metal < d) { d = metal; mat = 6.0; }
  if (wood < d) { d = wood; mat = 7.0; }
  if (glow < d) { d = glow; mat = 8.0; }
  if (plate < d) { d = plate; mat = 9.0; }
  if (bone < d) { d = bone; mat = 11.0; }
  if (fur < d) { d = fur; mat = 14.0; }
  if (worn < d) { d = worn; mat = 15.0; }
  if (pack < d) { d = pack; mat = 16.0; }
  if (packLit < d) { d = packLit; mat = 17.0; }
  return d;
}

// Skin is paper with a breath of pencil; how much, and which pencil, differs from one person to the next.
void skinTone(inout Surf s) {
  float tone = fract(eLook.x * 5.17);
  s.albedo = P_PEACH; s.cover = 0.2; s.wrap = 0.5;
  if (tone > 0.45) { s.albedo = P_TAN; s.cover = 0.5; }
  if (tone > 0.7) { s.albedo = P_BARK; s.cover = 0.66; }
  if (tone > 0.88) { s.albedo = P_UMBER; s.cover = 0.6; }
}

// A face: tall dot eyes under a level lid, a small mouth. f: the point, from the middle of the head.
void paintFace(inout Surf s, vec3 f, float spread, float blush) {
  float blink = step(0.965, fract(uTime * 0.27 + eLook.x));
  float side = f.x < 0.0 ? -1.0 : 1.0;
  vec2 e = vec2(f.x - side * spread, f.y + 0.015);
  vec2 sz = vec2(0.05, mix(0.085, 0.012, blink)) * (1.0 + 0.06 * side);
  float eye = smoothstep(1.0, 0.85, length(e / sz)) * step(e.y, 0.052);
  float glint = smoothstep(0.024, 0.014, length(e - vec2(-0.016, 0.03))) * (1.0 - blink);
  float lid = penLine(e.y - 0.058) * step(abs(e.x), 0.072);
  float mouth = penLine(f.y + 0.118 + f.x * f.x * 1.5) * step(abs(f.x), 0.034);
  s.ink = max(lid, mouth);
  // blush is a few rose ticks, rationed
  vec2 c = vec2(abs(f.x) - spread - 0.08, f.y + 0.095);
  float ticks = smoothstep(0.3, 0.1, abs(fract((c.x * 0.9 + c.y * 0.45) * 46.0) - 0.5)) * step(length(c * vec2(1.0, 1.7)), 0.055) * blush;
  if (ticks > 0.1) { s.albedo = P_ROSE; s.cover = ticks * 0.85; }
  if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0 - glint; s.solid = 1.0; s.ink = 0.0; }
}

void entSurf(vec3 p, float mat, inout Surf s) {
  int m = int(mat + 0.5);
  bool unit = kind < 0.5, human = kind > 0.5 && kind < 1.5, veiled = kind > 1.5 && kind < 2.5, karn = kind > 2.5 && kind < 3.5, lynd = kind > 3.5;
  vec3 f = p - hHead;
  if (m == 12) {
    // hands: a unit's are dark grips, the veiled wear gloves, a karn's are its hide
    if (unit || veiled) { s.albedo = P_CHARCOAL; s.cover = 0.85; }
    else if (karn) { s.albedo = eColC; s.cover = 0.74; }
    else skinTone(s);
  } else if (m == 0) {
    if (karn) {
      // hide in the karn's own pencil, paler down the front of the jaw; small eyes under a heavy brow
      s.albedo = eColC; s.cover = 0.74; s.wrap = 0.3;
      if (length(f) < 0.5 && f.z > 0.05) {
        s.cover = mix(0.74, 0.4, smoothstep(-0.05, -0.2, f.y) * smoothstep(0.1, 0.25, f.z));
        float blink = step(0.965, fract(uTime * 0.27 + eLook.x));
        vec2 e = vec2(abs(f.x) - 0.135, f.y - 0.03);
        float eye = smoothstep(1.0, 0.8, length(e / vec2(0.036, mix(0.045, 0.008, blink))));
        float brow = penLine(e.y - 0.07 - e.x * 0.3) * step(abs(e.x), 0.085);
        float mouth = penLine(f.y + 0.2) * step(abs(f.x), 0.1);
        float nose = max(penLine(length(vec2(abs(f.x) - 0.035, f.y + 0.085)) - 0.012), 0.0);
        s.ink = max(max(brow, mouth), nose * 0.8);
        if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
      }
    } else {
      skinTone(s);
      if (f.z > 0.05 && length(f) < 0.36) {
        paintFace(s, f, lynd ? 0.115 : 0.125, 1.0);
        if (lynd && s.solid < 0.5) s.ink = max(s.ink, smoothstep(0.02, 0.012, length(vec2(f.x, f.y + 0.07))));      // a small dark nose
      }
    }
  } else if (m == 1) {
    // hair: one pencil, laid a little unevenly, and a few strands drawn falling from the crown
    float ang = atan(f.x, f.z + 0.04);
    float lock = vnoise(vec2(ang * 3.2 + eLook.x * 40.0, 0.0));
    s.albedo = eColC; s.cover = mix(0.8, 0.94, lock);
    float strand = penLine((fract(ang * 2.4 + lock * 0.9) - 0.5) / 2.4 * 0.5) * step(0.45, vnoise(vec2(ang * 7.0, eLook.x * 9.0)));
    s.ink = strand * smoothstep(0.3, 0.12, f.y) * 0.5;
  } else if (m == 2 && unit) {
    // the scout's body: a white chest plate with a lamp in it, dark joints at the waist and upper arms,
    // white gauntlets with the corps' red at the wrist
    vec3 c = p - hChest;
    s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25;
    float belt = abs(p.y - hHip.y - 0.1) - 0.03;
    float dh = min(length(p - hHandL), length(p - hHandR));
    bool arm = abs(c.x) > 0.19;
    if (arm && dh > 0.21) { s.albedo = P_SLATE; s.cover = 0.84; }                    // upper arm: the joint
    if (arm && dh < 0.21) s.ink = penLine(dh - 0.205) * 0.8;
    if (dh < 0.135) { s.albedo = eColA; s.cover = 0.86; s.ink = penLine(dh - 0.13) * 0.8; }
    if (!arm) {
      if (p.y < hHip.y + 0.15) { s.albedo = P_SLATE; s.cover = 0.84; }              // the waist: a dark joint
      s.ink = max(penLine(p.y - hHip.y - 0.15), penLine(c.y + 0.045) * step(0.07, abs(c.x)) * 0.5) * 0.85;
      float lamp = length(c.xy - vec2(0.0, 0.05));
      if (c.z > 0.04 && lamp < 0.07) { s.albedo = P_SKY; s.cover = lamp < 0.048 ? 0.3 : 0.9; s.glow = lamp < 0.048 ? 0.7 : 0.0; s.ink = penLine(lamp - 0.07) * 0.8; }
      if (belt < 0.0) { s.albedo = eColA; s.cover = 0.86; s.ink = 0.0; }
    }
  } else if (m == 2 && veiled) {
    // the robe: one colour to the ground, a pale band at the hem, long folds
    s.albedo = eColA; s.cover = 0.86;
    float hem = step(p.y, 0.15);
    s.cover = mix(s.cover, 0.14, hem);
    float folds = penLine((abs(fract(atan(p.x - hHip.x, p.z - hHip.z) * 1.6 + 0.25) - 0.5)) / 1.6 * 0.22) * smoothstep(hHip.y, hHip.y - 0.12, p.y) * (1.0 - hem);
    s.ink = max(max(penLine(p.y - 0.15), penLine(p.y - 0.185) * 0.6), folds * 0.5);
    // a cord at the waist
    if (abs(p.y - hHip.y - 0.1) < 0.02) { s.albedo = eColB; s.cover = 0.9; s.ink = 0.0; }
  } else if (m == 2) {
    // a jacket (or a karn's vest) in the wearer's colour: a belt, a pale band down the front, a pale hem
    vec3 c = p - hChest;
    s.albedo = eColA; s.cover = 0.84;
    float belt = abs(p.y - hHip.y - 0.075) - 0.026;
    bool torso = abs(c.x) < 0.17 * kWide();
    if (karn) {
      // a vest, open down the front over the hide, stitched along its edges
      if (torso && c.z > 0.0 && abs(c.x) < 0.07 + (c.y + 0.1) * 0.25) { s.albedo = eColC; s.cover = 0.6; }
      if (torso && c.z > 0.0) s.ink = penLine(abs(c.x) - 0.07 - (c.y + 0.1) * 0.25) * 0.8;
    } else {
      if (belt < 0.0 && torso) { s.albedo = P_UMBER; s.cover = 0.95; }
      s.ink = penLine(belt) * 0.9 * float(torso);
      if (torso && c.z > 0.0 && abs(c.x) < 0.022 && belt > 0.0) { s.albedo = P_CREAM; s.cover = 0.12; }           // the fastening down the front
      if (torso && c.z > 0.0 && belt > 0.0) s.ink = max(s.ink, penLine(abs(c.x) - 0.022) * 0.6);
      // a pocket on the chest, and the skirt's hem drawn as one line
      if (torso && c.z > 0.05) s.ink = max(s.ink, penLine(sdBox(vec3(c.x - 0.085, c.y + 0.02, 0.0), vec3(0.035, 0.028, 1.0))) * 0.6);
      s.ink = max(s.ink, penLine(p.y - hHip.y + 0.045) * 0.7 * float(torso));
    }
    // cuffs
    float dh = min(length(p - hHandL), length(p - hHandR));
    if (!torso && dh < 0.14) { s.albedo = P_CREAM; s.cover = 0.14; s.ink = penLine(dh - 0.135) * 0.8; }
  } else if (m == 3) {
    float below = hHip.y - p.y;                 // how far under the hip joint
    if (unit) {
      // white plates over the hips, the thighs and the shins; the joints between them dark
      s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25;
      bool crotch = abs(p.x - hHip.x) < 0.04 && below > -0.02;
      bool joint = (below > 0.1 && below < 0.15) || crotch;
      if (joint) { s.albedo = P_SLATE; s.cover = 0.84; }
      s.ink = max(max(penLine(below - 0.1), penLine(below - 0.15)), penLine(abs(p.x - hHip.x) - 0.04) * step(-0.02, below) * step(below, 0.1)) * 0.8;

    } else if (lynd) {
      // short trousers; from the knee down, their own fur
      s.albedo = P_SLATE; s.cover = 0.8;
      if (below > 0.15) { s.albedo = eColC; s.cover = 0.86; s.wrap = 0.4; }
      s.ink = penLine(below - 0.15) * 0.8;
    } else {
      // trousers: slate, charcoal or tan from one person to the next (a karn's are always dark)
      float pick = fract(eLook.x * 9.13);
      s.albedo = karn || pick < 0.4 ? P_CHARCOAL : (pick < 0.75 ? P_SLATE : P_TAN); s.cover = 0.8;
      if (karn && below > 0.17) { s.albedo = P_TAN; s.cover = 0.6; s.ink = penLine(fract(below * 22.0) - 0.5) * 0.5; }     // shins bound in cord
    }
  }
  else if (m == 4) {
    if (unit) {
      // armoured boots: white, a sole in the corps' colour, a line where the cuff ends
      s.albedo = P_SKY; s.cover = 0.12;
      if (p.y < 0.05) { s.albedo = eColA; s.cover = 0.86; }
      s.ink = max(penLine(p.y - 0.05), penLine(p.y - 0.14) * 0.7) * 0.8;
    } else if (lynd) {
      // paws: fur, pale at the toes
      vec3 q = p - (abs(p.x - hFootL.x) < abs(p.x - hFootR.x) ? hFootL : hFootR);
      s.albedo = eColC; s.cover = mix(0.86, 0.14, smoothstep(0.03, 0.07, q.z)); s.wrap = 0.4;
      s.ink = penLine(abs(q.x) - 0.03) * step(0.07, q.z) * 0.6;
    } else {
      // boots: dark, a paler sole, a folded cuff
      s.albedo = karn ? P_UMBER : P_CHARCOAL; s.cover = 0.86;
      if (p.y < 0.035) { s.albedo = P_TAN; s.cover = 0.5; }
      s.ink = max(penLine(p.y - 0.035) * 0.6, penLine(p.y - 0.15) * 0.7);
    }
  }
  else if (m == 5) {
    s.albedo = eColB; s.cover = 0.86;
    if (veiled) {
      // the hood's opening is edged with a pale band
      float rim = f.z * 0.9 - f.y * 0.18 - 0.2;
      if (rim > -0.035 && length(f) < 0.45) { s.albedo = P_CREAM; s.cover = 0.14; }
      s.ink = penLine(rim + 0.035) * step(length(f), 0.45) * 0.7;
    }
    if (lynd) s.ink = penLine(p.y - hChest.y + 0.09) * 0.8;                      // the cape's hem
    if (karn) {
      float below = hHip.y - p.y;
      if (below > 0.0) { s.albedo = P_BARK; s.cover = 0.82; s.ink = max(penLine(below - 0.19) * 0.7, penLine(abs(p.x - hHip.x) - 0.06) * 0.35); }      // the kilt: hide, a stitched border
      else s.ink = penLine(length(vec2(p.x - hHip.x, p.y - hHip.y - 0.07)) - 0.03) * step(0.0, p.z - hHip.z) * 0.8;                                    // the belt's round buckle
    }
  } else if (m == 6) { s.albedo = P_STONE; s.cover = 0.6; }                     // the headset
  else if (m == 7) heldSurf(hKit, hLook, false, s);
  else if (m == 9) {
    if (unit) { s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25; s.ink = penLine(abs(p.y - hChest.y - 0.085) - 0.06) * 0.6; }
    else if (karn) { s.albedo = eColB; s.cover = 0.86; s.ink = penLine(length(p - hChest - vec3(-0.26, 0.12, 0.0)) - 0.1) * 0.7; }      // the shoulder plate
    else { s.albedo = P_BARK; s.cover = 0.8; s.ink = penLine(p.y - hHip.y - 0.06) * 0.7; }                                            // the satchel
  }
  else if (m == 10) {
    // the helmet: white shell, a dark visor round the front, two lamps in it for eyes
    s.albedo = P_SKY; s.cover = 0.1; s.wrap = 0.25;
    vec2 v = vec2(atan(f.x, f.z), f.y + 0.02);
    float vis = (length(max(vec2(abs(v.x) - 0.78, abs(v.y) - 0.035), 0.0)) - 0.1) * 0.34;
    s.ink = max(penLine(vis) * 0.9, penLine(f.y - 0.2) * 0.35 * step(abs(f.x), 0.3));
    if (vis < 0.0 && f.z > -0.02) {
      float blink = step(0.965, fract(uTime * 0.27 + eLook.x));
      float side = v.x < 0.0 ? -1.0 : 1.0;
      vec2 e = vec2(v.x - side * 0.37, v.y);
      float eye = length(e / vec2(0.105, mix(0.085, 0.012, blink)));
      s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0;
      // one streak of sky across the glass
      if (abs(v.y - 0.075 + v.x * 0.05) < 0.012 && v.x > 0.5 && v.x < 0.8) { s.albedo = P_SKY; s.cover = 0.3; s.solid = 0.0; }
      if (eye < 1.0) { s.albedo = mix(P_SKY, P_TEAL, 0.3); s.cover = eye < 0.72 ? 0.12 : 0.8; s.solid = 0.0; s.glow = eye < 0.72 ? 0.9 : 0.0; }
    }
  }
  else if (m == 11) {
    // bone: horn and tusk, or the mask of the veiled. Paper, with a little drawn on it.
    s.albedo = P_CREAM; s.cover = 0.1; s.wrap = 0.3;
    if (veiled) {
      // two narrow eyes that slant up and out, and one small light on the brow
      float blink = step(0.97, fract(uTime * 0.19 + eLook.x));
      vec2 e = vec2(abs(f.x) - 0.075, f.y - 0.01 - (abs(f.x) - 0.075) * 0.45);
      float eye = smoothstep(1.0, 0.8, length(e / vec2(0.05, mix(0.02, 0.004, blink))));
      float mark = length(vec2(f.x, f.y - 0.115) * vec2(1.0, 0.6));
      s.ink = penLine(f.x) * step(f.y, -0.09) * step(-0.19, f.y) * 0.5;
      if (eye > 0.3) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; s.ink = 0.0; }
      if (mark < 0.022) { s.albedo = mix(P_SKY, P_TEAL, 0.4); s.cover = 0.3; s.glow = 0.9; }
    } else s.ink = step(0.62, vnoise(vec2(f.y * 30.0, f.x * 6.0))) * 0.35;        // rings on a horn
  }
  else if (m == 13) { s.albedo = INK_BLACK; s.cover = 1.0; s.solid = 1.0; }        // the dark inside a hood
  else if (m == 14) {
    // fur: ears and tail in the hair's colour, the inside of an ear and the tip of the tail left pale
    s.albedo = eColC; s.cover = 0.86; s.wrap = 0.4;
    float tail = smoothstep(-0.5, -0.6, p.z - hHip.z) * step(p.y, hChest.y);
    float inner = step(-0.03, f.z) * step(0.24, f.y) * smoothstep(0.07, 0.045, abs(abs(f.x) - 0.17 - (f.y - 0.2) * 0.33)) * smoothstep(0.64, 0.56, f.y);
    s.cover = mix(s.cover, 0.12, max(tail, inner));
    s.ink = step(0.7, vnoise(vec2(p.y * 34.0, p.x * 18.0 + p.z * 18.0))) * 0.4 * (1.0 - inner);
  }
  else if (m == 15) frameSurf(p - hChest, kWide(), s);
  else if (m == 16 || m == 17) unitSurf(p - hChest - vec3(0.0, 0.0, unit ? -0.275 : -0.2 * max(kWide(), 1.0)), hUnit, m == 17, s);
  else heldSurf(hKit, hLook, true, s);          // the light of what is in the hand
}
`,
});
