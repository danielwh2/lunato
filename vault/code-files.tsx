"use client";

import { morphChanges } from "lunato";
import { useFollow } from "./scroll-follow";
import "lunato/vault.css";

export type TouchedFile = { path: string; added: number; removed: number; editing?: boolean };

/**
 * CodeFiles: the files an agent has touched so far, as a short list under a running total that follows the newest
 * file down. Needs scroll-follow from the vault beside it.
 *
 * @example
 * <CodeFiles files={[
 *   { path: "src/lib/price.ts", added: 4, removed: 1 },
 *   { path: "src/lib/tax.ts", added: 9, removed: 0, editing: true },
 * ]} />
 *
 * @param files - Every file touched so far, in the order the agent reached them. Keyed by path.
 */
export function CodeFiles({ files, className = "" }: { files: TouchedFile[]; className?: string }) {
  const [box, content] = useFollow<HTMLUListElement>();
  const added = files.reduce((sum, f) => sum + f.added, 0);
  const removed = files.reduce((sum, f) => sum + f.removed, 0);
  const busy = files.some((f) => f.editing);
  return (
    <div
      className={`w-full rounded-[12px] border border-neutral-200 bg-white p-[3px] font-mono text-[11px] [corner-shape:squircle] ${className}`}
    >
      <div className="flex h-7 items-center gap-2 px-2 text-neutral-500">
        <span
          ref={morphChanges}
        >{`${files.length} ${files.length === 1 ? "file" : "files"} changed`}</span>
        <span aria-hidden className="ml-auto flex gap-1.5 tabular-nums">
          <span ref={morphChanges} className="text-green-700">{`+${added}`}</span>
          <span ref={morphChanges} className="text-red-600">{`−${removed}`}</span>
        </span>
        <span className="sr-only" aria-live="polite">
          {busy ? "" : `${added} lines added, ${removed} removed`}
        </span>
      </div>
      <div ref={box} className="max-h-[144px] overflow-y-auto overflow-x-hidden">
        <ul ref={content} className="m-0 list-none p-0">
          {files.map((f) => {
            const cut = f.path.lastIndexOf("/") + 1;
            return (
              <li key={f.path} data-editing={f.editing || undefined} className="lunato-file">
                <div className="lunato-file-row">
                  <div className="lunato-file-face flex h-6 items-center gap-2 rounded-[8px] px-2 [corner-shape:squircle]">
                    <span
                      aria-hidden
                      className="grid flex-none place-items-center text-neutral-400"
                    >
                      <svg className="lunato-file-icon" {...icon}>
                        <path d="M3.5 1.5h4.5l3 3v7a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
                        <path d="M8 1.5v3h3" />
                      </svg>
                      <svg className="lunato-file-arc" {...icon}>
                        <circle cx="7" cy="7" r="5" pathLength={100} strokeDasharray="30 70" />
                      </svg>
                    </span>
                    <span className="min-w-0 truncate">
                      <span className="text-neutral-400">{f.path.slice(0, cut)}</span>
                      <span className="text-neutral-900">{f.path.slice(cut)}</span>
                    </span>
                    <span aria-hidden className="ml-auto flex flex-none gap-1.5 tabular-nums">
                      <span ref={morphChanges} className="text-green-700">{`+${f.added}`}</span>
                      <span ref={morphChanges} className="text-red-600">{`−${f.removed}`}</span>
                    </span>
                    <span className="sr-only">{`, ${f.added} lines added, ${f.removed} removed${f.editing ? ", editing" : ""}`}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const icon = {
  width: 12,
  height: 12,
  viewBox: "0 0 14 14",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
