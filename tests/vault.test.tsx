// @vitest-environment happy-dom
// The vault's components in a DOM: the states they move through (sending, uploading, failed, stopped, done) and the
// motion bookkeeping that keeps a chip or a burst honest. lunato's morph is stubbed; what it draws is its own tests' job.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { AiInput } from "../vault/ai-input";
import { AiPill } from "../vault/ai-pill";
import { type Attachment, Attachments } from "../vault/attachments";
import { CodeDiff } from "../vault/code-diff";
import { EffortCharge } from "../vault/effort-charge";
import { EffortChip } from "../vault/effort-chip";
import { EffortSegments } from "../vault/effort-segments";
import { EffortSlider } from "../vault/effort-slider";
import { EffortTape } from "../vault/effort-tape";
import { LoaderGrid } from "../vault/loader-grid";
import { SourceChips } from "../vault/source-chips";
import { MaxBurst } from "../vault/effort";
import { ModelMenu } from "../vault/model-menu";
import { SendMorph } from "../vault/send-morph";
import { SendVoice } from "../vault/send-voice";
import { StreamingBlur } from "../vault/streaming-blur";
import { StreamingCaret } from "../vault/streaming-caret";
import { ThinkingIndicator } from "../vault/thinking-indicator";
import { ThinkingPhases } from "../vault/thinking-phases";
import { ThinkingSteps } from "../vault/thinking-steps";
import { ThinkingThoughts } from "../vault/thinking-thoughts";
import { duration } from "../vault/thinking";
import { TokenMeter } from "../vault/token-meter";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("lunato", () => ({ morphChanges: () => () => {} }));

const files: Attachment[] = ["a", "b", "c"].map((id) => ({ id, name: id + ".pdf", size: 2048 }));

function Panel() {
  const [items, setItems] = useState(files);
  return <form><input aria-label="field" /><Attachments items={items} onRemove={(id) => setItems((all) => all.filter((f) => f.id !== id))} /></form>;
}

test("a removed chip lingers while it fades, then goes; focus moves on, then back to the field", async () => {
  const host = document.body.appendChild(document.createElement("div"));
  await act(() => createRoot(host).render(<Panel />));
  const live = () => [...host.querySelectorAll("li:not([data-leaving])")].map((li) => (li as HTMLElement).dataset.id);
  const leaving = () => [...host.querySelectorAll("li[data-leaving]")].map((li) => (li as HTMLElement).dataset.id);
  const press = async (id: string) => {
    const button = host.querySelector<HTMLButtonElement>('li:not([data-leaving])[data-id="' + id + '"] button')!;
    button.focus();
    await act(() => button.click());
  };
  expect(live()).toEqual(["a", "b", "c"]);

  await press("b");
  expect(live()).toEqual(["a", "c"]);
  expect(leaving()).toEqual(["b"]);
  expect(host.querySelector("li[data-leaving]")!.getAttribute("aria-hidden")).toBe("true");
  expect((document.activeElement as HTMLElement).closest("li")!.dataset.id).toBe("c");

  const gone = host.querySelector("li[data-leaving]")!;
  await act(() => { gone.dispatchEvent(new Event("animationend", { bubbles: true })); gone.dispatchEvent(new Event("webkitAnimationEnd", { bubbles: true })); });
  expect(leaving()).toEqual([]);

  await press("c");
  expect((document.activeElement as HTMLElement).closest("li")!.dataset.id).toBe("a");
  await press("a");
  expect(live()).toEqual([]);
  expect(document.activeElement!.getAttribute("aria-label")).toBe("field");
  expect(host.querySelector("ul")!.className).not.toContain("pb-1");
});

test("MaxBurst stays quiet when it opens at Max, then fires on each way in", async () => {
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  await act(() => root.render(<MaxBurst on />));
  expect(host.querySelector(".lunato-burst")).toBeNull();
  await act(() => root.render(<MaxBurst on={false} />));
  await act(() => root.render(<MaxBurst on />));
  expect(host.querySelectorAll(".lunato-burst i").length).toBe(8);
  const first = host.querySelector(".lunato-burst");
  await act(() => root.render(<MaxBurst on />)); // Max holds: no new burst
  expect(host.querySelector(".lunato-burst")).toBe(first);
  await act(() => root.render(<MaxBurst on={false} />));
  await act(() => root.render(<MaxBurst on />));
  expect(host.querySelector(".lunato-burst")).not.toBe(first); // a fresh one, keyed anew
});

