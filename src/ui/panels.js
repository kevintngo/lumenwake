// Windows: character sheet, bag, trader, bounty board, help. Each is a render
// function that rebuilds its body from game state; clicks call game systems.
// Everything in here is reachable by mouse.

import { ATTRIBUTES, BAG_GEAR, derive, xpToNext } from '../sim/stats.js';
import { CLASSES } from '../content/classes.js';
import { GEAR_SLOTS } from '../content/gear.js';
import { describe, canUse, itemPrice } from '../sim/items.js';
import { ITEMS, SHOP_STOCK } from '../content/items.js';
import { TALENTS, rank, takeTalent } from '../content/talents.js';
import { RECIPES } from '../content/items.js';
import { VIEWS } from '../config.js';
import { BIOMES, biomeById } from '../content/themes.js';
import { GOALS } from '../sim/systems/missions.js';
import { itemIcon } from './icons.js';
import { PEOPLES } from '../content/peoples.js';
import { CREATURES } from '../content/creatures.js';
import { LUMENS, TEMPERS, FOODS, LUMEN_STAGES, LUMEN_MAX } from '../content/companions.js';
import { lumenLevel, lumenToNext, lumenStage, lumenMods } from '../sim/lumen.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Panels {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.open = new Map();   // id -> element
    const bus = game.bus;
    bus.on('ui:toggle', (id) => this.toggle(id));
    bus.on('ui:close', () => this.closeAll());
    bus.on('npc:talk', (npc) => {
      // the dispatcher and the quartermaster open their windows; anyone else has a word to say
      if (npc.role === 'shop' || npc.role === 'bounty') { this.trader = npc; this.show(npc.role === 'shop' ? 'shop' : 'bounty'); return; }
      const says = npc.says || ['Fair winds.'];
      npc.said = ((npc.said ?? -1) + 1) % says.length;
      bus.emit('talk', { npc, line: says[npc.said] });
    });
    for (const ev of ['lumen:changed', 'lumen:level', 'lumen:ready', 'lumen:burst', 'bag:changed', 'levelup', 'trade', 'bounty:changed', 'xp', 'attune', 'found', 'boon', 'talent']) bus.on(ev, () => this.refresh());

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) this.act(b.dataset.act, b.dataset.arg, b);
    });
    root.addEventListener('pointerover', (e) => {
      const c = e.target.closest('[data-item]');
      const hint = c && c.closest('.panel').querySelector('.hint');
      if (hint) {
        const it = ITEMS[c.dataset.item];
        hint.innerHTML = `<strong>${esc(it.name)}</strong> — ${esc(it.desc || '')}${it.value ? ` <span class="dim">Sells for ${it.value}.</span>` : ''}`;
      }
    });
  }

  spec(id) {
    return {
      character: { title: 'Character', side: 'left', body: () => this.character() },
      bag: { title: 'Bag', side: 'right', body: () => this.bag() },
      lumen: { title: 'Lumen', side: 'left', body: () => this.lumen() },
      shop: { title: 'Trade', side: 'right', body: () => this.shop() },
      bounty: { title: 'Contracts', side: 'right', body: () => this.bounty() },
      view: { title: 'View', side: 'right', body: () => this.view() },
      help: { title: 'How to Play', side: '', body: () => this.help() },
    }[id];
  }

  toggle(id) { if (this.open.has(id)) this.close(id); else this.show(id); }

  show(id) {
    const spec = this.spec(id);
    if (!spec) return;
    // one window per side keeps the middle of the screen clear
    for (const [other] of this.open) if (other !== id && (innerWidth < 1100 || this.spec(other).side === spec.side)) this.close(other);
    let el = this.open.get(id);
    if (!el) {
      el = document.createElement('section');
      el.className = `panel plate ${spec.side}`;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', spec.title);
      el.innerHTML = `<header><h2>${spec.title}</h2><button type="button" class="x" data-act="close" data-arg="${id}" aria-label="Close">×</button></header><div class="body"></div>`;
      this.root.appendChild(el);
      this.open.set(id, el);
    }
    el.querySelector('.body').innerHTML = spec.body();
    this.game.bus.emit('ui:click');
  }

  close(id) {
    const el = this.open.get(id);
    if (el) { el.remove(); this.open.delete(id); }
  }
  closeAll() { for (const [id] of this.open) this.close(id); }
  refresh() { for (const [id, el] of this.open) el.querySelector('.body').innerHTML = this.spec(id).body(); }

  act(name, arg, el) {
    const g = this.game, p = g.player, s = p.sheet;
    if (name === 'close') return this.close(arg);
    if (name === 'attr' && s.points > 0) { s.base[arg]++; s.points--; derive(p); g.bus.emit('ui:click'); }
    else if (name === 'use') g.loot.use(arg);
    else if (name === 'feed') g.companion.feed(arg);
    else if (name === 'equip') g.loot.equip(+arg);
    else if (name === 'sellgear') g.loot.sellGear(+arg);
    else if (name === 'buygear') g.loot.buyGear(+arg);
    else if (name === 'sell') g.loot.sell(arg, 1);
    else if (name === 'sellmats') g.loot.sellMaterials();
    else if (name === 'buy') g.loot.buy(arg);
    else if (name === 'accept') g.missions.accept(+arg);
    else if (name === 'abandon') g.missions.drop();
    else if (name === 'talent') { if (takeTalent(s, arg)) { derive(p); g.bus.emit('talent', { id: arg, name: TALENTS[arg].name }); g.bus.emit('ui:click'); } }
    else if (name === 'craft') g.loot.craft(+arg);
    else if (name === 'guide') { this.closeAll(); g.bus.emit('guide:restart'); return; }
    else if (name === 'cam') {
      const cam = g.camera;
      if (arg === 'left') cam.rotate(0.5, 0); else if (arg === 'right') cam.rotate(-0.5, 0);
      else if (arg === 'high') cam.rotate(0, 0.16); else if (arg === 'low') cam.rotate(0, -0.16);
      else if (arg === 'near') cam.zoom(0.84); else if (arg === 'far') cam.zoom(1.19);
      else if (VIEWS[arg]) Object.assign(cam.goal, { pitch: VIEWS[arg][0], distance: VIEWS[arg][1] * (g.touch ? 0.9 : 1) });
      else if (arg === 'full') {
        const d = document, root = d.documentElement;
        const on = d.fullscreenElement || d.webkitFullscreenElement;
        try {
          const done = on ? (d.exitFullscreen || d.webkitExitFullscreen).call(d) : (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
          if (done && done.catch) done.catch(() => {});
        } catch { /* the browser said no; the page simply stays as it is */ }
      }
      g.bus.emit('ui:click');
      return;      // the same button stays under the finger, so leave the sheet as it is
    }
    this.refresh();
  }

  // ------------------------------------------------------------ bodies
  character() {
    const p = this.game.player, s = p.sheet;
    const rows = ATTRIBUTES.map((a) => {
      const bonus = p.attr[a.id] - s.base[a.id];
      return `<div class="attr"><div><strong>${a.name}</strong><small>${a.hint}</small></div>
        <div class="val">${s.base[a.id]}${bonus ? `<u>+${bonus}</u>` : ''}</div>
        <button type="button" class="plus" data-act="attr" data-arg="${a.id}" ${s.points ? '' : 'disabled'} aria-label="Raise ${a.name}">+</button></div>`;
    }).join('');
    const skills = this.game.skills.list.map((k) => `<div class="attr" style="grid-template-columns:1fr auto"><div><strong>${k.name}</strong><small>${k.desc}</small></div>
      <div class="dim">${s.level >= k.unlock ? (this.game.touch ? 'Ready' : `Key ${k.key}`) : `Level ${k.unlock}`}</div></div>`).join('');
    // a talent to choose: three on offer, one to take
    const numeral = ['', 'I', 'II', 'III'];
    const offer = s.picks > 0 && s.offer ? `<div class="label">Choose a talent${s.picks > 1 ? ` (${s.picks} to choose)` : ''}</div>` + s.offer.map((id) => {
      const t = TALENTS[id], r = rank(s, id);
      return `<div class="offer"><strong>${t.name}${t.max > 1 ? ` ${numeral[r + 1]}` : ''}</strong><small>${t.desc}</small>
        <button type="button" class="btn primary" data-act="talent" data-arg="${id}" aria-label="Choose ${t.name}">Choose</button></div>`;
    }).join('') : '';
    const owned = Object.keys(s.talents || {}).map((id) => `${TALENTS[id].name}${TALENTS[id].max > 1 ? ' ' + numeral[rank(s, id)] : ''}`).join(', ');
    return `
      <div class="hero-card"><img src="${this.game.portraits.figure}" alt="" />
        <div><strong class="c-${s.cls}">${PEOPLES[s.people || 'unit'].name} ${CLASSES[s.cls].name}</strong>
          <small>Level <b class="c-num">${s.level}</b> · <b class="c-xp">${s.xp} / ${xpToNext(s.level)} experience</b></small>
          <small>${CLASSES[s.cls].blurb}</small></div></div>
      ${offer}
      <p class="${s.points ? '' : 'dim'}">${s.points ? `<strong style="color:var(--red-ink)">${s.points} points</strong> to spend.` : 'Gain a level to earn attribute points.'}</p>
      ${rows}
      <div class="sheet">
        <div><span>Health</span>${p.maxHp}</div><div><span>Focus</span>${p.maxFocus}</div>
        <div><span>Attack</span>${p.attack.toFixed(0)}</div><div><span>Swings / s</span>${p.attackSpeed.toFixed(2)}</div>
        <div><span>Critical</span>${(p.crit * 100).toFixed(0)}%</div><div><span>Dodge</span>${(p.dodge * 100).toFixed(0)}%</div>
        <div><span>Armor</span>${p.defense.toFixed(0)}</div><div><span>Technique power</span>${(p.power * 100).toFixed(0)}%</div>
        <div><span>Critical damage</span>${(p.critDamage * 100).toFixed(0)}%</div><div><span>Speed</span>${(p.speedMul * 100).toFixed(0)}%</div>
      </div>
      <div class="label">Worn</div>${this.worn()}
      <div class="label">Abilities</div>${skills}
      <div class="label">Talents</div><p class="${owned ? '' : 'dim'}">${owned || 'Each level brings a choice of three.'}</p>`;
  }

  cells(mode) {
    const s = this.game.player.sheet;
    let html = '';
    for (let i = 0; i < 24; i++) {
      const b = s.bag[i];
      if (!b) { html += '<div class="cell"></div>'; continue; }
      const it = ITEMS[b.id];
      const act = mode === 'sell' ? (it.value ? 'sell' : '') : it.kind === 'use' ? 'use' : '';
      html += `<button type="button" class="cell" data-item="${b.id}" ${act ? `data-act="${act}" data-arg="${b.id}"` : ''} aria-label="${esc(it.name)}">${itemIcon(it)}${b.n > 1 ? `<span class="count">${b.n}</span>` : ''}</button>`;
    }
    return html;
  }

  /** The lumen: what it is, what it lends, what it lets go, and what there is to feed it. */
  lumen() {
    const g = this.game, s = g.player.sheet, l = s.lumen, L = LUMENS[l.kind], level = lumenLevel(l), stage = lumenStage(l);
    const most = Math.max(8, l.ember, l.shell, l.tide);
    const tempers = TEMPERS.map((t) => `<div class="temper"><span class="${t.cls}">${t.name}</span><span class="bar"><i class="${t.cls}" style="transform:scaleX(${(l[t.id] / most).toFixed(3)})"></i></span><b class="c-num">${l[t.id]}</b><small>${t.gives}</small></div>`).join('');
    const pct = (v) => `+${Math.round(v * 1000) / 10}%`;
    const m = Object.fromEntries(lumenMods(l).map((x) => [x.stat, x.value]));
    const lends = lumenLevel(l) > 1 || m.attack || m.defense || m.power
      ? `<b class="c-good">${pct(m.attack)}</b> attack · <b class="c-good">+${m.defense.toFixed(1)}</b> armor · <b class="c-good">${pct(m.maxHp)}</b> health · <b class="c-good">${pct(m.power)}</b> technique power · <b class="c-good">${pct(m.focusRegen)}</b> focus recovery`
      : 'Nothing yet: it has not eaten.';
    const next = stage < 2 ? `At level <b class="c-num">${LUMEN_STAGES[stage + 1]}</b> it takes a new shape, by whichever temper is strongest${stage === 1 ? ' (or a fourth shape if none leads)' : ''}.` : 'It has taken its last shape.';
    const foods = s.bag.filter((b) => FOODS[b.id] && b.n > 0).map((b) => {
      const it = ITEMS[b.id], f = FOODS[b.id];
      const gives = TEMPERS.filter((t) => f[t.id]).map((t) => `<b class="${t.cls}">+${f[t.id]} ${t.name}</b>`).join(' ');
      return `<div class="offer"><strong>${esc(it.name)} <b class="c-num">×${b.n}</b></strong><small>${gives}</small>
        <button type="button" class="btn" data-act="feed" data-arg="${b.id}" aria-label="Feed it one ${esc(it.name)}">Feed</button></div>`;
    }).join('');
    return `
      <div class="hero-card lumen-card"><img src="./static/art/lumen-${l.kind}.webp" alt="" />
        <div><strong class="c-key">${L.name}</strong>
          <small>Level <b class="c-num">${level}</b>${level < LUMEN_MAX ? ` · <b class="c-num">${lumenToNext(l)}</b> more to the next` : ' · full grown'}</small>
          <small>${L.blurb}</small></div></div>
      <div class="label">Its burst${g.touch ? '' : ' (G, when it is full)'}</div>
      <p><b class="c-key">${L.burst.name}</b> · ${L.burst.text}</p>
      <div class="label">Tempers</div>${tempers}
      <div class="label">What it lends you</div><p>${lends}</p>
      <div class="label">Feed it</div>
      ${foods || '<p class="dim">Nothing to feed it. It eats what creatures drop: leaves, spores, bristles, embers, shards, claws.</p>'}
      <p class="dim">${next}</p>`;
  }

  /** Whoever keeps this window: their likeness, their name and what they have to say. */
  speaker(line) {
    const n = this.trader;
    if (!n) return `<p>“${line}”</p>`;
    return `<div class="speaker"><img src="./static/art/crew-${n.name.toLowerCase()}.webp" alt="" /><div><strong class="c-name">${esc(n.name)}</strong><small>${esc(n.title || '')}</small><p>“${line}”</p></div></div>`;
  }

  /** One piece of gear as a card: its name in its rarity's colour, what it gives, and a button. */
  gearCard(item, button = '', worn = false) {
    const d = describe(item), s = this.game.player.sheet;
    const cannot = !canUse(s.cls, item);
    return `<div class="gear${worn ? ' worn' : ''}">
      <strong style="color:${d.color}">${esc(d.name)}</strong>
      <small><span style="color:${d.color}">${d.rarity}</span> ${d.slot}${d.family ? ` · ${d.family}` : ''} · level <b class="c-num">${d.ilvl}</b>${cannot ? ' · <span class="c-bad">not for your class</span>' : ''}</small>
      <small class="line">${[...d.implicit, ...d.affixes].map((t) => t.replace(/([+\-]?\d+(?:\.\d+)?%?)/, '<b class="c-good">$1</b>')).join(' &nbsp;·&nbsp; ')}</small>
      ${d.power ? `<small class="power">${esc(d.power)}</small>` : ''}
      ${button}</div>`;
  }

  /** The three slots and what is in them. */
  worn() {
    const s = this.game.player.sheet;
    return GEAR_SLOTS.map(([slot, name]) => (s.equip[slot] ? this.gearCard(s.equip[slot], `<span class="slotname">${name}</span>`, true)
      : `<div class="gear"><strong class="dim">Nothing</strong><small>${name}</small></div>`)).join('');
  }

  bag() {
    const s = this.game.player.sheet;
    const carried = s.gear.map((it) => this.gearCard(it, canUse(s.cls, it) ? `<button type="button" class="btn" data-act="equip" data-arg="${it.uid}">Equip</button>` : '')).join('');
    return `
      <div class="row"><div class="label">Worn</div><span class="coin">${s.glint} glint</span></div>
      ${this.worn()}
      <div class="label">Gear carried (${s.gear.length} of ${BAG_GEAR})</div>
      ${carried || '<p class="dim">Nothing yet. Creatures, supply pods and contracts all pay in gear.</p>'}
      <div class="label">Supplies</div>
      <div class="grid">${this.cells('use')}</div>
      <div class="hint dim">${this.game.touch ? 'Tap' : 'Click'} a flask to drink it. Gear is sold to the trader on the ship.</div>`;
  }

  shop() {
    const s = this.game.player.sheet;
    const stock = SHOP_STOCK.map((id) => {
      const it = ITEMS[id];
      return `<div class="offer"><strong>${it.name}</strong><small>${it.desc}</small>
        <button type="button" class="btn" data-act="buy" data-arg="${id}" ${s.glint < it.price ? 'disabled' : ''}>Buy · ${it.price}</button></div>`;
    }).join('');
    const mats = s.bag.filter((b) => ITEMS[b.id].kind === 'mat').reduce((n, b) => n + ITEMS[b.id].value * b.n, 0);
    return `
      ${this.speaker('Flasks, and whatever came up on the last lift.')}
      <div class="row"><div class="label">Supplies</div><span class="coin">${s.glint} glint</span></div>
      ${stock}
      <div class="label">Made from what you carry</div>
      ${RECIPES.map((r, i) => {
        const needs = Object.keys(r.needs).map((id) => `${ITEMS[id].name} ${Math.min(this.game.loot.count(id), r.needs[id])}/${r.needs[id]}`).join(', ');
        const can = s.glint >= r.glint && Object.keys(r.needs).every((id) => this.game.loot.count(id) >= r.needs[id]);
        return `<div class="offer"><strong>${ITEMS[r.id].name}</strong><small>${needs}</small>
          <button type="button" class="btn" data-act="craft" data-arg="${i}" ${can ? '' : 'disabled'} aria-label="Make ${ITEMS[r.id].name} for ${r.glint} glint">Make · ${r.glint}</button></div>`;
      }).join('')}
      <div class="label">Gear for sale</div>
      ${this.game.missions.stock.map((it, i) => this.gearCard(it, `<button type="button" class="btn" data-act="buygear" data-arg="${i}" ${s.glint < itemPrice(it) ? 'disabled' : ''}>Buy · ${itemPrice(it)}</button>`)).join('') || '<p class="dim">Sold out until the next contract.</p>'}
      <div class="label">Your gear</div>
      ${s.gear.map((it) => this.gearCard(it, `<button type="button" class="btn" data-act="sellgear" data-arg="${it.uid}">Sell · ${describe(it).value}</button>`)).join('') || '<p class="dim">You carry no spare gear.</p>'}
      <div class="row"><div class="label">Your bag — ${this.game.touch ? 'tap' : 'click'} to sell one</div>
        <button type="button" class="btn" data-act="sellmats" ${mats ? '' : 'disabled'}>Sell materials · ${mats}</button></div>
      <div class="grid">${this.cells('sell')}</div>
      <div class="hint dim">${this.game.touch ? 'Each tap sells one, and shows what it fetched.' : 'Point at an item to see what it fetches.'}</div>`;
  }

  /** The dispatcher's board: three contracts, each a place and a goal. */
  bounty() {
    const g = this.game, ms = g.missions, taken = ms.pending;
    const card = (o, i) => {
      const B = biomeById(o.biome);
      const elder = o.goal === 'hunt' && B.boss ? `<img class="elder" src="./static/art/elder-${B.boss}.webp" alt="" />` : '';
      return `<div class="contract${taken === o ? ' taken' : ''}">
        <div class="contract-art"><img src="./static/art/place-${o.biome}.webp" alt="" />${elder}<span class="tier">Level <b class="c-num">${o.tier}</b></span></div>
        <div class="contract-words"><strong>${esc(o.name)}</strong>
          <small><b class="c-place">${esc(B.name)}</b> · <b class="c-goal-${o.goal}">${GOALS[o.goal].name}</b></small>
          <small>${GOALS[o.goal].brief}${elder ? ` <b class="c-foe">${esc(CREATURES[B.boss].name)}</b> holds it.` : ''}</small>
          <small>Pays <b class="c-xp">${o.xp} experience</b> and <b class="c-coin">${o.glint} glint</b>, and a piece of gear</small></div>
        ${taken === o ? '<button type="button" class="btn" data-act="abandon">Hand it back</button>' : `<button type="button" class="btn${taken ? '' : ' primary'}" data-act="accept" data-arg="${i}">Take it</button>`}</div>`;
    };
    return this.speaker(taken ? 'The pad is warm. South gate, straight down the street.' : 'Three places want a surveyor today. Pick one.') + ms.offers.map(card).join('') +
      `<p class="dim">Contracts run: <b class="c-num">${g.player.sheet.missions || 0}</b></p>`;
  }

  /** Every way of turning and zooming the view that needs a drag, a pinch or a wheel is also a button here. */
  view() {
    const d = document;
    const full = d.fullscreenEnabled || d.webkitFullscreenEnabled;
    const b = (arg, text) => `<button type="button" class="btn" data-act="cam" data-arg="${arg}">${text}</button>`;
    return `
      <div class="pair">${b('behind', 'Behind the hero')}${b('above', 'From above')}</div>
      <div class="pair">${b('left', 'Turn left')}${b('right', 'Turn right')}</div>
      <div class="pair">${b('high', 'Look from higher')}${b('low', 'Look from lower')}</div>
      <div class="pair">${b('near', 'Closer')}${b('far', 'Farther')}</div>
      ${full ? `<div class="pair">${b('full', 'Full screen on or off')}</div>` : ''}
      <p class="dim">${this.game.touch ? 'You can also drag the picture to turn it and pinch to zoom.' : 'You can also drag with the right mouse button, turn with Q and E, and zoom with the wheel.'}</p>`;
  }

  help() {
    if (this.game.touch) return `<div class="keys-list">
      <kbd>Stick</kbd><span>Your left thumb walks. Push it part-way to stroll.</span>
      <kbd>Tap</kbd><span>Tap the picture to walk to a spot, attack a creature or talk to townsfolk.</span>
      <kbd>Sword</kbd><span>Attacks the nearest creature, or talks to someone close. Hold it to keep fighting.</span>
      <kbd>Round buttons</kbd><span>Skills. They aim at your target, or at the nearest creature.</span>
      <kbd>Arrows</kbd><span>Picks the next creature.</span>
      <kbd>Flasks</kbd><span>Drink a Red Tonic or a Blue Draught.</span>
      <kbd>Drag / pinch</kbd><span>Drag the picture to turn and tilt the view, pinch to zoom. The View menu has buttons for both.</span>
    </div>
    <p class="dim">Loot is picked up by walking over it. Supply pods open when you walk up to them, once their island is quiet. Side islands are worth the detour: survey marks pay extra, a beacon shows what is left to find, a lit crystal lends its strength until you are lifted out.</p>
    <button type="button" class="btn" data-act="guide">Show me the first steps again</button>`;
    return `<div class="keys-list">
      <kbd>Left click</kbd><span>Walk to a spot, attack a creature, talk to townsfolk. Hold to keep walking.</span>
      <kbd>W A S D</kbd><span>Walk by hand.</span>
      <kbd>1 2 3 4</kbd><span>Skills. They aim at your target, or at the cursor.</span>
      <kbd>Space</kbd><span>Jump: over a gap, onto a terrace, clear of a blow along the ground.</span>
      <kbd>R / T</kbd><span>Drink a Red Tonic or a Blue Draught.</span>
      <kbd>F / Tab</kbd><span>Attack the nearest creature, or pick the next one.</span>
      <kbd>Right drag</kbd><span>Turn and tilt the view. <kbd>Q</kbd> <kbd>E</kbd> also turn it.</span>
      <kbd>Wheel</kbd><span>Zoom.</span>
      <kbd>G</kbd><span>Lets your lumen's burst go, when it is full. <kbd>L</kbd> opens its window, where it is fed.</span>
      <kbd>C / B / V</kbd><span>Character sheet, bag, and buttons for the view.</span>
    </div>
    <p class="dim">Loot is picked up by walking over it. Supply pods open when you walk up to them, once their island is quiet. Side islands are worth the detour: survey marks pay extra, a beacon shows what is left to find, a lit crystal lends its strength until you are lifted out.</p>
    <button type="button" class="btn" data-act="guide">Show me the first steps again</button>`;
  }
}
