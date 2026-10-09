"use client";

import { morphChanges } from "lunato";
import { useFollow } from "./scroll-follow";
import "lunato/vault.css";

export type DiffLine = { kind: "add" | "del" | "ctx"; text: string; id?: string };

/**
 * CodeDiff: one file as an agent edits it, as a compact unified diff that follows the newest line down. Needs
 * scroll-follow from the vault beside it.
 *
 * @example
 * <CodeDiff file="src/lib/price.ts" streaming={busy} lines={[
 *   { kind: "del", text: "const total = price * qty;" },
 *   { kind: "add", text: "const total = price * qty * (1 + tax);" },
 * ]} />
 *
 * @param file - The file's path: the directory is set dim, the name in ink.
 * @param lines - The diff so far, top to bottom. Pass `id` if lines are inserted above ones already written.
 * @param streaming - True while the agent is still writing: the caret shows and the counts are not yet announced.
 */
export function CodeDiff({
  file,
  lines,
  streaming = false,
  className = "",
}: {
  file: string;
  lines: DiffLine[];
  streaming?: boolean;
  className?: string;
}) {
  const [box, content] = useFollow();
  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;
  const cut = file.lastIndexOf("/") + 1;
  const place = { old: 0, add: 0 };
  return (
    <div
      className={`w-full overflow-hidden rounded-[12px] border border-neutral-200 bg-white font-mono text-[11px] leading-[18px] [corner-shape:squircle] ${className}`}
    >
      <div className="flex h-7 items-center gap-2 border-b border-neutral-200 px-2.5">
        <span className="min-w-0 truncate">
          <span className="text-neutral-400">{file.slice(0, cut)}</span>
          <span className="text-neutral-900">{file.slice(cut)}</span>
        </span>
        <span aria-hidden className="ml-auto flex flex-none gap-1.5 tabular-nums">
          <span ref={morphChanges} className="text-green-700">{`+${added}`}</span>
          <span ref={morphChanges} className="text-red-600">{`−${removed}`}</span>
        </span>
        <span className="sr-only" aria-live="polite">
          {streaming ? "" : `${added} lines added, ${removed} removed`}
        </span>
      </div>
      <div ref={box} className="max-h-[140px] overflow-y-auto overflow-x-hidden">
        <div ref={content} className="py-1">
          {lines.map((line, i) => {
            const key =
              line.id ?? (line.kind === "add" ? `add${place.add++}` : `old${place.old++}`);
            return (
              <div key={key} data-kind={line.kind} className="lunato-diff-line">
                <div className="lunato-diff-row">
                  <span aria-hidden className="select-none text-center">
                    {SIGN[line.kind]}
                  </span>
                  {line.kind !== "ctx" && (
                    <span className="sr-only">{line.kind === "add" ? "added: " : "removed: "}</span>
                  )}
                  <span
                    className={`lunato-diff-text ${streaming && i === lines.length - 1 ? "lunato-diff-caret" : ""}`}
                  >
                    {line.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SIGN = { add: "+", del: "−", ctx: " " };
