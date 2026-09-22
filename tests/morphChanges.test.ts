import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { morphChanges, vMorphChanges } from "../src/index";
import "../src/element";
import { RISE, ROLL_MS, SPREAD } from "../src/tokens";

// happy-dom has no layout and no Web Animations. Every glyph measures as a 10px box in
// reading order, and each animate() call is recorded so a test can read what moved.
type Call = { el: Element; frames: Keyframe[]; options: KeyframeAnimationOptions };
const calls: Call[] = [];
const mutation = () => new Promise((done) => setTimeout(done));

let cursor = 0;
const box = (i: number) => ({ left: i * 10, top: 0, width: 10, height: 10, right: i * 10 + 10, bottom: 10, x: i * 10, y: 0, toJSON() {} }) as DOMRect;

beforeEach(() => {
  calls.length = 0;
  cursor = 0;
  document.body.innerHTML = "";
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  Range.prototype.getBoundingClientRect = () => box(cursor++);
  Element.prototype.getBoundingClientRect = function () {
    return box(cursor++);
  };
  Element.prototype.animate = function (frames, options) {
    calls.push({ el: this, frames: frames as Keyframe[], options: options as KeyframeAnimationOptions });
    return { finished: new Promise(() => {}), cancel() {}, playState: "running" } as unknown as Animation;
  };
  Element.prototype.getAnimations = () => [];
});
afterEach(() => vi.unstubAllGlobals());

function label(html: string) {
  const el = document.createElement("span");
  el.innerHTML = html;
  el.style.fontSize = "10px";
  document.body.append(el);
  Object.defineProperty(el, "getBoundingClientRect", { value: () => ({ ...box(0), width: 100, height: 20 }) });
  return el;
}
const copies = (el: HTMLElement) => [...el.querySelector("[aria-hidden]")!.children].map((c) => c.textContent);
const rolls = () => calls.filter((c) => "opacity" in c.frames[0]);

