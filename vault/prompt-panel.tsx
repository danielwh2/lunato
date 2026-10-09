"use client";

import { morphChanges } from "lunato";
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Attachment } from "./attachments";
import "lunato/vault.css";

/**
 * prompt-panel: what the prompt panels share.
 *
 * The field's actions and count, the rolling hint, the size and shape variables, and the note on a failed send.
 */

export type PanelSize = "sm" | "md" | "lg";
export type PanelShape = "rounded" | "pill";

/**
 * What AiInput, AiComposer and AiPill share behind their field: whether there is something to send, the count left
 * under maxLength, and the actions. Each action puts the caret back in the field: a press on a button would otherwise
 * leave focus on it, and a send button that disables once the answer ends would drop it on the page.
 *
 * @example
 * const panel = usePromptPanel<HTMLInputElement>({ value, busy, disabled, maxLength, attachments, onSubmit, onStop, onRetry });
 * <form {...panel.form}> <input ref={panel.field} onKeyDown={sendOnEnter(panel.submit)} /> </form>
 */
export function usePromptPanel<Field extends HTMLInputElement | HTMLTextAreaElement>({
  value,
  busy,
  disabled,
  maxLength,
  attachments = NO_FILES,
  onSubmit,
  onStop,
  onRetry,
}: {
  value: string;
  busy: boolean;
  disabled: boolean;
  maxLength?: number;
  attachments?: Attachment[];
  onSubmit: () => void;
  onStop: () => void;
  onRetry?: () => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const field = useRef<Field>(null) as RefObject<Field | null>;
  const counter = useId();
  const left = maxLength === undefined ? 0 : maxLength - value.length;
  const near = maxLength !== undefined && left <= maxLength / 10;
  const ready =
    (value.trim() !== "" || attachments.length > 0) &&
    left >= 0 &&
    !attachments.some((a) => a.uploading || a.error);
  const focus = () => field.current?.focus();
  const submit = () => {
    if (!ready || busy || disabled) return;
    onSubmit();
    focus();
  };
  const refocus = () => matchMedia("(pointer: coarse)").matches || focus();
  const stop = () => {
    onStop();
    refocus();
  };
  const retry =
    onRetry &&
    (() => {
      onRetry();
      refocus();
    });
  useLayoutEffect(() => {
    const at = document.activeElement;
    if (!busy && at instanceof HTMLButtonElement && at.disabled && form.current?.contains(at))
      focus();
  }, [busy]);
  return {
    field,
    counter,
    left,
    near,
    ready,
    submit,
    stop,
    retry,
    form: {
      ref: form,
      onSubmit: (e: FormEvent) => {
        e.preventDefault();
        submit();
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key !== "Escape" || !busy || e.nativeEvent.isComposing) return;
        e.preventDefault();
        stop();
      },
      onMouseDown: (e: MouseEvent) => {
        if ((e.target as Element).closest(CONTROLS)) return;
        e.preventDefault();
        focus();
      },
    },
  };
}

const NO_FILES: Attachment[] = [];
const CONTROLS =
  "button, input, textarea, select, label, a, [tabindex], [contenteditable], [role=menu], [role=alert]";

/**
 * Enter on a one-line field sends. Never while an IME is still choosing, and never Safari's Enter confirming one
 * (keyCode 229), which is why the field sends rather than leaving it to the form.
 */
export const sendOnEnter = (submit: () => void) => (e: KeyboardEvent) => {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  if (e.keyCode !== 229) submit();
};

/**
 * The hint a panel shows in place of its placeholder. It rolls through the hints every 3s while the field sits empty
 * and unfocused, reads "Answering" while the model works, and falls back to the placeholder while the panel is off.
 *
 * @param resting - True while the field is empty and unfocused, the only time the hints roll.
 */
export function usePromptHint({
  placeholder,
  hints,
  busy,
  disabled,
  resting,
}: {
  placeholder: string;
  hints?: string[];
  busy: boolean;
  disabled: boolean;
  resting: boolean;
}) {
  const [at, setAt] = useState(0);
  const count = hints?.length ?? 0;
  const turning = count > 1 && resting && !busy && !disabled;
  useEffect(() => {
    if (!turning) return;
    const id = setInterval(() => document.hidden || setAt((i) => i + 1), HINT_MS);
    return () => clearInterval(id);
  }, [turning]);
  return disabled ? placeholder : busy ? "Answering" : count ? hints![at % count] : placeholder;
}

