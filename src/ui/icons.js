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

export const MENU_ICONS = {
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
  next: svg(`<circle cx="20" cy="20" r="4.5" fill="#d64634"/><path d="M8 17a12.5 12.5 0 0 1 22-6M32 23a12.5 12.5 0 0 1-22 6"/><path d="M31 4v8h-8M9 36v-8h8"/>`),
};