describe("morphChanges", () => {
  it("draws a copy of every grapheme and keeps the real text in place", () => {
    const el = label("Hi 👋");
    morphChanges(el);
    expect(copies(el)).toEqual(["H", "i", "👋"]);
    expect(el.textContent).toContain("Hi 👋");
    expect(calls).toHaveLength(0); // the first paint does not animate
  });

  it("rolls the old letters up and out and the new ones up and in, swept left to right", async () => {
    const el = label("Copy");
    morphChanges(el);
    el.textContent = "Copied";
    await mutation();
    const out = rolls().filter((c) => c.frames[1].opacity === 0);
    const into = rolls().filter((c) => c.frames[0].opacity === 0);
    expect(out.map((c) => c.el.textContent)).toEqual(["y"]);
    expect(out[0].frames[1].translate).toBe(`0 -${RISE}em`);
    expect(into.map((c) => c.el.textContent)).toEqual(["i", "e", "d"]);
    expect(into[0].frames[0].translate).toBe(`0 ${RISE}em`);
    const delays = into.map((c) => c.options.delay as number);
    expect(delays).toEqual([...delays].sort((x, y) => x - y)); // left to right
    expect(Math.max(...delays)).toBeLessThanOrEqual(ROLL_MS * SPREAD);
  });

  it("counts like an odometer: 9 to 10 rolls the ones slot and brings in only the tens", async () => {
    const el = label("9");
    morphChanges(el);
    const slot = el.querySelector("[aria-hidden]")!.firstElementChild!;
    el.textContent = "10";
    await mutation();
    expect(slot.isConnected).toBe(true);
    expect([...slot.children].map((f) => f.textContent)).toEqual(["9", "0"]); // both values share the slot mid-roll
    const out = calls.find((c) => c.el.textContent === "9")!;
    const into = calls.find((c) => c.el.textContent === "0")!;
    expect(out.frames[1].translate).toBe(`0 -${RISE}em`);
    expect(into.frames[0].translate).toBe(`0 ${RISE}em`);
    expect(out.options.delay).toBe(into.options.delay); // the old value leaves as the new one arrives
    expect(copies(el).sort()).toEqual(["1", "90"]); // the new tens digit, and the ones slot holding both values
  });

  it("rolls down when the number falls", async () => {
    const el = label("10");
    morphChanges(el);
    el.textContent = "9";
    await mutation();
    const into = rolls().find((c) => c.frames[0].opacity === 0)!;
    expect(into.frames[0].translate).toBe(`0 -${RISE}em`);
  });

  it("morphs an icon element into the next one", async () => {
    const el = label('<svg data-key="copy"></svg>');
    morphChanges(el);
    expect((el.querySelector("svg") as SVGElement).style.visibility).toBe("hidden");
    el.innerHTML = '<svg data-key="check"></svg>';
    await mutation();
    const svgs = [...el.querySelectorAll("[aria-hidden] svg")];
    expect(svgs.map((s) => s.getAttribute("data-key"))).toEqual(["copy", "check"]);
    for (const s of svgs) expect((s as SVGElement).style.visibility).toBe("");
    const leaving = calls.find((c) => c.el.getAttribute("data-key") === "copy")!;
    expect(leaving.frames[1]).toMatchObject({ opacity: 0, scale: 0.25 });
  });

  it("draws through a window: the element across, soft bands above and below, never cutting a glyph at rest", () => {
    // A tight line-height: each glyph's own box reaches 4px above the element and 4px below.
    Range.prototype.getBoundingClientRect = () => ({ ...box(cursor++), top: -4, bottom: 24, height: 28 }) as DOMRect;
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 20 });
    const el = label("gy");
    morphChanges(el);
    const window = el.querySelector<HTMLElement>("[aria-hidden]")!;
    expect(window.style.overflow).toMatch(/clip|hidden/);
    // Plus one roll's travel (RISE em of 10px) above and below, faded across, so a rolling glyph dissolves rather than being sliced.
    expect(window.style.top).toBe(`-${4 + RISE * 10}px`);
    expect(window.style.bottom).toBe(`-${4 + RISE * 10}px`);
    expect(window.style.getPropertyValue("mask-image")).toContain(`#000 ${RISE * 10}px`);
    // Text touching the edges leaves no room for a fade, so nothing at rest is dimmed.
    expect(window.style.getPropertyValue("mask-image")).toContain("#000 0px");
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  });

  it("morphs one line icon into another in place, and turns a rotated one", async () => {
    const icon = (lines: string) => `<svg viewBox="0 0 14 14">${lines}</svg>`;
    const right = icon('<line x1="3" y1="7" x2="11" y2="7"/><line x1="7" y1="3" x2="11" y2="7"/><line x1="7" y1="11" x2="11" y2="7"/>');
    const down = icon('<line x1="7" y1="3" x2="7" y2="11"/><line x1="11" y1="7" x2="7" y2="11"/><line x1="3" y1="7" x2="7" y2="11"/>');
    const menu = icon('<line x1="2.5" y1="4" x2="11.5" y2="4"/><line x1="2.5" y1="7" x2="11.5" y2="7"/><line x1="2.5" y1="10" x2="11.5" y2="10"/>');
    const el = label(right);
    morphChanges(el);
    const face = el.querySelector("[aria-hidden] svg")!;
    el.innerHTML = down;
    await mutation();
    expect(el.querySelector("[aria-hidden] svg")).toBe(face); // the same drawing, not a swap
    const spin = calls.find((c) => c.el === face)!;
    expect(spin.frames[1]).toEqual({ rotate: "90deg" });
    calls.length = 0;
    el.innerHTML = menu;
    await mutation();
    expect(el.querySelectorAll("[aria-hidden] svg")).toHaveLength(1);
    expect(calls.some((c) => c.frames[1]?.scale === 0.25)).toBe(false); // lines slide; nothing shrinks away
  });

  it("places glyphs in the element's own pixels while it is scaled, so a press never skews a morph", () => {
    // The element is drawn at half size (a card squashed mid-press, exaggerated): 200px of layout shows as 100px.
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 200 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 40 });
    const el = label("ab");
    morphChanges(el);
    const boxes = [...el.querySelector("[aria-hidden]")!.children] as HTMLElement[];
    // On screen the glyphs sit at 0px and 10px, 10px wide; in the element's own pixels that is 0, 20 and 20 wide.
    expect(boxes.map((b) => b.style.left)).toEqual(["0px", "20px"]);
    expect(boxes[1].style.width).toBe("20px");
    delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
    delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  });

  it("only crossfades under reduced motion", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const el = label("1");
    morphChanges(el);
    el.textContent = "2";
    await mutation();
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(Object.keys(c.frames[1])).toEqual(["opacity"]);
  });

  it("unbinds back to plain text, and binding twice replaces the first", () => {
    const el = label("x");
    morphChanges(el);
    const stop = morphChanges(el);
    expect(el.querySelectorAll("[aria-hidden]")).toHaveLength(1);
    stop();
    expect(el.querySelector("[aria-hidden]")).toBeNull();
    expect(el.style.position).toBe("");
  });

  it("is its own adapter: ignores a null ref, and binds through the Vue directive and the element", () => {
    expect(morphChanges(null)).toBeTypeOf("function");

    const el = label("x");
    vMorphChanges.mounted(el);
    expect(el.querySelectorAll("[aria-hidden]")).toHaveLength(1);
    vMorphChanges.unmounted(el);
    expect(el.querySelector("[aria-hidden]")).toBeNull();

    const tag = document.createElement("lunato-text");
    tag.textContent = "42";
    document.body.append(tag);
    expect(copies(tag)).toEqual(["4", "2"]);
    tag.remove();
    expect(tag.querySelector("[aria-hidden]")).toBeNull();
  });
});
