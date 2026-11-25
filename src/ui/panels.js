// Windows. One large frame in the middle of the screen, used three ways:
//
//   the menu     five tabs: Character, Gear, Lumen, Contract, Guide (keys C, B, L, J, H)
//   the shop     opened by talking to the quartermaster
//   the board    opened by talking to the dispatcher
//
// Each body is a function that builds its HTML from game state; clicks on
// anything with `data-act` call a game system and the body is built again.
// Nothing scrolls on a desktop screen: where a list can grow (gear, supplies,
// food) it is a grid of tiles with one detail pane beside it, and the button
// that acts on the selected tile lives in that pane.
//
// The menu holds the game while it is open (`holding`, read by ui.js), so it
// reads its own keys; ui.js hands them over through `key(e)`.

import { ATTRIBUTES, BAG_GEAR, derive, xpToNext } from '../sim/stats.js';
import { CLASSES, FAMILIES } from '../content/classes.js';
import { GEAR_SLOTS } from '../content/gear.js';
import { describe, canUse, itemPrice, baseOf, rarityOf } from '../sim/items.js';
import { ITEMS, SHOP_STOCK, RECIPES } from '../content/items.js';
import { TALENTS, rank, takeTalent } from '../content/talents.js';
import { biomeById } from '../content/themes.js';
import { GOALS } from '../sim/systems/missions.js';
import { PEOPLES } from '../content/peoples.js';
import { CREATURES } from '../content/creatures.js';
import { BOONS } from '../content/sites.js';
import { LUMENS, TEMPERS, FOODS, LUMEN_STAGES, LUMEN_MAX, LUMEN_STEP } from '../content/companions.js';
import { lumenLevel, lumenToNext, lumenStage, lumenMods, lumenTotal } from '../sim/lumen.js';
import { SKILL_ICONS, MENU_ICONS, ATTR_ICONS, TEMPER_ICONS, GEAR_ICONS, itemIcon, gearIcon , setGearArt } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (v) => `${Math.round(v * 100)}%`;
const NUMERAL = ['', 'I', 'II', 'III', 'IV', 'V'];
const SLOT_NAME = Object.fromEntries(GEAR_SLOTS);
const art = (name) => `./static/art/${name}.webp`;

export const TABS = [
  { id: 'character', name: 'Character', key: 'C', icon: MENU_ICONS.character },
  { id: 'gear', name: 'Gear', key: 'B', icon: MENU_ICONS.gear },
  { id: 'lumen', name: 'Lumen', key: 'L', icon: MENU_ICONS.lumen },
  { id: 'contract', name: 'Contract', key: 'J', icon: MENU_ICONS.contract },
  { id: 'guide', name: 'Guide', key: 'H', icon: MENU_ICONS.guide },
];
const TAB_OF = { character: 'character', bag: 'gear', gear: 'gear', lumen: 'lumen', contract: 'contract', help: 'guide', guide: 'guide' };   // what 'ui:toggle' may ask for
const TAB_KEYS = { KeyC: 'character', KeyB: 'gear', KeyI: 'gear', KeyL: 'lumen', KeyJ: 'contract', KeyH: 'guide' };
const TITLES = { menu: 'Menu', shop: 'Trade', bounty: 'Contracts' };
const HOLDS = { menu: true };        // which windows hold the game still while they are open

/** A stat line of an item ("+6 Attack"), its number coloured by which way it goes. */
const line = (t) => esc(t).replace(/^([+\-]?\d+(?:\.\d+)?%?)/, (m) => `<b class="${m[0] === '-' ? 'c-bad' : 'c-good'}">${m}</b>`);

