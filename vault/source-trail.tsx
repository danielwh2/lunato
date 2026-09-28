"use client";

import { morphChanges } from "lunato";
import type { CSSProperties } from "react";
import { type Source, Mark } from "./sources";
import "lunato/vault.css";

export type { Source } from "./sources";

/**
 * SourceTrail: a research run's status line with its sources in orbit round a small planet, which grows into a count
 * once the run is done. Needs sources from the vault beside it.
 *
 * @example
 * <SourceTrail sources={found}
 *   status={done ? `Read ${found.length} sources` : "Searching the web"}
 *   done={done} />
 *
 * @param sources - Every source found so far, in the order found. The first six orbit; the count takes them all.
 * @param status - The line to show beside the orbit. Change it as the run moves on.
 * @param done - True once the run has finished: the orbit folds into the count.
 * @param speed - How fast the sources orbit: 2 is twice as fast, 0.5 half.
 * @param className - Its colour and type: the status takes the text colour.
 */
export function SourceTrail({
  sources,
  status,
  done = false,
  speed = 1,
  className = "",
}: {
  sources: Source[];
  status: string;
  done?: boolean;
  speed?: number;
  className?: string;
}) {
  const newest = sources[sources.length - 1];
  return (
    <span
      role="status"
      data-done={done || undefined}
      className={`lunato-trail inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-medium text-neutral-500 ${className}`}
      style={{ "--lunato-speed": speed } as CSSProperties}
    >
      <span aria-hidden className="isolate grid h-6 w-12 flex-none place-items-center">
        <span className="lunato-trail-orbit grid place-items-center [grid-area:1/1]">
          <span className="lunato-trail-ring [grid-area:1/1]" />
          {sources.slice(0, SLOTS).map((s, i) => (
            <span
              key={s.id}
              className="lunato-trail-in [grid-area:1/1]"
              style={{ "--p": i } as CSSProperties}
            >
              <span className="lunato-trail-x grid">
                <span className="lunato-trail-y grid">
                  <span className="lunato-trail-moon grid size-3 place-items-center overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]">
                    <Mark source={s} look="moon" />
                  </span>
                </span>
              </span>
            </span>
          ))}
        </span>
        <span className="lunato-trail-core [grid-area:1/1]">
          <span ref={morphChanges}>{sources.length}</span>
        </span>
      </span>
      <span ref={morphChanges} data-lunato="roll">{status}</span>
      <span className="sr-only">{newest && !done ? `Found ${newest.title}` : ""}</span>
    </span>
  );
}

const SLOTS = 6;
