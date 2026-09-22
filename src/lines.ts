import { ROLL_MS, SPRING } from "./tokens.js";

// Icons morph into each other in two ways.
//
// Line icons (one to three <line>s) follow Benji Taylor's
// "Morphing icons with Claude": every icon is padded to three lines, a line an icon
// doesn't need collapses to an invisible point at the centre, and two icons that are
// the same shape turned (arrows, chevrons, plus and cross) rotate instead of morphing.
//
// Any other outline icon of up to four simple shapes (a Nucleo play and pause, say) morphs
// outline to outline: each shape is sampled into points along its length, shapes pair up by
// where they sit, each outline is turned to start where its partner starts and run the same
// way, so it never folds through itself on the way, and the points travel on the roll's spring.

type Seg = [number, number, number, number];
type Point = [number, number];

const LINES = 3; // every line icon is padded to this many, so any one can become any other
const EPS = 0.05; // viewBox units two endpoints may differ by and still count as the same point
const TURNS = [90, -90, 180, 45, -45, 135, -135]; // quarter turns first (arrows, chevrons), then eighths (plus into cross)
const COORDS = ["x1", "y1", "x2", "y2"] as const;

// The spring's own stops, so a morph drawn frame by frame keeps pace with the glyphs rolling beside it.
const STOPS = SPRING.slice(SPRING.indexOf("(") + 1, -1).split(",").map(Number);
const ease = (t: number) => {
  const x = t * (STOPS.length - 1);
  const i = Math.min(Math.floor(x), STOPS.length - 2);
  return STOPS[i] + (STOPS[i + 1] - STOPS[i]) * (x - i);
};

/** An svg with a viewBox whose children are one to three lines. */
export const isLineIcon = (el: Element) =>
  el.localName === "svg" && !!el.getAttribute("viewBox") && el.children.length > 0 && el.children.length <= LINES &&
  [...el.children].every((c) => c.localName === "line");

const centre = (svg: Element): Point => {
  const [x, y, w, h] = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  return [x + w / 2, y + h / 2];
};
const read = (line: Element): Seg => COORDS.map((k) => parseFloat(line.getAttribute(k) ?? "") || 0) as Seg;
const write = (line: Element, seg: Seg) => COORDS.forEach((k, i) => line.setAttribute(k, String(seg[i])));
const turn = ([x1, y1, x2, y2]: Seg, deg: number, [cx, cy]: Point): Seg => {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const at = (x: number, y: number) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos];
  return [...at(x1, y1), ...at(x2, y2)] as Seg;
};
const flip = ([x1, y1, x2, y2]: Seg): Seg => [x2, y2, x1, y1];
const gap = (a: Seg, b: Seg) => Math.hypot(a[0] - b[0], a[1] - b[1]) + Math.hypot(a[2] - b[2], a[3] - b[3]);
const near = (a: Seg, b: Seg) => Math.min(gap(a, b), gap(a, flip(b)));
const point = ([cx, cy]: Point): Seg => [cx, cy, cx, cy];
const collapsed = (s: Seg, c: Point) => gap(s, point(c)) < EPS;

/** The same drawing, whatever order its lines were written in and whichever way each one runs. */
export function same(a: Seg[], b: Seg[], c: Point): boolean {
  const left = a.filter((s) => !collapsed(s, c));
  const right = b.filter((s) => !collapsed(s, c));
  if (left.length !== right.length) return false;
  const used = new Set<number>();
  return left.every((s) => {
    const i = right.findIndex((r, k) => !used.has(k) && near(s, r) < EPS * 2);
    return i >= 0 && used.add(i);
  });
}

/** The quarter or eighth turn that takes `a` onto `b`, if there is one. */
export const turnBetween = (a: Seg[], b: Seg[], c: Point) => TURNS.find((deg) => same(a.map((s) => turn(s, deg, c)), b, c));

/**
 * Where each of `a`'s three lines should go: the assignment of `b`'s lines, and the direction
 * each runs, that moves the endpoints least, so lines slide into place instead of crossing.
 */
export function assign(a: Seg[], b: Seg[], c: Point): Seg[] {
  const to = [...b, ...Array.from({ length: LINES - b.length }, () => point(c))];
  let best: Seg[] = to;
  let cost = Infinity;
  for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
    const picked = order.map((k, i) => (gap(a[i], to[k]) <= gap(a[i], flip(to[k])) ? to[k] : flip(to[k])));
    const total = picked.reduce((sum, s, i) => sum + gap(a[i], s), 0);
    if (total < cost) {
      cost = total;
      best = picked;
    }
  }
  return best;
}

/** A line collapsed to the centre is hidden, so a padding line never shows as a dot under a round cap. */
export const hideCollapsed = (svg: Element) => {
  const c = centre(svg);
  for (const line of svg.children) (line as SVGElement).style.opacity = collapsed(read(line), c) ? "0" : "";
};

const tweens = new WeakMap<Element, () => void>();

/** Fold a rotation in flight into the coordinates, so the next morph starts from exactly what is on screen. */
function settle(face: Element) {
  tweens.get(face)?.();
  const angle = parseFloat(getComputedStyle(face).rotate) || 0;
  face.getAnimations().forEach((a) => a.cancel());
  if (angle) for (const line of face.children) write(line, turn(read(line), angle, centre(face)));
}

