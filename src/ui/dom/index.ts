// The interface's own small renderer: JSX elements, function components with hooks, and a keyed diff onto the real
// DOM. It does what the interface needs and no more (no class components, context, portals or memo), and it follows
// the conventions the components were written against: `class` and `className`, `style` objects (custom properties
// too), `onX` events, DOM properties where an element has one and attributes otherwise, `data-*`/`aria-*` kept even
// when false, keyed children, object and callback refs, state updates batched into one render a microtask later,
// effects run after the next paint.
//
// Nodes it did not create are left alone: an element it renders with no children can be filled by other code
// (the plates, the floaters, the portrait canvases), and its diff never removes what it did not put there.

export type Key = string | number;
export type ComponentChild = VNode | string | number | bigint | boolean | null | undefined;
export type ComponentChildren = ComponentChild | ComponentChildren[];
export type FunctionComponent<P = Record<string, unknown>> = (props: P) => ComponentChildren;
export interface RefObject<T> {
  current: T;
}
export type RefCallback<T> = (value: T | null) => void;
export type Ref<T> = RefObject<T | null> | RefCallback<T> | null | undefined;

const TEXT = '#text';
const ROOT = '#root';
const SVG_NS = 'http://www.w3.org/2000/svg';

export function Fragment(props: { children?: ComponentChildren }): ComponentChildren {
  return props.children;
}

interface HookSlot {
  value?: unknown;
  set?: (next: unknown) => void;
  deps?: readonly unknown[];
  effect?: () => void | (() => void);
  cleanup?: void | (() => void);
}

interface ComponentState {
  hooks: HookSlot[];
  pending: HookSlot[];
  vnode: VNode;
  dirty: boolean;
  gone: boolean;
}

export interface VNode<P = any> {
  type: string | FunctionComponent<any>;
  props: P;
  key: Key | undefined;
  ref: Ref<unknown>;
  /** element or text: its node */
  dom: Node | null;
  /** what it rendered (elements, components, fragments, the root) */
  kids: VNode[] | null;
  parent: VNode | null;
  comp: ComponentState | null;
  depth: number;
  svg: boolean;
}

function vnode(type: VNode['type'], props: any, key: Key | undefined, ref: Ref<unknown>): VNode {
  return { type, props, key, ref, dom: null, kids: null, parent: null, comp: null, depth: 0, svg: false };
}

export function createElement(type: VNode['type'], props?: Record<string, any> | null, ...children: ComponentChildren[]): VNode {
  const p: Record<string, any> = {};
  let key: Key | undefined;
  let ref: Ref<unknown>;
  if (props) {
    for (const k in props) {
      if (k === 'key') key = props[k];
      else if (k === 'ref') ref = props[k];
      else p[k] = props[k];
    }
  }
  if (children.length) p.children = children.length === 1 ? children[0] : children;
  return vnode(type, p, key, ref);
}
export const h = createElement;

/** The JSX automatic runtime's entry: children are already in props, the key comes apart. */
export function jsx(type: VNode['type'], props: Record<string, any>, key?: Key): VNode {
  let ref: Ref<unknown>;
  let p = props;
  if ('ref' in props) {
    p = {};
    for (const k in props) {
      if (k === 'ref') ref = props[k];
      else p[k] = props[k];
    }
  }
  return vnode(type, p, key, ref);
}

// ---------------------------------------------------------------- children

/** A child list as vnodes of its own (a vnode may be shown in several places, so each place gets a copy). */
function normalize(children: ComponentChildren, out: VNode[] = []): VNode[] {
  if (children == null || typeof children === 'boolean') return out;
  if (Array.isArray(children)) {
    for (const c of children) normalize(c, out);
  } else if (typeof children === 'object') {
    const v = children as VNode;
    out.push(vnode(v.type, v.props, v.key, v.ref));
  } else {
    out.push(vnode(TEXT, String(children), undefined, undefined));
  }
  return out;
}

const isHost = (v: VNode): boolean => typeof v.type === 'string';

/** The DOM nodes a vnode puts directly into its host element, in order. */
function nodesOf(v: VNode, out: Node[] = []): Node[] {
  if (v.type === TEXT || (isHost(v) && v.type !== ROOT)) {
    if (v.dom) out.push(v.dom);
  } else if (v.kids) {
    for (const k of v.kids) nodesOf(k, out);
  }
  return out;
}

/** Puts a host's managed nodes in order (anything else in it stays where it is, after them). */
function place(host: VNode): void {
  const parent = host.dom as Node;
  const nodes: Node[] = [];
  for (const k of host.kids || []) nodesOf(k, nodes);
  if (!nodes.length) return;
  let at: Node | null = null;
  // start where the first managed node already is, or at the end if none is in place yet
  for (const n of nodes) {
    if (n.parentNode === parent) {
      at = n;
      break;
    }
  }
  for (const n of nodes) {
    if (n === at) at = at.nextSibling;
    else parent.insertBefore(n, at);
  }
}

