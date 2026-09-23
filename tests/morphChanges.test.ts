import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { morphChanges, vMorphChanges } from "../src/index";
import "../src/element";
import { EDGE, ENTER_FROM, EXIT_CLEAR, FIT_GROW, LANDED, ROLL_MS, ROOM, SPREAD } from "../src/tokens";

// happy-dom has no layout and no Web Animations. A glyph measures as a 10px box at its offset in its text, a drawn
// copy as the box its inline style puts it in, and each animate() call is recorded so a test can read what moved.
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
  Range.prototype.getBoundingClientRect = function () {
    cursor++;
    return box(this.startOffset);
  };
  Element.prototype.getBoundingClientRect = function () {
    const { left, top, width, height } = (this as HTMLElement).style ?? {};
    if (!left) return box(cursor++);
    const [x, y, w, h] = [left, top, width, height].map((v) => parseFloat(v));
    return { left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, x, y, toJSON() {} } as DOMRect;
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

  it("rolls the old letters up and out and the new ones up and in, a word at a time", async () => {
    const el = label("Copy");
    morphChanges(el);
    el.textContent = "Copied";
    await mutation();
    const out = rolls().filter((c) => c.frames.at(-1)!.opacity === 0);
    const into = rolls().filter((c) => c.frames[0].opacity === 0);
    expect(out.map((c) => c.el.textContent)).toEqual(["y"]);
    // Every glyph box here is 10px tall: a roll travels exactly one box, straight, at full size.
    expect(out[0].frames.at(-1)!.translate).toBe("0 -10px");
    expect(out[0].frames.at(-1)!.scale).toBe(1);
    // It is gone before its travel is: faded out by EXIT_CLEAR, so nothing glides onto it while it still shows.
    expect(out[0].frames[1]).toEqual({ opacity: 0, offset: EXIT_CLEAR });
    expect(into.map((c) => c.el.textContent)).toEqual(["i", "e", "d"]);
    expect(into[0].frames[0].translate).toBe("0 10px");
    expect(into[0].frames[1]).toEqual({ opacity: 0, offset: ENTER_FROM }); // shows only once it is on its way
    // One word, so its letters all start together and it rises straight, never at a slant.
    expect(new Set(into.map((c) => c.options.delay))).toEqual(new Set([0]));
  });

  it("sweeps left to right by word as text streams in, each word rising as one piece", async () => {
    const el = label("Yes");
    morphChanges(el);
    el.textContent = "Yes if the";
    await mutation();
    const into = rolls().filter((c) => c.frames[0].opacity === 0);
    const delay = (text: string) => into.filter((c) => c.el.textContent === text).map((c) => c.options.delay as number);
    expect(new Set(delay("t").concat(delay("h"), delay("e"))).size).toBe(1); // "the" moves as one
    expect(delay("i")[0]).toBe(delay("f")[0]);
    expect(delay("i")[0]).toBeLessThan(delay("t")[0]); // "if" before "the"
    expect(delay("t")[0]).toBeLessThanOrEqual(ROLL_MS * SPREAD);
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
    // One box apart the whole way, so the leaving and arriving digit never overlap in their shared slot.
    expect(out.frames.at(-1)!.translate).toBe("0 -10px");
    expect(into.frames[0].translate).toBe("0 10px");
    expect(out.options.delay).toBe(into.options.delay); // the old value leaves as the new one arrives
    expect(copies(el).sort()).toEqual(["1", "90"]); // the new tens digit, and the ones slot holding both values
  });

  it("rolls down when the number falls", async () => {
    const el = label("10");
    morphChanges(el);
    el.textContent = "9";
    await mutation();
    const into = rolls().find((c) => c.frames[0].opacity === 0)!;
    expect(into.frames[0].translate).toBe("0 -10px");
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

  it("draws through a window: the element or the glyph boxes, never beyond, with a thin fade at the top and bottom", () => {
    // A tight line-height: each glyph's own box reaches 4px above the element and 4px below.
    Range.prototype.getBoundingClientRect = () => ({ ...box(cursor++), top: -4, bottom: 24, height: 28 }) as DOMRect;
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 20 });
    const el = label("gy");
    morphChanges(el);
    const window = el.querySelector<HTMLElement>("[aria-hidden]")!;
    expect(window.style.overflow).toMatch(/clip|hidden/);
    // Exactly the glyph boxes: a rolling glyph leaves and arrives through these edges, never painting past the line.
    expect(window.style.top).toBe("-4px");
    expect(window.style.bottom).toBe("-4px");
    const mask = window.style.getPropertyValue("mask-image");
    expect(mask).toContain(`to bottom, transparent, #000 ${EDGE * 10}px`); // EDGE of the 10px type, inside the box's margin
    // Text touching the sides leaves no room for a sideways fade, so nothing at rest is dimmed.
    expect(mask).toContain("#000 0px");
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

  it("eases its width so no showing letter is cut: ahead of arrivals growing, after departures shrinking", async () => {
    const fits = () => calls.filter((c) => "width" in c.frames[0]);
    const el = label("Copy");
    el.style.width = "40px";
    morphChanges(el);
    el.style.width = "60px";
    el.textContent = "Copied";
    await mutation();
    expect(fits()[0].frames).toEqual([{ width: "40px" }, { width: "60px" }]);
    expect(fits()[0].options).toMatchObject({ delay: 0, duration: ROLL_MS * FIT_GROW });

    calls.length = 0;
    const back = label("Copied");
    back.style.width = "60px";
    morphChanges(back);
    back.style.width = "40px";
    back.textContent = "Copy";
    await mutation();
    // It holds its width while the leaving letters fade, then closes; held, not released, during the wait.
    expect(fits()[0].options).toMatchObject({ delay: ROLL_MS * EXIT_CLEAR, fill: "backwards" });
  });

  it("hands a word pushed onto the next line over in place, never gliding it across the text between", async () => {
    const el = label("ab cd");
    morphChanges(el);
    const [, , c, d] = [...el.querySelector("[aria-hidden]")!.children] as HTMLElement[];
    // The edit wraps: "cd" lands one 10px line lower.
    Range.prototype.getBoundingClientRect = function () {
      const i = cursor++;
      return this.toString() === "c" || this.toString() === "d" ? { ...box(i), top: 10, y: 10, bottom: 20 } : box(i);
    };
    el.textContent = "abc cd";
    await mutation();
    const on = (el: Element) => calls.filter((call) => call.el === el);
    for (const glyph of [c, d]) {
      expect(on(glyph).some((call) => "translate" in call.frames[0])).toBe(false); // no diagonal glide
      expect(on(glyph)[0].frames).toEqual([{ opacity: 0 }, { opacity: 0, offset: ENTER_FROM }, { opacity: 1 }]);
    }
    const ghosts = calls.filter((call) => call.frames[0].opacity === 1 && call.frames.length === 2 && !("translate" in call.frames[1]));
    expect(ghosts.map((g) => g.el.textContent)).toEqual(["c", "d"]); // faded out where they were
    expect(ghosts[0].options.duration).toBe(ROLL_MS * EXIT_CLEAR);
  });

  it("moves one thing at a time when words move: leaving, then gliding into the room, then arriving", async () => {
    const glides = () => calls.filter((c) => "translate" in c.frames[0] && !("opacity" in c.frames[0]));
    const arrivals = () => rolls().filter((c) => c.frames[0].opacity === 0 && "translate" in c.frames[0]);
    // A word goes in the middle: "c" glides right to make room, from the start, and "b" arrives once it has all but landed.
    const grow = label("a c");
    morphChanges(grow);
    grow.textContent = "a b c";
    await mutation();
    expect(glides().map((c) => c.el.textContent)).toEqual(["c"]);
    expect(glides()[0].options.delay).toBe(0); // nothing leaves, so nothing to wait for
    expect(arrivals().map((c) => c.el.textContent)).toEqual(["b"]);
    expect(arrivals()[0].options.delay).toBeGreaterThanOrEqual(ROLL_MS * LANDED);

    // A word goes from the middle: it leaves first, and "c" glides left into its place only after it has all but faded.
    calls.length = 0;
    const shrink = label("a x c");
    morphChanges(shrink);
    shrink.textContent = "a c";
    await mutation();
    const out = rolls().filter((c) => c.frames.at(-1)!.opacity === 0);
    expect(out.map((c) => c.el.textContent)).toEqual(["x"]);
    expect(out[0].options.delay).toBe(0);
    expect(glides()[0].options.delay).toBe(ROLL_MS * ROOM);

    // Nothing gliding, as when a word is added at the end: the arrival does not wait.
    calls.length = 0;
    const append = label("a");
    morphChanges(append);
    append.textContent = "a b";
    await mutation();
    expect(glides()).toHaveLength(0);
    expect(arrivals()[0].options.delay).toBe(0);
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
