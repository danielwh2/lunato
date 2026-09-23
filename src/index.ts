import { pair } from "./diff.js";
import { hideCollapsed, isLineIcon, morphIcon } from "./lines.js";
import { collect, trendOf, type Unit } from "./units.js";
import {
  BLUR,
  EDGE,
  ENTER_FROM,
  EXIT_CLEAR,
  FEATHER,
  FIT_GROW,
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
 * That shape, element in and cleanup out, is what React 19 refs and Svelte 5 attachments call, so the
 * function is its own adapter there: `<span ref={morphChanges}>` and `<span {@attach morphChanges}>`. `null`
 * is ignored, because React calls a ref with it on unmount when the ref returns no cleanup (React 18).
 */
export function morphChanges(target: string | Element | null): () => void {
  if (target === null) return () => {};
  const host = (
    typeof target === "string" ? document.querySelector(target) : target
  ) as HTMLElement | null;
  if (!host) throw new Error(`lunato: nothing matches "${target}"`);
  bound.get(host)?.(); // binding again replaces the old binding, so StrictMode and HMR are safe

  const style = getComputedStyle(host); // live: reads below always see current values
  const undress = dress(host, style);
  const overlay = document.createElement("span");
  overlay.setAttribute("aria-hidden", "true");
  // The host hides its own glyphs with a transparent fill; the overlay puts the fill back for the copies it draws.
  // It is also the window motion is seen through: nothing it draws ever paints outside the element. `clip` where supported, `hidden` before that.
  overlay.style.cssText =
    "position:absolute;left:0;right:0;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-text-fill-color:currentcolor;overflow:hidden;overflow:clip";
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

  const attach = () => {
    if (overlay.parentNode === host) return;
    host.append(overlay); // first bind, or a framework replaced the children
    mutations.takeRecords(); // that append is ours
  };

  /** Put a box at its unit's measured rectangle, in the overlay's coordinates. */
  const place = (box: HTMLElement, unit: Unit, origin: { x: number; y: number }) => {
    const { left, top, width, height } = unit.rect;
    // A line-height equal to the glyph's content height puts the baseline where the host drew it.
    box.style.cssText = `position:absolute;display:block;white-space:pre;left:${left - origin.x}px;top:${top - origin.y}px;width:${width}px;height:${height}px;line-height:${height}px`;
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
    // The fit pins the width; it lets go first so the reads below see the natural layout.
    const fromWidth = fitting ? parseFloat(style.width) || width : width;
    if (fitting) {
      fitting.cancel();
      fitting = undefined;
      host.style.whiteSpace = wrap;
    }

    // Every read, then every write: interleaving them forces a layout per glyph.
    const frame = host.getBoundingClientRect();
    if (!frame.width && !frame.height) return; // not rendered; the resize observer calls back when it is
    // Rects arrive in screen pixels, scaled by any transform on the element or around it: a card squashed while it is
    // pressed, say. Everything is measured in the element's own unscaled pixels instead, or a change made mid-press
    // places every glyph a few percent off and the glides that follow correct it, which reads as jitter.
    // ponytail: scale only; a rotated ancestor still skews these.
    const sx = host.offsetWidth ? frame.width / host.offsetWidth : 1;
    const sy = host.offsetHeight ? frame.height / host.offsetHeight : 1;
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
    const now = live.map((u) => read(u.face));
    const toWidth = parseFloat(style.width) || 0;
    const nextText = next.map((u) => u.text).join("");
    const trend = trendOf(text, nextText);
    text = nextText;

    const pairs = pair(live, next);
    const kept = new Map(pairs.map(([o, n]) => [n, o]));
    const leaving = live.map((_, o) => o).filter((o) => !pairs.some(([p]) => p === o));
    // A kept digit slot whose value changed rolls in place: its old face leaves as the new one arrives.
    const rolling = pairs.filter(
      ([o, n]) =>
        live[o].text !== next[n].text || (next[n].key === "~icon" && live[o].node !== next[n].node),
    );
    const entering = next.map((_, n) => n).filter((n) => !kept.has(n));
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
    overlay.style.top = `${top}px`;
    overlay.style.bottom = `${inner.height - bottom}px`;
    const across = `linear-gradient(to right, transparent, #000 ${fade.left}px, #000 calc(100% - ${fade.right}px), transparent)`;
    const down = `linear-gradient(to bottom, transparent, #000 ${fade.top}px, #000 calc(100% - ${fade.bottom}px), transparent)`;
    overlay.style.setProperty("-webkit-mask-image", `${across}, ${down}`);
    overlay.style.setProperty("mask-image", `${across}, ${down}`);
    overlay.style.setProperty("-webkit-mask-composite", "source-in");
    overlay.style.setProperty("mask-composite", "intersect");

    for (const node of hidden) node.style.visibility = "";
    hidden = next.filter((u) => u.node).map((u) => u.node as HTMLElement);
    for (const node of hidden) node.style.visibility = "hidden";

    for (const o of leaving) {
      const { box, face: f } = live[o];
      if (!animate) {
        box.remove();
        continue;
      }
      clear(f); // the box keeps any glide it has, and the ghost drifts on while it fades
      const out = run(
        f,
        exit(now[o], live[o], -trend, still),
        ROLL_MS,
        still ? 0 : exitAt(o),
        SPRING,
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
        if (animate)
          run(
            l.face,
            enter(unit, trend, still),
            ROLL_MS,
            still ? 0 : landAt + enterAt(n),
            SPRING,
            "backwards",
          );
        return l;
      }
      const old = live[o];
      let f = old.face;
      // A morphable icon reshapes into the new one; any other new element is drawn fresh.
      if (
        unit.node &&
        unit.node !== old.node &&
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
            exit(now[o], old, -trend, still),
            ROLL_MS,
            delay,
            SPRING,
            "forwards",
          ).finished.then(
            () => leavingFace.remove(),
            () => leavingFace.remove(),
          );
          run(f, enter(unit, trend, still), ROLL_MS, delay, SPRING, "backwards");
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
          ROLL_MS,
          roomAt,
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
      const growing = toWidth > fromWidth;
      const hold = growing ? 0 : ROLL_MS * EXIT_CLEAR;
      const span = growing ? ROLL_MS * FIT_GROW : Math.max(total - hold, ROLL_MS * FIT_GROW);
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
          render(false);
        },
        () => {},
      );
    }
    width = toWidth;
  };

  const mutations = new MutationObserver((records) => {
    if (records.every((r) => overlay.contains(r.target))) return; // our own drawing
    render(true);
  });
  mutations.observe(host, { childList: true, characterData: true, subtree: true });

  // Anything that moves the glyphs without changing them: a resize, a wrap, a web font landing.
  const refit = () => {
    if (!fitting) render(false);
  };
  const resizes = new ResizeObserver(refit);
  resizes.observe(host);
  document.fonts?.addEventListener?.("loadingdone", refit);

  render(false);

  const unbind = () => {
    mutations.disconnect();
    resizes.disconnect();
    document.fonts?.removeEventListener?.("loadingdone", refit);
    if (fitting) {
      fitting.cancel();
      host.style.whiteSpace = wrap;
    }
    for (const node of hidden) node.style.visibility = "";
    overlay.remove();
    undress();
    bound.delete(host);
  };
  bound.set(host, unbind);
  return unbind;
}

/** Vue: `<span v-morph-changes>{{ price }}</span>`. Registered by name in `<script setup>`, or with `app.directive("morph-changes", vMorphChanges)`. */
export const vMorphChanges = {
  mounted: (el: Element) => void morphChanges(el),
  unmounted: (el: HTMLElement) => bound.get(el)?.(),
};

/** The inline styles the effect needs, and a way back. Only these properties are touched, so styles set by anyone else survive. */
function dress(host: HTMLElement, style: CSSStyleDeclaration) {
  const wear: Record<string, string> = {
    "-webkit-text-fill-color": "transparent", // hides the glyphs and leaves `color` alone, because the copies read it
  };
  if (["static", ""].includes(style.position)) wear.position = "relative";
  if (style.display === "inline") wear.display = "inline-block";
  const before = Object.keys(wear).map(
    (name) => [name, host.style.getPropertyValue(name)] as const,
  );
  for (const name in wear) host.style.setProperty(name, wear[name]);
  return () => before.forEach(([name, value]) => host.style.setProperty(name, value));
}
