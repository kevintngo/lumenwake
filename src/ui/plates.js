// World-anchored interface: name slips over creatures and the numbers that
// float up when something is hit. Pooled DOM nodes moved with transforms.
//
// Lettering never sits on other lettering:
//  - slips are laid out most important first (your target, then nearest); one
//    that would land on another is lifted to sit just above it, and one that
//    would land on the HUD (an announcement, the target plate, the map…) is
//    left out until there is room;
//  - a number starts above its creature's slip, not on it; numbers landing on
//    the same creature in quick succession fan out sideways; and a number that
//    would cross any slip or an older number steps up over it;
//  - the HUD is drawn over this layer (see ui.css), so nothing here can cover it.

const GAP = 4;            // px kept clear between two slips
const RISE = 44;          // px a number climbs
// letter heights of the numbers (ui.css: .fl and its kinds), [desktop, touch], to size them without measuring
const SIZES = { '': [27, 22], hurt: [27, 22], crit: [38, 30], heal: [22, 18], xp: [20, 18], miss: [20, 18] };

export class Plates {
  constructor(game, root, floatRoot) {
    this.game = game;
    this.root = root;
    this.floatRoot = floatRoot;
    this.nodes = new Map();   // entity id -> { el, fill, w, h, lift, shown }
    this.floaters = [];
    this.pool = [];
    this.hud = [];            // HUD boxes slips must keep off; read again whenever the HUD changes
    this.hudAge = 99;
    this.hudSig = -1;
    this.watch = ['toast', 'log', 'target', 'tracker'].map((id) => document.getElementById(id));

    const bus = game.bus;
    bus.on('damage', (d) => this.float(d.target, String(d.amount), d.target.kind === 'player' ? 'hurt' : d.crit ? 'crit' : ''));
    bus.on('miss', (d) => this.float(d.target, d.text, 'miss'));
    bus.on('xp', (d) => { const p = game.player; this.floatAt(p.x, p.y + 2.5, p.z, `+${d.amount} xp`, 'xp'); });
    bus.on('heal', (d) => { if (!d.focus) this.floatAt(d.entity.x, d.entity.y + 2.1, d.entity.z, 'Mended', 'heal'); });
  }

  /** A number over an entity: it rides above the entity's slip. */
  float(e, text, cls) {
    let slot = 0;
    for (const o of this.floaters) if (o.e === e && o.t < 0.5) slot++;
    const dx = slot ? (slot % 2 ? 1 : -1) * Math.ceil(slot / 2) * 36 : 0;
    this.push({ e, text, cls, dx, ph: 0 });
  }
  /** A word at a point in the world. */
  floatAt(x, y, z, text, cls) { this.push({ e: null, x, y, z, text, cls, dx: 0, ph: 0 }); }

  push(f) {
    const el = this.pool.pop() || this.floatRoot.appendChild(document.createElement('div'));
    el.className = 'fl ' + f.cls;
    el.textContent = f.text;
    el.style.display = '';
    const size = (SIZES[f.cls] || SIZES[''])[this.game.touch ? 1 : 0];
    f.el = el; f.t = 0; f.life = f.cls === 'crit' ? 1.1 : 0.9;
    f.w = f.text.length * size * 0.58 + 8; f.h = size + 2; f.up = 0;
    this.floaters.push(f);
  }

