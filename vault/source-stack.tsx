"use client";

import { morphChanges } from "lunato";
import type { CSSProperties } from "react";
import { type Source, Mark } from "./sources";
import "lunato/vault.css";

export type { Source } from "./sources";

/**
 * SourceStack: where a research run is reading from, as a stack of small overlapping circles with a status beside it.
 * Needs sources from the vault beside it.
 *
 * @example
 * <SourceStack sources={found} status={`Reading ${found.length} sources`} />
 *
 * @param sources - Every source found so far, in the order found. The stack shows the first `max`.
 * @param max - How many circles show before the rest become a count.
 * @param status - A line beside the stack, such as "Reading 9 sources". It morphs as it changes.
 * @param className - Placement and type for the whole row.
 */
export function SourceStack({
  sources,
  max = 4,
  status,
  className = "",
}: {
  sources: Source[];
  max?: number;
  status?: string;
  className?: string;
}) {
  const shown = sources.slice(0, max);
  const extra = sources.length - shown.length;
  const newest = sources[sources.length - 1];
  return (
    <div className={`lunato-stack inline-flex items-center gap-2 ${className}`}>
      <ul aria-label="Sources" className="m-0 flex list-none items-center p-0">
        {shown.map((s, i) => (
          <li
            key={s.id}
            className="lunato-stack-item relative"
            style={{ "--z": shown.length - i } as CSSProperties}
          >
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                aria-label={s.title}
                className={CIRCLE}
              >
                <Mark source={s} look="stack" />
              </a>
            ) : (
              <span tabIndex={0} role="img" aria-label={s.title} className={CIRCLE}>
                <Mark source={s} look="stack" />
              </span>
            )}
            <span aria-hidden className="lunato-stack-tip">
              {s.title}
            </span>
          </li>
        ))}
        {extra > 0 && (
          <li className="lunato-stack-item" style={{ "--z": 0 } as CSSProperties}>
            <span
              aria-label={`${extra} more`}
              className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-neutral-100 px-1 text-[10px] font-semibold leading-none tabular-nums text-neutral-600 shadow-[0_0_0_1.5px_#fff]"
            >
              <span ref={morphChanges}>{`+${extra}`}</span>
            </span>
          </li>
        )}
      </ul>
      {status !== undefined && (
        <span
          ref={morphChanges} data-lunato="roll"
          className="whitespace-nowrap text-[12px] font-medium text-neutral-500"
        >
          {status}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {newest ? `Found ${newest.title}` : ""}
      </span>
    </div>
  );
}

const CIRCLE =
  "grid size-[18px] place-items-center overflow-hidden rounded-full bg-white shadow-[0_0_0_1.5px_#fff,inset_0_0_0_1px_rgb(0_0_0/0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400";
