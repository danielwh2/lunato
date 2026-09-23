"use client";

import {
  type ClipboardEvent,
  type DragEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import "lunato/vault.css";

export type Attachment = {
  id: string;
  name: string;
  size?: number;
  preview?: string;
  uploading?: boolean;
  error?: string;
};

/**
 * Attachments: the files a prompt carries, as a row of chips inside its panel, each with a thumbnail or file mark, the
 * name, the size and a button to take it off. Chips follow the panel's --lunato-size and --lunato-radius.
 *
 * @example
 * <Attachments items={files} onRemove={(id) => setFiles((all) => all.filter((f) => f.id !== id))} />
 *
 * @param items - The files attached, in order, keyed by id. preview is an image URL; uploading, or an error in a few
 *   words, holds the send until the file lands or is taken off.
 * @param onRemove - Called with a file's id when its remove button is pressed. Leave it out and the chips stay put.
 */
export function Attachments({
  items,
  onRemove,
  className = "",
}: {
  items: Attachment[];
  onRemove?: (id: string) => void;
  className?: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const places = useRef(new Map<string, Place>());
  const height = useRef<number | null>(null);
  const before = useRef(items);
  const refocus = useRef<{ gone: string; to: string } | null>(null);
  const [leaving, setLeaving] = useState<(Attachment & { place: Place })[]>([]);

  useLayoutEffect(() => {
    const now = new Set(items.map((a) => a.id));
    const gone = before.current.filter((a) => !now.has(a.id) && places.current.has(a.id));
    before.current = items;
    const leave = gone.map((a) => ({ ...a, place: places.current.get(a.id)! }));
    for (const a of gone) places.current.delete(a.id);
    setLeaving((all) => {
      const kept = all.filter((a) => !now.has(a.id));
      return leave.length || kept.length !== all.length ? [...kept, ...leave] : all;
    });
    const move = refocus.current;
    if (!move || now.has(move.gone)) return;
    refocus.current = null;
    const at = document.activeElement;
    if (at !== document.body && !list.current?.contains(at)) return;
    const next = list.current?.querySelector<HTMLElement>(
      `[data-id="${CSS.escape(move.to)}"] button`,
    );
    (
      next ??
      row.current?.closest("form")?.querySelector<HTMLElement>("input:not([type=file]), textarea")
    )?.focus();
  }, [items]);

  const measure = (glide: boolean) => {
    const ul = list.current;
    if (!ul) return;
    const still = !glide || matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const li of ul.querySelectorAll<HTMLElement>(":scope > [data-id]:not([data-leaving])")) {
      const id = li.dataset.id!;
      const place = { x: li.offsetLeft, y: li.offsetTop, width: li.offsetWidth };
      const was = places.current.get(id);
      if (was && !still && (was.x !== place.x || was.y !== place.y)) {
        li.animate(
          [{ translate: `${was.x - place.x}px ${was.y - place.y}px` }, { translate: "0 0" }],
          { duration: MOVE_MS, easing: EASE },
        );
      }
      places.current.set(id, place);
    }
    const now = ul.offsetHeight;
    if (height.current !== null && height.current !== now && !still) {
      row.current?.animate([{ height: `${height.current}px` }, { height: `${now}px` }], {
        duration: MOVE_MS,
        easing: EASE,
      });
    }
    height.current = now;
  };
  useLayoutEffect(() => measure(true));
  useEffect(() => {
    const watch = new ResizeObserver(() => measure(false));
    if (list.current) watch.observe(list.current);
    return () => watch.disconnect();
  }, []);

  const remove = (id: string, i: number) => {
    const focused = list.current?.contains(document.activeElement);
    if (focused) refocus.current = { gone: id, to: (items[i + 1] ?? items[i - 1])?.id ?? "" };
    onRemove?.(id);
  };
  return (
    <div ref={row} className={`lunato-attachments ${className}`}>
      <ul
        aria-label="Attachments"
        ref={list}
        className={`relative m-0 flex list-none flex-wrap gap-1 p-0 ${items.length ? "pb-1" : ""}`}
      >
        {items.map((a, i) => (
          <li
            key={a.id}
            data-id={a.id}
            data-uploading={a.uploading || undefined}
            data-error={a.error ? "" : undefined}
            title={a.error}
            className={`lunato-attachment ${CHIP}`}
          >
            <Chip file={a} />
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                title="Remove"
                onClick={() => remove(a.id, i)}
                className={REMOVE}
              >
                <Cross />
              </button>
            )}
          </li>
        ))}
        {leaving.map((a) => (
          <li
            key={a.id}
            data-id={a.id}
            data-leaving
            aria-hidden
            className={`lunato-attachment ${CHIP}`}
            style={{ position: "absolute", left: a.place.x, top: a.place.y, width: a.place.width }}
            onAnimationEnd={() => setLeaving((all) => all.filter((l) => l.id !== a.id))}
          >
            <Chip file={a} />
            {onRemove && (
              <span className={REMOVE}>
                <Cross />
              </span>
            )}
          </li>
        ))}
      </ul>
      <span role="status" className="sr-only">
        {items
          .filter((a) => a.error)
          .map((a) => `${a.name}: ${a.error}`)
          .join(". ")}
      </span>
    </div>
  );
}

