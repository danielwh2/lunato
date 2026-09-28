// Every number the library uses, with the reason beside it. Nothing here is an option.

/**
 * A damped spring's step response, sampled into a CSS linear() so the browser plays it without script.
 * `damping` is the damping ratio: below 1 it overshoots once and settles. The stiffness is set so the
 * wobble has died below 0.1% by the end of the duration, so the last stop is honest.
 */
function spring(damping: number, stops: number) {
  const at = springAt(damping);
  const ys = Array.from({ length: stops }, (_, i) =>
    i === stops - 1 ? 1 : +at(i / (stops - 1)).toFixed(4),
  );
  return `linear(${ys.join(", ")})`;
}

/** The same spring as a function of its progress, 0 to 1 of the duration, for motion baked frame by frame. */
export function springAt(damping: number) {
  const w = 7 / damping; // e^-7 is under 0.1%
  const wd = w * Math.sqrt(1 - damping * damping);
  return (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
}

// A changed glyph leaves and arrives on this: damping 0.75 overshoots by about 3%, a small lunar bounce at the landing.
export const SPRING = spring(0.75, 24);
// Anything that travels sideways, a kept glyph's glide and the element's width: the house ease, no overshoot, so a glide never outruns its box.
export const SETTLE = "cubic-bezier(0.2, 0, 0, 1)";

/** SETTLE as a function, for motion that must follow the glides and the width fit exactly. */
export function settleAt(x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const curve = (u: number, p: number, q: number) => 3 * u * (1 - u) ** 2 * p + 3 * u * u * (1 - u) * q + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (curve(mid, 0.2, 0) < x) lo = mid;
    else hi = mid;
  }
  return curve((lo + hi) / 2, 0, 1);
}

export const ROLL_MS = 600; // the spring reads by ~250ms; the rest is the soft landing that makes it feel smooth
export const SPREAD = 0.25; // the sweep across every changed glyph takes this share of the roll. Delay follows position, so a glyph and its replacement move together

export const TRAVEL = 1; // share of its own box a glyph travels: a whole box, so a leaving glyph and its replacement never overlap
export const EXIT_CLEAR = 0.55; // share of the roll by which a leaving glyph has faded out: gone before anything slides into its place
export const ENTER_FROM = 0.2; // share of the roll before an arriving glyph starts to show: it comes into view already moving
export const EDGE = 0.12; // em of soft fade where a rolling glyph crosses the window's top or bottom edge: inside a glyph box's own margin, so ink at rest is never dimmed
export const ROOM = 0.25; // share of a roll the leaving glyphs get before a kept one glides into their place: by then they have all but faded
export const LANDED = 0.65; // share of a roll the glides get before arrivals drop in: an arrival shows from ENTER_FROM on, by when the glides are 99% of the way, so nothing arrives over a glyph still sliding past
export const FIT_GROW = 0.6; // share of the roll a growing element takes to reach its width: there before the letters arriving at its edge show
export const BLUR = 0.12; // em of blur at the edge of a roll, so it scales with the type

export const ICON_SHRINK = 0.25; // an icon or emoji shrinks this far, so it reads as one mark becoming another
export const ICON_BLUR = "blur(4px)"; // icons blur by a fixed amount: at control sizes 0.1em would be a pixel and hide nothing

export const FEATHER = 0.25; // em of soft fade where motion meets the element's edge. It only ever sits in empty space, so text at rest is never dimmed

// The word roll, for an element marked data-lunato="roll": words pair by position, and each changed word rises up and
// away as its replacement bubbles up from below, small and leaning, springs a little past its place and bobs upright.
export const RISE = springAt(0.6); // a word's travel: about 10% past its place, once
export const BOB = springAt(0.45); // its height springs looser than its rise, so it bobs once after landing: the bubble
export const RISE_MS = 600;
export const BOB_MS = 667;
export const WORD_STEP_MS = 67; // changed words set off one after another, left to right
export const BUBBLE_MS = 50; // a new word starts rising this long after the old one, so the two never meet
export const BUBBLE_FROM = 0.6; // an arriving word starts at this size
export const GROW_MS = 400; // the time its width takes to reach full size, on the house ease, never past it
export const LEAVE_SCALE = [0.9, 1.1] as const; // a leaving word's width and height as it goes
export const TILT = 3; // degrees an arriving word leans, alternating word by word
export const STRETCH = 0.5; // a word is taller by this share of its speed, in boxes a frame
export const SPEED_BLUR = 0.45; // em of blur per box a frame of speed: blurred only while it moves fast
export const MAX_BLUR = 0.07; // em
export const SHOWS = [0.15, 0.6] as const; // share of its rise over which an arriving word fades in
export const FADES = 0.6; // share of its rise by which a leaving word has gone
export const FIT_MS = 500; // every word's room, the glides and the element's width ease together over this, on SETTLE
export const LAG_MS = 50; // when a word narrows, the room waits this long, so it never squeezes a word before it has begun to leave
export const ROOMY = 0.9; // calm: an arriving word waits until its slot is this share of its width
export const FRAME_MS = 1000 / 60; // the step motion is baked at
