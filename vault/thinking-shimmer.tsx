"use client";

import { useEffect, useRef, useState } from "react";
import "lunato/vault.css";

/**
 * ThinkingShimmer: the status alone, in muted text with a band of ink gliding across it while the model works.
 *
 * @example
 * <ThinkingShimmer status={done ? "Thought for 8s" : step} done={done} />
 *
 * @param status - The line to show. Change it as the model moves on.
 * @param done - True once the model has finished: the line stops shimmering.
 */
export function ThinkingShimmer({
  status,
  done = false,
  className = "",
}: {
  status: string;
  done?: boolean;
  className?: string;
}) {
  const lines = useSwap(status);
  return (
    <span
      role="status"
      className={`inline-grid overflow-hidden whitespace-nowrap text-[12px] font-medium text-neutral-500 ${className}`}
    >
      {lines.map((line) => (
        <span
          key={line.key}
          aria-hidden={line.leaving || undefined}
          data-leaving={line.leaving || undefined}
          className="lunato-shimmer-line [grid-area:1/1]"
        >
          <span
            className={done ? "" : "lunato-shimmer"}
            style={{ animationDelay: `${-(line.born % SHIMMER_MS)}ms` }}
          >
            {line.text}
          </span>
        </span>
      ))}
    </span>
  );
}

const SHIMMER_MS = 2000;
const SWAP_MS = 260;

function useSwap(text: string) {
  const [lines, setLines] = useState([{ text, key: 0, born: 0, leaving: false }]);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current ??= performance.now();
    const born = performance.now() - start.current;
    setLines((all) => {
      const last = all[all.length - 1];
      return last.text === text
        ? all
        : [
            { ...last, leaving: true },
            { text, key: last.key + 1, born, leaving: false },
          ];
    });
    const settled = setTimeout(
      () => setLines((all) => all.filter((line) => !line.leaving)),
      SWAP_MS,
    );
    return () => clearTimeout(settled);
  }, [text]);
  return lines;
}