test("Thoughts counts while thinking, then freezes into Thought for", async () => {
  vi.useFakeTimers();
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  const label = () => host.querySelector("button")!.textContent;
  await act(() => root.render(<ThinkingThoughts thoughts="a" />));
  expect(label()).toBe("Thinking");
  await act(() => vi.advanceTimersByTime(1250));
  expect(label()).toBe("Thinking for 1s");
  await act(() => vi.advanceTimersByTime(1000));
  await act(() => root.render(<ThinkingThoughts thoughts="a b" done />));
  expect(label()).toBe("Thought for 2s");
  await act(() => vi.advanceTimersByTime(5000));
  expect(label()).toBe("Thought for 2s");
  expect(host.querySelector('[role="status"]')!.textContent).toBe("Thought for 2s");
  expect(host.querySelector("button")!.getAttribute("aria-expanded")).toBe("false");
  await act(() => host.querySelector("button")!.click());
  expect(host.querySelector("button")!.getAttribute("aria-expanded")).toBe("true");
  vi.useRealTimers();
});

test("MaxBurst does what atMax asks: ring alone, or nothing but your own feedback", async () => {
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  const reached = vi.fn();
  await act(() => root.render(<MaxBurst on={false} feedback={{ burst: "ring" }} />));
  await act(() => root.render(<MaxBurst on feedback={{ burst: "ring" }} />));
  expect(host.querySelector(".lunato-burst")).not.toBeNull();
  expect(host.querySelectorAll(".lunato-burst i").length).toBe(0);
  await act(() => root.render(<MaxBurst on={false} feedback={{ burst: false, tap: false, onReach: reached }} />));
  await act(() => root.render(<MaxBurst on feedback={{ burst: false, tap: false, onReach: reached }} />));
  expect(reached).toHaveBeenCalledTimes(1);
  expect(host.querySelector(".lunato-burst")).toBeNull();
});

const mount = () => {
  const host = document.body.appendChild(document.createElement("div"));
  return { host, root: createRoot(host) };
};
const enter = (field: HTMLElement) => field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
const CROSS = "M4 4l6 6M10 4l-6 6";

test("a failed send shows its note above the panel, retries back into the field, and comes back fresh", async () => {
  const { host, root } = mount();
  const retry = vi.fn();
  const panel = (error?: string) => <AiInput value="hi" onChange={() => {}} onSubmit={() => {}} busy={false} onStop={() => {}} error={error} onRetry={retry} />;
  await act(() => root.render(panel()));
  expect(host.querySelector('[role="alert"]')).toBeNull();
  await act(() => root.render(panel("You're offline")));
  const note = host.querySelector('[role="alert"]')!;
  expect(note.textContent).toBe("You're offline" + "Retry");
  expect(note.parentElement!.tagName).toBe("FORM");
  await act(() => note.querySelector("button")!.click());
  expect(retry).toHaveBeenCalledTimes(1);
  expect(document.activeElement!.getAttribute("aria-label")).toBe("Message");
  await act(() => root.render(panel()));
  expect(host.querySelector('[role="alert"]')).toBeNull();
  await act(() => root.render(panel("You're offline")));
  expect(host.querySelector('[role="alert"]')).not.toBe(note); // put in place anew, so it is read out again
});

test("without onRetry the note has no button; the pill shows it too", async () => {
  const { host, root } = mount();
  await act(() => root.render(<AiPill value="" onChange={() => {}} onSubmit={() => {}} busy={false} onStop={() => {}} error="Too many requests" />));
  const note = host.querySelector('[role="alert"]')!;
  expect(note.textContent).toBe("Too many requests");
  expect(note.querySelector("button")).toBeNull();
});

