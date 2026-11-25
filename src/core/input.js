// Raw device state for one frame: keys held, keys pressed this frame, pointer
// position, clicks and drags, fingers on the picture, and the on-screen stick.
// Systems read it; nothing here knows the game.
//
// On the picture a mouse clicks, holds to steer and drags (right button) to turn
// the view. A finger taps (a click), drags to turn the view, and two fingers
// pinch to zoom; walking by touch is the stick's job.

const TAP_SLOP = 10;   // px a finger may wander and still count as a tap

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();      // key codes that went down this frame
    this.mouse = { x: 0, y: 0, nx: 0, ny: 0, inside: false, left: false, right: false };
    this.clicks = [];              // { x, y, nx, ny, button } released without dragging
    this.wheel = 0;
    this.dragX = 0; this.dragY = 0;   // camera drag accumulated this frame
    this.any = false;                 // any interaction this frame (used to unlock audio)
    this.down = null;
    this.stick = { x: 0, y: 0 };      // on-screen stick, -1..1, y is forward; the interface writes it
    this.acting = false;              // the on-screen attack button is held
    this.pinch = 1;                   // two-finger zoom this frame, as a factor on the camera distance
    this.touches = new Map();         // fingers on the picture: id -> { x, y, moved, multi }

    const typing = (e) => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    // Tab, Space, Enter and arrows work the interface whenever a button or a panel has focus,
    // or a panel or the title is up; only then are they kept from the game.
    const inUi = (e) => e.code !== 'Escape' && (
      (e.target instanceof Element && e.target.closest('button, a, [role="dialog"]')) ||
      (e.code === 'Tab' && document.querySelector('#panels .win, #pause:not([hidden]), body.titled')));
    addEventListener('keydown', (e) => {
      if (typing(e) || e.metaKey || e.ctrlKey || inUi(e)) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      this.any = true;
      if (/^(Space|Tab|Arrow|Digit|Key)/.test(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear(); this.touches.clear();
      this.mouse.left = this.mouse.right = false;
      this.stick.x = this.stick.y = 0; this.acting = false;
    });

    const place = (e) => {
      const r = canvas.getBoundingClientRect();
      const m = this.mouse;
      m.x = e.clientX - r.left; m.y = e.clientY - r.top;
      m.nx = (m.x / r.width) * 2 - 1; m.ny = 1 - (m.y / r.height) * 2;
    };
    canvas.addEventListener('pointerdown', (e) => {
      place(e);
      try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or already released pointer */ }
      this.any = true;
      if (e.pointerType === 'touch') {
        this.mouse.inside = false;      // a finger is not a cursor: nothing is hovered
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0, multi: false });
        if (this.touches.size > 1) for (const t of this.touches.values()) t.multi = true;
        return;
      }
      this.down = { x: e.clientX, y: e.clientY, button: e.button, moved: 0, lx: e.clientX, ly: e.clientY };
      if (e.button === 0) this.mouse.left = true; else this.mouse.right = true;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') {
        const t = this.touches.get(e.pointerId);
        if (!t) return;
        if (this.touches.size === 1) {
          t.moved += Math.abs(e.clientX - t.x) + Math.abs(e.clientY - t.y);
          if (t.moved > TAP_SLOP) { this.dragX += e.clientX - t.x; this.dragY += e.clientY - t.y; }
        } else if (this.touches.size === 2) {
          let o = null;
          for (const [id, f] of this.touches) if (id !== e.pointerId) o = f;
          const before = Math.hypot(t.x - o.x, t.y - o.y), after = Math.hypot(e.clientX - o.x, e.clientY - o.y);
          if (before > 24 && after > 24) this.pinch *= before / after;
        }
        t.x = e.clientX; t.y = e.clientY;
        return;
      }
      place(e);
      this.mouse.inside = true;
      const d = this.down;
      if (!d) return;
      d.moved += Math.abs(e.clientX - d.lx) + Math.abs(e.clientY - d.ly);
      if (d.button !== 0) { this.dragX += e.clientX - d.lx; this.dragY += e.clientY - d.ly; }
      d.lx = e.clientX; d.ly = e.clientY;
    });
    const up = (e) => {
      if (e.pointerType === 'touch') {
        const t = this.touches.get(e.pointerId);
        this.touches.delete(e.pointerId);
        if (t && !t.multi && t.moved <= TAP_SLOP && e.type === 'pointerup') {
          place(e);
          this.clicks.push({ x: this.mouse.x, y: this.mouse.y, nx: this.mouse.nx, ny: this.mouse.ny, button: 0, touch: true });
        }
        return;
      }
      place(e);
      const d = this.down;
      if (d && d.moved < 7) this.clicks.push({ x: this.mouse.x, y: this.mouse.y, nx: this.mouse.nx, ny: this.mouse.ny, button: d.button });
      this.down = null;
      this.mouse.left = this.mouse.right = false;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => (this.mouse.inside = false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  held(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }
  /** True while the left button is held long enough to count as "steer toward the cursor". */
  steering() { return this.mouse.left && this.down && this.down.button === 0; }

  endFrame() {
    this.pressed.clear();
    this.clicks.length = 0;
    this.wheel = 0; this.dragX = 0; this.dragY = 0; this.pinch = 1;
    this.any = false;
  }
}