function diffChildren(parentV: VNode, raw: ComponentChildren, old: VNode[]): void {
  const next = normalize(raw);
  const used = new Array<boolean>(old.length).fill(false);
  for (let i = 0; i < next.length; i++) {
    const v = next[i];
    let match: VNode | null = null;
    const same = (o: VNode | undefined, j: number): boolean =>
      !!o && !used[j] && o.key === v.key && o.type === v.type;
    if (same(old[i], i)) {
      match = old[i];
      used[i] = true;
    } else {
      for (let j = 0; j < old.length; j++) {
        if (same(old[j], j)) {
          match = old[j];
          used[j] = true;
          break;
        }
      }
    }
    v.parent = parentV;
    v.depth = parentV.depth + 1;
    diff(v, match, parentV.svg);
  }
  for (let j = 0; j < old.length; j++) if (!used[j]) unmount(old[j], true);
  parentV.kids = next;
  if (isHost(parentV)) place(parentV);
}

// ---------------------------------------------------------------- diff

function diff(v: VNode, old: VNode | null, parentSvg: boolean): void {
  const type = v.type;
  if (type === TEXT) {
    if (old) {
      v.dom = old.dom;
      if (old.props !== v.props) (v.dom as Text).data = v.props;
    } else {
      v.dom = document.createTextNode(v.props);
    }
    return;
  }
  if (typeof type === 'function') {
    renderComponent(v, old, parentSvg);
    return;
  }
  const svg = type === 'svg' || (parentSvg && type !== 'foreignObject');
  v.svg = svg;
  let dom: Element;
  if (old) {
    dom = old.dom as Element;
    v.dom = dom;
    diffProps(dom, v.props, old.props, svg);
    diffChildren(v, v.props.children, old.kids || []);
  } else {
    dom = svg ? document.createElementNS(SVG_NS, type) : document.createElement(type);
    v.dom = dom;
    diffProps(dom, v.props, {}, svg);
    diffChildren(v, v.props.children, []);
  }
  const p = v.props;
  if ('value' in p && p.value !== undefined && (dom as HTMLInputElement).value !== String(p.value)) {
    (dom as HTMLInputElement).value = p.value;
  }
  if ('checked' in p && p.checked !== undefined && (dom as HTMLInputElement).checked !== p.checked) {
    (dom as HTMLInputElement).checked = p.checked;
  }
  if (!old || old.ref !== v.ref) {
    if (old) setRef(old.ref, null);
    setRef(v.ref, dom);
  }
}

function setRef(ref: Ref<unknown>, value: unknown): void {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else ref.current = value;
}

function unmount(v: VNode, removeDom: boolean): void {
  const c = v.comp;
  if (c) {
    c.gone = true;
    for (const hk of c.hooks) {
      if (typeof hk.cleanup === 'function') hk.cleanup();
      hk.cleanup = undefined;
    }
    c.pending.length = 0;
  }
  if (v.ref) setRef(v.ref, null);
  const own = v.type === TEXT || isHost(v);
  if (v.kids) for (const k of v.kids) unmount(k, removeDom && !own);
  if (own && removeDom && v.dom && v.dom.parentNode) v.dom.parentNode.removeChild(v.dom);
}

// ---------------------------------------------------------------- properties

// (numbers on these style properties take no unit)
const UNITLESS = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

function setStyle(style: CSSStyleDeclaration, key: string, value: unknown): void {
  if (key[0] === '-') style.setProperty(key, value == null ? '' : String(value));
  else
    (style as unknown as Record<string, string>)[key] =
      value == null ? '' : typeof value !== 'number' || UNITLESS.test(key) ? String(value) : value + 'px';
}

type Listening = Element & { l?: Record<string, (e: Event) => void> };
function proxy(this: Listening, e: Event): void {
  this.l?.[e.type + 'false']?.(e);
}
function proxyCapture(this: Listening, e: Event): void {
  this.l?.[e.type + 'true']?.(e);
}