test("a file uploading or failed holds the send; taking it off frees it", async () => {
  const { host, root } = mount();
  const sent = vi.fn();
  const panel = (attachments: Attachment[]) => (
    <AiInput value="look at this" onChange={() => {}} onSubmit={sent} busy={false} onStop={() => {}} attachments={attachments} onAttach={() => {}} onRemove={() => {}} />
  );
  const field = () => host.querySelector<HTMLInputElement>('input[aria-label="Message"]')!;
  const send = () => host.querySelector<HTMLButtonElement>('button[aria-label="Send"]')!;

  await act(() => root.render(panel([{ id: "a", name: "a.png", uploading: true }])));
  await act(() => enter(field()));
  expect(sent).not.toHaveBeenCalled();
  expect(send().disabled).toBe(true);
  expect(host.querySelector('li[data-id="a"]')!.textContent).toContain("uploading");

  await act(() => root.render(panel([{ id: "a", name: "a.png", size: 30e6, error: "Over 20 MB" }])));
  const chip = host.querySelector<HTMLElement>('li[data-id="a"]')!;
  expect(chip.dataset.error).toBe("");
  expect(chip.textContent).toContain("Over 20 MB");
  expect(chip.textContent).not.toContain("28.6 MB"); // the error takes the size's place
  expect(host.querySelector('.lunato-attachments [role="status"]')!.textContent).toBe("a.png: Over 20 MB");
  await act(() => enter(field()));
  expect(sent).not.toHaveBeenCalled();
  expect(send().disabled).toBe(true);

  await act(() => root.render(panel([{ id: "b", name: "b.pdf", size: 2048 }])));
  expect(send().disabled).toBe(false);
  await act(() => enter(field()));
  expect(sent).toHaveBeenCalledTimes(1);
});

test("Voice: listening keeps the bars and a press stops dictation, even once words have arrived", async () => {
  const { host, root } = mount();
  const voice = vi.fn();
  const sendIt = vi.fn();
  const button = () => host.querySelector("button")!;
  const render = (disabled: boolean, listening: boolean) => root.render(<SendVoice busy={false} disabled={disabled} onSend={sendIt} onStop={() => {}} onVoice={voice} listening={listening} />);
  await act(() => render(true, false));
  expect(button().getAttribute("aria-label")).toBe("Dictate");
  expect(button().getAttribute("aria-pressed")).toBe("false");
  await act(() => render(false, true)); // words are arriving while it listens
  expect(button().getAttribute("aria-pressed")).toBe("true");
  expect(host.querySelector("[data-listening]")).not.toBeNull();
  await act(() => button().click());
  expect(voice).toHaveBeenCalledTimes(1);
  expect(sendIt).not.toHaveBeenCalled();
  await act(() => render(false, false));
  expect(button().getAttribute("aria-label")).toBe("Send");
  expect(button().hasAttribute("aria-pressed")).toBe(false);
  await act(() => button().click());
  expect(sendIt).toHaveBeenCalledTimes(1);
});

test("stopped: the line, the steps, the thoughts and the phases end on a cross, not a check", async () => {
  vi.useFakeTimers();
  const { host, root } = mount();
  await act(() => root.render(<ThinkingIndicator status="Stopped" stopped />));
  expect(host.querySelector("[data-done]")).not.toBeNull();
  expect(host.querySelector(`.lunato-thinking-done path[d="${CROSS}"]`)).not.toBeNull();

  await act(() => root.render(<ThinkingSteps steps={["Searching", "Reading"]} stopped />));
  expect(host.querySelector("[data-running]")).toBeNull();
  expect(host.querySelectorAll(`path[d="${CROSS}"]`).length).toBe(1);
  expect(host.querySelector(`li:last-child path[d="${CROSS}"]`)).not.toBeNull();

  await act(() => root.render(<ThinkingThoughts thoughts="a" />));
  await act(() => vi.advanceTimersByTime(1250));
  await act(() => root.render(<ThinkingThoughts thoughts="a" stopped />));
  expect(host.querySelector("button")!.textContent).toBe("Stopped after 1s");
  expect(host.querySelector('[role="status"]')!.textContent).toBe("Stopped after 1s");
  await act(() => vi.advanceTimersByTime(3000));
  expect(host.querySelector("button")!.textContent).toBe("Stopped after 1s");

  await act(() => root.render(<ThinkingPhases phases={["Reading", "Planning", "Writing"]} phase={1} />));
  await act(() => vi.advanceTimersByTime(2250));
  expect(host.querySelector('[role="status"]')!.textContent).toBe("Planning"); // not the ticking seconds
  await act(() => root.render(<ThinkingPhases phases={["Reading", "Planning", "Writing"]} phase={1} stopped />));
  expect([...host.querySelectorAll(".lunato-phase")].map((p) => (p as HTMLElement).dataset.state)).toEqual(["done", "stopped", undefined]);
  expect(host.querySelector('[role="status"]')!.textContent).toBe("Stopped after 2s");
  vi.useRealTimers();
});

test("a token meter with no limit yet sits empty rather than NaN", async () => {
  const { host, root } = mount();
  await act(() => root.render(<TokenMeter used={1200} limit={0} />));
  expect(host.querySelector<HTMLElement>('[role="meter"] > span > span')!.style.scale).toBe("0 1");
});

