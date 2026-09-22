// Every number the library uses, with the reason beside it. Nothing here is an option.

/**
 * A damped spring's step response, sampled into a CSS linear() so the browser plays it without script.
 * `damping` is the damping ratio: below 1 it overshoots once and settles. The stiffness is set so the
 * wobble has died below 0.1% by the end of the duration, so the last stop is honest.
 */
function spring(damping: number, stops: number) {
  const w = 7 / damping; // e^-7 is under 0.1%
  const wd = w * Math.sqrt(1 - damping * damping);
  const at = (t: number) => 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
  const ys = Array.from({ length: stops }, (_, i) => (i === stops - 1 ? 1 : +at(i / (stops - 1)).toFixed(4)));
  return `linear(${ys.join(", ")})`;
}

// A changed glyph leaves and arrives on this: damping 0.75 overshoots by about 3%, a small lunar bounce at the landing.
export const SPRING = spring(0.75, 24);
// Anything that travels sideways, a kept glyph's glide and the element's width: the house ease, no overshoot, so a glide never outruns its box.
export const SETTLE = "cubic-bezier(0.2, 0, 0, 1)";

export const ROLL_MS = 600; // the spring reads by ~250ms; the rest is the soft landing that makes it feel smooth
export const SPREAD = 0.25; // the sweep across every changed glyph takes this share of the roll. Delay follows position, so a glyph and its replacement move together

export const TRAVEL = 1; // share of its own box a glyph travels: a whole box, so a leaving glyph and its replacement never overlap
export const EXIT_CLEAR = 0.55; // share of the roll by which a leaving glyph has faded out: gone before anything slides into its place
export const ENTER_FROM = 0.2; // share of the roll before an arriving glyph starts to show: it comes into view already moving
export const EDGE = 0.12; // em of soft fade where a rolling glyph crosses the window's top or bottom edge: inside a glyph box's own margin, so ink at rest is never dimmed
export const FIT_GROW = 0.6; // share of the roll a growing element takes to reach its width: there before the letters arriving at its edge show
export const BLUR = 0.12; // em of blur at the edge of a roll, so it scales with the type

export const ICON_SHRINK = 0.25; // an icon or emoji shrinks this far, so it reads as one mark becoming another
export const ICON_BLUR = "blur(4px)"; // icons blur by a fixed amount: at control sizes 0.1em would be a pixel and hide nothing

export const FEATHER = 0.25; // em of soft fade where motion meets the element's edge. It only ever sits in empty space, so text at rest is never dimmed
