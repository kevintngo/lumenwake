// Interface root: the always-on HUD (status, target, hotbar, minimap frame,
// log, toasts), the title screen, and the two sub-modules for world plates and
// panels. Reads game state each frame and listens to the event bus; the game
// never calls into the UI.

import { VIEWS } from '../config.js';
import { xpToNext } from '../sim/stats.js';
import { CLASSES } from '../content/classes.js';
import { PEOPLES, PEOPLE_ORDER } from '../content/peoples.js';
import { describe } from '../sim/items.js';
import { GOALS } from '../sim/systems/missions.js';
import { ITEMS } from '../content/items.js';
import { clearSave } from '../app/save.js';
import { SKILL_ICONS, MENU_ICONS, ACT_ICONS, itemIcon } from './icons.js';
import { Plates } from './plates.js';
import { Panels } from './panels.js';
import { createStick, watchTouch } from './touch.js';
import { createGuide } from './guide.js';
import { createCinemaUI } from './cinema.js';

const $ = (id) => document.getElementById(id);
const HOURS = [[5, 'Dawn'], [8, 'Morning'], [12, 'Midday'], [17, 'Afternoon'], [20, 'Dusk'], [24, 'Night']];

export function createUI(game) {
  const bus = game.bus, p = game.player;
  const plates = new Plates(game, $('plates'), $('floaters'));
  const panels = new Panels(game, $('panels'));
  const el = {
    hpBar: $('hp-bar'), foBar: $('fo-bar'), xpBar: $('xp-bar'),
    lvl: $('lvl'), glint: $('glint'), hpFill: $('hp-fill'), hpText: $('hp-text'), foFill: $('fo-fill'), foText: $('fo-text'), xpFill: $('xp-fill'),
    target: $('target'), tName: $('t-name'), tLvl: $('t-lvl'), tFill: $('t-fill'),
    boss: $('boss'), bossName: $('boss-name'), bossFill: $('boss-fill'),
    zone: $('zone'), clock: $('clock'), ring: $('map-ring'), boon: $('boon'), tracker: $('tracker'), trackerText: $('tracker-text'),
    log: $('log'), toast: $('toast'), hotbar: $('hotbar'), menu: $('menu'),
  };
  const last = {};
  const set = (key, node, prop, value) => { if (last[key] !== value) { last[key] = value; node[prop] = value; } };
  const meter = (key, node, now, max) => {     // what a screen reader is told about a bar
    if (last['m' + key] === now && last['x' + key] === max) return;
    last['m' + key] = now; last['x' + key] = max;
    node.setAttribute('aria-valuenow', now); node.setAttribute('aria-valuemax', max);
  };
  const scale = (key, node, v) => { v = Math.max(0, Math.min(1, v)).toFixed(3); if (last[key] !== v) { last[key] = v; node.style.transform = `scaleX(${v})`; } };

  // ---- hotbar: four skills, then two drinks. On a touch screen the same buttons
  // sit in an arc under the right thumb, joined by an attack button and a
  // next-target button (the stylesheet does the moving).
  const slots = [];
  for (let i = 0; i < 4; i++) slots.push(makeSlot('', String(i + 1), '', () => game.skills.cast(i), `s${i}`));
  // the bar shows the abilities of the class being played
  const dressBar = () => game.skills.list.forEach((k, i) => {
    const b = slots[i].el, old = b.querySelector('svg');
    if (old) old.remove();
    b.insertAdjacentHTML('afterbegin', SKILL_ICONS[k.icon] || '');
    b.title = k.name;
    b.setAttribute('aria-label', `${k.name}, key ${k.key}`);
  });
  dressBar();
  bus.on('class', dressBar);
  el.hotbar.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
  const drinks = [['tonic', 'R'], ['draught', 'F']].map(([id, key], i) => {
    const slot = makeSlot(itemIcon(ITEMS[id]), key, ITEMS[id].name, () => game.loot.use(id), `d${i}`);
    slot.count = slot.el.appendChild(Object.assign(document.createElement('span'), { className: 'count' }));
    slot.item = id;
    return slot;
  });
  const act = makeSlot(ACT_ICONS.attack + ACT_ICONS.talk, 'Space', 'Attack', () => game.controls.act(), 'act touch-only');
  makeSlot(ACT_ICONS.next, 'Tab', 'Next target', () => game.controls.cycleTarget(), 'next touch-only');
  // held down, the attack button carries the fight on to the next creature
  act.el.addEventListener('pointerdown', (e) => {
    game.input.acting = true;
    try { act.el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) act.el.addEventListener(ev, () => (game.input.acting = false));

  function makeSlot(icon, key, title, onClick, cls) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `slot ${cls}`; b.title = title;
    b.setAttribute('aria-label', `${title}, key ${key}`);
    b.innerHTML = `${icon}<span class="cool"></span><span class="key">${key}</span>`;
    // A finger acts the moment it lands (and a second finger still counts while the
    // other thumb holds the stick, when browsers send no click). A mouse click
    // hands the keys back to the game; a keyboard press keeps its focus.
    let touched = -1e9;
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      touched = performance.now();
      game.input.any = true;
      onClick();
    });
    b.addEventListener('click', (e) => {
      if (performance.now() - touched < 800) return;
      onClick();
      if (e.detail) b.blur();
    });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    el.hotbar.appendChild(b);
    return { el: b, cool: b.querySelector('.cool'), base: `slot ${cls}` };
  }
  const flashSlot = (slot) => { slot.el.classList.add('fired'); setTimeout(() => slot.el.classList.remove('fired'), 130); };
  bus.on('skill', (d) => flashSlot(slots[game.skills.list.findIndex((s) => s.id === d.id)]));
  bus.on('drink', (d) => flashSlot(drinks.find((s) => s.item === d.item)));

  // ---- menu
  const sound = { on: true };
  for (const b of el.menu.querySelectorAll('button')) {
    const id = b.dataset.open;
    b.innerHTML = MENU_ICONS[id];
    b.addEventListener('click', (e) => { bus.emit('ui:toggle', id); if (e.detail) b.blur(); });
  }
  bus.on('ui:toggle', (id) => {
    if (id !== 'sound') return;
    sound.on = !sound.on;
    const sb = el.menu.querySelector('[data-open="sound"]');
    sb.innerHTML = MENU_ICONS[sound.on ? 'sound' : 'muted'];
    sb.setAttribute('aria-pressed', String(sound.on));
    bus.emit('sound', sound.on);
  });

  // ---- log and toast (text fades in and out; it never bounces or zooms)
  function log(html) {
    const line = document.createElement('p');
    line.innerHTML = html;
    el.log.appendChild(line);
    while (el.log.children.length > 5) el.log.firstChild.remove();
    fitLog();
    setTimeout(() => line.classList.add('old'), 5200);
    setTimeout(() => line.remove(), 6200);
  }
  // where the layout gives messages only a line or two of room, older ones leave rather than show half a slip
  function fitLog() {
    const box = el.log;
    let h = -5;
    for (const c of box.children) h += c.offsetHeight + 5;
    while (box.children.length > 1 && h > box.clientHeight + 1) { h -= box.firstChild.offsetHeight + 5; box.firstChild.remove(); }
  }
  let toastTimer = 0;
  function toast(title, sub = '', seconds = 2.8) {
    el.toast.innerHTML = `<strong>${title}</strong>${sub ? `<span>${sub}</span>` : ''}`;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), seconds * 1000);
  }
  bus.on('log', (d) => log(d.text));
  bus.on('pickup', (d) => {
    if (d.gear) { const g = describe(d.gear); log(`Picked up <b style="color:${g.color}">${g.name}</b> <span class="dim">${g.rarity}</span>`); return; }
    const it = ITEMS[d.item]; log(`Picked up <em>${it.name}</em>${d.n > 1 ? ` ×${d.n}` : ''}`);
  });
  bus.on('equip', (d) => log(`Now using <b style="color:${describe(d.item).color}">${describe(d.item).name}</b>.`));
  // (with cinematics off there are no cards, so the same things are said in a slip)
  const plain = game.cinema.quiet;
  bus.on('boss:arrive', (m) => { if (plain) toast(m.name, 'It holds this island.', 3.2); });
  bus.on('boss:fell', (m) => log(`<em>${m.name}</em> is down.`));
  bus.on('boss:enrage', (m) => log(`<em>${m.name}</em> is wounded, and faster for it.`));
  bus.on('talent', (d) => log(`Talent taken: <em>${d.name}</em>.`));
  bus.on('levelup', (d) => { toast(`Level ${d.level}`, 'A talent to choose and points to spend, in the Character sheet.', 3.6); el.menu.querySelector('[data-open="character"]').classList.add('alert'); });
  bus.on('ui:toggle', (id) => { if (id === 'character') el.menu.querySelector('[data-open="character"]').classList.remove('alert'); });
  bus.on('trade', (d) => { if (d.total) log(`Sold materials for <em>${d.total} glint</em>`); });
  bus.on('monster:died', (m) => { if (m.elite) log(`You felled an <em>${m.name}</em>.`); });
  // ---- the mission, said as it happens
  bus.on('mission:taken', (o) => { if (o) toast(o.name, 'Contract taken. Step onto the pad in the gate room to go down.', 4); panels.refresh(); });
  bus.on('mission:begin', (d) => { if (plain) toast(d.offer.name, `${d.biome.name} · ${GOALS[d.offer.goal].name}`, 4); });
  bus.on('room:wave', (d) => { if (d.wave > 0) log('More of them.'); });
  bus.on('room:clear', (d) => { if (d.kind !== 'boss') log(d.kind === 'cache' ? 'Clear.' : 'Island clear. <em>The gate is down.</em>'); });
  bus.on('pod:open', (d) => { if (d.core) toast('A survey core', game.missions.track(), 3); });
  bus.on('mission:done', () => toast('Contract done', 'Lifting out…', 2.6));
  bus.on('mission:report', (r) => {
    if (r.won) toast(`${r.offer.name}: paid`, `+${r.xp} xp · +${r.glint} glint${r.prizeName ? ` · ${r.prizeName}` : ''} · ${r.kills} felled in ${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}`, 5.5);
    else toast('Lifted out', 'The contract is not paid. The board still has it.', 4.5);
  });
  el.ring.addEventListener('click', (e) => { if (e.detail) el.ring.blur(); });

  // ---- layout: the picture fills the canvas's box (the window, or the top of an
  // upright phone), and the minimap frame tells the renderer where to draw the map
  function placeMap() {
    const r = el.ring.getBoundingClientRect(), c = game.canvas.getBoundingClientRect();
    const shown = !document.body.classList.contains('titled') && !document.body.classList.contains('cine');   // no map behind the title card, or in a cinematic
    // a small map shows about as much country as a big one
    game.renderer.minimap.rect = [r.left - c.left + r.width / 2, r.top - c.top + r.height / 2, shown ? r.width / 2 - 3 : 0, 0.62 * Math.max(1, 150 / Math.max(r.width, 1))];
  }
  function layout() { game.resize(); placeMap(); fitLog(); }
  addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(game.canvas);

  // ---- touch: the stick, and the finger layout
  createStick(game, $('ui'));
  watchTouch(game, () => {
    $('keys-hint').textContent = 'Tap to move and fight  ·  the stick walks  ·  drag the picture to turn the view';
    panels.refresh();
    layout();
  });

  // ---- title
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  game.reducedMotion = calm;
  const hadSave = !!game.player.sheet && (game.player.sheet.level > 1 || game.player.sheet.xp > 0);
  // a journey starts by choosing who to be (any of the peoples can be any class) ...
  const peopleRoot = $('people-pick');
  peopleRoot.innerHTML = PEOPLE_ORDER.map((id) => `<button type="button" class="people-chip" data-people="${id}" aria-pressed="false">${PEOPLES[id].name}</button>`).join('');
  const showPeople = (id) => {
    for (const b of peopleRoot.children) b.setAttribute('aria-pressed', String(b.dataset.people === id));
    $('people-blurb').textContent = PEOPLES[id].blurb;
  };
  peopleRoot.addEventListener('click', (e) => {
    const b = e.target.closest('[data-people]');
    if (b) game.choosePeople(b.dataset.people);
  });
  bus.on('people', (d) => showPeople(d.id));
  showPeople(game.player.sheet.people || 'unit');
  // ... and what to be: one button for each class
  const pickRoot = $('class-pick');
  pickRoot.innerHTML = Object.keys(CLASSES).map((id) => `<button type="button" class="class-card" data-class="${id}"><strong>${CLASSES[id].name}</strong><span>${CLASSES[id].blurb}</span></button>`).join('');
  pickRoot.addEventListener('click', (e) => {
    const b = e.target.closest('[data-class]');
    if (!b) return;
    game.chooseClass(b.dataset.class);
    $('btn-begin').click();
  });
  pickRoot.querySelector('button').focus({ preventScroll: true });
  $('btn-begin').disabled = false;
  void hadSave;
  $('btn-begin').addEventListener('click', () => {
    document.body.classList.remove('titled');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();      // the keys go to the game now, not to the card that was clicked
    game.begin();
    layout();
    // The view this journey was last seen from, or else the usual one: low behind the hero,
    // who starts with his back to the camera. A phone's picture is small, so it stands closer.
    const [pitch, distance] = game.savedView || [VIEWS.behind[0], VIEWS.behind[1] * (game.touch ? 0.9 : 1)];
    Object.assign(game.camera.goal, { pitch, distance });
    p.yaw = Math.PI - game.camera.goal.yaw;
  });
  $('btn-new').addEventListener('click', () => { clearSave(); game.started = false; location.search = '?new'; });
  game.look.fadeGoal = 1;
  // a wide, low view of the town turns slowly behind the title
  Object.assign(game.camera.goal, { pitch: 0.3, distance: 32 });
  Object.assign(game.camera, { pitch: 0.3, distance: 32 });

  createCinemaUI(game, layout);

  // ---- the guide: first steps and tips (a new journey starts with them)
  createGuide(game, toast, log);

  // ---- per-frame refresh
  bus.on('frame', (dt) => {
    if (game.paused && !calm) game.camera.goal.yaw += dt * 0.06; // slow orbit behind the title
    const s = p.sheet;
    set('lvl', el.lvl, 'textContent', String(s.level));
    set('glint', el.glint, 'textContent', String(s.glint));
    scale('hp', el.hpFill, p.hp / p.maxHp);
    if (last.low !== game.low) { last.low = game.low; el.hpBar.classList.toggle('low', !!game.low); }
    scale('fo', el.foFill, p.focus / p.maxFocus);
    scale('xp', el.xpFill, s.xp / xpToNext(s.level));
    set('hpT', el.hpText, 'textContent', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    set('foT', el.foText, 'textContent', `${Math.floor(p.focus)} / ${p.maxFocus}`);
    meter('hp', el.hpBar, Math.ceil(p.hp), p.maxHp);
    meter('fo', el.foBar, Math.floor(p.focus), p.maxFocus);
    meter('xp', el.xpBar, Math.round(s.xp / xpToNext(s.level) * 100), 100);

    const t = p.target && p.target.kind === 'monster' && !p.target.dead && !p.target.boss ? p.target : null;      // a boss has its own bar
    set('tHid', el.target, 'hidden', !t);
    if (t) {
      set('tName', el.tName, 'textContent', t.name);
      set('tLvl', el.tLvl, 'textContent', `Level ${t.level}`);
      scale('tHp', el.tFill, t.hp / t.maxHp);
    }

    const boss = game.monsters.find((m) => m.boss && !m.dead);
    set('bossHid', el.boss, 'hidden', !boss);
    if (boss) { set('bossName', el.bossName, 'textContent', boss.name); scale('bossHp', el.bossFill, boss.hp / boss.maxHp); }

    const ms = game.missions;
    set('zone', el.zone, 'textContent', ms.active ? ms.active.offer.name : game.biome.name);
    set('clock', el.clock, 'textContent', ms.active ? game.biome.name : 'Aloft');
    set('boonHid', el.boon, 'hidden', true);

    const line = ms.track();
    set('trHid', el.tracker, 'hidden', !line);
    if (line) set('trText', el.trackerText, 'textContent', line);

    game.skills.list.forEach((k, i) => {
      const slot = slots[i], cd = game.skills.cooldowns[i];
      const locked = s.level < k.unlock;
      const cls = slot.base + (locked ? ' locked' : p.focus < k.focus ? ' dry' : '') + (slot.el.classList.contains('fired') ? ' fired' : '');
      set('sc' + i, slot.el, 'className', cls);
      const left = (cd / k.cooldown * 100).toFixed(0) + '%';
      if (last['cd' + i] !== left) { last['cd' + i] = left; slot.cool.style.setProperty('--left', left); }
    });
    for (const d of drinks) {
      const n = game.loot.count(d.item);
      set('dn' + d.item, d.count, 'textContent', String(n));
      const cls = d.base + (n ? '' : ' empty') + (d.el.classList.contains('fired') ? ' fired' : '');
      set('dc' + d.item, d.el, 'className', cls);
    }
    if (game.touch) {
      // the big button says what it would do: fight, or talk when only townsfolk are near
      const e = game.controls.actTarget();
      const talk = !!e && e.kind === 'npc';
      set('actC', act.el, 'className', act.base + (talk ? ' talk' : e ? '' : ' idle'));
      if (last.actL !== talk) { last.actL = talk; act.el.title = talk ? 'Talk' : 'Attack'; act.el.setAttribute('aria-label', talk ? 'Talk' : 'Attack the nearest creature'); }
    }
    plates.update(dt);
  });

  return { toast, log, panels, plates };
}