test("an effort value missing from the levels can still be set to the first level", async () => {
  const { host, root } = mount();
  const change = vi.fn();
  await act(() => root.render(<EffortSegments value="medium" onChange={change} levels={[{ id: "low", label: "Low", color: "#e2a3ea" }, { id: "max", label: "Max", color: "#9c1fae" }]} />));
  await act(() => host.querySelector('[role="slider"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true })));
  expect(change).toHaveBeenCalledWith("low");
});

test("streamed text keeps its elements as it grows, and a finished answer mounts whole", async () => {
  const { host, root } = mount();
  await act(() => root.render(<StreamingBlur text="Yes, straw" />));
  const word = host.querySelectorAll("span")[1];
  await act(() => root.render(<StreamingBlur text="Yes, strawberry" />));
  expect(host.querySelectorAll("span")[1]).toBe(word); // the word grew in place rather than blurring in again
  expect(word.textContent).toBe("strawberry");

  await act(() => root.render(<CodeDiff file="a.ts" streaming lines={[{ kind: "ctx", text: "a" }, { kind: "add", text: "const t" }]} />));
  const line = host.querySelector('[data-kind="add"]');
  await act(() => root.render(<CodeDiff file="a.ts" streaming lines={[{ kind: "del", text: "a" }, { kind: "add", text: "const total = 1;" }]} />));
  expect(host.querySelector('[data-kind="add"]')).toBe(line);

  await act(() => root.render(<StreamingCaret text="Done already." />));
  expect(host.querySelector("p")!.textContent).toBe("Done already.");
});

test("no models yet renders nothing rather than crashing", async () => {
  const { host, root } = mount();
  await act(() => root.render(<ModelMenu models={[]} value="" onChange={() => {}} />));
  expect(host.innerHTML).toBe("");
});

test("the second click of a double-click that sent never stops the answer", async () => {
  const { host, root } = mount();
  const stop = vi.fn();
  await act(() => root.render(<SendMorph busy onSend={() => {}} onStop={stop} />));
  const button = host.querySelector("button")!;
  await act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 2 })));
  expect(stop).not.toHaveBeenCalled();
  await act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
  expect(stop).toHaveBeenCalledTimes(1);
});

test("in a panel, voice offers dictation only with nothing to send, not while a file holds the send", async () => {
  const { host, root } = mount();
  const panel = (value: string, attachments: Attachment[]) => (
    <AiInput value={value} onChange={() => {}} onSubmit={() => {}} busy={false} onStop={() => {}} send="voice" onVoice={() => {}} attachments={attachments} onAttach={() => {}} />
  );
  const last = () => [...host.querySelectorAll("button")].at(-1)!;
  await act(() => root.render(panel("", [])));
  expect(last().getAttribute("aria-label")).toBe("Dictate");
  await act(() => root.render(panel("summarise this", [{ id: "a", name: "a.pdf", uploading: true }])));
  expect(last().getAttribute("aria-label")).toBe("Send");
  expect(last().disabled).toBe(true);
});

test("a removal that lands late does not pull focus from where someone has moved on to", async () => {
  const { host, root } = mount();
  const files: Attachment[] = [{ id: "a", name: "a.pdf" }, { id: "b", name: "b.pdf" }];
  const panel = (items: Attachment[]) => <form><input aria-label="field" /><Attachments items={items} onRemove={() => {}} /></form>;
  await act(() => root.render(panel(files)));
  const remove = host.querySelector<HTMLButtonElement>('[data-id="a"] button')!;
  remove.focus();
  await act(() => remove.click()); // onRemove waits on a server: nothing changes yet
  await act(() => root.render(panel(files.map((f) => ({ ...f })))));
  const field = host.querySelector<HTMLInputElement>('[aria-label="field"]')!;
  field.focus(); // they move on and start typing
  await act(() => root.render(panel(files.slice(1)))); // the delete lands
  expect(document.activeElement).toBe(field);
});

// The entries on the page: every preview file but the shared hooks, keyed by name.
test("the pill always shows its send button, off until there is something to send", async () => {
  const { host, root } = mount();
  const pill = (value: string) => <AiPill value={value} onChange={() => {}} onSubmit={() => {}} busy={false} onStop={() => {}} />;
  await act(() => root.render(pill("")));
  const send = host.querySelector<HTMLButtonElement>('button[aria-label="Send"]')!;
  expect(send.disabled).toBe(true);
  expect(send.className).not.toContain("opacity-0");
  await act(() => root.render(pill("hi")));
  expect(send.disabled).toBe(false);
});

