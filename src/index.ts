import { pair } from "./diff.js";
import { hideCollapsed, isLineIcon, morphIcon } from "./lines.js";
import { planRoll, type Roll, wordsOf } from "./roll.js";
import { collect, trendOf, type Unit } from "./units.js";
import {
  BLUR,
  EDGE,
  ENTER_FROM,
  EXIT_CLEAR,
  FEATHER,
  FIT_GROW,
  FIT_MS,
  ICON_BLUR,
  ICON_SHRINK,
  LANDED,
  ROLL_MS,
  ROOM,
  SETTLE,
  SPREAD,
  SPRING,
  TRAVEL,
} from "./tokens.js";

const bound = new WeakMap<HTMLElement, () => void>();

/** A drawn unit: `box` holds its place and glides, `face` inside it rolls. Two elements, so a glide never cancels a roll. */
type Live = Unit & { box: HTMLElement; face: HTMLElement };

const KEYS = ["opacity", "translate", "scale", "rotate", "filter"] as const;
const FILL = "-webkit-text-fill-color"; // transparent on the element hides its glyphs and leaves `color` alone, because the copies read it
const LOOKS = ["class", "hidden"]; // the element's own attributes that can change how it is laid out

/**
 * Whether the effect can run here. linear() easing is the newest thing it needs (Chrome 113, Safari 17.2, Firefox 112),
 * so a browser that has it has the rest. Anywhere else, the server and jsdom included, the element stays plain text.
 */
const supported = () =>
  typeof document !== "undefined" &&
  typeof ResizeObserver === "function" &&
  typeof Element.prototype.animate === "function" &&
  !!globalThis.CSS?.supports?.("animation-timing-function", "linear(0, 1)");

/**
 * Morphs an element's content in place. Change it however you like (`textContent`, a
 * framework re-render, a new child icon): what the old and new content share holds
 * still or glides to its new place, and every glyph that changed rolls, the old one
 * leaving through one edge of the line as the new one arrives through the other.
 *
 * The element stays the source of truth: its text remains in the DOM for screen readers,
 * search and selection, and its CSS sets the look.
 *
 * Returns a function that removes the effect and puts the element back as it was.
 *
 * Mark the element `data-lunato="roll"` for the word roll instead: words pair by position, as slot-text rolls, and each
 * changed word rises away as its replacement bubbles up from below. Made for statuses and thinking states. It reads the
 * mark at every change, so it can be set or cleared at any time; text on more than one line always morphs.
 *
 * `data-lunato-feel="calm"` keeps either one and drops the play: no overshoot, and in the roll no bubble, lean or bob.
 * Playful, the default, is what it is without the mark.
 *
 * That shape, element in and cleanup out, is what React 19 refs and Svelte 5 attachments call, so the
 * function is its own adapter there: `<span ref={morphChanges}>` and `<span {@attach morphChanges}>`. `null`
 * is ignored, because React calls a ref with it on unmount when the ref returns no cleanup (React 18).
 *
 * Where the effect cannot run (an old browser, the server, jsdom) it does nothing and the text stays as it is. The
 * same if drawing ever fails: the element goes back to plain text.
 */
