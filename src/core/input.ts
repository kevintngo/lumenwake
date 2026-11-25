const TAP_SLOP = 10;

interface MouseState {
  x: number;
  y: number;
  nx: number;
  ny: number;
  inside: boolean;
  left: boolean;
}

interface ClickEvent {
  nx: number;
  ny: number;
  button: number;
  touch?: boolean;
}

interface PointerDownState {
  button: number;
  moved: number;
  lx: number;
  ly: number;
}

interface TouchPoint {
  x: number;
  y: number;
  moved: number;
  multi: boolean;
}

export class Input {
  readonly keys = new Set<string>();
  readonly pressed = new Set<string>();
  readonly mouse: MouseState = { x: 0, y: 0, nx: 0, ny: 0, inside: false, left: false };
  readonly clicks: ClickEvent[] = [];
  wheel = 0;
  dragX = 0;
  dragY = 0;
  down: PointerDownState | null = null;
  readonly stick = { x: 0, y: 0 };
  acting = false;
  pinch = 1;
  readonly touches = new Map<number, TouchPoint>();

  constructor(canvas: HTMLCanvasElement) {
    const typing = (e: KeyboardEvent) =>
      e.target instanceof Element && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);

    const inUi = (e: KeyboardEvent) =>
      e.code !== 'Escape' &&
      ((e.target instanceof Element && Boolean(e.target.closest('button, a, [role="dialog"]'))) ||
        (e.code === 'Tab' &&
          Boolean(document.querySelector('#panels .win, #pause:not([hidden]), body.titled'))));

    addEventListener('keydown', (e) => {
      if (typing(e) || e.metaKey || e.ctrlKey || inUi(e)) return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (/^(Space|Tab|Arrow|Digit|Key)/.test(e.code)) e.preventDefault();
    });

    addEventListener('keyup', (e) => this.keys.delete(e.code));

    addEventListener('blur', () => {
      this.keys.clear();
      this.touches.clear();
      this.mouse.left = false;
      this.stick.x = 0;
      this.stick.y = 0;
      this.acting = false;
    });

    const place = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const m = this.mouse;
      m.x = e.clientX - r.left;
      m.y = e.clientY - r.top;
      m.nx = (m.x / r.width) * 2 - 1;
      m.ny = 1 - (m.y / r.height) * 2;
    };

    canvas.addEventListener('pointerdown', (e) => {
      place(e);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
      }
      if (e.pointerType === 'touch') {
        this.mouse.inside = false;
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0, multi: false });
        if (this.touches.size > 1) {
          for (const t of this.touches.values()) t.multi = true;
        }
        return;
      }
      this.down = {
        button: e.button,
        moved: 0,
        lx: e.clientX,
        ly: e.clientY,
      };
      if (e.button === 0) this.mouse.left = true;
    });

    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') {
        const t = this.touches.get(e.pointerId);
        if (!t) return;
        if (this.touches.size === 1) {
          t.moved += Math.abs(e.clientX - t.x) + Math.abs(e.clientY - t.y);
          if (t.moved > TAP_SLOP) {
            this.dragX += e.clientX - t.x;
            this.dragY += e.clientY - t.y;
          }
        } else if (this.touches.size === 2) {
          let o: TouchPoint | null = null;
          for (const [id, f] of this.touches) {
            if (id !== e.pointerId) o = f;
          }
          if (o) {
            const before = Math.hypot(t.x - o.x, t.y - o.y);
            const after = Math.hypot(e.clientX - o.x, e.clientY - o.y);
            if (before > 24 && after > 24) this.pinch *= before / after;
          }
        }
        t.x = e.clientX;
        t.y = e.clientY;
        return;
      }
      place(e);
      this.mouse.inside = true;
      const d = this.down;
      if (!d) return;
      d.moved += Math.abs(e.clientX - d.lx) + Math.abs(e.clientY - d.ly);
      if (d.button !== 0) {
        this.dragX += e.clientX - d.lx;
        this.dragY += e.clientY - d.ly;
      }
      d.lx = e.clientX;
      d.ly = e.clientY;
    });

    const up = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        const t = this.touches.get(e.pointerId);
        this.touches.delete(e.pointerId);
        if (t && !t.multi && t.moved <= TAP_SLOP && e.type === 'pointerup') {
          place(e);
          this.clicks.push({
            nx: this.mouse.nx,
            ny: this.mouse.ny,
            button: 0,
            touch: true,
          });
        }
        return;
      }
      place(e);
      const d = this.down;
      if (d && d.moved < 7) {
        this.clicks.push({
          nx: this.mouse.nx,
          ny: this.mouse.ny,
          button: d.button,
        });
      }
      this.down = null;
      this.mouse.left = false;
    };

    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => {
      this.mouse.inside = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );
  }

  held(code: string): boolean {
    return this.keys.has(code);
  }

  hit(code: string): boolean {
    return this.pressed.has(code);
  }

  steering(): boolean {
    return this.mouse.left && this.down !== null && this.down.button === 0;
  }

  endFrame(): void {
    this.pressed.clear();
    this.clicks.length = 0;
    this.wheel = 0;
    this.dragX = 0;
    this.dragY = 0;
    this.pinch = 1;
  }
}