test("no effort levels yet renders nothing rather than crashing, in every meter", async () => {
  const { host, root } = mount();
  for (const Meter of [EffortCharge, EffortChip, EffortSegments, EffortSlider, EffortTape]) {
    await act(() => root.render(<Meter value="" onChange={() => {}} levels={[]} />));
    expect(host.innerHTML).toBe("");
  }
});

test("a finished run with no time to show says so plainly, never 0s, and seconds read whole", async () => {
  const { host, root } = mount();
  await act(() => root.render(<ThinkingThoughts thoughts="a" done />));
  expect(host.querySelector("button")!.textContent).toBe("Thought");
  await act(() => root.render(<ThinkingPhases phases={["Reading"]} phase={0} done />));
  expect(host.querySelector('[role="status"]')!.textContent).toBe("Done");
  await act(() => root.render(<ThinkingPhases phases={["Reading"]} phase={0} done seconds={3.417} />));
  expect(host.querySelector('[role="status"]')!.textContent).toBe("Done in 3s");
  expect(duration(75.5)).toBe("1m 15s");
});

test("a token meter with no count yet reads nought rather than NaN", async () => {
  const { host, root } = mount();
  await act(() => root.render(<TokenMeter used={undefined} limit={200_000} />));
  expect(host.textContent).toBe("0 / 200K");
  expect(host.querySelector('[role="meter"]')!.getAttribute("aria-valuenow")).toBe("0");
});

test("a two by two grid ripples: its four dots sit level, and none of them reads NaN", async () => {
  const { host, root } = mount();
  await act(() => root.render(<LoaderGrid grid={2} pattern="ripple" />));
  expect(host.innerHTML).not.toContain("NaN");
});

test("sources announce the one being read, or the newest found; an emoji name keeps its whole first letter", async () => {
  const { host, root } = mount();
  const sources = [{ id: "a", title: "🌙 Moon notes" }, { id: "b", title: "Second" }];
  await act(() => root.render(<SourceChips sources={sources} active="a" />));
  expect(host.querySelector("[aria-live]")!.textContent).toBe("Reading 🌙 Moon notes");
  expect(host.querySelector("li")!.textContent).toContain("🌙");
  await act(() => root.render(<SourceChips sources={sources} />));
  expect(host.querySelector("[aria-live]")!.textContent).toBe("Found Second");
});

test("a diff says which lines were added and removed, not only shows it", async () => {
  const { host, root } = mount();
  await act(() => root.render(<CodeDiff file="a.ts" lines={[{ kind: "ctx", text: "" }, { kind: "add", text: "b" }, { kind: "del", text: "c" }]} />));
  expect([...host.querySelectorAll(".lunato-diff-row")].map((row) => row.querySelector(".sr-only")?.textContent)).toEqual([undefined, "added: ", "removed: "]);
});

test("Escape belongs to whoever is nearest: it closes the menu without stopping the answer, and never mid-composition", async () => {
  const { host, root } = mount();
  const stop = vi.fn();
  const models = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
  await act(() => root.render(<AiInput value="" onChange={() => {}} onSubmit={() => {}} busy onStop={stop} models={models} model="a" onModelChange={() => {}} />));
  const chip = host.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
  await act(() => chip.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
  expect(document.activeElement).toBe(chip); // Safari gives a clicked button no focus, and the menu's keys need it
  const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  await act(() => chip.dispatchEvent(esc));
  expect(esc.defaultPrevented).toBe(true); // what a listener on the document reads, where the React root is the document
  expect(stop).not.toHaveBeenCalled();

  const field = host.querySelector("input")!;
  await act(() => field.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, isComposing: true })));
  expect(stop).not.toHaveBeenCalled();
  await act(() => field.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(stop).toHaveBeenCalledTimes(1);
});

