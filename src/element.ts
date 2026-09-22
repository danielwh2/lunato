import { morphChanges } from "./index.js";

/**
 * `<lunato-text>`, for anything with no element hook of its own: plain HTML, Astro, Angular, Solid.
 * Importing this file registers it; its content morphs like any bound element.
 */
// Guarded, class included: the server has no HTMLElement to extend, and a second copy of the package must not define the tag twice.
if (typeof customElements !== "undefined" && !customElements.get("lunato-text")) {
  customElements.define(
    "lunato-text",
    class extends HTMLElement {
      private off?: () => void;
      connectedCallback() {
        this.off = morphChanges(this);
      }
      disconnectedCallback() {
        this.off?.();
      }
    },
  );
}
