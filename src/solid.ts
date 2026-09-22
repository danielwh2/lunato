import { onCleanup, onMount } from "solid-js";
import { morphChanges as bind } from "./index.js";

/**
 * Solid: `<span ref={morphChanges}>{price()}</span>`. Solid calls a ref before it fills the element and
 * ignores what it returns, so the binding waits for mount and hands its cleanup to the component's owner.
 */
export function morphChanges(el: HTMLElement) {
  onMount(() => onCleanup(bind(el)));
}