export function morphChanges(target: string | Element | null): () => void {
  if (target === null || !supported()) return () => {};
  const host = (
    typeof target === "string" ? document.querySelector(target) : target
  ) as HTMLElement | null;
  if (!host) throw new Error(`lunato: nothing matches "${target}"`);
  bound.get(host)?.(); // binding again replaces the old binding, so StrictMode and HMR are safe

  const style = getComputedStyle(host); // live: reads below always see current values
  const { wear, undress } = dress(host, style);
  const overlay = document.createElement("span");
  overlay.setAttribute("aria-hidden", "true");
  // The host hides its own glyphs with a transparent fill; the overlay puts the fill back for the copies it draws.
  // It is also the window motion is seen through: nothing it draws ever paints outside the element. `clip` where supported, `hidden` before that.
  // No indent: every copy is a block of its own, and an inherited text-indent would push each one over. No margin,
  // padding or border either, here or on the boxes: a rule for the element's children (a gap between siblings) lands on these too.
  overlay.style.cssText =
    "position:absolute;left:0;right:0;margin:0;padding:0;border:0;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-text-fill-color:currentcolor;text-indent:0;overflow:hidden;overflow:clip";
  let overlayTop = 0; // where the window starts, relative to the element's padding box

  const reduced =
    typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : undefined;
  const calm = () => !!reduced?.matches;

  let live: Live[] = [];
  let text = "";
  let hidden: HTMLElement[] = []; // the host's own icons, kept invisible while their copies are drawn
  let width = 0; // the host's last settled width, for the fit
  let fitting: Animation | undefined;
  let wrap = ""; // the host's inline white-space, held while a fit runs
  let unseen = false; // the element had content while it could not be measured: its first draw is put in place, not animated

  /** Let one of the host's own icons show again and leave no trace: an emptied style attribute would change its markup, which is its key. */
  const show = (node: HTMLElement) => {
    node.style.visibility = "";
    if (!node.getAttribute("style")) node.removeAttribute("style");
  };
  /** Nothing to measure. The element shows its own glyphs, and the next draw starts clean, with no copies of what was. */
  const rest = () => {
    host.style.setProperty(FILL, "");
    hidden.forEach(show);
    hidden = [];
    overlay.replaceChildren();
    live = [];
    text = "";
    width = 0;
    unseen = [...host.childNodes].some(
      (n) => n !== overlay && (n.nodeType === Node.ELEMENT_NODE || !!n.nodeValue?.trim()),
    );
  };

  const attach = () => {
    if (overlay.parentNode === host) return;
    host.append(overlay); // first bind, or a framework replaced the children
    mutations.takeRecords(); // that append is ours
  };

  /** Put a box at its unit's measured rectangle, in the overlay's coordinates. */
  const place = (box: HTMLElement, unit: Unit, origin: { x: number; y: number }) => {
    const { left, top, width, height } = unit.rect;
    // A line-height equal to the glyph's content height puts the baseline where the host drew it.
    box.style.cssText = `position:absolute;display:block;margin:0;padding:0;border:0;white-space:pre;left:${left - origin.x}px;top:${top - origin.y}px;width:${width}px;height:${height}px;line-height:${height}px`;
  };
  const face = (unit: Unit) => {
    const el = (
      unit.node ? unit.node.cloneNode(true) : document.createElement("span")
    ) as HTMLElement;
    if (unit.node) {
      el.removeAttribute("id");
      el.style.visibility = ""; // the original is hidden while its copy draws
      if (isLineIcon(el)) hideCollapsed(el);
    } else {
      el.textContent = unit.text;
      el.style.cssText = "display:block;position:absolute;inset:0"; // a box for the transform, and stacked, so two values can share one slot mid-roll
    }
    return el;
  };
  const make = (unit: Unit, origin: { x: number; y: number }): Live => {
    const box = document.createElement("span");
    const f = face(unit);
    box.append(f);
    place(box, unit, origin);
    overlay.append(box);
    return { ...unit, box, face: f };
  };

  const run = (
    el: Element,
    frames: Keyframe[],
    duration: number,
    delay: number,
    easing: string,
    fill: FillMode,
  ) => {
    const a = el.animate(frames, { duration, delay, easing, fill });
    void a.finished.catch(() => {}); // cancelled by a later change: nothing to report
    return a;
  };
  const clear = (el: Element) => el.getAnimations().forEach((a) => a.cancel());
  const read = (el: Element): Keyframe => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(KEYS.map((k) => [k, cs[k] || (k === "opacity" ? "1" : "none")]));
  };
  /**
   * A glyph out of view: a whole box above the line (`dir` -1) or below it (1), straight, at full size. The window ends
   * at the glyph boxes, so there it is clipped away entirely: an arriving glyph starts unseen and slides in whole.
   */
  const gone = (unit: Unit, dir: number, still: boolean): Keyframe =>
    still
      ? { opacity: 0 }
      : unit.kind === "icon"
        ? { opacity: 0, translate: "0 0", scale: ICON_SHRINK, rotate: "0deg", filter: ICON_BLUR }
        : {
            opacity: 0,
            translate: `0 ${+(dir * TRAVEL * unit.rect.height).toFixed(2)}px`,
            scale: 1,
            rotate: "0deg",
            filter: `blur(${BLUR}em)`,
          };
  const shown = (still: boolean): Keyframe =>
    still
      ? { opacity: 1 }
      : { opacity: 1, translate: "0 0", scale: 1, rotate: "0deg", filter: "blur(0)" };
  // A glyph leaves faster than its replacement arrives: it fades out in the first part of its travel, so it is gone
  // before anything glides or rolls into its place, and the new one fades in only once it is on its way.
  const exit = (from: Keyframe, unit: Unit, dir: number, still: boolean): Keyframe[] =>
    still || unit.kind === "icon"
      ? [from, gone(unit, dir, still)]
      : [from, { opacity: 0, offset: EXIT_CLEAR }, gone(unit, dir, still)];
  const enter = (unit: Unit, dir: number, still: boolean): Keyframe[] =>
    still || unit.kind === "icon"
      ? [gone(unit, dir, still), shown(still)]
      : [gone(unit, dir, still), { opacity: 0, offset: ENTER_FROM }, shown(still)];
  /** Delay by position, spread over a share of the roll, so the change sweeps left to right, a word at a time. */
  const sweep = (xs: number[]) => {
    const lo = Math.min(...xs);
    const reach = Math.max(...xs) - lo || 1;
    const step = (ROLL_MS * SPREAD * Math.max(xs.length - 1, 0)) / (xs.length || 1);
    return (x: number) => (step * (x - lo)) / reach;
  };

  /** The units, and, on `animate`, how each one got there; otherwise everything is simply put where it now is. */
  const render = (animate: boolean) => {
    attach();
    if (style.display === "inline") wear(); // shown since it was bound: it needs its box now
    // The fit pins the width; it lets go first so the reads below see the natural layout. It pins it only while it is in
    // effect: once it has played out, the width on screen is the settled one, even if its promise has not yet resolved.
    const pinned = fitting?.effect?.getComputedTiming().progress != null;
    const fromWidth = pinned ? parseFloat(style.width) || width : width;
    if (fitting) {
      fitting.cancel();
      fitting = undefined;
      host.style.whiteSpace = wrap;
    }

    // Every read, then every write: interleaving them forces a layout per glyph.
    const frame = host.getBoundingClientRect();
    // Rects arrive in screen pixels, scaled by any transform on the element or around it: a card squashed while it is
    // pressed, say. Everything is measured in the element's own unscaled pixels instead, or a change made mid-press
    // places every glyph a few percent off and the glides that follow correct it, which reads as jitter.
    // The unscaled size comes from the computed style: offsetWidth rounds to a whole pixel, which would put every glyph
    // up to half a pixel out, by an amount that changes whenever the width does, so kept glyphs would shimmer as text grows.
    // ponytail: scale only; a rotated ancestor still skews these.
    const exact = (size: string, ...edges: string[]) =>
      parseFloat(size) + (style.boxSizing === "border-box" ? 0 : edges.reduce((sum, edge) => sum + (parseFloat(edge) || 0), 0));
    const boxWidth = exact(style.width, style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth) || host.offsetWidth;
    const boxHeight = exact(style.height, style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth) || host.offsetHeight;
    // Not rendered, shrunk around no text at all, or scaled to nothing along an axis. A resize or the next change draws it again.
    if ((!frame.width && !frame.height) || (!frame.width && boxWidth) || (!frame.height && boxHeight)) return rest();
    animate &&= !unseen;
    unseen = false;
    const sx = boxWidth ? frame.width / boxWidth : 1;
    const sy = boxHeight ? frame.height / boxHeight : 1;
    const local = (r: DOMRect): DOMRect => {
      const left = (r.left - frame.left) / sx - host.clientLeft;
      const top = (r.top - frame.top) / sy - host.clientTop;
      return {
        left,
        top,
        width: r.width / sx,
        height: r.height / sy,
        right: left + r.width / sx,
        bottom: top + r.height / sy,
        x: left,
        y: top,
        toJSON() {},
      } as DOMRect;
    };
    const inner = { left: 0, top: 0, width: host.clientWidth, height: host.clientHeight };
    hidden.forEach(show); // the originals are read as they were written, so an icon's markup never carries our hiding
    const next = collect(host, overlay).map((u) => ({ ...u, rect: local(u.rect) }));
    const was = live.map((u) => local(u.box.getBoundingClientRect())); // includes a glide in flight, so an interruption continues from where it is

    // The window: the element's padding box across, and down far enough to hold every glyph's own box, old and new,
    // so a tight line-height never cuts a descender. Where there is empty space between text and edge, motion fades out across it.
    // Above and below, the window ends at the element or the glyph boxes, whichever reaches further, so nothing ever paints
    // outside the text's own line. A roll travels a whole glyph box, so a glyph crosses that edge on its way in or out,
    // softened by a thin fade that sits inside the box's own margin above the ascenders and below the descenders.
    const still = calm();
    const size = parseFloat(style.fontSize) || 16;
    const rects = [...next.map((u) => u.rect), ...was];
    const top = Math.min(0, ...rects.map((r) => r.top - inner.top));
    const bottom = Math.max(inner.height, ...rects.map((r) => r.bottom - inner.top));
    // Icons fill their box, so where one reaches an edge the fade gives way rather than dim it at rest.
    const icons = next.filter((u) => u.kind === "icon").map((u) => u.rect);
    const room = (px: number, cap: number) =>
      +(next.length ? Math.max(0, Math.min(cap, px)) : cap).toFixed(2); // rounded: float noise like 4.199999999999999px lands in the style
    const edge = (gap: number) => +Math.max(0, Math.min(size * EDGE, gap)).toFixed(2);
    const fade = {
      top: edge(Math.min(Infinity, ...icons.map((r) => r.top - inner.top - top))),
      bottom: edge(Math.min(Infinity, ...icons.map((r) => inner.top + bottom - r.bottom))),
      left: room(Math.min(...next.map((u) => u.rect.left)) - inner.left, size * FEATHER),
      right: room(
        inner.left + inner.width - Math.max(...next.map((u) => u.rect.right)),
        size * FEATHER,
      ),
    };
    const origin = { x: inner.left, y: inner.top + top };
    // One line only: a box pinned mid-fit must not re-wrap its text, and a wrapped element has no single width to ease.
    const oneLine = next.every((u) => Math.abs(u.rect.top - next[0].rect.top) < u.rect.height / 2);
    const toWidth = parseFloat(style.width) || 0;
    const nextText = next.map((u, i) => (i && u.word !== next[i - 1].word ? " " : "") + u.text).join(""); // words apart, so a minus after a word still reads as one
    const trend = trendOf(text, nextText);
    text = nextText;

    // The word roll: only on one line, before and after, and never under reduced motion, which crossfades either way.
    const wasOneLine = was.every((r) => Math.abs(r.top - was[0].top) < r.height / 2);
    const calmFeel = host.dataset.lunatoFeel === "calm";
    const label = (u: Unit) => u.html ?? u.text;
    const roll: Roll | undefined =
      animate && !still && oneLine && wasOneLine && host.dataset.lunato === "roll"
        ? planRoll(
            wordsOf(live, label, (o) => was[o]),
            wordsOf(next, label, (n) => next[n].rect),
            size,
            calmFeel,
          )
        : undefined;
    const pairs = roll ? roll.pairs : pair(live, next);
    const ease = calmFeel ? SETTLE : SPRING;
    const kept = new Map(pairs.map(([o, n]) => [n, o]));
    const stays = new Set(pairs.map(([o]) => o));
    const leaving = live.map((_, o) => o).filter((o) => !stays.has(o));
    // A kept digit slot whose value changed rolls in place: its old face leaves as the new one arrives. A kept icon
    // has changed when its markup has, whether a new element took its place or the same one was redrawn.
    const rolling = pairs.filter(
      ([o, n]) =>
        live[o].text !== next[n].text || live[o].html !== next[n].html,
    );
    const entering = next.map((_, n) => n).filter((n) => !kept.has(n));
    // The pose of every face about to leave, so it goes on from where it is. Only those: a streamed answer keeps
    // every glyph it has, and a computed style for each of them at every token is the whole cost of a long one.
    const now = new Map<number, Keyframe>();
    if (animate) for (const o of [...leaving, ...rolling.map(([o]) => o)]) now.set(o, read(live[o].face));
    // Changes sweep left to right by word: every glyph in a word starts together, so the word rises straight, as one
    // piece. Staggered by letter, its leading edge would climb at a slant, which reads as dragged in at an angle.
    const wordStart = (units: { word: number }[], left: (i: number) => number) => {
      const starts = new Map<number, number>();
      units.forEach((u, i) =>
        starts.set(u.word, Math.min(starts.get(u.word) ?? Infinity, left(i))),
      );
      return (i: number) => starts.get(units[i].word)!;
    };
    const oldAt = wordStart(live, (o) => was[o].left);
    const newAt = wordStart(next, (n) => next[n].rect.left);
    const changeAt = sweep([
      ...new Set([
        ...leaving.map(oldAt),
        ...entering.map(newAt),
        ...rolling.map(([, n]) => newAt(n)),
      ]),
    ]);
    const exitAt = (o: number) => changeAt(oldAt(o));
    const enterAt = (n: number) => changeAt(newAt(n));
    const tail = still
      ? 0
      : Math.max(
          0,
          ...leaving.map(exitAt),
          ...entering.map(enterAt),
          ...rolling.map(([, n]) => enterAt(n)),
        );
    // How far each kept glyph has to go. Half a line or more down or up is a new line.
    const shifts = pairs.map(([o, n]) => ({
      n,
      dx: was[o].left - next[n].rect.left,
      dy: was[o].top - next[n].rect.top,
    }));
    const newLine = (s: { n: number; dy: number }) => Math.abs(s.dy) >= next[s.n].rect.height / 2;
    const gliding = !still && shifts.some((s) => !newLine(s) && Math.hypot(s.dx, s.dy) >= 0.5);
    // When words move, one thing at a time: what leaves goes first, what stays glides into the room it left, and what
    // arrives drops in once the glides have all but landed, so nothing ever passes through anything else. With nothing
    // gliding (a digit rolling, a word added at the end) all of it moves at once.
    const roomAt = gliding && (leaving.length || shifts.some(newLine)) ? ROLL_MS * ROOM : 0;
    const landAt = gliding ? roomAt + ROLL_MS * LANDED : 0;
    const total = landAt + ROLL_MS + tail;

    // Ghosts still fading keep their place on screen while the window moves.
    const moved = overlayTop - top;
    if (moved)
      for (const child of overlay.children)
        (child as HTMLElement).style.top =
          `${parseFloat((child as HTMLElement).style.top) + moved}px`;
    overlayTop = top;
    host.style.setProperty(FILL, "transparent");
    overlay.style.top = `${top}px`;
    overlay.style.bottom = `${inner.height - bottom}px`;
    const across = `linear-gradient(to right, transparent, #000 ${fade.left}px, #000 calc(100% - ${fade.right}px), transparent)`;
    const down = `linear-gradient(to bottom, transparent, #000 ${fade.top}px, #000 calc(100% - ${fade.bottom}px), transparent)`;
    overlay.style.setProperty("-webkit-mask-image", `${across}, ${down}`);
    overlay.style.setProperty("mask-image", `${across}, ${down}`);
    overlay.style.setProperty("-webkit-mask-composite", "source-in");
    overlay.style.setProperty("mask-composite", "intersect");

    hidden = next.filter((u) => u.node).map((u) => u.node as HTMLElement);
    for (const node of hidden) node.style.visibility = "hidden";

    for (const o of leaving) {
      const { box, face: f } = live[o];
      if (!animate) {
        box.remove();
        continue;
      }
      const rolled = roll?.leave.get(o);
      if (rolled) {
        // It leaves from where it is: any glide in flight stops there, and a face still moving blends from its pose.
        const moving = f.getAnimations().length > 0;
        clear(box);
        clear(f);
        place(box, { ...live[o], rect: was[o] }, origin);
        f.style.transformOrigin = `${rolled.centre - was[o].left}px 55%`;
        const frames = moving ? [{ ...rolled.frames[0], ...now.get(o) }, ...rolled.frames.slice(1)] : rolled.frames;
        run(f, frames, rolled.ms, 0, "linear", "forwards").finished.then(
          () => box.remove(),
          () => box.remove(),
        );
        continue;
      }
      clear(f); // the box keeps any glide it has, and the ghost drifts on while it fades
      const out = run(
        f,
        exit(now.get(o)!, live[o], -trend, still),
        ROLL_MS,
        still ? 0 : exitAt(o),
        ease,
        "forwards",
      );
      out.finished.then(
        () => box.remove(),
        () => box.remove(),
      );
    }

    live = next.map((unit, n) => {
      const o = kept.get(n);
      if (o === undefined) {
        const l = make(unit, origin);
        const rolled = roll?.arrive.get(n);
        if (rolled) {
          // Every glyph of the word turns and scales about the word's centre, so the word moves as one piece.
          l.face.style.transformOrigin = `${rolled.centre - unit.rect.left}px 55%`;
          run(l.face, rolled.frames, rolled.ms, 0, "linear", "backwards").finished.then(
            () => (l.face.style.transformOrigin = ""),
            () => {},
          );
          return l;
        }
        // A glyph arrives a box away from what leaves; an icon grows in place, so it waits for what leaves to fade.
        const clear = unit.kind === "icon" && leaving.length ? ROLL_MS * ROOM : 0;
        if (animate)
          run(
            l.face,
            enter(unit, trend, still),
            ROLL_MS,
            still ? 0 : landAt + enterAt(n) + clear,
            ease,
            "backwards",
          );
        return l;
      }
      const old = live[o];
      let f = old.face;
      // A morphable icon reshapes into the new one; any other new element is drawn fresh.
      if (
        unit.node &&
        unit.html !== old.html &&
        !morphIcon(old.face, unit.node, animate && !still ? enterAt(n) : null)
      )
        old.face.replaceWith((f = face(unit)));
      if (unit.text !== old.text) {
        // Both faces share the box, stacked, so the old value leaves through one edge as the new one arrives through the other.
        old.box.append((f = face(unit)));
        if (!animate) old.face.remove();
        else {
          const delay = still ? 0 : enterAt(n);
          const leavingFace = old.face;
          clear(leavingFace);
          run(
            leavingFace,
            exit(now.get(o)!, old, -trend, still),
            ROLL_MS,
            delay,
            ease,
            "forwards",
          ).finished.then(
            () => leavingFace.remove(),
            () => leavingFace.remove(),
          );
          run(f, enter(unit, trend, still), ROLL_MS, delay, ease, "backwards");
        }
      }
      place(old.box, unit, origin);
      const dx = was[o].left - unit.rect.left;
      const dy = was[o].top - unit.rect.top;
      if (animate && !still && Math.abs(dy) >= unit.rect.height / 2) {
        // A word pushed onto another line would glide there diagonally, across every word in between. Instead it
        // fades out where it was, with what leaves, and back in where it lands, with what arrives.
        const ghost = old.box.cloneNode(false) as HTMLElement;
        ghost.append(old.face.cloneNode(true));
        Object.assign(ghost.style, {
          left: `${was[o].left - origin.x}px`,
          top: `${was[o].top - origin.y}px`,
        });
        overlay.append(ghost);
        run(
          ghost,
          [{ opacity: 1 }, { opacity: 0 }],
          ROLL_MS * EXIT_CLEAR,
          0,
          SETTLE,
          "forwards",
        ).finished.then(
          () => ghost.remove(),
          () => ghost.remove(),
        );
        clear(old.box);
        run(
          old.box,
          [{ opacity: 0 }, { opacity: 0, offset: ENTER_FROM }, { opacity: 1 }],
          ROLL_MS,
          landAt,
          SETTLE,
          "backwards",
        );
      } else if (animate && !still && Math.hypot(dx, dy) >= 0.5) {
        clear(old.box);
        run(
          old.box,
          [{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }],
          roll ? FIT_MS : ROLL_MS,
          roll ? roll.lag : roomAt,
          SETTLE,
          "backwards",
        );
      }
      return { ...unit, box: old.box, face: f };
    });

    // An element sized by its content eases to the new width, so what sits beside it slides instead of jumping.
    if (
      animate &&
      !still &&
      oneLine &&
      fromWidth &&
      toWidth &&
      Math.abs(toWidth - fromWidth) >= 0.5
    ) {
      wrap = host.style.whiteSpace;
      host.style.whiteSpace = "nowrap"; // a box narrower than its text mid-fit must not wrap it onto a second line
      // The box never cuts a letter that is still showing. Growing, it reaches its new width ahead of the letters
      // arriving at its edge; shrinking, it holds its width until the letters leaving it have faded, then closes.
      // Rolling, it eases with every word's room, on the same curve.
      const growing = toWidth > fromWidth;
      const hold = roll ? roll.lag : growing ? 0 : ROLL_MS * EXIT_CLEAR;
      const span = roll ? FIT_MS : growing ? ROLL_MS * FIT_GROW : Math.max(total - hold, ROLL_MS * FIT_GROW);
      const fit = (fitting = run(
        host,
        [{ width: `${fromWidth}px` }, { width: `${toWidth}px` }],
        span,
        hold,
        SETTLE,
        "backwards",
      ));
      fit.finished.then(
        () => {
          if (fitting !== fit) return;
          fitting = undefined;
          host.style.whiteSpace = wrap;
          draw(false);
        },
        () => {},
      );
    }
    width = toWidth;
  };

  const unbind = () => {
    if (bound.get(host) !== unbind) return; // already stopped, or a newer binding has the element now
    mutations.disconnect();
    resizes.disconnect();
    listen(false);
    if (fitting) {
      fitting.cancel();
      host.style.whiteSpace = wrap;
    }
    hidden.forEach(show);
    overlay.remove();
    undress();
    bound.delete(host);
  };
  /** Draw, and if drawing ever fails, hand the element back as plain text: stale copies over hidden glyphs would be the wrong words. */
  const draw = (animate: boolean) => {
    try {
      render(animate);
    } catch (error) {
      unbind();
      console.error("lunato: could not draw, so this element is plain text again", host, error);
    }
    mutations.takeRecords(); // whatever that wrote to the element or its icons is ours
  };

  const mutations = new MutationObserver((records) => {
    const seen = records.filter((r) => !overlay.contains(r.target)); // the rest is our own drawing
    const own = seen.filter((r) => r.type === "attributes" && r.target === host);
    // The element's own class, style or hidden may have changed how it sits: the styles it wears are judged again.
    const sits = own.some((r) => LOOKS.includes(r.attributeName!));
    const moved = wear(sits) || sits;
    // What it holds has changed when its children or text have, or an icon it draws a copy of was redrawn where it is.
    const changed = seen.some((r) =>
      r.type === "attributes" ? r.target !== host && hidden.some((icon) => icon.contains(r.target)) : true,
    );
    if (changed) draw(true);
    else if (moved) refit();
    mutations.takeRecords();
  });
  mutations.observe(host, { attributes: true, childList: true, characterData: true, subtree: true });

  // Anything that moves the glyphs without changing them: a resize, a wrap, a web font landing.
  const refit = () => {
    if (!fitting) draw(false);
  };
  // Leaving the page is a resize to nothing, and so is coming back. The page holds the element only while it is on it:
  // one removed and never unbound is let go with everything here, and one put back is listened for again.
  const resizes = new ResizeObserver(() => {
    listen(host.isConnected);
    refit();
  });
  resizes.observe(host);

  // Paper lays the text out again, and the copies sit where the screen had them. For a print the element shows its
  // own glyphs and the copies step aside.
  const print = (event: Event) => {
    const paper = event.type === "beforeprint";
    overlay.style.display = paper ? "none" : "";
    host.style.setProperty(FILL, paper ? "" : "transparent");
    for (const node of hidden) node.style.visibility = paper ? "" : "hidden";
    if (!paper) refit();
    mutations.takeRecords();
  };
  let listening = false;
  /** The listeners on the document and the window: the only things outside the element that hold on to it. */
  const listen = (on: boolean) => {
    if (on === listening) return;
    listening = on;
    const set = on ? "addEventListener" : "removeEventListener";
    document.fonts?.[set]?.("loadingdone", refit);
    window[set]("beforeprint", print);
    window[set]("afterprint", print);
  };
  listen(true);

  bound.set(host, unbind);
  draw(false);
  return unbind;
}

