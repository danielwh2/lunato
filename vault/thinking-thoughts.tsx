"use client";

import { morphChanges } from "lunato";
import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { LoaderPlanet } from "./loader-planet";
import { Check, Cross, duration, useSeconds } from "./thinking";
import "lunato/vault.css";

/**
 * ThinkingThoughts: a model's thinking, folded into one line that counts the seconds and opens to show the reasoning.
 * Needs LoaderPlanet and thinking from the vault beside it.
 *
 * @example
 * <ThinkingThoughts thoughts={reasoning} done={status !== "reasoning"} />
 *
 * @param thoughts - The reasoning so far. Pass the whole text each time, not the latest chunk.
 * @param done - True once the model has finished thinking.
 * @param stopped - True once the thinking ended without finishing, stopped or failed.
 * @param seconds - How long it thought, if you know it. Left out, it counts from when thinking started.
 * @param defaultOpen - Whether the reasoning starts unfolded.
 * @param loader - What runs while it thinks. The vault's loaders take `size`, `speed` and a text colour.
 */
export function ThinkingThoughts({
  thoughts,
  done = false,
  stopped = false,
  seconds,
  defaultOpen = false,
  loader = <LoaderPlanet />,
  className = "",
}: {
  thoughts: string;
  done?: boolean;
  stopped?: boolean;
  seconds?: number;
  defaultOpen?: boolean;
  loader?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const over = done || stopped;
  const counted = useSeconds(over);
  const elapsed = seconds ?? counted;
  const time = duration(elapsed);
  const label = done
    ? `Thought for ${time}`
    : stopped
      ? `Stopped after ${time}`
      : elapsed < 1
        ? "Thinking"
        : `Thinking for ${time}`;
  const panel = useId();
  const body = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  useLayoutEffect(() => {
    const el = body.current;
    if (el && following.current) el.scrollTop = el.scrollHeight;
  }, [thoughts, open]);
  return (
    <div data-open={open || undefined} className={`lunato-thoughts grid text-[12px] ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        data-done={over || undefined}
        onClick={() => setOpen((o) => !o)}
        className="lunato-thinking group inline-flex w-fit cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border-0 bg-transparent p-0 font-medium text-neutral-500 transition-colors duration-150 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
      >
        <span
          aria-hidden
          className={`grid place-items-center transition-colors duration-150 ${done ? "text-green-700" : stopped ? "text-neutral-400" : "text-neutral-900"}`}
        >
          <span className="lunato-thinking-loader grid">{loader}</span>
          <span className="lunato-thinking-done grid">
            {done || !stopped ? <Check /> : <Cross />}
          </span>
        </span>
        <span ref={morphChanges}>{label}</span>
        <svg
          aria-hidden
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lunato-thoughts-chevron"
        >
          <path d="M4.75 3 7.75 6 4.75 9" />
        </svg>
      </button>
      <span role="status" className="sr-only">
        {over ? label : ""}
      </span>
      <div id={panel} className="lunato-thoughts-fold">
        <div className="min-h-0 overflow-hidden">
          <div
            ref={body}
            onScroll={(e) => {
              const el = e.currentTarget;
              following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
              el.toggleAttribute("data-scrolled", el.scrollTop > 0);
            }}
            className="lunato-thoughts-body ml-[7.5px] mt-1.5 max-h-[120px] overflow-y-auto border-l border-neutral-200 pl-3 leading-relaxed text-neutral-500"
          >
            <p className="m-0 whitespace-pre-wrap">{thoughts}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