/**
 * AttachButton: a plus that opens the file picker, sized and cornered like the panel's other controls.
 *
 * @param onAttach - Called with the files picked.
 */
export function AttachButton({
  onAttach,
  className = "",
}: {
  onAttach: (files: File[]) => void;
  className?: string;
}) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        aria-label="Attach files"
        title="Attach files"
        onClick={() => picker.current?.click()}
        className={`grid size-[var(--lunato-size,28px)] flex-none cursor-pointer place-items-center rounded-[var(--lunato-radius,12px)] border-0 bg-transparent text-neutral-500 transition-[color,background-color,scale] duration-150 [corner-shape:var(--lunato-corner,squircle)] hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 active:scale-[0.96] ${className}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M7 3v8M3 7h8" />
        </svg>
      </button>
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          onAttach([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </>
  );
}

/**
 * useFileDrop: lets a panel take files dropped on it or pasted into its field. Only a drag carrying files is taken, so
 * text dragged in still drops into the field; a paste that also carries text (cells from a spreadsheet) stays text.
 *
 * @param onAttach - Called with the files dropped or pasted. Leave it out and nothing is taken.
 * @param disabled - True while the panel is off.
 */
export function useFileDrop(onAttach: ((files: File[]) => void) | undefined, disabled: boolean) {
  const [dragging, setDragging] = useState(false);
  const carries = (e: DragEvent) =>
    !!onAttach && !disabled && e.dataTransfer.types.includes("Files");
  return {
    dragging,
    zone: {
      onDragOver: (e: DragEvent) => {
        if (!carries(e)) return;
        e.preventDefault();
        setDragging(true);
      },
      onDragLeave: (e: DragEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      },
      onDrop: (e: DragEvent) => {
        if (!carries(e)) return;
        e.preventDefault();
        setDragging(false);
        onAttach!([...e.dataTransfer.files]);
      },
    },
    onPaste: (e: ClipboardEvent) => {
      const pasted = [...e.clipboardData.files];
      if (!onAttach || disabled || !pasted.length || e.clipboardData.getData("text/plain")) return;
      e.preventDefault();
      onAttach(pasted);
    },
  };
}

type Place = { x: number; y: number; width: number };

const MOVE_MS = 240;
const EASE = "cubic-bezier(0.2, 0, 0, 1)";

function Chip({ file }: { file: Attachment }) {
  return (
    <>
      <span className="relative grid size-[calc(var(--lunato-size,28px)-8px)] flex-none place-items-center overflow-hidden rounded-[calc(var(--lunato-radius,12px)-4px)] bg-white text-neutral-500 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)] [corner-shape:var(--lunato-corner,squircle)]">
        {file.error ? (
          <Warning />
        ) : file.preview ? (
          <img
            src={file.preview}
            alt=""
            className="lunato-attachment-mark size-full object-cover"
          />
        ) : (
          <FileMark />
        )}
        <Arc />
      </span>
      <span className="min-w-0 truncate text-neutral-900">{file.name}</span>
      {file.error ? (
        <span className="flex-none text-red-600">{file.error}</span>
      ) : (
        file.size !== undefined && (
          <span className="flex-none tabular-nums text-neutral-500">{bytes(file.size)}</span>
        )
      )}
      {file.uploading && <span className="sr-only">, uploading</span>}
    </>
  );
}

const CHIP =
  "flex h-[var(--lunato-size,28px)] min-w-0 max-w-[220px] items-center gap-1.5 rounded-[var(--lunato-radius,12px)] border border-neutral-200 bg-neutral-50 pl-1 pr-0.5 text-[11px] font-medium leading-none [corner-shape:var(--lunato-corner,squircle)] data-error:border-red-200";
const REMOVE =
  "grid size-[calc(var(--lunato-size,28px)-8px)] flex-none cursor-pointer place-items-center rounded-[calc(var(--lunato-radius,12px)-4px)] border-0 bg-transparent text-neutral-400 transition-[color,background-color,scale] duration-150 [corner-shape:var(--lunato-corner,squircle)] hover:bg-neutral-200/70 hover:text-neutral-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-400 active:scale-[0.9]";

const bytes = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 ** 2
      ? `${Math.round(n / 1024)} KB`
      : `${(n / 1024 ** 2).toFixed(1)} MB`;

const Cross = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
  </svg>
);
const FileMark = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinejoin="round"
    aria-hidden
    className="lunato-attachment-mark"
  >
    <path d="M3 1.5h4l2.5 2.5v6a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5v-8A.5.5 0 0 1 3 1.5Z" />
    <path d="M7 1.5V4h2.5" />
  </svg>
);
const Warning = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className="lunato-attachment-mark text-red-600"
  >
    <path d="M9 16.25a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5Z" />
    <path d="M9 5.431V9.5" />
    <circle cx="9" cy="12.417" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const Arc = () => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden
    className="lunato-attachment-arc absolute inset-0 m-auto size-3/4 text-neutral-900"
  >
    <circle
      cx="10"
      cy="10"
      r="7.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      pathLength={100}
      strokeDasharray="28 72"
    />
  </svg>
);
