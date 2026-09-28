import {
  BOB,
  BOB_MS,
  BUBBLE_FROM,
  BUBBLE_MS,
  FADES,
  FIT_MS,
  FRAME_MS,
  GROW_MS,
  LAG_MS,
  LEAVE_SCALE,
  MAX_BLUR,
  RISE,
  RISE_MS,
  SHOWS,
  SPEED_BLUR,
  STRETCH,
  TILT,
  ROOMY,
  WORD_STEP_MS,
  settleAt,
} from "./tokens.js";

/** A word on the line: the units it is made of, what it reads, and where its ink sits, in the element's own pixels. */
export type Word = { ids: number[]; label: string; left: number; right: number; height: number };
/** How one word's faces move: keyframes every glyph of it shares, about its centre, over `ms`. */
export type Face = { frames: Keyframe[]; centre: number; ms: number };
export type Roll = {
  pairs: [number, number][]; // kept units, [old, new]
  lag: number; // when the glides and the width fit start
  leave: Map<number, Face>; // by old unit
  arrive: Map<number, Face>; // by new unit
};

/** Units grouped into words, in reading order. */
export function wordsOf<U extends { word: number }>(
  units: U[],
  label: (u: U) => string,
  rect: (i: number) => { left: number; right: number; height: number },
): Word[] {
  const words: Word[] = [];
  units.forEach((u, i) => {
    const r = rect(i);
    const last = words[words.length - 1];
    if (last && units[last.ids[0]].word === u.word) {
      last.ids.push(i);
      last.label += label(u);
      last.left = Math.min(last.left, r.left);
      last.right = Math.max(last.right, r.right);
      last.height = Math.max(last.height, r.height);
    } else words.push({ ids: [i], label: label(u), left: r.left, right: r.right, height: r.height });
  });
  return words;
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const span = (x: number, [a, b]: readonly [number, number]) => clamp((x - a) / (b - a));
const round = (x: number) => +x.toFixed(3);

/**
 * The word roll, as slot-text rolls: words pair by position, and a word is kept only where it reads the same. Each
 * changed word owns a slot whose edges ease from where the old word was to where the new one lands, on the same curve
 * the kept words glide on, so no slot ever crosses another. A face is never wider than its slot, lean included, so
 * nothing overlaps. Words that only leave go at once; the rest set off one after another.
 *
 * `calm` keeps the roll and drops the play: words rise in and out whole, at their own size, upright, on the house ease.
 */
export function planRoll(a: Word[], b: Word[], size: number, calm = false): Roll {
  const pairs: [number, number][] = [];
  const oldEnd = a.length ? Math.max(...a.map((w) => w.right)) : (b[0]?.left ?? 0);
  const newEnd = b.length ? Math.max(...b.map((w) => w.right)) : (a[0]?.left ?? 0);
  const slots: { was?: Word; now?: Word; at: number; lean: number }[] = [];
  let k = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const was = a[i];
    const now = b[i];
    if (was && now && was.label === now.label) {
      was.ids.forEach((o, j) => pairs.push([o, now.ids[j]]));
      continue;
    }
    slots.push({ was, now, at: now ? k++ * WORD_STEP_MS : 0, lean: i % 2 ? TILT : -TILT });
  }
  const width = (w?: Word) => (w ? w.right - w.left : 0);
  // Calm, a word never squeezes: a narrowing slot holds until the word leaving it has gone, and an arriving word waits
  // for most of its room before it rises (the clamp takes the rest, while it is still low in the window).
  const firstAt = (done: (t: number) => boolean) => {
    let t = 0;
    while (t < RISE_MS + FIT_MS && !done(t)) t += FRAME_MS;
    return t;
  };
  const gone = firstAt((t) => settleAt(t / RISE_MS) >= FADES);
  const narrowing = slots.filter((s) => width(s.now) < width(s.was));
  const lag = !narrowing.length ? 0 : calm ? Math.max(...narrowing.map((s) => s.at + gone)) : LAG_MS;
  const fit = (t: number) => settleAt(clamp((t - lag) / FIT_MS));
  const room = (s: (typeof slots)[number], t: number) => {
    const e = fit(t);
    const left = mix(s.was?.left ?? oldEnd, s.now?.left ?? newEnd, e);
    const right = mix(s.was?.right ?? oldEnd, s.now?.right ?? newEnd, e);
    return { mid: (left + right) / 2, width: right - left };
  };
  type Pose = { y: number; sx: number; sy: number; tilt: number; shown: number };
  const bake = (word: Word, slot: (typeof slots)[number], pose: (t: number) => Pose, ms: number): Face => {
    const centre = (word.left + word.right) / 2;
    const h = word.height;
    const w = width(word);
    const frames: Keyframe[] = [];
    for (let t = 0; t < ms; t += FRAME_MS) {
      const now = pose(t);
      const was = pose(t - FRAME_MS);
      const speed = Math.abs(now.y - was.y); // in boxes a frame
      const blur = Math.min(MAX_BLUR, SPEED_BLUR * (speed + Math.abs(now.sy - was.sy)));
      const sy = now.sy * (1 + (calm ? 0 : STRETCH) * speed);
      const lean = (Math.abs(now.tilt) * Math.PI) / 180;
      const r = room(slot, t);
      // A leaning box is w cos + h sin across: it never reaches past its slot.
      const sx = w ? Math.max(0, Math.min(now.sx, (r.width - h * sy * Math.sin(lean)) / (w * Math.cos(lean)))) : now.sx;
      frames.push({
        offset: round(t / ms),
        opacity: round(now.shown),
        translate: `${round(r.mid - centre)}px ${round(now.y * h)}px`,
        rotate: `${round(now.tilt)}deg`,
        scale: `${round(sx)} ${round(sy)}`,
        filter: `blur(${round(blur * size)}px)`,
      });
    }
    return { frames, centre, ms };
  };
  const leave = new Map<number, Face>();
  const arrive = new Map<number, Face>();
  for (const slot of slots) {
    const { was, now, at, lean } = slot;
    if (was) {
      const face = bake(was, slot, (t) => {
        const away = calm ? settleAt(clamp((t - at) / RISE_MS)) : RISE((t - at) / RISE_MS);
        if (calm) return { y: -away, sx: 1, sy: 1, tilt: 0, shown: 1 - clamp(away / FADES) };
        return { y: -away, sx: mix(1, LEAVE_SCALE[0], away), sy: mix(1, LEAVE_SCALE[1], away), tilt: 0, shown: 1 - clamp(away / FADES) };
      }, at + RISE_MS);
      face.frames.push({ ...face.frames[face.frames.length - 1], offset: 1, opacity: 0 });
      for (const o of was.ids) leave.set(o, face);
    }
    if (now) {
      const from = calm ? Math.max(at + BUBBLE_MS, firstAt((t) => room(slot, t).width >= ROOMY * width(now))) : at + BUBBLE_MS;
      const face = bake(now, slot, (t) => {
        const up = calm ? settleAt(clamp((t - from) / RISE_MS)) : RISE((t - from) / RISE_MS);
        if (calm) return { y: 1 - up, sx: 1, sy: 1, tilt: 0, shown: span(up, SHOWS) };
        return {
          y: 1 - up,
          sx: mix(BUBBLE_FROM, 1, settleAt(clamp((t - from) / GROW_MS))),
          sy: mix(BUBBLE_FROM, 1, BOB((t - from) / BOB_MS)),
          tilt: lean * (1 - up),
          shown: span(up, SHOWS),
        };
      }, Math.max(from + Math.max(RISE_MS, BOB_MS, GROW_MS), lag + FIT_MS));
      face.frames.push({ offset: 1, opacity: 1, translate: "0px 0px", rotate: "0deg", scale: "1 1", filter: "blur(0px)" });
      for (const n of now.ids) arrive.set(n, face);
    }
  }
  return { pairs, lag, leave, arrive };
}
