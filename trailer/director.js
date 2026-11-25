// The trailer's shot list. record.mjs evaluates this file in the game's page and then calls __dir.step() once per
// video frame (60 a second). Every shot is the real game played by this script: it builds a surveyor, takes a
// contract, puts creatures in front of them, and fights through the game's own systems; the cinematics are the
// game's own. The sound is the game's own too: its score and every effect, made by audio/audio.js into an
// OfflineAudioContext that is rendered one frame at a time beside the picture (see `sound` below).
//
// Square, for a timeline (X): the picture holds the fight with a 45 degree lens, the HUD is left out (names and
// numbers ride on the creatures), and short captions sit at the top over sky. The first frame is the poster: the
// strongest shot first, at full brightness. Cuts fall on bars of the score's own beat where they can.
(async () => {
  const real = window.__real;
  const wait = (ms) => new Promise((r) => real.setTimeout(r, ms));
  while (!window.__game) await wait(50);
  const g = window.__game, p = g.player, cam = g.camera, R = g.renderer, ms = g.missions, cine = g.cinema;
  const items = await import('/src/sim/items.js');
  const stats = await import('/src/sim/stats.js');
  const { CLASSES } = await import('/src/content/classes.js');
  const { BASES } = await import('/src/content/gear.js');
  const { hubSpec } = await import('/src/world/layout.js');
  const { TOWN } = await import('/src/content/town.js');
  const { createAudio } = await import('/src/audio/audio.js');
  const { EventBus } = await import('/src/core/events.js');
  const $ = (id) => document.getElementById(id);
  await document.fonts.ready;

  // ---------------------------------------------------------------- the page
  $('btn-begin').click();
  g.bus.emit('guide:skip', { quiet: true });
  while (cine.now) cine.finish(true);
  cine.queue.length = 0;
  $('title').style.display = 'none';
  const ui = $('ui');
  ui.style.transition = 'none';
  const css = document.createElement('style');
  css.textContent = `
    #toast, #log p { transition: none !important; }
    #ui > *:not(#plates):not(#floaters):not(#panels) { visibility: hidden !important; }
    #cine-skip, #cine-caption { display: none !important; }
    #cap { position: fixed; left: 50%; top: 30px; transform: translateX(-50%); width: max-content; max-width: 600px; padding: 10px 28px 14px; z-index: 50; opacity: 0;
      font: 600 35px/1.18 var(--hand); letter-spacing: 0.01em; color: var(--ink); text-align: center; text-wrap: balance; }
    #cap.low { top: auto; bottom: 34px; }
    .np { font-size: 18px !important; } .np small { font-size: 15px !important; }
    .np.loot, .fl.xp { display: none !important; }      /* (what drops, and the experience it gives, would bury a fight in words) */
    body.nocard #cine-card { display: none !important; }
    .fl { font-size: 30px !important; } .fl.crit { font-size: 40px !important; }
    #veil { position: fixed; inset: 0; z-index: 60; background: #070f2a; opacity: 0; pointer-events: none; }`;
  document.head.appendChild(css);
  const cap = Object.assign(document.createElement('div'), { id: 'cap', className: 'plate' });
  const veil = Object.assign(document.createElement('div'), { id: 'veil' });
  document.body.append(cap, veil);
  window.__advance(6000);
  for (const id of ['toast', 'log', 'report']) { const el = $(id); if (el) el.hidden = true; }

  // picture settings: fixed, so nothing shifts between frames
  R.adapt = () => {};
  R.scale = 1;
  g.resize();
  g.save = () => {};
  cam.fov = 45 * Math.PI / 180;
  // the camera aims a few paces past the hero (`ahead`, set by a shot), so they stand below the middle with the fight above
  let ahead = 0;
  const update = cam.update.bind(cam);
  cam.update = (dt, t, aspect, ground) => update(dt, [t[0] - Math.sin(cam.goal.yaw) * ahead, t[1], t[2] - Math.cos(cam.goal.yaw) * ahead], aspect, ground);

  // ---------------------------------------------------------------- the sound
  // One audio/audio.js of its own, on a stand-in for the game: the same game in every way the effects need (where the
  // hero and each creature are), but with the music told what to play by the film (`score`), so it is one piece from
  // the first cut to the last instead of a new one at every cut. Everything the game announces while a shot is being
  // filmed is passed on to it; nothing from the moments between shots is. Its context is offline, and advances one
  // frame of sound for each frame of picture.
  const SR = 44100, FR = 1 / 60;
  let actx = null, filming = false, soundFrames = 0, rendering = null, buffer = null;
  const abus = new EventBus();
  const score = { area: 'ember', boss: { kind: 'monster', boss: true, defId: 'warden', dead: false, enraged: false, ai: { state: 'chase' }, x: 0, z: 0 }, heat: 3 };
  const steady = new Proxy(p, { get: (t, k) => (k === 'hp' || k === 'maxHp' ? 100 : k === 'dead' ? false : t[k]) });
  const stand = new Proxy(g, {
    get(t, k) {
      if (k === 'bus') return abus;
      if (k === 'biome') return { id: score.area };
      if (k === 'monsters') return [...(score.boss && !score.boss.dead ? [score.boss] : []), ...Array.from({ length: score.heat }, () => ({ kind: 'monster', dead: false, ai: { state: 'chase' } }))];
      if (k === 'cinema') return { active: false, blocking: false };
      if (k === 'player') return steady;
      if (k === 'settings') return { master: 1, music: 1, sfx: 1, ambience: 0.6 };
      return t[k];
    },
  });
  const Offline = class extends OfflineAudioContext { get state() { return 'running'; } };
  const LIMIT = 40;          // seconds of sound made room for (the film is shorter)
  window.AudioContext = function () { return (actx = new Offline(2, SR * LIMIT, SR)); };
  createAudio(stand);
  abus.emit('begin');
  window.AudioContext = undefined;
  g.bus.on('frame', () => { R.minimap.rect[2] = 0; });        // (no little map in the corner: the HUD is left out)
  const emit0 = g.bus.emit.bind(g.bus);
  const QUIET = new Set(['frame', 'begin', 'zone', 'boss:arrive', 'boss:fell', 'boss:enrage', 'cine:begin', 'mission:report', 'mission:begin', 'mission:done', 'room:clear', 'levelup']);
  g.bus.emit = (type, d) => { const r = emit0(type, d); if (filming && !QUIET.has(type)) abus.emit(type, d); return r; };
  const suspendAt = (t) => new Promise((ok) => actx.suspend(t).then(ok));
  async function soundFrame() {
    abus.emit('frame', FR);
    const reached = suspendAt(++soundFrames * FR);
    if (!rendering) rendering = actx.startRendering().then((b) => (buffer = b)); else actx.resume();
    await reached;
  }
  const hush = (type, d) => { if (filming) abus.emit(type, d); };       // something the score is told by the film itself

  // ---------------------------------------------------------------- helpers
  const KINDS = ['weapon', 'offhand', 'unit', 'mod', 'mod', 'visor', 'frame', 'grips', 'greaves', 'boots'];
  /** A surveyor some way into the journey, in all ten slots, with the given relics worn. */
  const hero = (cls, who, relics = [], level = 11) => {
    g.chooseClass(cls); g.choosePeople(who);
    const s = p.sheet, fam = CLASSES[cls].family;
    s.level = level; s.first = false; s.missions = 9; s.threat = {};
    Object.assign(s.base, { might: 15, grace: 13, vigor: 15, mind: 13 });
    const left = [...relics];
    for (const kind of KINDS) {
      const r = left.find((id) => RELIC_KIND[id] === kind);
      if (r) left.splice(left.indexOf(r), 1);
      const it = r ? items.rollItem({ relic: r, ilvl: level, cls }) : items.rollItem({ slot: kind, family: kind === 'weapon' || kind === 'offhand' ? fam : undefined, ilvl: level, rarity: 2 + (kind.length % 2), cls });
      s.gear.push(it); g.loot.equip(it.uid);
    }
    s.gear.length = 0;
    stats.derive(p); p.hp = p.maxHp; p.focus = p.maxFocus;
    s.lumen.kind = { vanguard: 'pyre', ranger: 'current', adept: 'prism' }[cls] || s.lumen.kind;
    if (g.companion) g.companion.dress();
  };
  const RELIC_KIND = { quake: 'weapon', rot: 'weapon', chill: 'weapon', thorn: 'frame', vigil: 'frame', spore: 'unit', rush: 'unit', tide: 'greaves', wick: 'mod', meteor: 'boots' };

  const clearWorld = () => {
    for (const e of g.entities.list) if (e.kind === 'monster' || e.kind === 'drop') e.gone = true;
    g.monsters = [];
    g.entities.sweep();
    g.loot.drops = [];
    g.skills.shots.length = 0;
    g.skills.cooldowns.fill(0);
    g.skills.queue.length = 0;
    g.hazards.clear(); g.stop = 0;
    Object.assign(p, { target: null, pursue: false, moveTo: null, dash: null, action: 0, pending: null, mend: null, dead: false, invuln: 0, calm: 10, aloft: false, air: 0, vy: 0, lift: 0 });
    p.hp = p.maxHp; p.focus = p.maxFocus; g.look.hurt = 0; g.look.fade = 1; g.look.veil = 0;
    if (g.input && g.input.stick) g.input.stick.x = g.input.stick.y = 0;
    document.querySelectorAll('#floaters .fl').forEach((el) => (el.style.display = 'none'));
  };
  /** Takes a contract to a place (no cinematic on the way down), with the given threat, and empties its islands: the film brings its own creatures. */
  const contract = (biome, goal, threat = 0, conds = [], keepBoss = false) => {
    while (cine.now) cine.finish(true);
    cine.queue.length = 0;
    ms.active = null; ms.pending = null;
    const s = p.sheet;
    s.threat = { [biome]: threat };
    for (let b = 0; b < 300 && !ms.offers.some((o) => o.biome === biome && o.goal === goal); b++) { s.board = (s.board || 0) + 1; ms.refresh(); }
    const i = ms.offers.findIndex((o) => o.biome === biome && o.goal === goal);
    Object.assign(ms.offers[i], { threat, conditions: conds });
    ms.accept(i);
    cine.quiet = true;
    ms.deploy();
    ms.active.rooms.forEach((r, k) => { if (!(keepBoss && g.world.rooms[k].kind === 'boss')) r.state = 'clear'; });
    for (const gate of g.world.gates) gate.shut = false;
    clearWorld();
  };
  const home = () => {
    while (cine.now) cine.finish(true);
    ms.active = null; ms.pending = null;
    g.enter(hubSpec(TOWN));
    if (ms.arrive) ms.arrive();
    clearWorld();
  };
  /** Stands the hero at x,z facing `face`, and the camera at (yaw, pitch, distance) round them, `lead` paces ahead. */
  const go = (x, z, yaw, pitch, dist, face = yaw + Math.PI, lead = 0) => {
    p.x = x; p.z = z; p.y = g.world.surface(x, z); p.yaw = face; p.walk = 0; p.move = 0;
    ahead = lead;
    cam.target = [x - Math.sin(yaw) * ahead, p.y + 1, z - Math.cos(yaw) * ahead];
    cam.rail = null;
    Object.assign(cam, { yaw, pitch, distance: dist }); Object.assign(cam.goal, { yaw, pitch, distance: dist });
    while (R.worldTex.update(x, z, 16) > 0);
  };
  const room = (kind, n = 0) => g.world.rooms.filter((r) => r.kind === kind)[n] || g.world.rooms[1];
  /** A point given as paces to the right of and away from the camera, from the hero. */
  const at = (rt, fw, yaw = cam.goal.yaw) => [p.x + Math.cos(yaw) * rt - Math.sin(yaw) * fw, p.z - Math.sin(yaw) * rt - Math.cos(yaw) * fw];
  const spawn = (id, rt, fw, level, elite = false) => {
    const [x, z] = at(rt, fw);
    const m = g.spawner.spawnMonster(id, x, z, level, elite);
    m.grow = 1; m.ai.provoked = true; m.ai.target = p;
    return m;
  };
  const cast = (i, target) => {
    if (target && !target.dead) { p.target = target; p.pursue = true; }
    g.skills.cooldowns[i] = 0; p.focus = Math.max(p.focus, 40);
    return g.skills.cast(i);
  };
  const barSlot = (id) => g.skills.list.findIndex((s) => s.id === id);
  const alive = (list) => list.filter((m) => m && !m.dead && !m.gone);
  const nearest = (list) => alive(list).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  const ease = (t) => t * t * (3 - 2 * t);
  const sim = () => { g.frame(FR, 16.7); window.__advance(1000 * FR); };
  const keep = (frac = 0.6) => { p.hp = Math.max(p.hp, p.maxHp * frac); p.focus = Math.max(p.focus, 30); };
  const yawTo = (m, turn = 0) => Math.atan2(p.x - m.x, p.z - m.z) + turn;
  /** Runs the game until fn() says so (not filmed). */
  const until = (fn, max = 900) => { let i = 0; for (; i < max && !fn(); i++) sim(); return i; };
  /** Into the boss island of the current contract, the gate behind open, and on until its elder has woken (cinematic or not). */
  const toElder = (inset = 9) => {
    const w = g.world, r = room('boss'), l = w.nav.links.find((k) => k.b === r.i);
    for (const gate of w.gates) gate.shut = false;
    go(r.x - l.ux * (r.r - inset), r.z - l.uz * (r.r - inset), Math.atan2(-l.ux, -l.uz) + Math.PI, 0.3, 12, Math.atan2(l.ux, l.uz));
    until(() => g.monsters.some((m) => m.boss), 240);
    return g.monsters.find((m) => m.boss);
  };

  // ---------------------------------------------------------------- captions (frames from the start)
  const CAPTIONS = [];
  const caption = (from, to, text, low = false) => CAPTIONS.push([from, to, text, low]);
  const captionAt = (f) => {
    let o = 0;
    for (const [a, b, text, low] of CAPTIONS) if (f >= a && f <= b) {
      if (cap.textContent !== text) cap.textContent = text;
      cap.classList.toggle('low', low);
      o = Math.min(1, (f - a) / 9, (b - f) / 9);
    }
    cap.style.opacity = o.toFixed(2);
  };

  // ---------------------------------------------------------------- shots
  const shots = [];
  let mobs = [], boss = null, yaw0 = 0;

  // 1. Straight in: a colossus of the Ember Shelf, and a surveyor whose third blow shakes the ground.
  const ownStage = cine.frameStage.bind(cine);
  shots.push({
    id: 'warden', frames: 150, pre: 150,
    setup() {
      // (closer and lower than the game stands for a giant: the colossus over the hero, its head near the top of the picture)
      cine.frameStage = () => { cam.stage.lift = 3.4; cam.stage.pull = 1.5; cam.stage.wide = 0.14; };
      hero('vanguard', 'unit', ['quake', 'thorn', 'spore']);
      contract('ember', 'hunt', 3, ['angry'], true);
      boss = toElder(11);
      boss.hp = boss.maxHp = Math.round(p.attack * 400);
      mobs = [boss];
      yaw0 = yawTo(boss, 0.42);
      go(p.x, p.z, yaw0, 0.26, 12.5, p.yaw, 0);
      g.controls.setTarget(boss, true);
    },
    tick(i) {
      keep(0.7); boss.hp = Math.max(boss.hp, boss.maxHp * 0.6);
      cam.goal.yaw = yawTo(boss, 0.62 - 0.22 * ease(Math.max(0, i) / 150));
      cam.goal.pitch = 0.14; cam.goal.distance = 12.5 - 1.5 * ease(Math.max(0, i) / 150);
      if (i < 12) { p.flash = 0; for (const m of g.monsters) m.flash = 0; }      // the first frame is the poster: no white flash on it
      if (p.target !== boss) g.controls.setTarget(boss, true);
      if (i === -60 || i === 40) cast(barSlot('cleave'), boss);
      if (i === -20 || i === 96) cast(barSlot('slam'), boss);
    },
    after() { cine.frameStage = ownStage; },
  });
  caption(6, 138, 'Giant elders hold every island');

  // 2. Under the islands: an elder wakes in the Underhalls, its lantern the only light. (The game's own cinematic.)
  shots.push({
    id: 'keeper', frames: 300, pre: 0,
    setup() {
      hero('ranger', 'human', ['rot', 'vigil', 'rush']);
      contract('vault', 'hunt', 0, [], true);
      cine.quiet = false; cine.seen = {};
      const r = room('boss'), l = g.world.nav.links.find((k) => k.b === r.i);
      go(r.x - l.ux * (r.r - 9), r.z - l.uz * (r.r - 9), Math.atan2(-l.ux, -l.uz), 0.3, 12, Math.atan2(l.ux, l.uz));
      until(() => cine.now && /^elder/.test(cine.now.id), 300);
      until(() => !cine.now || cine.now.t >= 4.05, 400);         // the last of its rising, then its voice and its name
    },
    tick() { keep(1); },
  });

  // 3. Four places, a beat and a quarter each.
  const place = (id, biome, cls, who, relics, foes, yaw, pitch, dist, act) => shots.push({
    id, frames: 75, pre: 46,
    setup() {
      hero(cls, who, relics);
      contract(biome, 'sweep');
      const r = room('fight', 1);
      go(r.x, r.z, yaw, pitch, dist, yaw + Math.PI, 1.6);
      yaw0 = yaw;
      mobs = foes.map(([kind, rt, fw, elite]) => spawn(kind, rt, fw, 9, !!elite));
    },
    tick(i) {
      keep(0.7);
      cam.goal.yaw = yaw0 + 0.16 * (Math.max(0, i) / 75);
      if (!p.target && nearest(mobs)) g.controls.setTarget(nearest(mobs), true);
      act(i);
    },
  });
  place('glass', 'glasswood', 'ranger', 'lynd', ['chill'], [['sproutling', 1.4, 5], ['puffcap', -1.6, 6.5], ['wisp', 0.2, 8], ['hound', 2.4, 7.5], ['sproutling', -2.6, 4.4]], 0.9, 0.3, 10.5,
    (i) => { if (i === -30 || i === 20) cast(barSlot('volley'), nearest(mobs)); });
  place('hush', 'hush', 'adept', 'veiled', ['wick', 'chill'], [['wisp', 1.2, 4.5], ['puffcap', -1.4, 5.2], ['wisp', 2.6, 6.8], ['mite', -2.4, 7]], 2.4, 0.34, 10,
    (i) => { if (i === -16) cast(barSlot('nova')); if (i === 14 || i === 52) cast(barSlot('bolt'), nearest(mobs)); });
  place('shatter', 'shatter', 'vanguard', 'karn', ['meteor', 'quake'], [['cragling', 1.6, 3.6], ['mite', -1.8, 3.2], ['watcher', 0.4, 6.5], ['cragling', -0.6, 5]], 0.646, 0.16, 9.5,
    (i) => { if (i === -40) p.intent.jump = true; if (i === 4) cast(barSlot('cleave'), nearest(mobs)); if (i === 22) p.intent.jump = true; });
  place('rime', 'rime', 'ranger', 'unit', ['rot'], [['cragling', 1.0, 6], ['strider', -2, 8], ['shellsnap', 2.6, 7], ['cragling', -1, 9.5]], 3.6, 0.28, 11,
    (i) => { if (i === -30 || i === 30) cast(barSlot('volley'), nearest(mobs)); if (i === 6) cast(barSlot('bolt'), nearest(mobs)); });
  caption(462, 738, 'Sky islands, dungeons, open space');

  // 4. A relic's power: a pack goes up one creature after another.
  /** Nine creatures in rows in front of the hero, each felled by a blow or a burst, standing until struck. */
  const pack = (near) => {
    const list = [];
    for (let k = 0; k < 9; k++) list.push(spawn(['sproutling', 'puffcap', 'bristlehog'][k % 3], -2.6 + (k % 3) * 2.6 + (k > 2 ? 0.7 : 0), near + Math.floor(k / 3) * 1.9, 9));
    for (const m of list) { m.maxHp = m.hp = Math.round(p.attack * 0.75); m.ai.provoked = false; m.ai.state = 'idle'; }
    return list;
  };
  shots.push({
    id: 'spores', frames: 150, pre: 30,
    setup() {
      hero('vanguard', 'lynd', ['spore', 'quake', 'thorn']);
      contract('glasswood', 'sweep');
      const r = room('fight', 0);
      yaw0 = 5.2;
      go(r.x, r.z, yaw0, 0.42, 12, yaw0 + Math.PI, 2.2);
      mobs = [];
      mobs = pack(2.6);
    },
    tick(i) {
      keep(0.8);
      cam.goal.yaw = yaw0 - 0.2 * ease(Math.max(0, i) / 150);
      if (i === 6) cast(barSlot('cleave'), mobs[1]);
      if (i === 64) mobs = pack(2.2);                       // a second pack comes on, and goes the same way
      if (i === 88) cast(barSlot('slam'));
      if (i > 100 && !p.target && nearest(mobs)) g.controls.setTarget(nearest(mobs), true);
    },
  });
  caption(756, 888, 'Elders drop relics with powers');

  // 5. Ten slots: the surveyor in the Gear tab, turning, and a relic's card.
  shots.push({
    id: 'gear', frames: 150, pre: 20,
    setup() {
      hero('adept', 'karn', ['meteor', 'wick', 'vigil']);
      home();
      const pad = g.world.structures.find((s) => s.role === 'deploy');
      go(pad.x + 3, pad.z - 7, 0.4, 0.3, 10);
      const it = items.rollItem({ relic: 'tide', ilvl: 11, cls: 'adept' }); it.lock = true; p.sheet.gear.push(it);
      for (let k = 0; k < 7; k++) p.sheet.gear.push(items.rollItem({ ilvl: 9 + (k % 3), rarity: k % 4, cls: 'adept' }));
      g.bus.emit('ui:toggle', 'bag');
      const t = document.querySelector('#panels .tile.relic[data-key^="gear:"]'); if (t) t.click();
      const pane = $('win-pane'); if (pane) pane.scrollTop = 0;
    },
    tick(i) {
      const pane = $('win-pane');
      for (const k in g.portraits.stages) { const st = g.portraits.stages[k]; st.yaw = (st.yaw || 0) + 0.022; st.dirty = true; }
      if (pane) { const d = document.querySelector('#panels .detail'), want = d ? d.offsetTop - 60 : 600; pane.scrollTop = Math.max(0, want * ease(Math.min(1, Math.max(0, (i - 60) / 70)))); }
    },
    after() { g.bus.emit('ui:close'); },
  });
  caption(906, 1038, 'Ten gear slots', true);

  // 6. A place that has been surveyed before: Unbound, at night, and what falls bursts.
  shots.push({
    id: 'threat', frames: 150, pre: 34,
    setup() {
      hero('adept', 'human', ['chill', 'wick']);
      contract('glasswood', 'sweep', 5, ['dark', 'volatile', 'leaders']);
      const r = room('fight', 1);
      yaw0 = 1.9;
      go(r.x, r.z, yaw0, 0.36, 11.5, yaw0 + Math.PI, 1.8);
      mobs = [['hound', 1.6, 4.2, true], ['sproutling', -1.4, 4.4], ['wisp', 0.4, 6.2], ['bristlehog', -2.6, 6.4], ['sproutling', 2.8, 6.8], ['puffcap', -0.6, 8.2]].map(([k, rt, fw, e]) => spawn(k, rt, fw, 12, !!e));
      for (const m of mobs) { g.missions.temper(m); if (!m.elite) m.hp = m.maxHp = Math.round(p.attack * 1.2); }
    },
    tick(i) {
      keep(0.75);
      cam.goal.yaw = yaw0 + 0.18 * ease(Math.max(0, i) / 150);
      if (i === -14) cast(barSlot('nova'));
      if (i === 20 || i === 64 || i === 108) cast(barSlot('bolt'), nearest(mobs));
      if (i === 84) cast(barSlot('step'), null);
      if (!p.target && nearest(mobs)) g.controls.setTarget(nearest(mobs), true);
      if (i === 0) { score.boss.enraged = true; hush('boss:enrage', score.boss); }
    },
  });
  caption(1056, 1188, 'Places get harder each time you return');

  // 7. The Stone Warden comes down. (The game's own cinematic.)
  shots.push({
    id: 'felled', frames: 300, pre: 0,
    setup() {
      hero('vanguard', 'unit', ['quake', 'thorn', 'spore']);
      contract('ember', 'hunt', 0, [], true);
      cine.quiet = false; cine.seen = { 'elder:warden': true };
      boss = toElder(10);
      until(() => !cine.now, 400);
      for (let k = 0; k < 40; k++) { keep(1); if (p.target !== boss) g.controls.setTarget(boss, true); sim(); }
      boss.hp = 1; g.combat.strike(boss, 60);
      until(() => cine.now && cine.now.id === 'felled', 120);
      until(() => !cine.now || cine.now.t >= 0.75, 120);       // (in past the first of the slowed blow, which is all rock this close)
    },
    tick(i) {
      keep(1);
      if (i === 0) { score.boss.dead = true; score.heat = 0; hush('boss:fell', score.boss); }
    },
  });

  // 8. Home: the town at evening, the lumen at the shoulder, and the pad that takes you down.
  shots.push({
    id: 'home', frames: 270, pre: 10,
    setup() {
      document.body.classList.add('nocard');
      hero('vanguard', 'unit', ['quake', 'thorn', 'spore']);
      home();
      g.hour = 17.6;
      const pad = g.world.structures.find((s) => s.role === 'deploy');
      ms.refresh(); ms.accept(0);
      yaw0 = 0.2;
      go(pad.x - 1.5, pad.z - 9.5, yaw0 + Math.PI, 0.22, 8.5, 0.15, 0);
      boss = pad;
    },
    tick(i) {
      const t = Math.max(0, i) / 270;
      if (i < 200) p.moveTo = { x: boss.x - 0.6, z: boss.z - 4.2 };
      cam.goal.yaw = yaw0 + Math.PI + 0.55 * ease(t);
      cam.goal.pitch = 0.22 + 0.2 * ease(t);
      cam.goal.distance = 8.5 + 5 * ease(t);
      if (i === 0) { score.area = 'town'; score.boss = null; hush('zone', {}); hush('mission:report', { won: true }); }
      veil.style.opacity = String(Math.max(0, Math.min(1, (i - 236) / 30)).toFixed(3));
    },
  });
  caption(1584, 1740, 'Free to play in your browser');

  // ---------------------------------------------------------------- the clock
  const starts = [];
  let total = 0;
  for (const s of shots) { starts.push(total); total += s.frames; }
  let f = 0, k = -1, i = 0, shot = null;
  window.__dir = {
    async step() {
      if (k < 0 || i >= shot.frames) {
        if (shot && shot.after) shot.after();
        k++; shot = shots[k]; i = -shot.pre;
        filming = false;
        shot.setup();
        for (; i < 0; i++) { shot.tick(i); sim(); }
      }
      filming = true;
      shot.tick(i);
      sim();
      captionAt(f);
      await soundFrame();
      const info = `${shot.id} ${i}`;
      i++; f++;
      return info;
    },
    async finishSound() {
      filming = false;
      actx.resume();
      await rendering;
      // the film's length, levelled for a phone speaker: about -16 dB rms over the whole, peaks held under -1 dB
      const n = Math.min(buffer.length, Math.ceil(total * FR * SR) + Math.round(0.2 * SR));
      const L = buffer.getChannelData(0), Rr = buffer.getChannelData(1);
      let sum = 0;
      for (let j = 0; j < n; j++) sum += (L[j] * L[j] + Rr[j] * Rr[j]) / 2;
      const rms = Math.sqrt(sum / n), gain = Math.min(12, Math.pow(10, -16 / 20) / Math.max(rms, 1e-6));
      const ceil = Math.pow(10, -1 / 20), soft = (x) => (Math.abs(x) < 0.7 * ceil ? x : Math.sign(x) * (0.7 * ceil + 0.3 * ceil * Math.tanh((Math.abs(x) - 0.7 * ceil) / (0.3 * ceil))));
      const fade = Math.round(0.5 * SR);
      const pcm = new Int16Array(n * 2);
      for (let j = 0; j < n; j++) {
        const e = j > n - fade ? (n - j) / fade : 1;
        pcm[j * 2] = Math.round(soft(L[j] * gain) * e * 32767);
        pcm[j * 2 + 1] = Math.round(soft(Rr[j] * gain) * e * 32767);
      }
      const head = new DataView(new ArrayBuffer(44));
      const str = (o, s) => [...s].forEach((c, q) => head.setUint8(o + q, c.charCodeAt(0)));
      str(0, 'RIFF'); head.setUint32(4, 36 + pcm.byteLength, true); str(8, 'WAVE'); str(12, 'fmt ');
      head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 2, true); head.setUint32(24, SR, true);
      head.setUint32(28, SR * 4, true); head.setUint16(32, 4, true); head.setUint16(34, 16, true); str(36, 'data'); head.setUint32(40, pcm.byteLength, true);
      const bytes = new Uint8Array(44 + pcm.byteLength);
      bytes.set(new Uint8Array(head.buffer), 0); bytes.set(new Uint8Array(pcm.buffer), 44);
      const CH = 1 << 21;
      this.parts = [];
      for (let o = 0; o < bytes.length; o += CH) {
        let bin = '';
        const piece = bytes.subarray(o, o + CH);
        for (let q = 0; q < piece.length; q += 0x8000) bin += String.fromCharCode.apply(null, piece.subarray(q, q + 0x8000));
        this.parts.push(btoa(bin));
      }
      console.log(`sound: rms ${(20 * Math.log10(rms)).toFixed(1)} dB before levelling, gain ${(20 * Math.log10(gain)).toFixed(1)} dB`);
      return this.parts.length;
    },
    soundPart(q) { return this.parts[q]; },
  };
  return total;
})();
