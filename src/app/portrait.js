// The hero's own likeness, drawn by the game. Whenever who the hero is, or what
// is in their hand, changes, one frame is taken of the hero alone on a clean
// sheet and handed to the interface as two pictures: head and shoulders, and
// the whole figure. So the portrait in the corner is always exactly the hero
// on the ground, whatever people, class and colours were chosen.
//
// The clean sheet is the sky: the hero is stood high in overcast (cloud is bare
// paper) straight above where they are, and seen from a little below, so no
// ground and no horizon is in the frame. Everything touched is put back before
// the frame the player sees is drawn.

const RAD = Math.PI / 180;
const UP = 15.5 * RAD;          // how far below the figure the camera stands

export class Portraits {
  constructor(game) {
    this.game = game;
    this.due = true;
    this.bust = ''; this.figure = '';
    for (const ev of ['people', 'class', 'equip']) game.bus.on(ev, () => { this.due = true; });
  }

  /** Once a frame, before the frame the player sees is drawn. */
  update() {
    if (!this.due || document.hidden) return;
    this.due = false;
    try { this.take(); } catch (err) { console.warn('Portrait not taken:', err); }
  }

  take() {
    const g = this.game, r = g.renderer, cam = g.camera, p = g.player, view = g.view;
    const size = { ...r.size }, scale = r.scale, paper = { ...r.paper }, map = [...r.minimap.rect];
    const keep = { y: p.y, yaw: p.yaw, lift: p.lift, action: p.action, actionT: p.actionT, move: p.move, walk: p.walk, grow: p.grow, pose: p.pose, flash: p.flash, shade: p.shade };
    const was = { rail: cam.rail, shake: cam.shake, cloud: g.env.cloud, fade: g.look.fade, veil: g.look.veil, hurt: g.look.hurt };
    // the sitter: at ease, facing north (the ringed world hangs in the north-west, so the camera looks the other way)
    Object.assign(p, { y: p.y + 70, yaw: Math.PI, lift: 0, action: 0, actionT: 0, move: 0, walk: 0, grow: 1, pose: undefined, flash: 0, shade: 1 });
    view.only = p;
    g.env.cloud = 1.7; g.look.fade = 1; g.look.veil = 0; g.look.hurt = 0; cam.shake = 0;
    r.scale = 1.4;
    r.minimap.rect = [0, 0, 0, 0];
    const tall = p.height * 1.02 / 1.6 * 1.95;         // a little more than head to foot
    const shot = (w, h, fit, mid, lens, turn) => {
      const D = (fit / 2) / Math.tan(lens * RAD / 2) * 1.04, t = turn + Math.PI, cy = p.y + tall * mid;
      r.resize(w, h, 2);
      r.paper.a = null; r.paper.b = null; r.paper.mix = 0;
      cam.rail = { pos: [p.x + Math.sin(t) * Math.cos(UP) * D, cy - Math.sin(UP) * D, p.z + Math.cos(t) * Math.cos(UP) * D], look: [p.x, cy, p.z], lens: lens * RAD, mix: 1 };
      cam.update(0, [p.x, p.y + 1, p.z], w / h, null);
      r.render(view.build(g.time));
      return g.canvas.toDataURL('image/webp', 0.9);
    };
    this.bust = shot(176, 176, tall * 0.5, 0.62, 9, 0.4);
    this.figure = shot(300, 400, tall, 0.47, 13, 0.5);
    // ... and everything back as it was
    Object.assign(p, keep);
    view.only = null;
    Object.assign(cam, { rail: was.rail, shake: was.shake });
    g.env.cloud = was.cloud; g.look.fade = was.fade; g.look.veil = was.veil; g.look.hurt = was.hurt;
    r.scale = scale;
    Object.assign(r.paper, paper);
    r.minimap.rect = map;
    r.resize(size.cssW, size.cssH, size.dpr);
    g.bus.emit('portrait', { bust: this.bust, figure: this.figure });
  }
}
