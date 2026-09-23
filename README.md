# lunato

<img src="media/title.gif" alt="The title 'Only what changed moves.' with its last word morphing through rolls, turns, glides" width="100%">

The motion layer for AI interfaces. Streamed answers, agent status, live captions and rewrites change their minds as they go; lunato moves only the words that changed. One function, zero dependencies, any framework.

```
npm i lunato
```

## Usage

```ts
import { morphChanges } from "lunato";

morphChanges("#price");
price.textContent = "$24"; // the 0 rolls to a 4, the rest holds still
```

Call it once, then change the content however you like. It returns a function that undoes it.

## Frameworks

```tsx
<span ref={morphChanges}>{price}</span>          // React 19
<span {@attach morphChanges}>{price}</span>      // Svelte 5
<span v-morph-changes>{{ price }}</span>         // Vue, with vMorphChanges imported
<span ref={morphChanges}>{price()}</span>        // Solid, from "lunato/solid"
```

Anywhere else, use the element:

```html
<script type="module">import "lunato/element";</script>
<lunato-text>$240</lunato-text>
```

Safe with StrictMode, hot reload and server imports.

## In an AI interface

Bind the elements that change in place, and render into them as you already do:

```tsx
<p ref={morphChanges}>{answer}</p>                               // streamed words rise in as they arrive
<span ref={morphChanges}>{status}</span>                         // "Reading 4 sources" → "Reading 9 sources"
<span ref={morphChanges}>{busy ? <StopIcon /> : <SendIcon />}</span>  // the icon morphs
<span ref={morphChanges}>{tokens.toLocaleString()} tokens</span>  // digits roll
```

Regenerated answers, rewrites in another tone and live captions work the same way: only the words that changed move.

## Components

The vault on lunato's site has AI interface pieces built with it, each with its motion finished: AI inputs, send buttons, model pickers, effort meters, thinking states and loaders, code changes, research sources, image generation, streaming text and token meters. They are React 19 and Tailwind v4, one file each, to copy into your project and change as you like.

## What moves

<p>
  <img src="media/numbers.gif" alt="A share price rolling digit by digit" width="49%">
  <img src="media/icons.gif" alt="A play button reshaping into pause" width="49%">
</p>
<img src="media/emoji.gif" alt="Reaction chips swapping emoji and counting up" width="100%">

- **Text.** Unchanged words hold still, however many edits sit between them, so a caption correcting itself only moves the words that changed. Inside a changed word, shared letters stay too. A word pushed onto the next line fades across instead of flying over the text.
- **Numbers.** Digits pair from the right like an odometer, so 9 to 10 rolls the 9 and brings in only the 1. Falling numbers roll down.
- **Emoji and icons.** Shrink and blur into the next one.
- **Line icons.** An svg of up to three `<line>`s morphs into another, turning when it is the same drawing rotated. After Benji Taylor's [Morphing icons with Claude](https://benji.org/morphing-icons-with-claude).
- **Outline icons.** An svg of up to four simple shapes reshapes outline to outline, so a play triangle becomes two pause bars.

## Styling

No options: the element's CSS is the look. Use `font-variant-numeric: tabular-nums` on numbers. Motion never draws outside the element, and its width eases to fit.

## Accessibility

The real text stays in the DOM for screen readers, search and selection; the animation is an `aria-hidden` overlay. Reduced motion becomes a plain fade.

## Limits

- A rotation around the element skews the morph; a scale does not.
- The width only eases on one-line text.
- `text-shadow` and `text-decoration` paint under the animation.
- Text painted with `background-clip: text` shows twice: the gradient still paints through the hidden originals under the moving copies. Animate `color` instead.

## Prior art

[Scritto](https://scrit.to) by Jace inspired the rolls. [torph](https://torph.lochie.me) by Lochie morphs text through framework components. lunato's code, numbers and API are its own.

## License

MIT
