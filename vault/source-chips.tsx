"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { type Source, Mark, domain } from "./sources";
import "lunato/vault.css";

export type { Source } from "./sources";

/**
 * SourceChips: where a research run is reading from, as a wrapping row of small badges, each an icon and a short
 * domain. Needs sources from the vault beside it.
 *
 * @example
 * <SourceChips sources={found} active={reading?.id}
 *   onSelect={(source) => openPreview(source)} />
 *
 * @param sources - Every source found so far, in the order found.
 * @param active - The id of the source being read now, if any.
 * @param onSelect - Called with the source a badge stands for. Makes every badge a button; without it, one with a url is a link.
 * @param className - Placement for the whole row.
 */
export function SourceChips({
  sources,
  active,
  onSelect,
  className = "",
}: {
  sources: Source[];
  active?: string;
  onSelect?: (source: Source) => void;
  className?: string;
}) {
  const seen = useRef(0);
  const from = seen.current;
  useEffect(() => {
    seen.current = sources.length;
  });
  const newest = sources[sources.length - 1];
  return (
    <div className={className}>
      <ul aria-label="Sources" className="m-0 flex list-none flex-wrap gap-1 p-0">
        {sources.map((s, i) => {
          const on = s.id === active;
          const body = (
            <>
              <span className="grid size-3 flex-none place-items-center overflow-hidden rounded-full">
                <Mark source={s} look="chip" />
              </span>
              <span className="max-w-[16ch] truncate">{domain(s)}</span>
            </>
          );
          const chip = `inline-flex h-[22px] items-center gap-1 rounded-[6px] px-1.5 text-[11px] font-medium no-underline shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] outline-none transition-colors duration-150 [corner-shape:squircle] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 ${on ? "bg-neutral-100 text-neutral-900" : "bg-white text-neutral-500"}`;
          return (
            <li
              key={s.id}
              className="lunato-badge-in"
              style={{ "--i": Math.max(0, i - from) } as CSSProperties}
            >
              {onSelect ? (
                <button
                  type="button"
                  data-active={on || undefined}
                  title={s.title}
                  onClick={() => onSelect(s)}
                  className={`${chip} cursor-pointer border-0 hover:text-neutral-900`}
                >
                  {body}
                </button>
              ) : s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  data-active={on || undefined}
                  title={s.title}
                  className={`${chip} hover:text-neutral-900`}
                >
                  {body}
                </a>
              ) : (
                <span data-active={on || undefined} title={s.title} className={chip}>
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <span className="sr-only" aria-live="polite">
        {newest ? `Reading ${newest.title}` : ""}
      </span>
    </div>
  );
}
