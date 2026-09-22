# lunato

Change an element's text and only what changed moves. What the old and new content share holds still or glides to its new place. Every changed glyph rolls: the old one leaves through one edge of the line as the new one arrives through the other, swept left to right on one spring. Works on letters, numbers, emoji and icon elements. One function, zero dependencies.

## Install

```
npm i lunato
```

## Quick start

```html
<span id="count">9</span>
```

```ts
import { morphChanges } from "lunato";

morphChanges("#count");
```

You call it once. After that the element's content is the API:

```ts
count.textContent = "10";            // the ones slot slides right and rolls 9 to 0; a 1 rolls in as the tens
label.textContent = "Copied";        // Cop holds still, y rolls out, ied rolls in
button.innerHTML = check + "Copied"; // the copy icon shrinks away as the check grows in
```

It takes a selector or an element. It returns a function that removes the effect and puts the element back the way it was.

Changes can arrive as fast as you like. A change that lands mid-flight continues from where each piece is.

## What it detects

The content is read as units: graphemes of text, and child elements without text of their own (an svg, an img). Emoji and elements are icons; everything else is a glyph.

What survives a change is the shared start, the shared end, and between them at most one run of two or more units that travels no further than its own length plus two places. A lone shared letter is ignored, so unrelated words roll rather than send single letters gliding across to find a partner.

Digits count like an odometer. They pair by place value, from the right, so a digit slot survives a change of value: it slides to its new place and rolls from the old value to the new one, both faces sharing the slot. Only a digit that is truly new, like the 1 in 9 → 10, rolls in on its own, and only one that is truly gone, like the 1 in 10 → 9, rolls out.

| Kind | Leaving | Arriving |
| --- | --- | --- |
| Glyph | Rolls 0.42em out through the top, shrinking to 0.72, blurring 0.12em | The mirror image, from below |
| Icon | Shrinks to 0.25 under a 4px blur, in place | Grows from 0.25 out of the blur |

The direction follows the first number that changed: falling numbers roll down. Everything else rolls up.

## Line icons