test("a code panel follows again once someone scrolls back to the bottom, even to where it last left them", async () => {
  let grow = () => {};
  vi.stubGlobal("ResizeObserver", class { constructor(run: () => void) { grow = run; } observe() {} disconnect() {} });
  const { host, root } = mount();
  await act(() => root.render(<CodeDiff file="a.ts" lines={[{ kind: "add", text: "a" }]} />));
  const box = host.querySelector<HTMLElement>(".overflow-y-auto")!;
  const VIEW = 100;
  let height = 200;
  let top = 0;
  Object.defineProperties(box, {
    clientHeight: { get: () => VIEW },
    scrollHeight: { get: () => height },
    scrollTop: { get: () => top, set: (to: number) => (top = Math.min(to, height - VIEW)) },
  });
  const scrollTo = (to: number) => { box.scrollTop = to; box.dispatchEvent(new Event("scroll")); };
  grow();
  expect(top).toBe(100);
  scrollTo(20);
  height = 250;
  grow();
  expect(top).toBe(20); // scrolled up: left alone
  height = 200;
  scrollTo(100);
  height = 300;
  grow();
  expect(top).toBe(200);
  vi.unstubAllGlobals();
});

test("a pointer press hides the focus ring only while the button holds focus, so a later Tab still shows it", async () => {
  const { host, root } = mount();
  await act(() => root.render(<SendMorph busy={false} onSend={() => {}} onStop={() => {}} />));
  const button = host.querySelector("button")!;
  const pointer = (type: string) => act(() => button.dispatchEvent(new PointerEvent(type, { bubbles: true })));
  await pointer("pointerdown");
  expect(button.dataset.pointer).toBe("");
  await pointer("pointerup"); // no focus came with the press, as in Safari: there will be no blur to end it
  expect(button.dataset.pointer).toBeUndefined();
  button.focus();
  await pointer("pointerdown");
  await pointer("pointerup");
  expect(button.dataset.pointer).toBe("");
});

test("a panel turned off while its field has focus rolls its hints again once it is back", async () => {
  vi.useFakeTimers();
  const { host, root } = mount();
  const pill = (disabled: boolean) => <AiPill value="" onChange={() => {}} onSubmit={() => {}} busy={false} onStop={() => {}} disabled={disabled} hints={["one", "two"]} />;
  await act(() => root.render(pill(false)));
  await act(() => host.querySelector("input")!.focus());
  await act(() => root.render(pill(true)));
  await act(() => root.render(pill(false)));
  await act(() => vi.advanceTimersByTime(3100));
  expect(host.textContent).toContain("two");
  vi.useRealTimers();
});

test("on a touch screen a composer's Enter is a new line and the button sends; stopping leaves the keyboard down", async () => {
  const coarse = (on: boolean) => vi.stubGlobal("matchMedia", (query: string) => ({ matches: on && query === "(pointer: coarse)" }));
  const sent = vi.fn();
  const composer = (busy = false) => <AiInput multiline value="hi" onChange={() => {}} onSubmit={sent} busy={busy} onStop={() => {}} />;

  coarse(true);
  const phone = mount();
  await act(() => phone.root.render(composer()));
  const area = phone.host.querySelector("textarea")!;
  expect(area.getAttribute("enterkeyhint")).toBe("enter");
  await act(() => enter(area));
  expect(sent).not.toHaveBeenCalled();
  await act(() => phone.host.querySelector<HTMLButtonElement>('button[aria-label="Send"]')!.click());
  expect(sent).toHaveBeenCalledTimes(1);
  await act(() => phone.root.render(composer(true)));
  area.blur();
  await act(() => phone.host.querySelector<HTMLButtonElement>('button[aria-label="Stop generating"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
  expect(document.activeElement).not.toBe(area);

  coarse(false);
  const desk = mount();
  await act(() => desk.root.render(composer()));
  expect(desk.host.querySelector("textarea")!.getAttribute("enterkeyhint")).toBe("send");
  await act(() => enter(desk.host.querySelector("textarea")!));
  expect(sent).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
});

test("the model menu slides over to stay on the screen when it opens past an edge", async () => {
  const { host, root } = mount();
  const models = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
  await act(() => root.render(<ModelMenu models={models} value="a" onChange={() => {}} />));
  const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    return (this.getAttribute("role") === "menu" ? { left: -12, right: 208 } : { left: 0, right: 0 }) as DOMRect;
  });
  const screen = vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(320);
  await act(() => host.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!.click());
  expect(host.querySelector<HTMLElement>('[role="menu"]')!.style.transform).toBe("translateX(20px)"); // 12px off, and 8px clear
  rect.mockRestore();
  screen.mockRestore();
});

test("a long press on the charge dial is its own gesture: no context menu cuts it short", async () => {
  const { host, root } = mount();
  await act(() => root.render(<EffortCharge value="low" onChange={() => {}} />));
  const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  await act(() => host.querySelector(".lunato-charge-dial")!.dispatchEvent(menu));
  expect(menu.defaultPrevented).toBe(true);
});