function setProp(dom: Element, name: string, value: any, old: any, svg: boolean): void {
  if (name === 'style') {
    const style = (dom as HTMLElement).style;
    if (typeof value === 'string') {
      style.cssText = value;
      return;
    }
    if (typeof old === 'string') {
      style.cssText = '';
      old = null;
    }
    if (old) for (const k in old) if (!(value && k in value)) setStyle(style, k, '');
    if (value) for (const k in value) if (!old || value[k] !== old[k]) setStyle(style, k, value[k]);
    return;
  }
  if (name[0] === 'o' && name[1] === 'n') {
    const bare = name.replace(/(PointerCapture)$|Capture$/i, '$1');
    const capture = bare !== name;
    const lower = bare.toLowerCase();
    const type = lower in dom || bare === 'onFocusIn' || bare === 'onFocusOut' ? lower.slice(2) : bare.slice(2);
    const el = dom as Listening;
    const map = el.l || (el.l = {});
    map[type + capture] = value;
    const fn = capture ? proxyCapture : proxy;
    if (value) {
      if (!old) dom.addEventListener(type, fn as EventListener, capture);
    } else {
      dom.removeEventListener(type, fn as EventListener, capture);
    }
    return;
  }
  if (svg) {
    if (name === 'className') name = 'class';
  } else if (
    name !== 'width' &&
    name !== 'height' &&
    name !== 'href' &&
    name !== 'list' &&
    name !== 'form' &&
    name !== 'tabIndex' &&
    name !== 'download' &&
    name !== 'rowSpan' &&
    name !== 'colSpan' &&
    name !== 'role' &&
    name !== 'popover' &&
    name in dom
  ) {
    try {
      (dom as unknown as Record<string, unknown>)[name] = value == null ? '' : value;
      return;
    } catch {
      // (a read-only property: fall through to the attribute)
    }
  }
  if (typeof value === 'function') return;
  if (value != null && (value !== false || name[4] === '-')) dom.setAttribute(name, value === true && name === 'popover' ? '' : value);
  else dom.removeAttribute(name);
}

const SKIP = new Set(['children', 'key', 'ref', 'value', 'checked']);

function diffProps(dom: Element, props: Record<string, any>, old: Record<string, any>, svg: boolean): void {
  for (const k in old) if (!SKIP.has(k) && !(k in props)) setProp(dom, k, null, old[k], svg);
  for (const k in props) if (!SKIP.has(k) && props[k] !== old[k]) setProp(dom, k, props[k], old[k], svg);
}

// ---------------------------------------------------------------- components and hooks

let current: ComponentState | null = null;
let hookAt = 0;

function renderComponent(v: VNode, old: VNode | null, parentSvg: boolean): void {
  const c: ComponentState = (old && old.comp) || { hooks: [], pending: [], vnode: v, dirty: false, gone: false };
  if (c.pending.length) runEffects(c);
  v.comp = c;
  v.svg = parentSvg;
  c.vnode = v;
  c.dirty = false;
  const before = current;
  const beforeAt = hookAt;
  current = c;
  hookAt = 0;
  let out: ComponentChildren;
  try {
    out = (v.type as FunctionComponent<any>)(v.props);
  } finally {
    current = before;
    hookAt = beforeAt;
  }
  diffChildren(v, out, (old && old.kids) || []);
  if (c.pending.length) afterPaint(c);
}

function slot(): HookSlot {
  if (!current) throw new Error('A hook was called outside a component');
  return current.hooks[hookAt++] || (current.hooks[hookAt - 1] = {});
}

const changed = (old: readonly unknown[] | undefined, next: readonly unknown[] | undefined): boolean =>
  !old || !next || old.length !== next.length || next.some((a, i) => a !== old[i]);

export function useState<S>(initial: S | (() => S)): [S, (next: S | ((prev: S) => S)) => void];
export function useState<S = undefined>(): [S | undefined, (next: S | undefined | ((prev: S | undefined) => S | undefined)) => void];
export function useState<S>(initial?: S | (() => S)): [S, (next: S | ((prev: S) => S)) => void] {
  const hk = slot();
  if (!hk.set) {
    const c = current as ComponentState;
    hk.value = typeof initial === 'function' ? (initial as () => S)() : initial;
    hk.set = (next) => {
      const value = typeof next === 'function' ? (next as (prev: unknown) => unknown)(hk.value) : next;
      if (Object.is(value, hk.value)) return;
      hk.value = value;
      enqueue(c);
    };
  }
  return [hk.value as S, hk.set as (next: S | ((prev: S) => S)) => void];
}

export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void {
  const hk = slot();
  if (changed(hk.deps, deps) || !hk.effect) {
    hk.effect = effect;
    hk.deps = deps;
    (current as ComponentState).pending.push(hk);
  }
}

export function useMemo<T>(make: () => T, deps: readonly unknown[]): T {
  const hk = slot();
  if (changed(hk.deps, deps) || !('value' in hk)) {
    hk.value = make();
    hk.deps = deps;
  }
  return hk.value as T;
}

export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly unknown[]): T {
  return useMemo(() => fn, deps);
}

