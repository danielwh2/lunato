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
import { EffortSegments } from "../vault/effort-segments";
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