/**
 * The hint drawn over the field so it can roll, fading under a blur as the first letter lands. The real placeholder
 * stays on the field, transparent, for screen readers.
 */
export function PromptHint({
  hint,
  hidden,
  className = "",
  style,
}: {
  hint: string;
  hidden: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      ref={morphChanges} data-lunato="roll"
      aria-hidden
      style={style}
      className={`pointer-events-none absolute overflow-x-clip whitespace-nowrap text-base text-neutral-400 transition-[opacity,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${hidden ? "opacity-0 blur-[2px]" : ""} ${className}`}
    >
      {hint}
    </span>
  );
}

/** What is left under maxLength, its digits rolling, fading in near the limit and turning red over it. */
export function PromptCount({
  id,
  left,
  near,
  className = "",
}: {
  id: string;
  left: number;
  near: boolean;
  className?: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className={`text-[11px] font-medium tabular-nums transition-[opacity,color] duration-150 motion-reduce:transition-none ${near ? "" : "opacity-0"} ${left < 0 ? "text-red-600" : "text-neutral-400"} ${className}`}
      >
        <span ref={morphChanges}>{left}</span>
      </span>
      <span id={id} className="sr-only">
        {left < 0 ? `${-left} characters over the limit` : `${left} characters left`}
      </span>
    </>
  );
}

/**
 * The custom properties a panel sets for its size and shape. The controls inside read --lunato-size, --lunato-radius
 * and --lunato-corner, so one prop resizes and reshapes them all; outside a panel they fall back to 28px squircles.
 * The panel's own corner is its controls' plus its padding and 1px border, so the two run concentric.
 */
export function panelLook(size: PanelSize = "md", shape: PanelShape = "rounded") {
  const { control, radius, pad, text } = SIZES[size];
  const round = shape === "pill";
  const style = {
    "--lunato-size": `${control}px`,
    "--lunato-radius": round ? "9999px" : `${radius}px`,
    "--lunato-corner": round ? "round" : "squircle",
    "--lunato-panel-pad": `${pad}px`,
    "--lunato-panel-radius": `${(round ? control / 2 : radius) + pad + 1}px`,
  } as CSSProperties;
  return { style, text };
}

/**
 * PromptError: why the last message did not go, in a note just above a prompt panel so nothing inside it moves, with
 * a Retry when there is onRetry. Mounted anew each time it appears, so the alert is read out even when the same error
 * comes back.
 *
 * @param error - What went wrong, in a few words.
 * @param onRetry - Called on Retry. Leave it out and there is none.
 */
export function PromptError({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={`lunato-prompt-error absolute bottom-full left-0 mb-2 flex max-w-full items-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white py-1 pl-1.5 text-[12px] font-medium leading-4 text-neutral-900 shadow-[0_6px_16px_-10px_rgb(0_0_0/0.25)] [corner-shape:squircle] ${onRetry ? "pr-1" : "pr-2"}`}
    >
      <svg
        aria-hidden
        width="14"
        height="14"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none text-red-600"
      >
        <path d="M9 16.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5Z" />
        <path d="M9 5.431V9.5" />
        <circle cx="9" cy="12.417" r="1" fill="currentColor" stroke="none" />
      </svg>
      <span className="min-w-0">{error}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-5 flex-none cursor-pointer rounded-[6px] border-0 bg-neutral-100 px-1.5 text-[11px] font-medium text-neutral-900 transition-[background-color,scale] duration-150 [corner-shape:squircle] hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 active:scale-[0.96]"
        >
          Retry
        </button>
      )}
    </div>
  );
}

const SIZES = {
  sm: { control: 24, radius: 10, pad: 3, text: "sm:[@media(pointer:fine)]:text-[12px]" },
  md: { control: 28, radius: 12, pad: 3, text: "sm:[@media(pointer:fine)]:text-[13px]" },
  lg: { control: 32, radius: 14, pad: 4, text: "sm:[@media(pointer:fine)]:text-[14px]" },
} as const;
const HINT_MS = 3000;