  /** The HUD's boxes, in this layer's pixels. */
  readHud() {
    const hud = this.hud;
    hud.length = 0;
    const add = (el) => {
      if (el.hidden) return;
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) hud.push({ l: r.left, t: r.top, r: r.right, b: r.bottom, hud: true });
    };
    for (const el of document.querySelectorAll('#ui > section:not(#log), #ui > nav, #log p, #toast.show, #place, body.touch #hotbar .slot')) add(el);
  }

  update(dt) {
    const g = this.game, cam = g.camera, p = g.player;
    const W = g.renderer.size.cssW, H = g.renderer.size.cssH;   // the picture's box, which #plates and #floaters share
    // the HUD's boxes are read again when an announcement, a message or a plate comes or goes, and now and then anyway
    const [toast, log, target, tracker] = this.watch;
    const sig = (toast.classList.contains('show') ? 1 + toast.textContent.length * 64 : 0) + (target.hidden ? 0 : 2) + (tracker.hidden ? 0 : 4) + log.childElementCount * 8;
    if (sig !== this.hudSig || (this.hudAge += dt) > 0.5) { this.hudSig = sig; this.hudAge = 0; this.readHud(); }
    const placed = [];         // slips already laid out this frame
    const blocked = (l, r, lift, y, h) => {
      const b = y - lift, t = b - h;
      for (const o of this.hud) if (l < o.r + GAP && r > o.l - GAP && t < o.b + GAP && b > o.t - GAP) return o;
      for (const o of placed) if (l < o.r + GAP && r > o.l - GAP && t < o.b + GAP && b > o.t - GAP) return o;
      return null;
    };

    // ---- name slips: townsfolk always, monsters when hovered, targeted or hurt, loot when near
    const want = [];
    for (const e of g.entities.list) {
      if (e.kind === 'player' || e.dead || e.grow < 0.6) continue;
      const dist = Math.hypot(e.x - p.x, e.z - p.z);
      let show = false;
      if (e.kind === 'npc') show = dist < 30;
      else if (e.kind === 'monster') show = !e.boss && dist < 40 && (e.marked || e.hover || e === p.target || e.hp < e.maxHp || e.elite || e.ai.state === 'chase' || e.ai.state === 'attack');
      else if (e.kind === 'drop') show = dist < 9 && e.age > 0.4;
      else if (e.kind === 'site') show = dist < 16;
      if (!show) continue;
      const s = cam.project(e.x, e.y + e.height + 0.25 + e.lift, e.z);
      if (!s || s.x < -0.1 || s.x > 1.1 || s.y < -0.1 || s.y > 1.1) continue;
      const rank = e === p.target ? 0 : e.marked ? 0.5 : e.hover ? 1 : e.kind === 'npc' ? 2 + dist * 0.01 : e.kind === 'drop' ? 200 + dist : (e.elite ? 5 : 10) + dist;
      want.push({ e, x: s.x * W, y: s.y * H, rank });
    }
    want.sort((a, b) => a.rank - b.rank);

    const seen = new Set();
    for (const it of want) {
      const e = it.e;
      seen.add(e.id);
      let n = this.nodes.get(e.id);
      if (!n) {
        const el = this.root.appendChild(document.createElement('div'));
        el.className = 'np' + (e.kind === 'npc' ? ' npc' : e.kind === 'drop' ? ' loot' + (e.rare ? ' rare' : '') : e.kind === 'site' ? ' site' : e.elite ? ' elite' : '');
        if (e.kind === 'monster') el.innerHTML = `${e.name}<small>Lv ${e.level}</small><span class="mini"><i></i></span>`;
        else if (e.kind === 'npc') el.innerHTML = `${e.name}<small>${e.title || ''}</small>`;
        else el.textContent = e.name;
        n = { el, fill: el.querySelector('i'), hp: -1, w: el.offsetWidth, h: el.offsetHeight, lift: 0, shown: true };
        this.nodes.set(e.id, n);
      }
      if (n.goal !== !!e.marked) { n.goal = !!e.marked; n.el.classList.toggle('goal', n.goal); }     // the guide's goal is ringed in red
      // find room: straight above the creature, or lifted over whatever slip is in the way
      const l = it.x - n.w / 2, r = it.x + n.w / 2;
      let need = 0, room = false;
      for (let tries = 0; tries < 6 && !room; tries++) {
        const hit = blocked(l, r, need, it.y, n.h);
        if (!hit) room = true;
        else if (hit.hud || need > 90) break;       // under the HUD, or too far from its creature to read as its name
        else need = it.y - hit.t + GAP;
      }
      if (room !== n.shown) { n.shown = room; n.el.style.visibility = room ? '' : 'hidden'; if (!room) n.lift = 0; }
      if (!room) continue;
      // up at once, down gently: a slip hops clear of another, then settles back without sliding through anything
      let lift = need;
      if (n.lift > need) { lift = Math.max(need, n.lift - 120 * dt); if (blocked(l, r, lift, it.y, n.h)) lift = need; }
      n.lift = lift;
      placed.push({ l, r, t: it.y - lift - n.h, b: it.y - lift });
      n.el.style.transform = `translate(${it.x.toFixed(1)}px, ${(it.y - n.lift).toFixed(1)}px) translate(-50%, -100%)`;
      if (n.fill && n.hp !== e.hp) { n.hp = e.hp; n.fill.style.transform = `scaleX(${Math.max(0, e.hp / e.maxHp).toFixed(3)})`; }
    }
    for (const [id, n] of this.nodes) if (!seen.has(id)) { n.el.remove(); this.nodes.delete(id); }

    // ---- numbers rise and fade; no bounce, no zoom. Oldest first, so a new one finds its way round the others.
    let w = 0;
    for (const f of this.floaters) {
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) { f.el.style.display = 'none'; this.pool.push(f.el); continue; }
      let x = 0, y = 0, s;       // y is the foot of the lettering
      if (f.e) {
        const e = f.e, n = this.nodes.get(e.id);
        if (n) f.ph = n.shown ? n.h + n.lift : 0;                 // clear of the slip, and remembered once the slip is gone
        // (a number on a colossus rises from where the blow landed, not from the top of its head)
        const top = e.hitY ? e.hitY + 1.2 : e.height + 0.25 + (e.lift || 0);
        s = e.hitY ? cam.project(e.x + (p.x - e.x) * 0.5, e.y + top, e.z + (p.z - e.z) * 0.5) : cam.project(e.x, e.y + top, e.z);
        if (s) { x = s.x * W + f.dx; y = s.y * H - f.ph - 3 - k * RISE; }
      } else {
        s = cam.project(f.x, f.y + k * 1.1, f.z);
        if (s) { x = s.x * W; y = s.y * H + f.h / 2; }
      }
      if (s) {
        // step up over any slip or older number in the way (and never back down into it)
        const l = x - f.w / 2, r = x + f.w / 2;
        for (let tries = 0; tries < 6; tries++) {
          const b = y - f.up, t = b - f.h;
          let hit = null;
          for (const o of placed) if (l < o.r + 2 && r > o.l - 2 && t < o.b + 2 && b > o.t - 2) { hit = o; break; }
          if (!hit) break;
          f.up = y - hit.t + 3;
        }
        placed.push({ l, r, t: y - f.up - f.h, b: y - f.up });
        f.el.style.transform = `translate(${x.toFixed(1)}px, ${(y - f.up).toFixed(1)}px) translate(-50%, -100%)`;
        f.el.style.opacity = k < 0.6 ? 1 : (1 - (k - 0.6) / 0.4).toFixed(2);
      } else f.el.style.opacity = 0;
      this.floaters[w++] = f;
    }
    this.floaters.length = w;
  }
}