/** Vue: `<span v-morph-changes>{{ price }}</span>`. Registered by name in `<script setup>`, or with `app.directive("morph-changes", vMorphChanges)`. */
export const vMorphChanges = {
  mounted: (el: Element) => void morphChanges(el),
  unmounted: (el: HTMLElement) => bound.get(el)?.(),
};

// What a bound element has to be, and what it is given when it is not.
const PINS = [
  { name: "position", when: ["static", ""], to: "relative" }, // somewhere for the overlay to sit against
  { name: "display", when: ["inline"], to: "inline-block" }, // a box to measure, and a width to ease
];

/**
 * The inline styles the effect needs, and a way back. Only these properties are touched, so styles set by anyone else survive.
 *
 * `wear` puts them on. Called again, it puts back any of them that has gone, and reports whether that changed anything.
 * With `judge`, it first takes its own off and looks again at what the element's rules now say, because an inline
 * style outvotes a class or a `hidden` that has since hidden the element or moved it.
 */
function dress(host: HTMLElement, style: CSSStyleDeclaration) {
  const before = new Map([FILL, ...PINS.map((p) => p.name)].map((name) => [name, host.style.getPropertyValue(name)]));
  const ours = new Set<string>();
  const wear = (judge = false) => {
    let changed = false;
    for (const { name, when, to } of PINS) {
      const intact = ours.has(name) && host.style.getPropertyValue(name) === to;
      if (intact && !judge) continue;
      if (intact) host.style.setProperty(name, before.get(name)!);
      const needed = when.includes(style.getPropertyValue(name));
      if (needed) host.style.setProperty(name, to);
      if (needed !== ours.has(name)) changed = true;
      if (needed) ours.add(name);
      else ours.delete(name);
    }
    return changed;
  };
  host.style.setProperty(FILL, "transparent");
  wear();
  const undress = () => {
    host.style.setProperty(FILL, before.get(FILL)!);
    for (const { name, to } of PINS)
      if (ours.has(name) && host.style.getPropertyValue(name) === to) host.style.setProperty(name, before.get(name)!); // still ours: a value set since is someone else's
  };
  return { wear, undress };
}
