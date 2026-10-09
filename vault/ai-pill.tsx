"use client";

import { morphChanges } from "lunato";
import { type ReactNode, type Ref, useImperativeHandle, useState } from "react";
import {
  type PanelSize,
  PromptCount,
  PromptError,
  PromptHint,
  panelLook,
  sendOnEnter,
  usePromptHint,
  usePromptPanel,
} from "./prompt-panel";
import { Arrow, Stop, press } from "./send";

/**
 * AiPill: the quietest prompt row, a single pill with its send button at the end. Needs prompt-panel and send from
 * the vault beside it.
 *
 * @example
 * <AiPill value={input} onChange={setInput} onSubmit={send}
 *   busy={status === "streaming"} onStop={stop}
 *   hints={["Ask anything", "Plan a trip to Lisbon", "Summarise this"]} />
 *
 * @param value - What is typed. Controlled: pass it back through onChange.
 * @param onSubmit - Called on Enter or the send button while there is something to send.
 * @param busy - True while the model is answering: the button or Escape stops it.
 * @param onStop - Called on the button or Escape while busy.
 * @param error - Why the last message did not go, shown in a note above the pill until you clear it.
 * @param onRetry - Called on the note's Retry.
 * @param hints - Hints to roll through every 3s while the pill is empty, unfocused and idle, in the placeholder's place.
 * @param size - "sm", "md" (the default) or "lg": the pill, its text and its button scale together.
 * @param disabled - Switches the whole pill off. Say why through placeholder.
 * @param maxLength - The most a message may hold. Near it, what is left shows at the field's end; over it, nothing sends.
 * @param leading - Anything to sit before the field. Round it to match the pill.
 * @param trailing - Anything to sit just before the send button.
 * @param ref - The text field, to focus it from outside.
 */
export function AiPill({
  value,
  onChange,
  onSubmit,
  busy,
  onStop,
  error,
  onRetry,
  placeholder = "Send a message",
  hints,
  size,
  disabled = false,
  maxLength,
  leading,
  trailing,
  ref,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onStop: () => void;
  error?: string;
  onRetry?: () => void;
  placeholder?: string;
  hints?: string[];
  size?: PanelSize;
  disabled?: boolean;
  maxLength?: number;
  leading?: ReactNode;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}) {
  const panel = usePromptPanel<HTMLInputElement>({
    value,
    busy,
    disabled,
    maxLength,
    onSubmit,
    onStop,
    onRetry,
  });
  useImperativeHandle(ref, () => panel.field.current!, [panel.field]);
  const [focused, setFocused] = useState(false);
  if (disabled && focused) setFocused(false);
  const hint = usePromptHint({ placeholder, hints, busy, disabled, resting: !value && !focused });
  const look = panelLook(size, "pill");
  return (
    <form
      {...panel.form}
      inert={disabled}
      style={look.style}
      className={`relative flex w-full items-center rounded-full border border-neutral-200 bg-white p-[var(--lunato-panel-pad)] shadow-[0_14px_34px_-22px_rgb(0_0_0/0.3)] transition-[border-color,opacity] duration-150 hover:border-neutral-300 focus-within:border-neutral-300 ${leading ? "" : "pl-3.5"} ${disabled ? "opacity-60" : ""} ${className}`}
    >
      <PromptError error={error} onRetry={panel.retry} />
      {leading}
      <span
        className={`relative flex h-full min-w-0 flex-1 items-center ${leading ? "ml-1.5" : ""}`}
      >
        <PromptHint hint={hint} hidden={!!value} className={`left-0 right-0 ${look.text}`} />
        <input
          ref={panel.field}
          aria-label="Message"
          aria-describedby={panel.near ? panel.counter : undefined}
          autoComplete="off"
          enterKeyHint="send"
          value={value}
          placeholder={hint}
          maxLength={maxLength}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={sendOnEnter(panel.submit)}
          className={`h-[var(--lunato-size)] w-full min-w-0 border-0 bg-transparent p-0 text-base text-neutral-900 outline-none placeholder:text-transparent ${look.text} ${panel.near ? "pr-10" : ""}`}
        />
        {maxLength !== undefined && (
          <PromptCount
            id={panel.counter}
            left={panel.left}
            near={panel.near}
            className="pointer-events-none absolute right-1"
          />
        )}
      </span>
      {trailing}
      <button
        type="button"
        disabled={!busy && !panel.ready}
        aria-label={busy ? "Stop generating" : "Send"}
        {...press(busy, panel.submit, panel.stop)}
        className="ml-1.5 grid size-[var(--lunato-size)] flex-none cursor-pointer place-items-center rounded-full border-0 bg-neutral-900 text-white transition-[opacity,scale] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 disabled:cursor-default disabled:opacity-30 data-pointer:focus-visible:outline-none active:scale-[0.96] motion-reduce:transition-none"
      >
        <span ref={morphChanges} className="grid">
          {busy ? <Stop /> : <Arrow />}
        </span>
      </button>
    </form>
  );
}
