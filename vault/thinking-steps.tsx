"use client";

import { morphChanges } from "lunato";
import type { ReactNode } from "react";
import { Check, Cross } from "./thinking";
import "lunato/vault.css";

/**
 * ThinkingSteps: what an agent has done so far, as a short timeline that unfolds a step at a time. Needs thinking from
 * the vault beside it.
 *
 * @example
 * <ThinkingSteps steps={["Searching the web", "Reading 4 sources"]}
 *   done={status === "done"} loader={<LoaderOrbit size={12} />} />
 *
 * @param steps - Every step so far, oldest first. The last one is running until done.
 * @param done - True once the agent has finished: the last step gets its check too.
 * @param stopped - True once the run ended without finishing, stopped or failed: the last step gets a cross.
 * @param loader - What the running step shows, at 12px. Pulsing dots by default; any loader from the vault fits.
 * @param doneMark - What a finished step shows. A check by default.
 */
export function ThinkingSteps({
  steps,
  done = false,
  stopped = false,
  loader = <Dots />,
  doneMark = <Check />,
  className = "",
}: {
  steps: string[];
  done?: boolean;
  stopped?: boolean;
  loader?: ReactNode;
  doneMark?: ReactNode;
  className?: string;
}) {
  return (
    <ol
      aria-live="polite"
      className={`m-0 grid list-none p-0 text-[12px] font-medium leading-5 ${className}`}
    >
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const running = !done && !stopped && last;
        return (
          <li key={i} data-running={running || undefined} className="lunato-step">
            <div className={`lunato-step-row flex items-center gap-2 ${i ? "pt-1" : ""}`}>
              <span
                aria-hidden
                className={`lunato-step-icon grid flex-none place-items-center transition-colors duration-150 ${running ? "text-neutral-900" : "text-neutral-400"}`}
              >
                <span className="lunato-step-loader grid">{loader}</span>
                <span className="lunato-step-done grid">
                  {stopped && !done && last ? <Cross /> : doneMark}
                </span>
              </span>
              <span
                ref={morphChanges}
                className={`transition-colors duration-150 ${running ? "text-neutral-900" : "text-neutral-500"}`}
              >
                {step}
              </span>
              {last && (done || stopped) && (
                <span className="sr-only">{done ? ", done" : ", stopped"}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const icon = {
  width: 12,
  height: 12,
  viewBox: "0 0 14 14",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const Dots = () => (
  <svg className="lunato-dots" {...icon}>
    <line x1="3" y1="7.5" x2="3" y2="7.5" />
    <line x1="7" y1="7.5" x2="7" y2="7.5" />
    <line x1="11" y1="7.5" x2="11" y2="7.5" />
  </svg>
);
