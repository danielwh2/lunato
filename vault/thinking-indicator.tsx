"use client";

import { morphChanges } from "lunato";
import type { ReactNode } from "react";
import { LoaderPlanet } from "./loader-planet";
import { Check, Cross } from "./thinking";
import "lunato/vault.css";

/**
 * ThinkingIndicator: what a model is doing right now, on one line it keeps rewriting beside a loader that gives way to
 * a done mark. Needs LoaderPlanet and thinking from the vault beside it.
 *
 * @example
 * <ThinkingIndicator status={done ? "Thought for 8s" : step} done={done}
 *   loader={<LoaderOrbit speed={1.4} />} />
 *
 * @param status - The line to show. Change it as the model moves on.
 * @param done - True once the model has finished.
 * @param stopped - True once the run ended without finishing, stopped or failed. Say what happened through status.
 * @param loader - What runs while it works. The vault's loaders take `size`, `speed` and a text colour.
 * @param doneMark - What shows once it is done. A check by default.
 * @param className - Its colour and type: the status takes the text colour, the marks keep their own.
 */
export function ThinkingIndicator({
  status,
  done = false,
  stopped = false,
  loader = <LoaderPlanet />,
  doneMark = <Check />,
  className = "",
}: {
  status: string;
  done?: boolean;
  stopped?: boolean;
  loader?: ReactNode;
  doneMark?: ReactNode;
  className?: string;
}) {
  return (
    <span
      role="status"
      data-done={done || stopped || undefined}
      className={`lunato-thinking inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-neutral-500 ${className}`}
    >
      <span
        aria-hidden
        className={`grid place-items-center transition-colors duration-150 ${stopped ? "text-neutral-400" : done ? "text-green-700" : "text-neutral-900"}`}
      >
        <span className="lunato-thinking-loader grid">{loader}</span>
        <span className="lunato-thinking-done grid">{stopped ? <Cross /> : doneMark}</span>
      </span>
      <span ref={morphChanges} data-lunato="roll">{status}</span>
    </span>
  );
}
