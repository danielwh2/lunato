"use client";

import { morphChanges } from "lunato";
import { duration, useSeconds } from "./thinking";
import "lunato/vault.css";

/**
 * ThinkingPhases: a model's run as named phases on a short segmented bar, with the phase's name and the seconds so far
 * beside it. Needs thinking from the vault beside it.
 *
 * @example
 * <ThinkingPhases phases={["Reading", "Planning", "Writing"]} phase={step} done={finished} />
 *
 * @param phases - The phases' names, in order.
 * @param phase - The index of the phase under way.
 * @param done - True once the run has finished.
 * @param stopped - True once the run ended without finishing, stopped or failed.
 * @param seconds - How long it has run, if you know it. Left out, it counts from when the run started.
 */
export function ThinkingPhases({
  phases,
  phase,
  done = false,
  stopped = false,
  seconds,
  className = "",
}: {
  phases: string[];
  phase: number;
  done?: boolean;
  stopped?: boolean;
  seconds?: number;
  className?: string;
}) {
  const counted = useSeconds(done || stopped);
  const time = duration(seconds ?? counted);
  const now = done ? phases.length : Math.max(0, Math.min(phases.length - 1, phase));
  return (
    <span
      className={`lunato-phases inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-medium ${className}`}
    >
      <span aria-hidden className="flex gap-[3px]">
        {phases.map((_, i) => (
          <span
            key={i}
            data-state={i < now ? "done" : i === now ? (stopped ? "stopped" : "now") : undefined}
            className="lunato-phase"
          >
            <i />
          </span>
        ))}
      </span>
      <span aria-hidden ref={morphChanges} data-lunato="roll" className="text-neutral-900">
        {done ? "Done in" : stopped ? "Stopped after" : phases[now]}
      </span>
      <span aria-hidden ref={morphChanges} className="-ml-1 tabular-nums text-neutral-400">
        {time}
      </span>
      <span role="status" className="sr-only">
        {done ? `Done in ${time}` : stopped ? `Stopped after ${time}` : phases[now]}
      </span>
    </span>
  );
}
