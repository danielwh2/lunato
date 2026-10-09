import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement, useState, act } from "react";
import { createRoot } from "react-dom/client";
import { createSignal } from "solid-js";
import html from "solid-js/html";
import { render } from "solid-js/web";
import { flushSync, mount, unmount } from "svelte";
import { compile } from "svelte/compiler";
import { beforeEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, withDirectives } from "vue";
import { morphChanges, vMorphChanges } from "../src/index";
import { morphChanges as solidMorphChanges } from "../src/solid";

// Each framework mounts a counter at 9, sets it to 10 and unmounts. It works if the element was bound,
// the change animated, and unmounting put the element back.
let animations = 0;
const mutation = () => new Promise((done) => setTimeout(done));
beforeEach(() => {
  animations = 0;
  document.body.innerHTML = "";
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  let i = 0;
  const box = () => ({ left: i * 10, top: 0, width: 10, height: 10, right: ++i * 10, bottom: 10, x: 0, y: 0, toJSON() {} }) as DOMRect;
  Range.prototype.getBoundingClientRect = box;
  Element.prototype.getBoundingClientRect = box;
  Element.prototype.animate = () => (animations++, { finished: new Promise(() => {}), cancel() {} }) as unknown as Animation;
  Element.prototype.getAnimations = () => [];
});
const bound = (el: Element) => !!el.querySelector("[aria-hidden]");
// happy-dom drops -webkit-text-fill-color, so the way back is read from the overlay and the position the binding gave.
const restored = (el: HTMLElement) => !bound(el) && el.style.position === "";

it("React 19: ref={morphChanges}", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let set!: (n: number) => void;
  function Count() {
    const [n, setN] = useState(9);
    set = setN;
    return createElement("span", { ref: morphChanges }, n);
  }
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  await act(() => root.render(createElement(Count)));
  const el = document.querySelector("span")!;
  expect(bound(el)).toBe(true);
  expect(animations).toBe(0); // the first paint never animates
  await act(() => set(10));
  await mutation();
  expect(animations).toBeGreaterThan(0);
  await act(() => root.unmount());
  expect(restored(el)).toBe(true);
});

it("Vue: v-morph-changes", async () => {
  const n = ref(9);
  const app = createApp({ render: () => withDirectives(h("span", String(n.value)), [[vMorphChanges]]) });
  app.mount(document.body.appendChild(document.createElement("div")));
  const el = document.querySelector("span")!;
  expect(bound(el)).toBe(true);
  expect(animations).toBe(0); // the first paint never animates
  n.value = 10;
  await nextTick();
  await mutation();
  expect(animations).toBeGreaterThan(0);
  app.unmount();
  expect(restored(el)).toBe(true);
});

it("Solid: ref={morphChanges} from lunato/solid", async () => {
  const [n, setN] = createSignal(9);
  const dispose = render(() => html`<span ref=${solidMorphChanges}>${n}</span>`, document.body.appendChild(document.createElement("div")));
  const el = document.querySelector("span")!;
  expect(bound(el)).toBe(true);
  expect(animations).toBe(0); // the first paint never animates
  setN(10);
  await mutation();
  expect(animations).toBeGreaterThan(0);
  dispose();
  expect(restored(el)).toBe(true);
});

it("Svelte 5: {@attach morphChanges}", async () => {
  const source = `<script>
  import { morphChanges } from ${JSON.stringify(path.resolve("src/index.ts"))};
  let n = $state(9);
  export function set(value) { n = value; }
</script>
<span {@attach morphChanges}>{n}</span>`;
  const dir = path.resolve("tests/.tmp");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "Count.svelte.js");
  writeFileSync(file, compile(source, { filename: "Count.svelte", generate: "client" }).js.code);
  const Count = (await import(/* @vite-ignore */ file)).default;
  const count = mount(Count, { target: document.body.appendChild(document.createElement("div")) }) as { set(n: number): void };
  flushSync();
  const el = document.querySelector("span")!;
  expect(bound(el)).toBe(true);
  expect(animations).toBe(0); // the first paint never animates
  count.set(10);
  flushSync();
  await mutation();
  expect(animations).toBeGreaterThan(0);
  unmount(count);
  expect(restored(el)).toBe(true);
});
