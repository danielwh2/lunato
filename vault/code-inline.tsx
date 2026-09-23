"use client";

import { morphChanges } from "lunato";
import { type CSSProperties, useRef } from "react";
import "lunato/vault.css";

/**
 * CodeInline: a few lines of code an agent rewrites in place, each line morphing so only the characters it changed move.
 *
 * @example
 * <CodeInline lines={code.split("\n")} active={editingLine} />
 *
 * @param lines - The code, one string per line. Change a line's text and it morphs to the new one.
 * @param active - The index of the line being changed now: the gutter bar sits beside it. -1, or left out, hides it.
 */
export function CodeInline({
  lines,
  active = -1,
  className = "",
}: {
  lines: string[];
  active?: number;
  className?: string;
}) {
  const first = useRef(lines);
  return (
    <div
      className={`w-full rounded-[12px] border border-neutral-200 bg-white p-[3px] font-mono text-[11px] leading-5 [corner-shape:squircle] ${className}`}
    >
      <div className="relative py-0.5">
        <span
          aria-hidden
          className={`absolute left-1 top-0 h-3.5 w-0.5 rounded-full bg-neutral-900 transition-[translate,opacity] duration-220 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${active < 0 ? "opacity-0" : ""}`}
          style={
            {
              translate: `0 ${ROW_INSET + Math.max(active, 0) * ROW + (ROW - BAR) / 2}px`,
            } as CSSProperties
          }
        />
        {lines.map((line, i) => (
          <div
            key={i}
            data-new={i >= first.current.length || undefined}
            className="lunato-inline-row"
          >
            <div className="relative flex gap-2.5 pl-3 pr-2">
              <span
                key={line}
                aria-hidden
                data-initial={first.current[i] === line || undefined}
                className="lunato-inline-flash"
              />
              <span
                aria-hidden
                className={`relative w-[2ch] flex-none select-none text-right tabular-nums transition-colors duration-150 ${i === active ? "text-neutral-900" : "text-neutral-400"}`}
              >
                {i + 1}
              </span>
              <span
                ref={morphChanges}
                className="relative min-w-0 overflow-hidden whitespace-pre text-neutral-800"
              >
                {line}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROW = 20;
const BAR = 14;
const ROW_INSET = 2;
