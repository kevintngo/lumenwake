// Interface root: the always-on HUD (status, target, hotbar, minimap frame,
// log, toasts), the select screen, and the sub-modules for world plates, the
// windows (panels.js), the pause menu (pause.js) and the settings behind it
// (settings.js). Reads game state each frame and listens to the event bus; the
// game never calls into the UI.
//
// What is open, and who has the keys: at most one window (the tabbed menu, the
// shop or the board) and, over it, the pause menu. While any of them is up the
// keys are theirs: a listener ahead of the game's own (see `keys` below) hands
// each press to the top one and keeps it from the game. The pause menu and the
// tabbed menu also hold the game still (`game.halt`).

import { VIEWS } from '../config.js';
import { damp } from '../core/math.js';
import { xpToNext } from '../sim/stats.js';
import { CLASSES, FAMILIES } from '../content/classes.js';
import { PEOPLES, PEOPLE_ORDER } from '../content/peoples.js';
import { ABILITIES } from '../content/abilities.js';
import { describe } from '../sim/items.js';
import { GOALS } from '../sim/systems/missions.js';
import { biomeById } from '../content/themes.js';
import { BOONS } from '../content/sites.js';
import { LUMENS } from '../content/companions.js';
import { lumenLevel } from '../sim/lumen.js';
import { ITEMS } from '../content/items.js';
import { SKILL_ICONS, MENU_ICONS, ACT_ICONS, itemIcon, elderPic } from './icons.js';
import { Plates } from './plates.js';
import { Panels } from './panels.js';
import { createStick, watchTouch } from './touch.js';
import { createTutorUI } from './tutor.js';
import { createCinemaUI } from './cinema.js';
import { createSettings, boxOf } from './settings.js';
import { createPause } from './pause.js';

const $ = (id) => document.getElementById(id);
const HOURS = [[5, 'Dawn'], [8, 'Morning'], [12, 'Midday'], [17, 'Afternoon'], [20, 'Dusk'], [24, 'Night']];