export function useRef<T>(initial: T): RefObject<T>;
export function useRef<T>(initial: T | null): RefObject<T | null>;
export function useRef<T = undefined>(): RefObject<T | undefined>;
export function useRef<T>(initial?: T): RefObject<T | undefined> {
  return useMemo(() => ({ current: initial }), []);
}

function runEffects(c: ComponentState): void {
  const list = c.pending.splice(0);
  for (const hk of list) {
    if (typeof hk.cleanup === 'function') hk.cleanup();
    hk.cleanup = undefined;
  }
  for (const hk of list) if (!c.gone && hk.effect) hk.cleanup = hk.effect();
}

// effects run after the next paint (or after 100 ms where frames do not come, as in a hidden tab)
const waiting = new Set<ComponentState>();
let painting = false;
function afterPaint(c: ComponentState): void {
  waiting.add(c);
  if (painting) return;
  painting = true;
  const done = (): void => {
    clearTimeout(timer);
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    setTimeout(flushEffects);
  };
  const timer = setTimeout(done, 100);
  const frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(done) : 0;
}
function flushEffects(): void {
  painting = false;
  const list = [...waiting];
  waiting.clear();
  for (const c of list) if (!c.gone && c.pending.length) runEffects(c);
}

// state updates: one render of everything changed, a microtask later, parents before children
let queue: ComponentState[] = [];
let queued = false;
function enqueue(c: ComponentState): void {
  if (c.gone || c.dirty) return;
  c.dirty = true;
  queue.push(c);
  if (!queued) {
    queued = true;
    Promise.resolve().then(flushRenders);
  }
}
function flushRenders(): void {
  queued = false;
  while (queue.length) {
    const list = queue.sort((a, b) => a.vnode.depth - b.vnode.depth);
    queue = [];
    for (const c of list) if (c.dirty && !c.gone) rerender(c);
  }
}
function rerender(c: ComponentState): void {
  const v = c.vnode;
  renderComponent(v, v, v.svg);
  let host = v.parent;
  while (host && !isHost(host)) host = host.parent;
  if (host) place(host);
}

// ---------------------------------------------------------------- render

const roots = new WeakMap<Element, VNode>();

/** Shows children in a container (null takes them away again). */
export function render(children: ComponentChildren, container: Element): void {
  let root = roots.get(container);
  if (!root) {
    root = vnode(ROOT, {}, undefined, undefined);
    root.dom = container;
    root.kids = [];
    root.svg = container.namespaceURI === SVG_NS;
    roots.set(container, root);
  }
  diffChildren(root, children, root.kids || []);
}

// ---------------------------------------------------------------- JSX types

/** An event whose currentTarget is the element the handler is on. */
export type TargetedEvent<T extends EventTarget, E extends Event = Event> = Omit<E, 'currentTarget'> & {
  readonly currentTarget: T;
};
type On<T extends EventTarget, E extends Event> = ((e: TargetedEvent<T, E>) => void) | null | undefined;

export interface DOMAttributes<T extends EventTarget> {
  children?: ComponentChildren;
  key?: Key;
  ref?: Ref<T>;
  class?: string;
  className?: string;
  style?: string | Record<string, string | number | null | undefined>;
  onClick?: On<T, MouseEvent>;
  onDblClick?: On<T, MouseEvent>;
  onContextMenu?: On<T, MouseEvent>;
  onPointerDown?: On<T, PointerEvent>;
  onPointerUp?: On<T, PointerEvent>;
  onPointerMove?: On<T, PointerEvent>;
  onPointerOver?: On<T, PointerEvent>;
  onPointerCancel?: On<T, PointerEvent>;
  onLostPointerCapture?: On<T, PointerEvent>;
  onKeyDown?: On<T, KeyboardEvent>;
  onKeyUp?: On<T, KeyboardEvent>;
  onInput?: On<T, Event>;
  onChange?: On<T, Event>;
  onFocus?: On<T, FocusEvent>;
  onBlur?: On<T, FocusEvent>;
  onFocusIn?: On<T, FocusEvent>;
  onFocusOut?: On<T, FocusEvent>;
  onWheel?: On<T, WheelEvent>;
  [attribute: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type Element = VNode;
  export type ElementType = string | ((props: any) => ComponentChildren);
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicAttributes {
    key?: Key;
  }
  export type IntrinsicElements = {
    [K in keyof HTMLElementTagNameMap]: DOMAttributes<HTMLElementTagNameMap[K]>;
  } & {
    [K in Exclude<keyof SVGElementTagNameMap, keyof HTMLElementTagNameMap>]: DOMAttributes<SVGElementTagNameMap[K]>;
  };
}
