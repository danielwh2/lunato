"use client";

import { morphChanges } from "lunato";
import { useEffect, useRef } from "react";
import { type SendProps, press } from "./send";

/**
 * SendLabel: a send button that says what it does, with its key beside it; while the model answers it reads Stop
 * with Esc, and Esc stops it from anywhere on the page. Sending on the key is left to your input. Sized by a panel's
 * --lunato-size, --lunato-radius and --lunato-corner.
 *
 * @example
 * <SendLabel busy={status === "streaming"} disabled={!input} onSend={send}
 *   onStop={stop} />
 *
 * @param busy - True while the model is answering: the button, and Esc, stop it.
 * @param disabled - True when there is nothing to send. Ignored while busy, so stop always works.
 * @param onSend - Called on a press while idle.
 * @param onStop - Called on a press, or on Esc, while busy.
 * @param keys - The key that sends, as your input has it: "Enter" by default, or "⌘ Enter".
 */
export function SendLabel({
  busy,
  disabled = false,
  onSend,
  onStop,
  keys = "Enter",
  className = "",
}: SendProps & { keys?: string }) {
  const stop = useRef(onStop);
  useEffect(() => {
    stop.current = onStop;
  });
  useEffect(() => {
    if (!busy) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && stop.current();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [busy]);
  return (
    <button
      type="button"
      disabled={!busy && disabled}
      {...press(busy, onSend, onStop)}
      className={`inline-flex h-[var(--lunato-size,28px)] flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--lunato-radius,12px)] border-0 bg-neutral-900 pl-2.5 pr-1 text-[12px] font-medium leading-none text-white transition-[scale,opacity] duration-150 [corner-shape:var(--lunato-corner,squircle)] active:scale-[0.96] disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 data-pointer:focus-visible:outline-none motion-reduce:transition-none ${className}`}
    >
      <span ref={morphChanges}>{busy ? "Stop" : "Send"}</span>
      <kbd
        ref={morphChanges}
        aria-hidden
        className="grid h-[calc(var(--lunato-size,28px)-8px)] min-w-5 place-items-center rounded-[calc(var(--lunato-radius,12px)-4px)] bg-white/15 px-1 [font-family:inherit] text-[11px] font-medium text-white/75 [corner-shape:var(--lunato-corner,squircle)]"
      >
        {busy ? "Esc" : keys}
      </kbd>
    </button>
  );
}