export function createUI(game) {
  const bus = game.bus, p = game.player;
  const store = createSettings(game);        // game.settings: read, and put into force, before anything is drawn
  const plates = new Plates(game, $('plates'), $('floaters'));
  const panels = new Panels(game, $('panels'));
  const pause = createPause(game, store, { onChange: () => syncHold(), guide: () => panels.show('menu', 'guide') });
  panels.onChange = () => syncHold();
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
  // sit in an arc under the right thumb, joined by an attack button, a jump
  // button and a next-target button (the stylesheet does the moving).
  const slots = [];
  for (let i = 0; i < 4; i++) slots.push(makeSlot('', String(i + 1), '', () => game.skills.cast(i), `s${i}`));
  // the bar shows the abilities of the class being played
  const dressBar = () => game.skills.list.forEach((k, i) => {
    const b = slots[i].el, old = b.querySelector('svg');
    if (old) old.remove();
    b.insertAdjacentHTML('afterbegin', SKILL_ICONS[k.icon] || '');
    b.title = `${k.name} (${k.key})`;
    b.setAttribute('aria-label', `${k.name}, key ${k.key}`);
  });
  dressBar();
  bus.on('class', dressBar);
  el.hotbar.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
  const drinks = [['tonic', 'R'], ['draught', 'T']].map(([id, key], i) => {
    const slot = makeSlot(itemIcon(ITEMS[id]), key, ITEMS[id].name, () => game.loot.use(id), `d${i}`);
    slot.count = slot.el.appendChild(Object.assign(document.createElement('span'), { className: 'count' }));
    slot.item = id;
    return slot;
  });
  const act = makeSlot(ACT_ICONS.attack + ACT_ICONS.talk, 'F', 'Attack', () => game.controls.act(), 'act touch-only');
  makeSlot(ACT_ICONS.jump, 'Space', 'Jump', () => { if (game.controls.jump) game.controls.jump(); }, 'jump touch-only');
  makeSlot(ACT_ICONS.next, 'Tab', 'Next target', () => game.controls.cycleTarget(), 'next touch-only');
  // held down, the attack button carries the fight on to the next creature
  act.el.addEventListener('pointerdown', (e) => {
    game.input.acting = true;
    try { act.el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) act.el.addEventListener(ev, () => (game.input.acting = false));

  function makeSlot(icon, key, title, onClick, cls) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `slot ${cls}`; b.title = title ? `${title} (${key})` : '';
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

  // ---- menu buttons: three open the menu at their tab, the fourth opens the pause menu
  for (const b of el.menu.querySelectorAll('button')) {
    const id = b.dataset.open;
    b.innerHTML = MENU_ICONS[id === 'bag' ? 'gear' : id];
    b.addEventListener('click', (e) => { if (id === 'menu') pause.show(); else bus.emit('ui:toggle', id); if (e.detail) b.blur(); });
  }
  // (two things the keys ask for that are settings now: M is the mute switch, V opens the camera's buttons)
  bus.on('ui:toggle', (id) => {
    if (id === 'sound') { store.set('mute', !store.values.mute); log(store.values.mute ? 'Sound <b class="c-bad">off</b>' : 'Sound <b class="c-good">on</b>'); }
    else if (id === 'view') pause.show('settings', 'controls');
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
    const it = ITEMS[d.item];
    log(it.kind === 'coin' ? `<b class="c-coin">+${d.n} glint</b>` : `Picked up <b class="c-item">${it.name}</b>${d.n > 1 ? ` <b class="c-num">×${d.n}</b>` : ''}`);
  });
  bus.on('equip', (d) => log(`Now using <b style="color:${describe(d.item).color}">${describe(d.item).name}</b>.`));
  // (with cinematics off there are no cards, so the same things are said in a slip)
  bus.on('boss:arrive', (m) => { if (game.cinema.quiet) toast(m.name, 'It holds this island.', 3.2); });
  bus.on('boss:fell', (m) => log(`<b class="c-foe">${m.name}</b> is down.`));
  bus.on('boss:enrage', (m) => log(`<b class="c-foe">${m.name}</b> is wounded, and faster for it.`));
  bus.on('talent', (d) => log(`Talent taken: <b class="c-key">${d.name}</b>.`));
  bus.on('levelup', (d) => toast(`Level ${d.level}`, game.touch ? 'A talent to choose.' : 'A talent to choose: press C.', 3.6));
  bus.on('trade', (d) => { if (d.total) log(`Sold materials for <b class="c-coin">${d.total} glint</b>`); });
  bus.on('monster:died', (m) => { if (m.elite) log(`You felled an <b class="c-foe">${m.name}</b>.`); });
  bus.on('xp', (d) => { if (d.amount >= 40) log(`<b class="c-xp">+${d.amount} experience</b>`); });
  // ---- the mission, said as it happens
  bus.on('mission:taken', (o) => { if (o) toast(o.name, 'Taken. Step onto the pad at the south gate.', 4); });
  bus.on('mission:begin', (d) => { if (game.cinema.quiet) toast(d.offer.name, `${d.biome.name} · ${GOALS[d.offer.goal].name}`, 4); });
  bus.on('room:wave', (d) => { if (d.wave > 0) log('More of them.'); });
  bus.on('room:clear', (d) => { if (d.kind !== 'boss') log(d.kind === 'cache' ? '<b class="c-good">Clear.</b>' : '<b class="c-good">Island clear.</b> The gate is down.'); });
  bus.on('pod:open', (d) => { if (d.core) toast('A survey core', game.missions.track(), 3); });
  bus.on('site:used', (d) => log(`<b class="c-key">${d.name}</b> · ${d.text.replace(/(\d+)/g, '<b class="c-num">$1</b>')}`));
  bus.on('site:guard', (d) => log(`Something was sitting on the <b class="c-key">${d.name.toLowerCase()}</b>: <b class="c-foe">${d.guard.name}</b>.`));
  bus.on('mission:done', () => toast('Contract done', 'Lifting out…', 2.6));
  // ---- back in town: the contract's report, with a picture of the place and what it paid
  const rep = { box: $('report'), art: $('report-art'), kind: $('report-kind'), name: $('report-name'), line: $('report-line'), stats: $('report-stats'), prize: $('report-prize'), ok: $('report-ok') };
  const closeReport = () => {
    if (rep.box.hidden) return;
    rep.box.hidden = true;
    if (rep.box.contains(document.activeElement)) document.activeElement.blur();      // the keys go back to the game
    bus.emit('report:closed');        // (however it was closed: Continue, its corner button, Escape, a window opening over it)
  };
  rep.ok.addEventListener('click', closeReport);
  $('report-x').addEventListener('click', closeReport);
  bus.on('ui:close', closeReport);
  bus.on('mission:begin', closeReport);
  bus.on('mission:report', (r) => {
    const B = biomeById(r.offer.biome), time = `${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}`;
    rep.art.src = art('place-' + r.offer.biome);
    rep.box.classList.toggle('lost', !r.won);
    rep.kind.textContent = r.won ? 'Paid' : 'Lifted out';
    rep.name.textContent = r.offer.name;
    rep.line.innerHTML = `<b class="c-place">${B.name}</b> · <b class="c-goal-${r.offer.goal}">${GOALS[r.offer.goal].name}</b>${r.won ? '' : ' · <span class="c-bad">Not paid: it is still on the board</span>'}`;
    if (r.won && r.markNeed) rep.line.innerHTML += ` · Marks <b class="c-num">${r.marks}</b> of <b class="c-num">${r.markNeed}</b>`;
    // the place remembers being surveyed (content/threat.js)
    if (r.threat) rep.line.innerHTML += `<br>${r.threat.now > r.threat.was ? `It will be more dangerous next time: <b class="c-foe">${r.threat.name}</b>.` : `It has settled a little: <b class="c-foe">${r.threat.name}</b>.`}`;
    const stat = (label, value, cls) => `<div><small>${label}</small><b class="${cls}">${value}</b></div>`;
    rep.stats.innerHTML = stat('Time', time, 'c-ink') + stat('Felled', r.kills, 'c-foe') + stat('Experience', '+' + r.xp, 'c-xp') + stat('Glint', '+' + r.glint, 'c-coin');
    rep.prize.innerHTML = r.prize ? `<div class="label">Also paid</div>${panels.gearCard(r.prize)}` : '';
    rep.box.hidden = false;
    rep.ok.focus({ preventScroll: true });
  });

  // ---- the lumen's plate: a click lets its burst go when it is full, and opens its window when it is not
  const lum = { box: $('lumen'), btn: $('lumen-btn'), face: $('lumen-face'), name: $('lumen-name'), sub: $('lumen-sub'), bar: $('lumen-bar'), fill: $('lumen-fill') };
  lum.btn.addEventListener('click', (e) => { if (!game.companion.burst()) bus.emit('ui:toggle', 'lumen'); if (e.detail) lum.btn.blur(); });
  bus.on('lumen:ready', (d) => log(`Your lumen is full: <b class="c-key">${d.name}</b> is ready${game.touch ? '' : ' (<b class="c-key">G</b>)'}.`));
  bus.on('lumen:burst', (d) => log(`<b class="c-key">${d.burst.name}</b>`));
  bus.on('lumen:changed', (d) => toast(`Your lumen is now a ${d.name}`, LUMENS[d.kind].blurb, 4.5));
  bus.on('lumen:level', (d) => log(`Your lumen is level <b class="c-num">${d.level}</b>.`));
  bus.on('frame', () => {
    const l = p.sheet.lumen, L = LUMENS[l.kind], full = l.charge >= 100;
    set('luFace', lum.face, 'src', art('lumen-' + l.kind));
    set('luName', lum.name, 'textContent', L.name);
    set('luSub', lum.sub, 'textContent', full ? L.burst.name + ' is ready' : 'Level ' + lumenLevel(l));
    scale('luFill', lum.fill, l.charge / 100);
    meter('lu', lum.bar, Math.round(l.charge), 100);
    if (last.luFull !== full) { last.luFull = full; lum.box.classList.toggle('full', full); }
  });

  // ---- the hero's likeness (taken by app/portrait.js), the elder's, and whoever is speaking
  bus.on('portrait', (d) => { $('hero-face').src = d.bust; });
  const talk = { box: $('talk'), face: $('talk-face'), name: $('talk-name'), title: $('talk-title'), line: $('talk-line'), timer: 0 };
  const hush = () => { talk.box.hidden = true; clearTimeout(talk.timer); };
  bus.on('talk', (d) => {
    talk.face.src = art('crew-' + d.npc.name.toLowerCase());
    talk.name.textContent = d.npc.name; talk.title.textContent = d.npc.title || '';
    talk.line.textContent = `“${d.line}”`;
    talk.box.hidden = false;
    clearTimeout(talk.timer);
    talk.timer = setTimeout(hush, 5200);
  });
  for (const ev of ['ui:close', 'moveclick', 'cine:begin', 'mission:begin']) bus.on(ev, hush);
  el.ring.addEventListener('click', (e) => { if (e.detail) el.ring.blur(); });

  // ---- layout: the picture fills the canvas's box (the window, or the top of an
  // upright phone), and the minimap frame tells the renderer where to draw the map
  function placeMap() {
    const r = boxOf(el.ring), c = game.canvas.getBoundingClientRect();
    const shown = !document.body.classList.contains('titled') && !document.body.classList.contains('cine');   // no map behind the title card, or in a cinematic
    // a small map shows about as much country as a big one
    game.renderer.minimap.rect = [r.left - c.left + r.width / 2, r.top - c.top + r.height / 2, shown ? r.width / 2 - 3 : 0, 0.62 * Math.max(1, 150 / Math.max(r.width, 1))];
  }
  function layout() {
    document.body.classList.toggle('compact', !!game.touch || innerWidth < 900 || innerHeight < 640);      // a narrow, short or touch screen: windows fill it and scroll
    game.resize(); placeMap(); fitLog();
  }
  addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(game.canvas);

  // ---- touch: the stick, and the finger layout
  createStick(game, $('ui'));
  watchTouch(game, () => {
    $('keys-hint').textContent = 'The stick walks  ·  tap to fight or talk';
    panels.refresh();
    layout();
  });
  bus.on('settings', (d) => { if (!d.key || d.key === 'text') layout(); });        // lettering of another size: the map's frame has moved

  // ---- the character select: the hero stands in the middle of the picture and changes as you choose.
  // One of the peoples down the left, a class down the right; Begin starts the journey.
  const art = (name) => `./static/art/${name}.webp`;
  const peopleRoot = $('people-pick'), pickRoot = $('class-pick'), summary = $('select-summary');
  peopleRoot.innerHTML = PEOPLE_ORDER.map((id) => `<button type="button" class="pick people-tile" role="radio" data-people="${id}" aria-checked="false">
    <img src="${art('people-' + id)}" alt="" loading="eager" /><span class="pick-words"><strong>${PEOPLES[id].name}</strong><span>${PEOPLES[id].blurb}</span></span></button>`).join('');
  pickRoot.innerHTML = Object.keys(CLASSES).map((id) => `<button type="button" class="pick class-card c-${id}" role="radio" data-class="${id}" aria-checked="false">
    <img src="${art('class-' + id)}" alt="" loading="eager" /><span class="pick-words"><strong>${CLASSES[id].name}</strong><span>${CLASSES[id].blurb}</span>
    <small>${FAMILIES[CLASSES[id].family].name} · ${CLASSES[id].abilities.map((a) => ABILITIES[a].name).join(', ')}</small></span></button>`).join('');
  const showChoice = () => {
    const s = p.sheet, who = s.people || 'unit';
    for (const b of peopleRoot.children) b.setAttribute('aria-checked', String(b.dataset.people === who));
    for (const b of pickRoot.children) b.setAttribute('aria-checked', String(b.dataset.class === s.cls));
    summary.innerHTML = `<b class="c-name">${PEOPLES[who].name}</b> <b class="c-${s.cls}">${CLASSES[s.cls].name}</b>`;
    set('pkind', $('pkind'), 'textContent', `${PEOPLES[who].name} ${CLASSES[s.cls].name}`);
    $('pname').className = 'c-' + s.cls;
  };
  // (only while choosing: once the journey has begun the select screen is put away, see Begin below)
  peopleRoot.addEventListener('click', (e) => { const b = e.target.closest('[data-people]'); if (b && !game.started) game.choosePeople(b.dataset.people); });
  pickRoot.addEventListener('click', (e) => { const b = e.target.closest('[data-class]'); if (b && !game.started) game.chooseClass(b.dataset.class); });
  // arrow keys move within a group, as they do between radio buttons
  for (const root of [peopleRoot, pickRoot]) root.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    const list = [...root.children], k = (list.indexOf(document.activeElement) + step + list.length) % list.length;
    list[k].focus(); list[k].click();
    e.preventDefault();
  });
  bus.on('people', showChoice);
  bus.on('class', showChoice);
  showChoice();
  $('btn-begin').disabled = false;
  $('btn-begin').addEventListener('click', () => {
    if (game.started) return;
    document.body.classList.remove('titled');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();      // the keys go to the game now, not to the card that was clicked
    // The select screen is put away for good: it fades out, but until now it stayed on top of the page, unseen,
    // and took every click meant for whatever was under its three boxes (a window's close button, for one).
    const title = $('title');
    title.inert = true;
    setTimeout(() => { title.hidden = true; }, 1000);
    game.camera.rail = null;
    p.yaw = Math.PI;
    game.begin();
    layout();
    // The view this journey was last seen from, or else the usual one: low behind the hero,
    // who starts with his back to the camera. A phone's picture is small, so it stands closer.
    const [pitch, distance] = game.savedView || [VIEWS.behind[0], VIEWS.behind[1] * (game.touch ? 0.9 : 1)];
    Object.assign(game.camera.goal, { pitch, distance });
    p.yaw = Math.PI - game.camera.goal.yaw;
  });
  // ---- kept journeys (app/save.js): with any, the select screen opens on them, the one played last chosen.
  // The two columns are then put away; "New surveyor" brings them back for a fresh sheet.
  const savesRoot = $('saves'), saveList = $('save-list'), btnBegin = $('btn-begin'), btnBack = $('btn-new');
  const span = (sec) => { const m = Math.round(sec / 60); return m < 60 ? `${Math.max(1, m)} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
  const kept = () => (game.fresh ? [] : game.store.summaries(game.account));
  let asking = null;
  function mode(creating) {
    const have = kept().length > 0;
    document.body.classList.toggle('has-saves', have);
    document.body.classList.toggle('creating', creating || !have);
    savesRoot.hidden = !have || creating;
    btnBack.hidden = !have || !creating;
    btnBegin.textContent = have && !creating ? 'Continue' : 'Begin';
  }
  function drawSaves() {
    saveList.innerHTML = kept().map((h) => (asking === h.id
      ? `<div class="save-ask" role="group" aria-label="Let this surveyor go?"><p>Let this surveyor go? Level <b class="c-num">${h.level}</b>, and everything they carry.</p>
          <div><button type="button" class="btn" data-keep="${h.id}">Keep</button><button type="button" class="btn danger" data-gone="${h.id}">Let go</button></div></div>`
      : `<div class="save-row"><button type="button" class="pick" role="radio" data-hero="${h.id}" aria-checked="${!!game.hero && game.hero.id === h.id}">
          <img src="${art('people-' + h.people)}" alt="" /><span class="pick-words"><strong>${PEOPLES[h.people].name} <b class="c-${h.cls}">${CLASSES[h.cls].name}</b></strong>
          <span>Level <b class="c-num">${h.level}</b> · ${h.missions} ${h.missions === 1 ? 'contract' : 'contracts'}</span><small>${span(h.played)} played</small></span></button>
        <button type="button" class="x" data-drop="${h.id}" aria-label="Let this surveyor go" title="Let this surveyor go">×</button></div>`)).join('');
  }
  function pickSave(id) { const h = game.store.loadHero(id); if (h) game.load(h); drawSaves(); }
  function createNew() { game.hero = null; game.chooseClass(p.sheet.cls); mode(true); }        // a fresh sheet: nothing of a kept surveyor's goes with it
  saveList.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t || game.started) return;
    const row = t.closest('[data-hero]'), drop = t.closest('[data-drop]'), keep = t.closest('[data-keep]'), gone = t.closest('[data-gone]');
    if (row) pickSave(row.dataset.hero);
    else if (drop) { asking = drop.dataset.drop; drawSaves(); }
    else if (keep) { asking = null; drawSaves(); }
    else if (gone) {
      game.store.deleteHero(gone.dataset.gone, game.account);
      asking = null;
      const left = kept();
      if (left.length) { pickSave(left[0].id); mode(false); } else { createNew(); drawSaves(); }
    }
  });
  $('btn-create').addEventListener('click', () => { if (!game.started) createNew(); });
  btnBack.addEventListener('click', () => { const list = kept(); if (!game.started && list.length) { pickSave(list[0].id); mode(false); } });
  { const list = kept(); if (list.length) pickSave(list[0].id); mode(false); drawSaves(); }
  bus.on('begin', () => { if (game.store.failed) toast('This browser will not keep your journey', 'A private window, or its storage is full. Settings, Saves can keep a copy in a file.', 6); });
  game.look.fadeGoal = 1;
  // While choosing, the camera stands in front of the hero, the square and the hall behind them, and sways a little.
  // On a wide screen the hero is in the middle between the two columns. On a narrow or upright one they stand, whole,
  // in the strip of picture between the name plate and the choices: the camera is placed so that their feet are on
  // the strip's lower edge and the tip of whatever they hold is on its upper one, however tall the strip is.
  const HERO_TOP = 2.0;        // metres from the ground to the top of the tallest of them, and of what they hold upright
  const strip = { top: -1, bottom: -1 };
  const stripNow = () => {
    const head = document.querySelector('.select-head'), H = innerHeight;
    let top = (head ? head.getBoundingClientRect().bottom : 0) + 12, bottom = H;
    for (const el of document.querySelectorAll('.select-col, .select-foot')) { const r = el.getBoundingClientRect(); if (r.height > 0 && r.top < bottom) bottom = r.top; }
    bottom -= 16;
    if (bottom - top < 150) bottom = top + 150;        // a very short screen: the choices cover their feet rather than the hero shrinking to nothing
    return [top, bottom];
  };
  const selectView = (t, dt = 0) => {
    const y = p.y, sway = game.reducedMotion ? 0 : Math.sin(t * 0.22) * 0.22, wide = innerWidth > 620 && innerWidth > innerHeight;        // (three columns, the hero between them: see the select screen's rules in ui.css)
    const a = 0.18 + sway;
    if (wide) { strip.top = -1; return { pos: [p.x + Math.sin(a) * 5.6, y + 1.25, p.z + Math.cos(a) * 5.6], look: [p.x, y + 0.72, p.z], lens: 32 * Math.PI / 180, mix: 1 }; }
    const [top, bottom] = stripNow();
    if (strip.top < 0) { strip.top = top; strip.bottom = bottom; }
    else { strip.top = damp(strip.top, top, 7, dt); strip.bottom = damp(strip.bottom, bottom, 7, dt); }
    const lens = 30 * Math.PI / 180, tl = Math.tan(lens / 2), H = innerHeight, eye = 1.3;
    const nT = 1 - 2 * strip.top / H, nB = 1 - 2 * strip.bottom / H;      // where the strip's edges are in the picture (+1 the top, -1 the bottom)
    let lo = 2.5, hi = 60, D = 8, pitch = 0;
    for (let i = 0; i < 22; i++) {
      D = (lo + hi) / 2;
      pitch = Math.atan(eye / D) + Math.atan(nB * tl);                      // the feet on the lower edge...
      if (Math.tan(pitch + Math.atan((HERO_TOP - eye) / D)) / tl > nT) lo = D; else hi = D;       // ...and how far back for the top to come down to the upper one
    }
    D = Math.max(D, 0.75 / (tl * innerWidth / H));                          // (a strip wider than it is tall: not so close that their arms leave the sides)
    return { pos: [p.x + Math.sin(a) * D, y + eye, p.z + Math.cos(a) * D], look: [p.x, y + eye - Math.tan(pitch) * D, p.z], lens, mix: 1 };
  };
  let selectT = 0;
  bus.on('frame', (dt) => {
    if (game.started) return;
    selectT += dt;
    p.yaw = 0;                               // facing the camera, which stands to the south
    game.camera.rail = selectView(selectT, dt);
  });

  createCinemaUI(game, layout);

  // ---- the first steps: the card, the marker and the ring round a control (app/tutorial.js decides what they say)
  createTutorUI(game, toast, log);

  // ---- what is open, and who has the keys
  const reportOpen = () => !rep.box.hidden;
  /** The pause menu and the tabbed menu hold the game while they are up. */
  function syncHold() { game.halt = pause.open || panels.holding; }
  /** Escape: one step back out of whatever is open; with nothing open, let go of the target, or else pause. */
  function escape() {
    if (pause.open) pause.back();
    else if (panels.kind) panels.close();
    else if (reportOpen()) closeReport();
    else if (game.started && !game.cinema.blocking) {
      hush();
      const c = game.controls, had = c.clearTarget ? c.clearTarget() : !!p.target && ((p.target = null), (p.pursue = false), true);
      if (!had) pause.show();
    }
  }
  bus.on('ui:escape', escape);
  bus.on('cine:begin', (d) => { if (d.blocking) { pause.hide(); panels.close(); } });
  /** Tab stays inside the window that is open. True if the focus had to be moved by hand. */
  function trap(e, box) {
    const items = [...box.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')].filter((x) => !x.disabled && x.tabIndex >= 0 && x.getClientRects().length);
    const at = document.activeElement, first = items[0], last = items[items.length - 1];
    if (!first) return true;
    if (!box.contains(at) || at === box) { (e.shiftKey ? last : first).focus(); return true; }
    if (e.shiftKey ? at === first : at === last) { (e.shiftKey ? last : first).focus(); return true; }
    return false;
  }
  // Ahead of the game's own key listener (core/input.js): while a window or the pause menu is up, every press is
  // theirs and the game does not hear it. (The game is held under two of them, so they could not be told by it.)
  addEventListener('keydown', (e) => {
    if (!game.started || game.cinema.blocking) return;
    const typing = e.target instanceof Element && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    const box = pause.open ? pause.el : panels.kind ? panels.el : null;
    if (!box) {
      if (reportOpen() && e.code === 'Escape') { closeReport(); e.preventDefault(); e.stopImmediatePropagation(); }
      // H is the interface's own key: the Guide
      else if (e.code === 'KeyH' && !e.repeat && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) bus.emit('ui:toggle', 'help');
      return;
    }
    e.stopImmediatePropagation();
    if (e.repeat && (e.code === 'Escape' || /^Key/.test(e.code))) { if (!typing) e.preventDefault(); return; }      // a key held down acts once
    if ((pause.open ? pause.key(e) : panels.key(e)) || (e.code === 'Tab' && trap(e, box))) e.preventDefault();
  }, true);

  // ---- per-frame refresh
  bus.on('frame', (dt) => {
    const s = p.sheet;
    const due = s.picks > 0 || s.points > 0;          // something to choose in the Character tab: a mark on its button
    if (last.due !== due) { last.due = due; el.menu.querySelector('[data-open="character"]').classList.toggle('alert', due); }
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
    if (boss) {
      set('bossName', el.bossName, 'textContent', boss.name);
      set('bossSub', $('boss-sub'), 'textContent', boss.enraged ? 'Wounded, and faster for it' : boss.def.epithet || '');
      set('bossFace', $('boss-face'), 'src', elderPic(boss.defId));
      if (last.bossMad !== !!boss.enraged) { last.bossMad = !!boss.enraged; el.boss.classList.toggle('mad', !!boss.enraged); }
      scale('bossHp', el.bossFill, boss.hp / boss.maxHp);
    }

    const ms = game.missions;
    set('zone', el.zone, 'textContent', ms.active ? ms.active.offer.name : game.biome.name);
    if (last.zoneKind !== !!ms.active) { last.zoneKind = !!ms.active; el.zone.className = ms.active ? 'c-ink' : 'c-place'; el.clock.className = ms.active ? 'c-place' : 'dim'; }
    set('clock', el.clock, 'textContent', ms.active ? game.biome.name : 'Aloft');
    set('boonHid', el.boon, 'hidden', !s.boon);
    if (last.boonOn !== !!s.boon) { last.boonOn = !!s.boon; document.body.classList.toggle('has-boon', !!s.boon); }      // (an upright phone drops the place's second word to make room for it)
    if (s.boon) { set('boonT', el.boon, 'textContent', BOONS[s.boon].name); set('boonTip', el.boon, 'title', BOONS[s.boon].desc); }

    const line = ms.track();
    set('trHid', el.tracker, 'hidden', !line);
    if (line) set('trText', el.trackerText, 'innerHTML', line.replace(/(\d+)/g, '<b class="c-num">$1</b>'));

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

  layout();
  return { toast, log, panels, plates, pause, settings: store };
}
