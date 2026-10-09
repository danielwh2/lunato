import { beforeEach, describe, expect, it } from "vitest";
import { collect, graphemes, kindOf, trendOf } from "../src/units";

describe("graphemes", () => {
  it("splits into what the eye sees, leaving spaces out", () => {
    expect(graphemes("a b").map((g) => g.segment)).toEqual(["a", "b"]);
    expect(graphemes("a b").map((g) => g.index)).toEqual([0, 2]);
  });

  it("keeps a flag and a family together, with UTF-16 offsets", () => {
    const parts = graphemes("🇬🇧x👨‍👩‍👧");
    expect(parts.map((g) => g.segment)).toEqual(["🇬🇧", "x", "👨‍👩‍👧"]);
    expect(parts.map((g) => g.index)).toEqual([0, 4, 5]);
  });
});

describe("kindOf", () => {
  it("tells pictures from letters", () => {
    expect(kindOf("❤️")).toBe("icon");
    expect(kindOf("🇬🇧")).toBe("icon");
    expect(kindOf("é")).toBe("char");
    expect(kindOf("7")).toBe("char");
  });
});

describe("trendOf", () => {
  it("reads the first number that changed", () => {
    expect(trendOf("£1,299.00", "£999.99")).toBe(-1);
    expect(trendOf("9", "10")).toBe(1);
    expect(trendOf("2 of 9", "2 of 3")).toBe(-1);
    expect(trendOf("1.5", "12.25")).toBe(1);
    expect(trendOf("-3", "-8")).toBe(-1);
    expect(trendOf("2024-01-01", "2024-01-02")).toBe(1); // hyphens in a date are not minus signs
  });

  it("counts words and a changed count of numbers as up", () => {
    expect(trendOf("Copy", "Copied")).toBe(1);
    expect(trendOf("Like", "❤️ 1")).toBe(1);
  });
});

describe("collect", () => {
  // happy-dom has no layout: every glyph and element measures as a 10px box unless a test says otherwise.
  const rect = (width: number, height = width) => ({ left: 0, top: 0, width, height, right: width, bottom: height }) as DOMRect;
  const sized = (host: Element, selector: string, size: number) =>
    Object.defineProperty(host.querySelector(selector)!, "getBoundingClientRect", { value: () => rect(size) });
  beforeEach(() => {
    Range.prototype.getBoundingClientRect = function () {
      return (this.startContainer.parentElement as HTMLElement).hidden ? rect(0) : rect(10);
    };
    Element.prototype.getBoundingClientRect = () => rect(10);
  });
  const read = (html: string, size?: (host: Element) => void) => {
    const host = document.createElement("span");
    host.innerHTML = html;
    size?.(host);
    return collect(host, document.createElement("i"));
  };

  it("numbers the words, across tags, spaces and icons", () => {
    expect(read("<b>Hel</b>lo world <svg></svg>ok").map((u) => u.word)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 3, 3]);
  });

  it("leaves out what is not on screen: text and icons that are not rendered, and a visually hidden label", () => {
    const units = read('<svg></svg><i hidden>no</i><span class="sr-only">Send</span>ok', (host) => {
      sized(host, "svg", 0);
      Object.defineProperties(host.querySelector(".sr-only")!, { offsetWidth: { value: 1 }, offsetHeight: { value: 1 } });
    });
    expect(units.map((u) => u.text)).toEqual(["o", "k"]);
  });

  it("reads an svg as one icon whatever it holds: its title is a name, not text on the page", () => {
    const units = read('<svg viewBox="0 0 24 24"><title>Send</title><path d="M2 2"/></svg>');
    expect(units.map((u) => u.node?.localName)).toEqual(["svg"]);
  });

  it("reads a line break as the space between two words, never as an icon", () => {
    const units = read("one<br>two");
    expect(units.map((u) => u.text).join("")).toBe("onetwo");
    expect(units.map((u) => u.word)).toEqual([0, 0, 0, 1, 1, 1]);
  });
});