An `<svg>` with a `viewBox` whose children are one to three `<line>` elements morphs its lines into the next one's, after Benji Taylor's [Morphing icons with Claude](https://benji.org/morphing-icons-with-claude). Any line icon can become any other in the same slot:

- **Same drawing, turned.** An arrow pointing right into one pointing down, or plus into cross, turns as one piece by the quarter or eighth turn that matches. You don't declare rotation groups; the turn is found by comparing the lines.
- **Anything else.** Each line slides to the partner that moves its endpoints least, so lines never cross on the way. An icon with fewer lines is padded with lines collapsed to the centre, which grow out of it or shrink into it, hidden, so a round cap never shows as a dot.

```html
<button id="toggle"><svg viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <line x1="2.5" y1="4" x2="11.5" y2="4"/><line x1="2.5" y1="7" x2="11.5" y2="7"/><line x1="2.5" y1="10" x2="11.5" y2="10"/>
</svg></button>
```

Swap the lines for a cross and the three bars become two. Put the stroke on the svg, so every line inherits it.

## Outline icons

Any other icon with a `viewBox` and one to four simple shapes (`path`, `rect`, `circle`, `ellipse`, `polyline`, `polygon`, `line`) morphs outline to outline, so icon sets like Nucleo work as they come. A play triangle reshapes into two pause bars:

1. Each shape is sampled into 64 points along its length with the browser's own path geometry.
2. Shapes pair up by where they sit. One without a partner grows out of, or shrinks into, its own centre.
3. Each outline is turned to start where its partner starts and run the same way, so it never folds through itself on the way.
4. The points travel on the roll's spring, and the finished icon is the real markup again.

Morphable icons ignore `data-key`: any two can morph. An icon of more parts, like an eight-spoke loader, or a path with holes, shrinks and blurs into the next one instead. So does any icon in a browser that can't measure paths.

## Styling is CSS

There are no options. The copies inherit the element's font, colour, transform and everything else, and sit exactly where the element drew its own glyphs, so wrapping, alignment, `letter-spacing` and `text-transform` all work. Set `font-variant-numeric: tabular-nums` on anything numeric, so a rolled digit lands in the column it left.

An element sized by its content eases to its new width, so what sits beside it slides instead of jumping.

Motion never spills sideways onto what sits beside the element. The copies draw through a window that is the element's padding box across, so a leaving glyph never lands on the next word. Where there is empty space between the text and a side edge, such as a pill's padding, motion fades across it (up to 0.25em); where text touches the side, the cut is clean, so text at rest is never dimmed.

Above and below, the window reaches one roll's travel (0.42em) past the glyphs and fades across that band, so a rolling digit dissolves rather than being sliced by a hard edge. A glyph at the end of its travel is already transparent, so the band only ever holds faint ink. With an ordinary line-height the band sits inside the element's own line.

## Frameworks

There are no wrapper components and no `update()` to call. Your framework renders into an element as usual; bind the element once and every re-render morphs.

`morphChanges` takes an element and returns its cleanup, which is exactly what React refs and Svelte attachments expect, so it plugs in as it is:

```tsx
// React 19
<span ref={morphChanges}>{price}</span>
```

```svelte
<!-- Svelte 5 -->
<span {@attach morphChanges}>{price}</span>
```

Vue gets a directive:

```vue
<script setup>
import { vMorphChanges } from "lunato";
</script>

<template><span v-morph-changes>{{ price }}</span></template>
```

Anywhere else (plain HTML, Astro, Angular, Solid), use the element. Importing it registers `<lunato-text>`:

```html
<script type="module">import "lunato/element";</script>

<lunato-text>$240</lunato-text>
```

In React 18 a ref with no cleanup is called with `null` on unmount; `morphChanges` ignores it, and the binding goes with the element. Binding the same element twice replaces the first binding, so StrictMode and hot reload are safe. Importing on the server is safe; nothing runs until an element is bound.

## Reduced motion and accessibility

With `prefers-reduced-motion: reduce`, nothing glides, rolls, shrinks or blurs. Units fade out where they were and fade in where they belong.

The text never leaves the DOM. Screen readers, search engines, find-in-page and selection all see the ordinary element. The glyphs are hidden with `-webkit-text-fill-color: transparent` and the copies are drawn in an `aria-hidden` overlay. Add `aria-live="polite"` to the element if changes should be announced.

## The numbers

Every number lives in `src/tokens.ts` with its reason beside it. To change one, copy the file.

| Job | Number | Why |
| --- | --- | --- |
| Roll | 600ms on a damped spring (ratio 0.75, about 3% overshoot), sampled into `linear()` | It reads by about 250ms. The rest is the soft landing, and that tail is most of what reads as smooth. |
| Sweep | 25% of the roll, spread by position | A glyph and its replacement start together, and the change runs left to right. |
| Glide and width | the roll plus the sweep, `cubic-bezier(0.2, 0, 0, 1)` | No overshoot, so a gliding glyph never outruns the box it sits in. |
| Travel | 0.42em, scale 0.72, blur 0.12em | Scales with the type. Far enough to read as a roll, near enough to stay on its line. |
| Icons | scale 0.25, blur 4px | One mark becoming another. A fixed blur, because 0.1em of a control label is a pixel. |
| Line icons | the roll's spring and duration, drawn per frame | The icon and the label beside it land together. Turns run on the svg box, where the compositor keeps them smooth. |

## Limits

- Glyphs are measured in the element's own pixels, so a scale on it or around it (a card squashed while pressed) never skews a morph. A rotation around it still does.
- `text-shadow` and `text-decoration` on the element still paint under the copies.
- Italic overhang past the element's edge is clipped, because nothing draws outside the element.
- The width eases only on one-line text. Wrapped text changes size without the ease.
- Inline styles on an icon element are not carried into its copy.

## Demo

```
npm run demo
```

This builds the library and writes `demo/standalone.html`, the demo with the library inlined, so it opens straight from the file system. Five examples, each cycling on click: a counter, a price, a pair of words, an emoji reaction and a copy pill.

## Prior art

[Scritto](https://scrit.to) by Jace showed a glyph leaving through one edge of its line as its replacement arrives through the other, on a spring, swept by position; the rolls here grew from studying it. [torph](https://torph.lochie.me) by Lochie morphs text through framework components. Line icons follow Benji Taylor's [Morphing icons with Claude](https://benji.org/morphing-icons-with-claude). lunato's code, numbers and API are its own.

## License

MIT