/** Make `face` exactly `next`: its attributes and its shapes. Stroke and class changes land here, at the end. */
function become(face: Element, next: Element) {
  for (const { name } of [...face.attributes]) if (name !== "style" && !next.hasAttribute(name)) face.removeAttribute(name);
  for (const { name, value } of next.attributes) if (name !== "id" && name !== "style") face.setAttribute(name, value);
  face.replaceChildren(...[...next.children].map((c) => c.cloneNode(true)));
  if (isLineIcon(face)) hideCollapsed(face);
}

/** Run `draw(eased progress)` each frame for one roll after `delay`, then `done`. Stoppable where it stands. */
function tween(face: Element, delay: number, draw: (e: number, t: number) => void, done: () => void) {
  const begin = performance.now() + delay;
  let frame = 0;
  const tick = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - begin) / ROLL_MS));
    draw(ease(t), t);
    if (t < 1) frame = requestAnimationFrame(tick);
    else {
      tweens.delete(face);
      done();
    }
  };
  frame = requestAnimationFrame(tick);
  tweens.set(face, () => {
    cancelAnimationFrame(frame); // stopped where it is: the next morph reads the drawing as it stands
    tweens.delete(face);
  });
}

/**
 * Morph the drawn line icon `face` into `next`. Same drawing: nothing moves. Same drawing turned:
 * the svg rotates as one piece. Anything else: each line slides to its partner, and padding lines
 * shrink into the centre or grow out of it. `delay` null means at once. False when either isn't a line icon.
 */
export function morphLines(face: Element, next: Element, delay: number | null): boolean {
  if (!isLineIcon(face) || !isLineIcon(next) || face.getAttribute("viewBox") !== next.getAttribute("viewBox")) return false;
  settle(face);
  const c = centre(face);
  const from = [...face.children].map(read);
  const to = [...next.children].map(read);
  if (delay === null || same(from, to, c)) {
    become(face, next);
    return true;
  }

  const deg = turnBetween(from, to, c);
  if (deg !== undefined) {
    // The svg box turns, never the lines inside it: a composited transform stays smooth where per-line ones jitter.
    const spin = face.animate([{ rotate: "0deg" }, { rotate: `${deg}deg` }], { duration: ROLL_MS, delay, easing: SPRING, fill: "forwards" });
    spin.finished.then(() => {
      spin.cancel();
      become(face, next);
    }, () => {}); // cancelled: the next morph has already folded the turn in
    return true;
  }

  const lines = [...face.children] as SVGElement[];
  while (lines.length < LINES) {
    const pad = lines[0].cloneNode() as SVGElement;
    write(pad, point(c));
    pad.style.opacity = "0";
    face.append(pad);
    lines.push(pad);
  }
  const start = lines.map(read);
  const target = assign(start, to, c);
  const shownFrom = lines.map((l) => (l.style.opacity === "" ? 1 : parseFloat(l.style.opacity)));
  const shownTo = target.map((s) => (collapsed(s, c) ? 0 : 1));
  tween(face, delay, (e) => lines.forEach((line, i) => {
    write(line, start[i].map((v, k) => v + (target[i][k] - v) * e) as Seg);
    line.style.opacity = String(Math.min(1, Math.max(0, shownFrom[i] + (shownTo[i] - shownFrom[i]) * e)));
  }), () => become(face, next));
  return true;
}

// ---------------------------------------------------------------------------------------------
// Outline icons

const SHAPES = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const CLOSED = new Set(["rect", "circle", "ellipse", "polygon"]);
const MAX_SHAPES = 4; // more parts than this (a spinner's eight spokes) and the icon swaps instead of morphing
const SAMPLES = 64; // points along each outline: enough that a rounded corner stays round mid-morph
const GEOMETRY = new Set(["d", "x", "y", "width", "height", "rx", "ry", "cx", "cy", "r", "x1", "y1", "x2", "y2", "points", "pathLength"]);
const SVG = "http://www.w3.org/2000/svg";

/** One outline, as SAMPLES + 1 points; a closed one ends where it starts. */
export type Outline = { points: Point[]; closed: boolean };

/** An svg with a viewBox made of one to four simple shapes, each a single stroke: no compound paths with holes. */
export const isShapeIcon = (el: Element) =>
  el.localName === "svg" && !!el.getAttribute("viewBox") && el.children.length > 0 && el.children.length <= MAX_SHAPES &&
  [...el.children].every((c) => SHAPES.has(c.localName) && (c.localName !== "path" || (c.getAttribute("d")?.match(/m/gi) ?? []).length === 1));

/** Any icon this module can morph. */
export const isMorphable = (el: Element) => isLineIcon(el) || isShapeIcon(el);

