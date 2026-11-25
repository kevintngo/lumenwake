// Small inline SVG icons, drawn in code so the game ships no image files.
// Drawn like the rest of the interface: a pale line on blueprint blue, a pencil colour inside.

const svg = (body, view = '0 0 40 40') => `<svg viewBox="${view}" aria-hidden="true" fill="none" stroke="#dff0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const css = (c) => `rgb(${c.join(',')})`;

export const SKILL_ICONS = {
  slam: svg(`<path d="M20 5v17" stroke-width="3.4"/><path d="M13 16l7 7 7-7" stroke-width="2.6"/><ellipse cx="20" cy="30" rx="14" ry="4.5" stroke="#ffc94a"/><path d="M6 24l-2-3M34 24l2-3M12 22l-1-4M28 22l1-4" stroke="#d64634"/>`),
  volley: svg(`<path d="M6 13h17M6 20h23M6 27h17" stroke-width="2.6"/><path d="M23 9l8 4-8 4zM29 16l8 4-8 4zM23 23l8 4-8 4z" fill="#8fd8ff" stroke-width="1.4"/>`),
  nova: svg(`<circle cx="20" cy="20" r="13" stroke="#8fd8ff" stroke-width="2.6"/><circle cx="20" cy="20" r="6" fill="#8fd8ff" stroke-width="1.4"/><path d="M20 3v6M20 31v6M3 20h6M31 20h6M8 8l4 4M28 28l4 4M32 8l-4 4M12 28l-4 4" stroke-width="1.6"/>`),
  cleave: svg(`<path d="M6 31C9 15 21 6 35 7 25 12 17 21 15 34z" fill="#f1ebdc"/><path d="M9 25c4-8 10-13 18-15M11 29c3-7 8-11 14-13" stroke-width="1.4"/><path d="M27 30l6 4M30 26l5 2" stroke="#d64634"/>`),
  bolt: svg(`<circle cx="24" cy="16" r="9.5" fill="#f09e4a"/><path d="M24 11c3 1 4 4 3 6s-4 3-6 1 0-5 3-3" stroke-width="1.5"/><path d="M5 35l9-9M9 27l5-2M13 35l3-6" stroke="#d64634"/>`),
  mend: svg(`<path d="M20 34C8 25 6 18 9 13c3-5 9-4 11 0 2-4 8-5 11 0 3 5 1 12-11 21z" fill="#86c06a"/><path d="M20 15v10M15 20h10" stroke="#f1ebdc" stroke-width="3.2"/>`),
  step: svg(`<path d="M8 10l11 10L8 30M20 10l11 10-11 10" stroke="#546c9c" stroke-width="4.2"/><path d="M4 16h6M3 24h6" stroke-width="1.5"/>`),
};

const flask = (c) => svg(`<path d="M12.5 24h15l3.5 6a3 3 0 0 1-3 5H12a3 3 0 0 1-3-5z" fill="${c}" stroke="none"/><path d="M16 8v7L9 27a5 5 0 0 0 4 8h14a5 5 0 0 0 4-8l-7-12V8"/><rect x="15" y="4" width="10" height="4" rx="1.5" fill="#b08054"/><path d="M13 24h14" stroke-width="1.4"/>`);
const pouch = (c) => svg(`<path d="M12 14c-6 6-8 20 8 20s14-14 8-20z" fill="${c}"/><path d="M13 14c2-3 1-6-1-8h16c-2 2-3 5-1 8z" fill="#f1ebdc"/><path d="M12 14h16" stroke="#d64634" stroke-width="2.4"/>`);
const gem = (c) => svg(`<path d="M20 4l12 10-12 22L8 14z" fill="${c}"/><path d="M8 14h24M20 36V14M20 4l-5 10M20 4l5 10" stroke-width="1.4"/>`);

export function itemIcon(item) {
  const c = css(item.color);
  if (item.kind === 'use') return flask(c);
  return item.drop === 3 ? gem(c) : pouch(c);
}

// ---- gear: one drawing for each family of weapon, one for a frame, one for a unit
export const GEAR_ICONS = {
  blade: svg(`<path d="M15 24L30 6h5v5L18 27z" fill="#f1ebdc"/><path d="M18.5 23.5L31 10" stroke-width="1.4"/><path d="M11 20l10 10" stroke-width="3"/><path d="M14.5 27.5L9 33" stroke="#ff8a70" stroke-width="4"/><circle cx="7.5" cy="34.5" r="2" fill="#ffc45e"/>`),
  rifle: svg(`<path d="M4 15h22l3 2v5H17l-1 3h-5l-1-3H4z" fill="#88b4d8"/><path d="M29 19h8" stroke-width="3"/><path d="M11 15v-4h10v4" stroke-width="1.6"/><path d="M19 25l2 8h-5l-1-8" fill="#b08054"/><path d="M8 18.5h14" stroke="#ffc45e" stroke-width="1.6"/>`),
  wand: svg(`<path d="M9 35L24 17" stroke-width="3.2"/><path d="M28 3l7 9-7 9-7-9z" fill="#86e6dc"/><path d="M28 3v18M21 12h14" stroke-width="1.3"/><path d="M12 31.5l3 2.6" stroke="#ffc45e" stroke-width="2.6"/><path d="M15 6l1 3M35 24l2 2M12 14l3 1" stroke-width="1.5"/>`),
  frame: svg(`<path d="M12 5l8 3 8-3 6 7-5 5v14l-9 4-9-4V17l-5-5z" fill="#e2bc82"/><path d="M20 8v27" stroke-width="1.4"/><path d="M11 22h18" stroke="#ff8a70" stroke-width="2.4"/><path d="M14 27h4M22 27h4" stroke-width="1.4"/>`),
  unit: svg(`<path d="M20 4l13 7.5v17L20 36 7 28.500v-17z" fill="#1c3a80"/><circle cx="20" cy="20" r="6.5" fill="#fff3c4"/><path d="M20 4v6M20 30v6M7 11.500l5.500 3M27.500 25.500l5.500 3M33 11.500l-5.500 3M12.500 25.500l-5.500 3" stroke-width="1.5"/>`),
};
/**
 * The drawing for a piece of gear. `base` is its row in content/gear.js. Once the game has drawn the pieces
 * themselves (app/portrait.js: the very shapes the hero carries and wears), the tile shows that; until then,
 * and for an empty slot, the line drawing above for its family or slot.
 */
const ELDER_ART = {};
/** A picture of an elder on nothing (app/portrait.js draws them once the game has begun). */
export function setElderArt(byId) { Object.assign(ELDER_ART, byId); }
export const elderPic = (id) => ELDER_ART[id] || '';
const GEAR_ART = {};
export function setGearArt(byBase) { Object.assign(GEAR_ART, byBase); }
export const gearIcon = (base) => (GEAR_ART[base.id] ? `<img class="gear-art" src="${GEAR_ART[base.id]}" alt="" draggable="false" />` : GEAR_ICONS[base.family] || GEAR_ICONS[base.slot] || GEAR_ICONS.unit);

// ---- the four attributes, and the lumen's three tempers
export const ATTR_ICONS = {
  might: svg(`<path d="M10 20h20" stroke-width="3.4"/><rect x="9" y="11" width="5" height="18" rx="1.5" fill="#ffab98"/><rect x="26" y="11" width="5" height="18" rx="1.5" fill="#ffab98"/><path d="M5 15v10M35 15v10" stroke-width="3"/>`),
  grace: svg(`<path d="M32 5C17 7 9 17 8 33c13-2 22-10 24-28z" fill="#ffcc74"/><path d="M8 33L27 11" stroke-width="1.6"/><path d="M14 26l-1-7M19 21l-1-7M24 15.500l-1-5M14.500 26.500l7 1M19.500 21.500l6 1" stroke-width="1.4"/>`),
  vigor: svg(`<path d="M20 4l13 4.500v9.500c0 9-5.500 14.500-13 18-7.500-3.500-13-9-13-18V8.500z" fill="#86c06a"/><path d="M20 13v12M14 19h12" stroke="#f1ebdc" stroke-width="3.4"/>`),
  mind: svg(`<path d="M20 3l4.500 12.500L37 20l-12.500 4.500L20 37l-4.500-12.500L3 20l12.500-4.500z" fill="#86e6dc"/><circle cx="20" cy="20" r="3" fill="#f1ebdc" stroke-width="1.4"/>`),
};
export const TEMPER_ICONS = {
  ember: svg(`<path d="M21 3c1 7 9 10 9 19a10 10 0 0 1-20 0c0-4 2-7 4-9 0 4 2 6 4 6-1-6 0-11 3-16z" fill="#ff8a70"/><path d="M20 34a4.500 4.500 0 0 1-4.500-4.500c0-3 2.500-4 4.500-7.500 2 3.500 4.500 4.500 4.500 7.500A4.500 4.500 0 0 1 20 34z" fill="#ffd772" stroke-width="1.2"/>`),
  shell: svg(`<path d="M4 28a16 16 0 0 1 32 0z" fill="#ffcc74"/><path d="M20 12v16M11.500 15l4 13M28.500 15l-4 13" stroke-width="1.5"/><path d="M3 32h34" stroke-width="2.6"/>`),
  tide: svg(`<path d="M3 15c4-5 8-5 11.500 0s7.500 5 11 0 7-4.500 11.500-1" stroke="#86e6dc" stroke-width="2.8"/><path d="M3 24c4-5 8-5 11.500 0s7.500 5 11 0 7-4.500 11.500-1" stroke-width="2.2"/><path d="M3 33c4-5 8-5 11.500 0s7.500 5 11 0 7-4.500 11.500-1" stroke="#86e6dc" stroke-width="1.8"/>`),
};

// ---- the settings' four sections
export const SET_ICONS = {
  display: svg(`<rect x="4" y="7" width="32" height="21" fill="#1c3a80"/><path d="M14 34h12M20 28v6"/><path d="M9 22l6-7 5 5 4-3 7 6" stroke="#ffc45e" stroke-width="1.6"/>`),
  sound: svg(`<path d="M6 16h6l8-7v22l-8-7H6z" fill="#88b4d8"/><path d="M25 14a8 8 0 0 1 0 12M29 10a13 13 0 0 1 0 20"/>`),
  controls: svg(`<path d="M15 5h10v10h10v10H25v10H15V25H5V15h10z" fill="#1c3a80"/><circle cx="20" cy="20" r="3" fill="#ffc45e" stroke-width="1.2"/>`),
  access: svg(`<circle cx="20" cy="20" r="16"/><circle cx="20" cy="11" r="2.600" fill="#dff0ff" stroke-width="1"/><path d="M11 16.500h18M20 16.500v8M20 24.500l-5 8M20 24.500l5 8" stroke-width="2.4"/>`),
};

SET_ICONS.saves = svg(`<path d="M7 6h21l6 6v22H7z" fill="#1c3a80"/><path d="M12 6v9h13V6" stroke-width="1.6"/><rect x="12" y="21" width="16" height="13" fill="#f1ebdc" stroke-width="1.4"/><path d="M15 26h10M15 30h6" stroke="#14295f" stroke-width="1.6"/>`);

export const MENU_ICONS = {
  gear: GEAR_ICONS.frame,
  contract: svg(`<path d="M9 4h15l7 7v25H9z" fill="#f1ebdc"/><path d="M24 4v7h7" stroke-width="1.6"/><path d="M14 17h12M14 22h12M14 27h6" stroke="#14295f" stroke-width="1.8"/><circle cx="26" cy="29" r="4" fill="#ff8a70" stroke="#14295f" stroke-width="1.4"/>`),
  guide: svg(`<path d="M20 9c-4-3-9-3-14-2v24c5-1 10-1 14 2 4-3 9-3 14-2V7c-5-1-10-1-14 2z" fill="#1c3a80"/><path d="M20 9v24" stroke-width="1.6"/><path d="M10 14h6M10 19h6M24 14h6M24 19h6" stroke="#ffc45e" stroke-width="1.6"/>`),
  menu: svg(`<path d="M7 11h26M7 20h26M7 29h26" stroke-width="3.2"/>`),
  character: svg(`<circle cx="20" cy="13" r="7" fill="#f1ebdc"/><path d="M7 35c0-9 6-13 13-13s13 4 13 13z" fill="#d64634"/>`),
  bag: svg(`<path d="M9 16h22l2 17a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" fill="#e2bc82"/><path d="M14 16v-3a6 6 0 0 1 12 0v3"/>`),
  lumen: svg(`<circle cx="20" cy="20" r="5.5" fill="#fff3c4"/><ellipse cx="20" cy="20" rx="14" ry="5" fill="none" transform="rotate(-24 20 20)"/><path d="M20 6v4M20 30v4M8 12l3 2.5M29 25.5l3 2.5"/>`),
  view: svg(`<path d="M4 20c5-8 11-11 16-11s11 3 16 11c-5 8-11 11-16 11S9 28 4 20z" fill="none"/><circle cx="20" cy="20" r="5.5" fill="#88b4d8"/><circle cx="20" cy="20" r="1.6" fill="#dff0ff"/>`),
  help: svg(`<circle cx="20" cy="20" r="15" fill="none"/><path d="M15 16a5 5 0 1 1 7 4.5c-1.5 1-2 2-2 3.5" stroke-width="2.6"/><circle cx="20" cy="29" r="1.4" fill="#dff0ff"/>`),
  sound: svg(`<path d="M7 16h6l8-7v22l-8-7H7z" fill="#88b4d8"/><path d="M26 14a8 8 0 0 1 0 12M30 10a13 13 0 0 1 0 20"/>`),
  muted: svg(`<path d="M7 16h6l8-7v22l-8-7H7z" fill="#f1ebdc"/><path d="M26 15l8 10M34 15l-8 10" stroke="#d64634" stroke-width="2.4"/>`),
};

// the touch screen's own buttons
export const ACT_ICONS = {
  attack: svg(`<path d="M14 23L29 6h5v5L17 26z" fill="#f1ebdc"/><path d="M17.5 22.5L30 10" stroke-width="1.4"/><path d="M10 19l11 11" stroke-width="3"/><path d="M13.5 26.5L8 32" stroke="#d64634" stroke-width="4"/><circle cx="6.5" cy="33.5" r="2" fill="#e2b034"/>`).replace('<svg ', '<svg class="i-attack" '),
  talk: svg(`<path d="M6 8h28v18H20l-8 7v-7H6z" fill="#f1ebdc"/><path d="M12 14.5h16M12 20h10" stroke-width="1.6"/>`).replace('<svg ', '<svg class="i-talk" '),
  jump: svg(`<path d="M20 29V8" stroke-width="3.6"/><path d="M11 17l9-9 9 9" stroke-width="3.6"/><path d="M9 35h22" stroke="#ffc45e" stroke-width="2.8"/>`),
  next: svg(`<circle cx="20" cy="20" r="4.5" fill="#d64634"/><path d="M8 17a12.5 12.5 0 0 1 22-6M32 23a12.5 12.5 0 0 1-22 6"/><path d="M31 4v8h-8M9 36v-8h8"/>`),
};