export class Panels {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.kind = null;          // what is open: null | 'menu' | 'shop' | 'bounty'
    this.tab = 'character';    // the menu's tab
    this.el = null;            // the window
    this.picked = {};          // the selected tile of each grid: gear, food, shop
    this.trader = null;
    this.onChange = null;      // told when a window opens or closes (ui.js: holding the game, the menu buttons)
    this.step = null;          // the first steps' current step (app/tutorial.js), said in the foot of whatever window is open
    const bus = game.bus;
    bus.on('ui:toggle', (id) => { if (TAB_OF[id]) this.toggle(TAB_OF[id]); });
    bus.on('ui:close', () => this.close());
    bus.on('npc:talk', (npc) => {
      // the dispatcher and the quartermaster open their windows; anyone else has a word to say
      if (npc.role === 'shop' || npc.role === 'bounty') { this.trader = npc; this.show(npc.role); return; }
      const says = npc.says || ['Fair winds.'];
      npc.said = ((npc.said ?? -1) + 1) % says.length;
      bus.emit('talk', { npc, line: says[npc.said] });
    });
    bus.on('portrait', (d) => { if (d.gear) setGearArt(d.gear); });        // (before the refresh below: the tiles are redrawn with them)
    for (const ev of ['lumen:changed', 'lumen:level', 'lumen:ready', 'lumen:burst', 'bag:changed', 'levelup', 'trade', 'xp', 'boon', 'talent', 'portrait',
      'mission:taken', 'mission:begin', 'mission:progress', 'mission:done', 'room:clear', 'site:used', 'class', 'people']) bus.on(ev, () => this.refresh());
    bus.on('zone', () => this.close());
    bus.on('guide', (d) => { this.step = d || null; this.refresh(); });

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b && !b.disabled) this.act(b.dataset.act, b.dataset.arg, b);
    });
    root.addEventListener('dblclick', (e) => {      // twice on a tile: the button in its detail pane
      const t = e.target.closest('.tile[data-key], .worn-tile[data-key]');
      const go = t && this.el && this.el.querySelector('.detail .btn.primary:not(:disabled)');
      if (go) go.click();
    });
    // what a thing does is said in the foot of the window while the pointer or the focus is on it
    const tip = (e) => {
      const t = e.target instanceof Element && e.target.closest('[data-tip]');
      const foot = this.el && this.el.querySelector('.win-tip');
      if (t && foot) foot.textContent = t.dataset.tip;
    };
    root.addEventListener('pointerover', tip);
    root.addEventListener('focusin', (e) => {
      tip(e);
      const t = e.target.closest('.tile[data-key], .worn-tile[data-key]');      // focusing a tile shows it, as clicking does
      if (t && t.getAttribute('aria-pressed') !== 'true') this.pick(t.dataset.ctx, t.dataset.key);
    });
  }

  /** Is the game to be held still for what is open? */
  get holding() { return !!HOLDS[this.kind]; }

  toggle(tab) { if (this.kind === 'menu' && this.tab === tab) this.close(); else this.show('menu', tab); }

  /** Opens a window (the menu at a tab), or brings the one that is open to that tab. */
  show(kind, tab) {
    const g = this.game;
    if (!g.started || g.cinema.blocking || !TITLES[kind]) return;
    if (this.kind !== kind) {
      this.close(true);
      this.kind = kind;
      const scrim = Object.assign(document.createElement('div'), { className: 'scrim' });
      scrim.dataset.act = 'close';
      const el = this.el = document.createElement('section');
      el.className = `win plate win-${kind}`;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', TITLES[kind]);
      el.tabIndex = -1;                       // a click on bare paper keeps the keys in the window
      el.innerHTML = `<header class="win-head"></header><div class="win-body"></div><footer class="win-foot"></footer>`;
      this.root.append(scrim, el);
    }
    if (tab) this.tab = tab;
    this.draw(true);
    g.bus.emit('ui:click');
    if (this.onChange) this.onChange();
  }

  close(quiet = false) {
    if (!this.kind) return;
    this.kind = null; this.el = null;
    this.root.replaceChildren();
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) document.activeElement.blur();      // the keys go back to the game
    if (!quiet && this.onChange) this.onChange();
  }
  closeAll() { this.close(); }

  /** Builds what is open again from the game's state, keeping the focus where it was. */
  refresh() { if (this.kind) this.draw(false); }

  draw(fresh) {
    const el = this.el, kind = this.kind, g = this.game, s = g.player.sheet;
    const had = !fresh && el.contains(document.activeElement) ? document.activeElement : null;
    const key = had && (had.dataset.key || (had.dataset.act ? `${had.dataset.act}:${had.dataset.arg || ''}` : had.id));
    const purse = `<span class="coin purse" title="Glint">${s.glint}</span><button type="button" class="x" data-act="close" aria-label="Close" title="Close (Esc)">×</button>`;
    const head = el.querySelector('.win-head'), body = el.querySelector('.win-body'), foot = el.querySelector('.win-foot');
    const touch = g.touch;
    // The first steps' card is under the window, so its line is said here instead of the key hints.
    const st = this.step, step = st ? `<span class="win-step"><b>First steps</b><span>${esc(touch && st.touch ? st.touch : st.text)}</span></span>` : '';
    if (kind === 'menu') {
      const alert = s.picks > 0 || s.points > 0;
      head.innerHTML = `<div class="tabs" role="tablist" aria-label="Menu">${TABS.map((t) => `<button type="button" role="tab" class="tab" id="tab-${t.id}" data-act="tab" data-arg="${t.id}"
        aria-selected="${t.id === this.tab}" aria-controls="win-pane" tabindex="${t.id === this.tab ? 0 : -1}" title="${t.name}${touch ? '' : ` (${t.key})`}">${t.icon}<span>${t.name}</span>${touch ? '' : `<kbd aria-hidden="true">${t.key}</kbd>`}${t.id === 'character' && alert ? '<i class="pip" aria-label="Something to choose"></i>' : ''}</button>`).join('')}</div>${purse}`;
      body.className = `win-body tab-${this.tab}`;
      body.id = 'win-pane';
      body.setAttribute('role', 'tabpanel');
      body.setAttribute('aria-labelledby', `tab-${this.tab}`);
      body.innerHTML = this[this.tab]();
      foot.innerHTML = `${step || `<span class="win-keys">${touch ? '' : '<kbd>Q</kbd><kbd>E</kbd> Switch tab <i></i> <kbd>Esc</kbd> Close'}</span>`}<span class="win-tip" aria-live="polite">${TIPS[this.tab]}</span>`;
    } else {
      const n = this.trader, taken = g.missions.pending;
      const says = kind === 'shop' ? 'Flasks, and whatever came up on the last lift.' : taken ? 'The pad is warm. South gate.' : 'Three places want a surveyor. Pick one.';
      head.innerHTML = `<div class="speaker">${n ? `<img src="${art('crew-' + n.name.toLowerCase())}" alt="" />` : ''}<div><strong class="c-name">${esc(n ? n.name : TITLES[kind])}</strong><small>${esc(n ? n.title || '' : '')}</small><p>“${says}”</p></div></div>${purse}`;
      body.className = `win-body win-${kind}-body`;
      body.innerHTML = this[kind]();
      foot.innerHTML = `${step || `<span class="win-keys">${touch ? '' : '<kbd>Esc</kbd> Close'}</span>`}<span class="win-tip" aria-live="polite">${TIPS[kind]}</span>`;
    }
    // the focus: where it was, or (a window just opened) on its tab, or on the window itself
    let to = key ? [...el.querySelectorAll('[data-key], [data-act], [id]')].find((x) => !x.disabled && (x.dataset.key || (x.dataset.act ? `${x.dataset.act}:${x.dataset.arg || ''}` : x.id)) === key) : null;
    if (fresh) to = el.querySelector('[role="tab"][aria-selected="true"]') || el.querySelector('.btn.primary:not(:disabled)');
    if (fresh || had) (to || el).focus({ preventScroll: true });
    // the figures that stand alive in a window (app/portrait.js draws them on these, and turns them when dragged)
    for (const box of el.querySelectorAll('.figure.live')) g.portraits.mount(box, box.dataset.stage);
  }

  /** Selects a tile: the grid marks it and the detail pane beside it shows it. */
  pick(ctx, key) {
    this.picked[ctx] = key;
    if (!this.el) return;
    for (const t of this.el.querySelectorAll(`[data-ctx="${ctx}"][data-key]`)) t.setAttribute('aria-pressed', String(t.dataset.key === key));
    const pane = this.el.querySelector(`.detail[data-for="${ctx}"]`);
    if (pane) pane.innerHTML = this.detail(ctx);
  }

  act(name, arg, el) {
    const g = this.game, p = g.player, s = p.sheet;
    if (name === 'close') return this.close();
    if (name === 'tab') return this.show('menu', arg);
    if (name === 'pick') { this.pick(el.dataset.ctx, el.dataset.key); g.bus.emit('ui:click'); return; }
    if (name === 'note') return;          // (a chip: what it says is in the foot of the window)
    if (name === 'attr') { if (s.points > 0) { s.base[arg]++; s.points--; derive(p); g.bus.emit('ui:click'); } }
    else if (name === 'use') g.loot.use(arg);
    else if (name === 'feed') g.companion.feed(arg);
    else if (name === 'feedall') { for (let i = g.loot.count(arg); i > 0 && g.companion.feed(arg); i--); }
    else if (name === 'equip') {
      const it = s.gear.find((x) => x.uid === +arg);
      if (g.loot.equip(+arg) && it) this.picked.gear = 'worn:' + baseOf(it).slot;        // the selection follows the piece onto the hero
    }
    else if (name === 'sellgear') g.loot.sellGear(+arg);
    else if (name === 'buygear') g.loot.buyGear(+arg);
    else if (name === 'sell') g.loot.sell(arg, 1);
    else if (name === 'sellall') g.loot.sell(arg, g.loot.count(arg));
    else if (name === 'sellmats') g.loot.sellMaterials();
    else if (name === 'buy') g.loot.buy(arg);
    else if (name === 'accept') g.missions.accept(+arg);
    else if (name === 'abandon') g.missions.drop();
    else if (name === 'talent') { if (takeTalent(s, arg)) { derive(p); g.bus.emit('talent', { id: arg, name: TALENTS[arg].name }); g.bus.emit('ui:click'); } }
    else if (name === 'craft') g.loot.craft(+arg);
    this.refresh();
  }

  /**
   * A key pressed while a window is open. Returns true if the window took it.
   * Escape closes; in the menu the tab keys and Q / E change tab; arrows move along the tabs and over a grid of tiles.
   */
  key(e) {
    if (!this.kind) return false;
    const code = e.code, t = e.target instanceof Element ? e.target : null;
    if (code === 'Escape') { this.close(); return true; }
    if (e.metaKey || e.ctrlKey || e.altKey || (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return false;
    if (this.kind === 'menu') {
      if (TAB_KEYS[code]) { this.toggle(TAB_KEYS[code]); return true; }
      if (code === 'KeyQ' || code === 'KeyE') { this.step(code === 'KeyE' ? 1 : -1); return true; }
    }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[code];
    if (t && dir && dir[0] && t.matches('.figure.live')) { this.game.portraits.turn(t, dir[0] * 0.35); return true; }
    if (!t || (!dir && code !== 'Home' && code !== 'End')) return false;
    if (t.matches('[role="tab"]')) {
      if (dir && dir[1]) return false;
      const i = TABS.findIndex((x) => x.id === this.tab);
      this.show('menu', TABS[code === 'Home' ? 0 : code === 'End' ? TABS.length - 1 : (i + dir[0] + TABS.length) % TABS.length].id);
      return true;
    }
    if (dir && t.matches('.tile, .worn-tile')) {
      // the nearest tile in that direction, in this grid or the next one over
      const from = t.getBoundingClientRect(), fx = from.left + from.width / 2, fy = from.top + from.height / 2;
      let best = null, score = 1e9;
      for (const o of this.el.querySelectorAll('button.tile, button.worn-tile')) {
        if (o === t) continue;
        const r = o.getBoundingClientRect(), dx = r.left + r.width / 2 - fx, dy = r.top + r.height / 2 - fy;
        const along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
        if (along < 4 || across > along * 1.5 + 24) continue;
        if (along + across * 2 < score) { score = along + across * 2; best = o; }
      }
      if (best) best.focus();
      return true;
    }
    return false;
  }
  step(d) {
    const i = TABS.findIndex((x) => x.id === this.tab);
    this.show('menu', TABS[(i + d + TABS.length) % TABS.length].id);
  }

  // ------------------------------------------------------------ pieces
  /**
   * A figure standing alive in the window, on a floor ring of the page's own: the hero, or their lumen. Dragging
   * turns it, and so do the arrow keys. (app/portrait.js draws it on the canvas, which is wider than its box and
   * clear where the figure is not, so a staff may swing out over the margin; the box is what takes the pointer.)
   */
  stage(what, label) {
    return `<div class="figure live stage-${what}" data-stage="${what}" tabindex="0" role="img" aria-label="${label} Drag it, or press the left and right arrow keys, to turn it.">
      <svg class="floor" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true"><ellipse class="disc" cx="100" cy="100" rx="64" ry="64"/><ellipse class="ring-a" cx="100" cy="100" rx="98" ry="98"/><ellipse class="ring-b" cx="100" cy="100" rx="80" ry="80"/></svg>
      <canvas class="stage" aria-hidden="true"></canvas>
      <span class="turn-hint" aria-hidden="true">Drag to turn</span></div>`;
  }
  heroFigure() { return this.stage('hero', 'Your surveyor.'); }

  /** A tile for a piece of gear: a drawing of what kind of thing it is, bordered in its rarity's colour. */
  gearTile(item, ctx, key) {
    const d = describe(item), R = rarityOf(item), cannot = !canUse(this.game.player.sheet.cls, item);
    return `<button type="button" class="tile${cannot ? ' cannot' : ''}" style="--rc:${R.color}" data-act="pick" data-ctx="${ctx}" data-key="${key}" aria-pressed="${this.picked[ctx] === key}"
      aria-label="${esc(d.name)}, ${R.name} ${d.slot}, level ${d.ilvl}${cannot ? ', not for your class' : ''}" data-tip="${esc(d.name)} · ${R.name} ${d.slot} · level ${d.ilvl}">${gearIcon(baseOf(item))}<span class="lv">${d.ilvl}</span></button>`;
  }
  /** A tile for a stack in the bag. */
  bagTile(b, ctx, key) {
    const it = ITEMS[b.id];
    return `<button type="button" class="tile" data-act="pick" data-ctx="${ctx}" data-key="${key}" aria-pressed="${this.picked[ctx] === key}" aria-label="${esc(it.name)}, ${b.n}" data-tip="${esc(it.name)}${it.desc ? ' · ' + esc(it.desc) : ''}">${itemIcon(it)}<span class="count">${b.n}</span></button>`;
  }
  blanks(n) { return n > 0 ? '<div class="tile empty"></div>'.repeat(n) : ''; }

  /** What a food gives the lumen, as coloured words. */
  feeds(id) {
    const f = FOODS[id];
    return f ? TEMPERS.filter((t) => f[t.id]).map((t) => `<b class="${t.cls}">+${f[t.id]} ${t.name}</b>`).join(' · ') : '';
  }

  /** A piece of gear in a detail pane: what it is, every line it gives, and the piece it would replace. */
  gearDetail(item, foot, worn = false) {
    const g = this.game, s = g.player.sheet, d = describe(item), R = rarityOf(item), b = baseOf(item);
    const cannot = !canUse(s.cls, item), now = !worn && s.equip[b.slot];
    const versus = now ? (() => { const w = describe(now); return `<div class="versus"><small>Worn now</small><strong style="color:${w.color}">${esc(w.name)}</strong><small>${[...w.implicit, ...w.affixes].map(line).join(' · ')}</small></div>`; })() : '';
    return `<div class="detail-head"><span class="tile" style="--rc:${R.color}">${gearIcon(b)}</span>
        <div><strong class="name" style="color:${d.color}">${esc(d.name)}</strong>
        <small><span style="color:${d.color}">${d.rarity}</span> ${SLOT_NAME[d.slot].toLowerCase()}${d.family ? ` · ${FAMILIES[d.family].name}` : ''} · Level <b class="c-num">${d.ilvl}</b></small></div></div>
      <ul class="lines">${[...d.implicit, ...d.affixes].map((t) => `<li>${line(t)}</li>`).join('')}</ul>
      ${d.power ? `<p class="power">${esc(d.power)}</p>` : ''}
      ${cannot ? '<p class="c-bad">Not for your class.</p>' : ''}
      ${versus}
      <div class="detail-foot">${foot}</div>`;
  }

  /** The detail pane of a grid: whatever is selected there, with the button that acts on it. */
  detail(ctx) {
    const g = this.game, p = g.player, s = p.sheet;
    let key = this.picked[ctx] || '';
    let [kind, id] = key.split(':');
    const find = () => (kind === 'worn' ? s.equip[id] : kind === 'gear' ? s.gear.find((it) => String(it.uid) === id) : kind === 'stock' ? g.missions.stock[+id] : s.bag.find((b) => b.id === id && (ctx !== 'food' || FOODS[id])));
    let it = key ? find() : null;
    if (!it) {
      // nothing selected, or it has gone (worn, sold, eaten): the first thing in the grid
      const first = this.el && this.el.querySelector(`[data-ctx="${ctx}"][data-key]`);
      key = this.picked[ctx] = first ? first.dataset.key : '';
      [kind, id] = key.split(':');
      it = key ? find() : null;
      if (first) first.setAttribute('aria-pressed', 'true');
    }
    if (!it) return `<p class="quiet">${ctx === 'food' ? 'Nothing to feed it. It eats what creatures drop.' : ctx === 'shop' ? 'Select a piece to see it.' : 'Nothing carried yet. Creatures, pods and contracts pay in gear.'}</p>`;
    if (kind === 'worn') return this.gearDetail(it, `<span class="coin">Worth ${describe(it).value}</span><span class="tag">Worn</span>`, true);
    if (kind === 'gear') {
      const v = describe(it).value;
      return this.gearDetail(it, ctx === 'shop'
        ? `<span class="quiet">Yours</span><button type="button" class="btn primary" data-act="sellgear" data-arg="${it.uid}">Sell · ${v}</button>`
        : `<span class="coin">Sells for ${v}</span><button type="button" class="btn primary" data-act="equip" data-arg="${it.uid}" ${canUse(s.cls, it) ? '' : 'disabled'}>Equip</button>`);
    }
    if (kind === 'stock') {
      const price = itemPrice(it), full = s.gear.length >= BAG_GEAR;
      return this.gearDetail(it, `<span class="quiet">${full ? 'Your pack is full' : 'For sale'}</span><button type="button" class="btn primary" data-act="buygear" data-arg="${id}" ${s.glint < price || full ? 'disabled' : ''}>Buy · ${price}</button>`);
    }
    // a stack in the bag: a flask, a material
    const item = ITEMS[it.id], feeds = this.feeds(it.id);
    let foot;
    if (ctx === 'shop') foot = item.value ? `<button type="button" class="btn" data-act="sellall" data-arg="${it.id}">Sell all · ${item.value * it.n}</button><button type="button" class="btn primary" data-act="sell" data-arg="${it.id}">Sell one · ${item.value}</button>` : '<span class="quiet">Bram has no use for it.</span>';
    else if (ctx === 'food') foot = `${it.n > 1 ? `<button type="button" class="btn" data-act="feedall" data-arg="${it.id}">Feed all ${it.n}</button>` : '<span></span>'}<button type="button" class="btn primary" data-act="feed" data-arg="${it.id}" aria-label="Feed it one ${esc(item.name)}">Feed</button>`;
    else {
      const full = item.kind === 'use' && (item.effect === 'heal' ? p.hp >= p.maxHp : p.focus >= p.maxFocus);
      foot = `${feeds ? `<button type="button" class="btn" data-act="feed" data-arg="${it.id}" aria-label="Feed one ${esc(item.name)} to your lumen">Feed lumen</button>` : '<span></span>'}
        ${item.kind === 'use' ? `<button type="button" class="btn primary" data-act="use" data-arg="${it.id}" ${full ? 'disabled' : ''} title="${full ? 'Nothing to restore' : ''}">Drink</button>` : ''}`;
    }
    return `<div class="detail-head"><span class="tile">${itemIcon(item)}</span>
        <div><strong class="name c-item">${esc(item.name)}</strong><small>${item.kind === 'use' ? 'Flask' : 'Material'} · <b class="c-num">×${it.n}</b></small></div></div>
      ${item.desc ? `<p>${esc(item.desc)}</p>` : ''}
      <ul class="lines">${feeds ? `<li>Lumen: ${feeds}</li>` : ''}${item.value ? `<li><span class="coin">Sells for ${item.value}</span></li>` : ''}</ul>
      <div class="detail-foot">${foot}</div>`;
  }

  /** One piece of gear as a card (the contract report's prize). */
  gearCard(item) {
    const d = describe(item);
    return `<div class="gear"><strong style="color:${d.color}">${esc(d.name)}</strong>
      <small><span style="color:${d.color}">${d.rarity}</span> ${d.slot} · Level <b class="c-num">${d.ilvl}</b></small>
      <small class="line">${[...d.implicit, ...d.affixes].map(line).join(' · ')}</small>
      ${d.power ? `<small class="power">${esc(d.power)}</small>` : ''}</div>`;
  }

  // ------------------------------------------------------------ the menu's tabs
  character() {
    const g = this.game, p = g.player, s = p.sheet, need = xpToNext(s.level);
    const offer = s.picks > 0 && s.offer ? `<section class="char-offer" aria-label="A talent to choose">
        <h3 class="label">Choose a talent${s.picks > 1 ? ` <span class="chip hot">${s.picks} to choose</span>` : ''}</h3>
        <div class="offer-row">${s.offer.map((id) => {
          const t = TALENTS[id], r = rank(s, id);
          return `<div class="pickcard"><div><strong class="c-key">${t.name}${t.max > 1 ? ` ${NUMERAL[r + 1]}` : ''}</strong><small>${t.desc}</small></div>
            <button type="button" class="btn primary" data-act="talent" data-arg="${id}" aria-label="Choose ${t.name}: ${esc(t.desc)}">Choose</button></div>`;
        }).join('')}</div></section>` : '';
    const attrs = ATTRIBUTES.map((a) => {
      const bonus = p.attr[a.id] - s.base[a.id];
      return `<div class="attr-tile" data-tip="${a.name}: ${esc(a.hint)}" title="${esc(a.hint)}">${ATTR_ICONS[a.id]}<span class="attr-name">${a.name}</span>
        <span class="attr-val">${s.base[a.id]}${bonus ? `<u>+${bonus}</u>` : ''}</span>
        <button type="button" class="plus" data-act="attr" data-arg="${a.id}" ${s.points ? '' : 'disabled'} aria-label="Raise ${a.name}: ${esc(a.hint)}" data-tip="${a.name}: ${esc(a.hint)}">+</button></div>`;
    }).join('');
    // [name, value, what it is]
    const stats = [['Health', p.maxHp, 'Health'], ['Focus', p.maxFocus, 'Focus: what abilities cost'], ['Attack', p.attack.toFixed(0), 'Attack: what a blow does'], ['Haste', p.attackSpeed.toFixed(2), 'Haste: attacks a second'],
      ['Armor', p.defense.toFixed(0), 'Armor: taken off every blow'], ['Critical', pct(p.crit), 'The chance a blow is critical'], ['Crit hit', pct(p.critDamage), 'What a critical blow does, beside a plain one'], ['Dodge', pct(p.dodge), 'The chance a blow misses you'],
      ['Power', pct(p.power), 'Technique power: how hard abilities hit'], ['Speed', pct(p.speedMul), 'How fast you run']]
      .map(([k, v, tip]) => `<div data-tip="${tip}" title="${tip}"><span>${k}</span><b>${v}</b></div>`).join('');
    const skills = g.skills.list.map((k) => {
      const open = s.level >= k.unlock, cost = `${k.focus} focus · ready every ${k.cooldown} s`;
      return `<div class="ability${open ? '' : ' locked'}" data-tip="${esc(k.name)}: ${cost}" title="${cost}">${SKILL_ICONS[k.icon] || ''}
        <div><strong>${esc(k.name)}</strong><small>${esc(k.desc)}</small></div>
        ${open ? (g.touch ? '' : `<kbd>${k.key}</kbd>`) : `<span class="chip">Level ${k.unlock}</span>`}</div>`;
    }).join('');
    const ids = [...new Set([...Object.keys(s.talents || {}), ...Object.keys(s.bonus || {})])].filter((id) => rank(s, id) > 0);
    const talents = ids.map((id) => `<button type="button" class="chip" data-act="note" data-tip="${TALENTS[id].name}: ${esc(TALENTS[id].desc)}" title="${esc(TALENTS[id].desc)}">${TALENTS[id].name}${TALENTS[id].max > 1 || rank(s, id) > 1 ? ` <b>${NUMERAL[rank(s, id)] || rank(s, id)}</b>` : ''}</button>`).join('');
    return `<div class="char${offer ? ' has-offer' : ''}">
      <section class="char-figure" aria-label="Who you are">${this.heroFigure()}
        <div class="who-card"><strong class="c-${s.cls}">${esc(p.name || 'Surveyor')}</strong><small>${PEOPLES[s.people || 'unit'].name} · ${CLASSES[s.cls].name}</small>
          <div class="who-level"><span>Level <b class="c-num">${s.level}</b></span><span class="c-xp">${s.xp} / ${need}</span></div>
          <div class="bar xp" role="img" aria-label="Experience: ${s.xp} of ${need}"><i style="transform:scaleX(${Math.min(1, s.xp / need).toFixed(3)})"></i></div></div></section>
      ${offer}
      <div class="char-main">
        <section><h3 class="label">Attributes ${s.points ? `<span class="chip hot">${s.points} ${s.points === 1 ? 'point' : 'points'} to spend</span>` : ''}</h3><div class="attr-grid">${attrs}</div></section>
        <section><h3 class="label">Numbers</h3><div class="stats">${stats}</div></section>
      </div>
      <section class="char-side"><h3 class="label">Abilities</h3><div class="abilities">${skills}</div></section>
      <section class="char-talents"><h3 class="label">Talents</h3><div class="chips">${talents || '<span class="quiet">Each level brings a choice of three.</span>'}</div></section>
    </div>`;
  }

  gear() {
    const s = this.game.player.sheet;
    const worn = GEAR_SLOTS.map(([slot, name]) => {
      const it = s.equip[slot];
      if (!it) return `<div class="worn-tile empty"><span class="worn-icon">${GEAR_ICONS[slot === 'weapon' ? CLASSES[s.cls].family : slot]}</span><span class="worn-words"><small>${name}</small><strong>Empty</strong></span></div>`;
      const d = describe(it);
      return `<button type="button" class="worn-tile" style="--rc:${d.color}" data-act="pick" data-ctx="gear" data-key="worn:${slot}" aria-pressed="${this.picked.gear === 'worn:' + slot}"
        aria-label="${name}: ${esc(d.name)}, ${d.rarity}" data-tip="${name} · ${esc(d.name)}"><span class="worn-icon">${gearIcon(baseOf(it))}</span><span class="worn-words"><small>${name}</small><strong style="color:${d.color}">${esc(d.name)}</strong></span></button>`;
    }).join('');
    const carried = s.gear.map((it) => this.gearTile(it, 'gear', 'gear:' + it.uid)).join('') + this.blanks(BAG_GEAR - s.gear.length);
    const bag = s.bag.map((b) => this.bagTile(b, 'gear', 'bag:' + b.id)).join('') + this.blanks(Math.max(0, 10 - s.bag.length));
    const html = `<div class="gearview">
      <section class="gear-worn" aria-label="Worn">${this.heroFigure()}<div class="worn-col"><h3 class="label">Worn</h3>${worn}</div></section>
      <div class="gear-grids">
        <section><h3 class="label">Carried <span class="quiet">${s.gear.length} of ${BAG_GEAR}</span></h3><div class="tiles">${carried}</div></section>
        <section><h3 class="label">Supplies and materials</h3><div class="tiles">${bag}</div></section>
      </div>
      <aside class="detail" data-for="gear" aria-label="Selected" aria-live="polite"></aside>
    </div>`;
    return this.withDetail(html, 'gear');
  }

  /** Fills a body's detail pane (the pane needs the body's tiles to choose a first selection from). */
  withDetail(html, ctx) {
    const box = document.createElement('div');
    box.innerHTML = html;
    const keep = this.el;
    this.el = box;                       // (detail() looks for the grid's first tile here)
    const pane = box.querySelector(`.detail[data-for="${ctx}"]`);
    if (this.picked[ctx] && !box.querySelector(`[data-ctx="${ctx}"][data-key="${this.picked[ctx]}"]`)) this.picked[ctx] = '';
    pane.innerHTML = this.detail(ctx);
    this.el = keep;
    return box.innerHTML;
  }

  /** The lumen: what it is, what it lends, what it lets go, and what there is to feed it. */
  lumen() {
    const g = this.game, s = g.player.sheet, l = s.lumen, L = LUMENS[l.kind], level = lumenLevel(l), stage = lumenStage(l);
    const most = Math.max(8, l.ember, l.shell, l.tide);
    const tempers = TEMPERS.map((t) => `<div class="temper" data-tip="${t.name}: lends ${t.gives}">${TEMPER_ICONS[t.id]}<span class="${t.cls}">${t.name}</span>
      <span class="bar"><i class="${t.cls}" style="transform:scaleX(${(l[t.id] / most).toFixed(3)})"></i></span><b class="c-num">${l[t.id]}</b><small>${t.gives}</small></div>`).join('');
    const share = (v) => `+${Math.round(v * 1000) / 10}%`;
    const m = Object.fromEntries(lumenMods(l).map((x) => [x.stat, x.value]));
    const lends = [['Attack', share(m.attack)], ['Armor', '+' + m.defense.toFixed(1)], ['Health', share(m.maxHp)], ['Technique', share(m.power)], ['Focus recovery', share(m.focusRegen)]]
      .map(([k, v]) => `<div><span>${k}</span><b class="c-good">${v}</b></div>`).join('');
    const next = stage < 2 ? `New shape at level <b class="c-num">${LUMEN_STAGES[stage + 1]}</b>, by its strongest temper.` : 'It has taken its last shape.';
    const into = level < LUMEN_MAX ? (lumenTotal(l) % LUMEN_STEP) / LUMEN_STEP : 1;
    // what there is to feed it: what creatures drop before the flasks (which it will eat, but you may want), the richest stack first
    const worth = (b) => TEMPERS.reduce((sum, t) => sum + (FOODS[b.id][t.id] || 0), 0) * b.n;
    const foods = s.bag.filter((b) => FOODS[b.id] && b.n > 0).sort((x, y) => (ITEMS[x.id].kind === 'use') - (ITEMS[y.id].kind === 'use') || worth(y) - worth(x));
    const html = `<div class="lumenview">
      <section class="lumen-figure" aria-label="Your lumen">${this.stage('lumen', 'Your lumen.')}
        <div class="who-card"><strong class="c-key">${L.name}</strong><small>${L.blurb}</small>
          <div class="who-level"><span>Level <b class="c-num">${level}</b></span><span class="quiet">${level < LUMEN_MAX ? `${lumenToNext(l)} to the next` : 'Full grown'}</span></div>
          <div class="bar lu" role="img" aria-label="Toward its next level"><i style="transform:scaleX(${into.toFixed(3)})"></i></div></div></section>
      <div class="lumen-main">
        <section class="card burst${l.charge >= 100 ? ' full' : ''}"><h3 class="label">Burst${g.touch ? '' : ' <kbd>G</kbd>'}</h3>
          <p><strong class="c-key">${L.burst.name}</strong>${L.burst.text}</p>
          <div class="charge"><div class="bar lu" role="img" aria-label="Charge: ${Math.round(l.charge)} of 100"><i style="transform:scaleX(${(l.charge / 100).toFixed(3)})"></i></div><b class="c-num">${Math.round(l.charge)}%</b></div></section>
        <section><h3 class="label">Tempers</h3><div class="tempers">${tempers}</div></section>
        <section><h3 class="label">Lends you</h3><div class="stats lends">${lends}</div></section>
        <p class="quiet">${next}</p>
      </div>
      <section class="lumen-feed"><h3 class="label">Feed it</h3><div class="tiles">${foods.map((b) => this.bagTile(b, 'food', 'food:' + b.id)).join('')}${this.blanks(Math.max(0, 8 - foods.length))}</div>
        <aside class="detail" data-for="food" aria-label="Selected food" aria-live="polite"></aside></section>
    </div>`;
    return this.withDetail(html, 'food');
  }

  /** The contract being run, or the one taken, or where to get one. */
  contract() {
    const g = this.game, ms = g.missions, a = ms.active, o = a ? a.offer : ms.pending, s = g.player.sheet, w = g.world;
    if (!o) return `<div class="contract-none"><img src="${art('place-town')}" alt="" />
      <div><h3>No contract</h3><p>Ilse, the dispatcher, has three. She stands before the hall.</p><p class="quiet">Contracts run: <b class="c-num">${s.missions || 0}</b></p></div></div>`;
    const B = biomeById(o.biome), goal = GOALS[o.goal], elder = o.goal === 'hunt' && B.boss ? CREATURES[B.boss] : null;
    const row = (name, now, of) => `<div class="prog${now >= of ? ' done' : ''}"><span>${name}</span><b class="c-num">${now} of ${of}</b><div class="bar"><i style="transform:scaleX(${(of ? Math.min(1, now / of) : 0).toFixed(3)})"></i></div></div>`;
    let rows = '';
    if (a) {
      const fights = a.rooms.filter((_, i) => w.rooms[i] && w.rooms[i].kind === 'fight'), clear = fights.filter((r) => r.state === 'clear').length;
      if (fights.length) rows += row('Islands cleared', clear, fights.length);
      if (o.goal === 'recover') rows += row('Survey cores', a.cores, a.need);
      if (o.goal === 'hunt') rows += `<div class="prog${a.done ? ' done' : ''}"><span>${elder ? esc(elder.name) : 'The elder'}</span><b class="${a.done ? 'c-good' : 'c-foe'}">${a.done ? 'Down' : 'On the last island'}</b></div>`;
      if (a.markNeed) rows += row('Survey marks', a.marks, a.markNeed);
      rows += `<div class="prog"><span>Beacon</span><b class="${a.revealed ? 'c-good' : 'quiet'}">${a.revealed ? 'Found: the rest is on your map' : 'Not found'}</b></div>`;
    }
    const time = a ? `${Math.floor(a.time / 60)}:${String(Math.floor(a.time % 60)).padStart(2, '0')}` : '';
    const boon = s.boon && BOONS[s.boon] ? `<div class="card boon-card"><div class="label">Boon</div><p><strong class="c-good">${BOONS[s.boon].name}</strong> ${BOONS[s.boon].desc}</p></div>` : '';
    return `<div class="contractview">
      <section class="contract-pic"><img src="${art('place-' + o.biome)}" alt="" />${elder ? `<img class="elder" src="${art('elder-' + B.boss)}" alt="" />` : ''}</section>
      <section class="contract-info">
        <div class="label">${a ? (a.done ? 'Done: lifting out' : 'On contract') : 'Contract taken'}</div>
        <h3>${esc(o.name)}</h3>
        <p><b class="c-place">${esc(B.name)}</b> · <b class="c-goal-${o.goal}">${goal.name}</b> · Level <b class="c-num">${o.tier}</b></p>
        ${a ? '' : '<p class="quiet">Step onto the pad at the south gate to go down.</p>'}
        ${rows ? `<div class="progs">${rows}</div>` : ''}
        ${boon}
        <div class="stats pay"><div><span>Experience</span><b class="c-xp">${o.xp}</b></div><div><span>Glint</span><b class="c-coin">${o.glint}</b></div>${a ? `<div><span>Time</span><b>${time}</b></div><div><span>Felled</span><b class="c-foe">${a.kills}</b></div>` : '<div><span>Also pays</span><b>A piece of gear</b></div>'}</div>
        ${a ? '' : '<div class="detail-foot"><span></span><button type="button" class="btn" data-act="abandon">Hand it back</button></div>'}
      </section>
    </div>`;
  }

  /** The controls, in three short columns. */
  guide() {
    const col = (title, rows) => `<section><h3 class="label">${title}</h3><div class="keys-list">${rows.map(([k, t]) => `<span class="keys">${k.split(' ').map((x) => `<kbd>${x}</kbd>`).join('')}</span><span>${t}</span>`).join('')}</div></section>`;
    const cols = this.game.touch ? [
      col('Move and look', [['Stick', 'Walk'], ['Tap', 'Move, attack or talk'], ['Arrow', 'Jump'], ['Drag', 'Turn the view'], ['Pinch', 'Zoom']]),
      col('Fight', [['Sword', 'Attack. Hold to keep going'], ['Round', 'Abilities'], ['Arrows', 'Next target'], ['Flasks', 'Tonic, Draught'], ['Lumen', 'Its burst, when full']]),
      col('Menus', [['Figure', 'Character'], ['Frame', 'Gear'], ['Light', 'Lumen'], ['Lines', 'Pause and settings']]),
    ] : [
      col('Move and look', [['W A S D', 'Walk'], ['Click', 'Move, attack or talk'], ['Space', 'Jump'], ['Right-drag', 'Turn the view'], ['Wheel', 'Zoom']]),
      col('Fight', [['F', 'Attack, or talk'], ['Tab', 'Next target'], ['1 2 3 4', 'Abilities'], ['R T', 'Tonic, Draught'], ['G', 'Lumen’s burst']]),
      col('Menus', [['C', 'Character'], ['B', 'Gear'], ['L', 'Lumen'], ['J', 'Contract'], ['H', 'This guide'], ['M', 'Sound on or off'], ['Esc', 'Close, or pause']]),
    ];
    const note = (title, text) => `<div class="card"><strong>${title}</strong><small>${text}</small></div>`;
    return `<div class="guideview"><div class="guide-cols">${cols.join('')}</div>
      <div class="guide-notes">${note('Loot', 'Walk over it to pick it up.')}${note('Supply pods', 'They open once their island is quiet.')}${note('Side islands', 'Marks pay extra. A beacon maps the rest. A crystal lends a boon.')}${note('Your lumen', 'Feed it what creatures drop. What it eats decides its shape.')}</div></div>`;
  }

  // ------------------------------------------------------------ the two windows opened by talking
  shop() {
    const g = this.game, s = g.player.sheet;
    const stock = SHOP_STOCK.map((id) => {
      const it = ITEMS[id];
      return `<div class="buyrow" data-tip="${esc(it.name)} · ${esc(it.desc)}">${itemIcon(it)}<div><strong>${it.name}</strong><small>${it.desc}</small></div>
        <button type="button" class="btn" data-act="buy" data-arg="${id}" ${s.glint < it.price ? 'disabled' : ''} aria-label="Buy ${it.name} for ${it.price} glint">Buy · ${it.price}</button></div>`;
    }).join('');
    const made = RECIPES.map((r, i) => {
      const needs = Object.keys(r.needs).map((id) => `${ITEMS[id].name} <b class="${g.loot.count(id) >= r.needs[id] ? 'c-good' : 'c-bad'}">${Math.min(g.loot.count(id), r.needs[id])}/${r.needs[id]}</b>`).join(', ');
      const can = s.glint >= r.glint && Object.keys(r.needs).every((id) => g.loot.count(id) >= r.needs[id]);
      return `<div class="buyrow">${itemIcon(ITEMS[r.id])}<div><strong>${ITEMS[r.id].name}</strong><small>${needs}</small></div>
        <button type="button" class="btn" data-act="craft" data-arg="${i}" ${can ? '' : 'disabled'} aria-label="Make ${ITEMS[r.id].name} for ${r.glint} glint">Make · ${r.glint}</button></div>`;
    }).join('');
    const mats = s.bag.filter((b) => ITEMS[b.id].kind === 'mat').reduce((n, b) => n + ITEMS[b.id].value * b.n, 0);
    const html = `<div class="shopview">
      <div class="shop-buy">
        <section><h3 class="label">Supplies</h3>${stock}</section>
        <section><h3 class="label">Made from materials</h3>${made}</section>
      </div>
      <div class="shop-grids">
        <section><h3 class="label">For sale</h3><div class="tiles">${g.missions.stock.map((it, i) => this.gearTile(it, 'shop', 'stock:' + i)).join('')}${this.blanks(5 - g.missions.stock.length)}</div></section>
        <section><h3 class="label">Your gear <span class="quiet">${s.gear.length} of ${BAG_GEAR}</span></h3><div class="tiles">${s.gear.map((it) => this.gearTile(it, 'shop', 'gear:' + it.uid)).join('')}${this.blanks(BAG_GEAR - s.gear.length)}</div></section>
        <section><h3 class="label">Your bag <button type="button" class="btn small" data-act="sellmats" ${mats ? '' : 'disabled'}>Sell all materials · ${mats}</button></h3><div class="tiles">${s.bag.map((b) => this.bagTile(b, 'shop', 'bag:' + b.id)).join('')}${this.blanks(Math.max(0, 10 - s.bag.length))}</div></section>
      </div>
      <aside class="detail" data-for="shop" aria-label="Selected" aria-live="polite"></aside>
    </div>`;
    return this.withDetail(html, 'shop');
  }

  /** The dispatcher's board: three contracts side by side, each a place and a goal. */
  bounty() {
    const g = this.game, ms = g.missions, taken = ms.pending;
    const card = (o, i) => {
      const B = biomeById(o.biome), elder = o.goal === 'hunt' && B.boss ? CREATURES[B.boss] : null;
      return `<div class="contract${taken === o ? ' taken' : ''}">
        <div class="contract-art"><img src="${art('place-' + o.biome)}" alt="" />${elder ? `<img class="elder" src="${art('elder-' + B.boss)}" alt="" />` : ''}<span class="tier">Level <b class="c-num">${o.tier}</b></span></div>
        <div class="contract-words"><strong>${esc(o.name)}</strong>
          <small><b class="c-place">${esc(B.name)}</b></small>
          <small><b class="c-goal-${o.goal}">${GOALS[o.goal].name}</b>${elder ? `: <b class="c-foe">${esc(elder.name)}</b>` : ''}</small></div>
        <div class="stats pay"><div><span>Experience</span><b class="c-xp">${o.xp}</b></div><div><span>Glint</span><b class="c-coin">${o.glint}</b></div><div><span>Islands</span><b>${o.rooms}</b></div><div><span>Also</span><b>Gear</b></div></div>
        ${taken === o ? '<button type="button" class="btn" data-act="abandon">Hand it back</button>' : `<button type="button" class="btn${taken ? '' : ' primary'}" data-act="accept" data-arg="${i}" aria-label="Take ${esc(o.name)}">Take it</button>`}</div>`;
    };
    return `<div class="boardview">${ms.offers.map(card).join('')}</div>`;
  }
}

// what the foot of each window says until something is pointed at
const TIPS = {
  character: 'Point at anything to see what it does.',
  gear: 'Select a piece to see it. Double-click to put it on.',
  lumen: 'What it eats decides what it becomes.',
  contract: '',
  guide: '',
  shop: 'Select a piece to see it. Double-click to buy or sell.',
  bounty: 'Take one, then step onto the pad at the south gate.',
};