const outline = (shape: Element): Outline | null => {
  const geometry = shape as SVGGeometryElement;
  if (typeof geometry.getTotalLength !== "function" || typeof geometry.getPointAtLength !== "function") return null;
  const length = geometry.getTotalLength();
  const closed = CLOSED.has(shape.localName) || /z\s*$/i.test(shape.getAttribute("d") ?? "");
  const points: Point[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const { x, y } = geometry.getPointAtLength(((closed ? i % SAMPLES : i) * length) / SAMPLES);
    points.push([x, y]);
  }
  return { points, closed };
};
const centroid = ({ points }: Outline): Point => {
  const ring = points.slice(0, SAMPLES);
  return [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
};
const dot = (at: Point, closed: boolean): Outline => ({ points: Array.from({ length: SAMPLES + 1 }, () => [...at] as Point), closed });
const distance = (a: Point[], b: Point[]) => a.reduce((s, p, i) => s + Math.hypot(p[0] - b[i][0], p[1] - b[i][1]), 0);

/**
 * `b`'s points reordered to travel least from `a`'s: run backwards if that is shorter, and for two
 * closed outlines, start at whichever point lines up best. This is what keeps a morph from twisting.
 */
export function align(a: Outline, b: Outline): Point[] {
  const ways = [b.points, [...b.points].reverse()];
  if (!(a.closed && b.closed)) return ways.reduce((best, w) => (distance(a.points, w) < distance(a.points, best) ? w : best));
  let best = b.points;
  let cost = Infinity;
  for (const way of ways) {
    const ring = way.slice(0, SAMPLES);
    for (let r = 0; r < SAMPLES; r++) {
      const turned = [...ring.slice(r), ...ring.slice(0, r)];
      turned.push(turned[0]);
      const c = distance(a.points, turned);
      if (c < cost) {
        cost = c;
        best = turned;
      }
    }
  }
  return best;
}

/** Pairs of shapes, by where they sit. A shape with no partner grows out of, or shrinks into, its own centre. */
export function partner(a: Outline[], b: Outline[]): { from: Outline; to: Outline; shownFrom: number; shownTo: number; source: number; arrival: number }[] {
  const n = Math.max(a.length, b.length);
  const orders = (k: number[]): number[][] => (k.length <= 1 ? [k] : k.flatMap((x, i) => orders([...k.slice(0, i), ...k.slice(i + 1)]).map((rest) => [x, ...rest])));
  const indices = Array.from({ length: n }, (_, i) => i);
  let best = indices;
  let cost = Infinity;
  for (const order of orders(indices)) {
    const c = order.reduce((s, j, i) => (a[i] && b[j] ? s + Math.hypot(centroid(a[i])[0] - centroid(b[j])[0], centroid(a[i])[1] - centroid(b[j])[1]) : s), 0);
    if (c < cost) {
      cost = c;
      best = order;
    }
  }
  return best.map((j, i) => {
    const from = a[i] ?? dot(centroid(b[j]), b[j].closed);
    const to = b[j] ?? dot(centroid(a[i]), a[i].closed);
    return { from, to, shownFrom: a[i] ? 1 : 0, shownTo: b[j] ? 1 : 0, source: i, arrival: j };
  });
}

const trace = (points: Point[]) => "M" + points.map(([x, y]) => `${+x.toFixed(3)} ${+y.toFixed(3)}`).join("L");

/** Morph the drawn outline icon `face` into `next`. False when either can't morph this way, or the browser can't measure paths. */
export function morphShapes(face: Element, next: Element, delay: number | null): boolean {
  if (!isShapeIcon(face) || !isShapeIcon(next) || face.getAttribute("viewBox") !== next.getAttribute("viewBox")) return false;
  settle(face);
  if (delay === null || face.innerHTML === next.innerHTML) {
    become(face, next);
    return true;
  }
  const from = [...face.children].map(outline);
  const to = [...next.children].map(outline);
  if (from.includes(null) || to.includes(null)) return false;
  const pairs = partner(from as Outline[], to as Outline[]);
  // Every shape is redrawn as one path for the trip, dressed in its own stroke (or its partner's, if it is arriving).
  const sources = [...face.children];
  const arrivals = [...next.children];
  const trips = pairs.map(({ from: a, to: b, shownFrom, shownTo, source, arrival }) => {
    const path = document.createElementNS(SVG, "path");
    const dress = shownFrom ? sources[source] : arrivals[arrival];
    for (const { name, value } of dress.attributes) if (!GEOMETRY.has(name)) path.setAttribute(name, value);
    return { path, start: a.points, end: align(a, b), shownFrom, shownTo };
  });
  face.replaceChildren(...trips.map((t) => t.path));
  tween(face, delay, (e) => {
    for (const { path, start, end, shownFrom, shownTo } of trips) {
      path.setAttribute("d", trace(start.map(([x, y], k) => [x + (end[k][0] - x) * e, y + (end[k][1] - y) * e] as Point)));
      path.style.opacity = String(Math.min(1, Math.max(0, shownFrom + (shownTo - shownFrom) * e)));
    }
  }, () => become(face, next));
  return true;
}

/** Morph one icon into another by whichever way fits: lines turn or slide, outlines reshape. */
export const morphIcon = (face: Element, next: Element, delay: number | null) =>
  (isLineIcon(face) && isLineIcon(next) ? morphLines(face, next, delay) : false) || morphShapes(face, next, delay);
