"use client";

import { morphChanges } from "lunato";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type Model = { id: string; label: string; description?: string; icon?: ReactNode };

/**
 * ModelMenu: a compact chip that picks the model a chat runs on, with a menu of the choices under it. The chip takes
 * its height and corner from a panel's --lunato-size, --lunato-radius and --lunato-corner.
 *
 * @example
 * <ModelMenu models={[{ id: "fast", label: "Fast", icon: <BoltIcon /> }]}
 *   value={model} onChange={setModel} />
 *
 * @param models - The choices, in order, each with an optional line under its name. Icons are drawn at 12px in currentColor.
 * @param value - The id of the chosen model.
 * @param onChange - Called with the id of the model picked.
 * @param side - Where the menu opens: below the chip, or above it.
 * @param align - Which edge of the chip the menu lines up with, or its centre. Near the edge of a screen it slides over to keep 8px clear.
 * @param fast - Whether fast responses are on.
 * @param onFastChange - Called with the Fast responses switch's new state. Leave it out and the switch goes.
 */
export function ModelMenu({
  models,
  value,
  onChange,
  side = "bottom",
  align = "start",
  fast = false,
  onFastChange,
  className = "",
}: {
  models: Model[];
  value: string;
  onChange: (id: string) => void;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  fast?: boolean;
  onFastChange?: (fast: boolean) => void;
  className?: string;
}) {
  const [menu, setMenu] = useState<"closed" | "open" | "closing">("closed");
  const keyboard = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const sheet = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = models.find((m) => m.id === value) ?? models[0];
  const chosen = models.indexOf(current);
  const count = models.length + (onFastChange ? 1 : 0);

  const open = (fromKeyboard: boolean) => {
    keyboard.current = fromKeyboard;
    trigger.current?.focus();
    setMenu("open");
  };
  const close = (refocus: boolean) => {
    setMenu((m) => (m === "open" ? "closing" : m));
    if (refocus) trigger.current?.focus();
  };
  useEffect(() => {
    if (menu === "closing") {
      const done = setTimeout(() => setMenu("closed"), CLOSE_MS);
      return () => clearTimeout(done);
    }
    if (menu !== "open") return;
    if (keyboard.current) items.current[chosen]?.focus();
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setMenu((m) => (m === "open" ? "closing" : m));
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menu, chosen]);

  useLayoutEffect(() => {
    const el = sheet.current;
    if (menu !== "open" || !el) return;
    el.style.transform = "";
    const { left, right } = el.getBoundingClientRect();
    const room = document.documentElement.clientWidth - EDGE;
    const nudge = Math.max(0, EDGE - left) + Math.min(0, room - right);
    if (nudge) el.style.transform = `translateX(${nudge}px)`;
  }, [menu]);

  const keys = (e: KeyboardEvent) => {
    if (menu !== "open") {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open(true);
      }
      return;
    }
    const k = items.current.indexOf(document.activeElement as HTMLButtonElement);
    const to = (
      {
        ArrowDown: k < 0 ? chosen : k + 1,
        ArrowUp: k < 0 ? chosen : k - 1,
        Home: 0,
        End: count - 1,
      } as Record<string, number>
    )[e.key];
    if (to !== undefined) {
      e.preventDefault();
      items.current[(to + count) % count]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") close(false);
  };

  if (!current) return null;
  return (
    <div ref={root} onKeyDown={keys} className={`relative inline-block ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-label={`Model: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={menu === "open"}
        aria-controls={id}
        onClick={(e) => (menu === "open" ? close(e.detail === 0) : open(e.detail === 0))}
        className={`inline-flex h-[var(--lunato-size,28px)] flex-none cursor-pointer items-center gap-[3px] whitespace-nowrap rounded-[var(--lunato-radius,12px)] border pl-2 pr-1.5 text-[11px] font-medium leading-none transition-colors duration-150 [corner-shape:var(--lunato-corner,squircle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 ${menu === "open" ? "border-neutral-300 bg-black/5 text-neutral-900" : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"}`}
      >
        {current.icon && (
          <span ref={morphChanges} className="mr-0.5 grid [&_svg]:size-3">
            {current.icon}
          </span>
        )}
        <span className="inline-flex items-center">
          <span ref={morphChanges} data-lunato="roll">{current.label}</span>
          {onFastChange && (
            <span
              className={`grid transition-[grid-template-columns] duration-220 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${fast ? "grid-cols-[1fr]" : "grid-cols-[0fr]"}`}
            >
              <span className="min-w-0 overflow-hidden">
                <span
                  className={`grid pl-1 text-amber-500 transition-[opacity,scale,filter] duration-220 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none [&_svg]:size-3 ${fast ? "" : "scale-50 opacity-0 blur-[2px]"}`}
                >
                  <Bolt />
                </span>
              </span>
            </span>
          )}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`text-neutral-500 transition-[rotate] duration-200 ${menu === "open" ? "rotate-180" : ""}`}
        >
          <path d="M3 4.75 6 7.75 9 4.75" />
        </svg>
      </button>
      {menu !== "closed" && (
        <div
          ref={sheet}
          id={id}
          role="menu"
          aria-label="Model"
          className={`absolute z-10 grid w-[220px] rounded-xl border border-neutral-200 bg-white p-[3px] shadow-[0_14px_34px_-22px_rgb(0_0_0/0.3)] transition-[opacity,translate] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] [corner-shape:squircle] starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none ${side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"} ${ALIGN[align]} ${menu === "closing" ? "pointer-events-none translate-y-1 opacity-0" : ""}`}
        >
          {models.map((m, i) => (
            <button
              key={m.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === value}
              tabIndex={-1}
              onClick={() => {
                onChange(m.id);
                close(true);
              }}
              className={`${ITEM} ${m.description ? "py-1" : ""} aria-checked:bg-neutral-100 aria-checked:text-neutral-900`}
            >
              {m.icon && <span className="grid flex-none [&_svg]:size-3">{m.icon}</span>}
              <span className="grid min-w-0">
                <span className="truncate leading-4">{m.label}</span>
                {m.description && (
                  <span className="truncate text-[11px] font-normal leading-[14px] text-neutral-500">
                    {m.description}
                  </span>
                )}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className={`ml-auto flex-none ${m.id === value ? "opacity-100" : "opacity-0"}`}
              >
                <path d="M2.5 7.5 5.5 10.5 11.5 3.5" />
              </svg>
            </button>
          ))}
          {onFastChange && (
            <>
              <hr className="mx-2 my-[3px] h-px border-0 bg-neutral-100" />
              <button
                ref={(el) => {
                  items.current[models.length] = el;
                }}
                type="button"
                role="menuitemcheckbox"
                aria-checked={fast}
                tabIndex={-1}
                onClick={() => onFastChange(!fast)}
                className={`group ${ITEM}`}
              >
                <span
                  className={`grid flex-none transition-colors duration-150 [&_svg]:size-3 ${fast ? "text-amber-500" : ""}`}
                >
                  <Bolt />
                </span>
                <span className="min-w-0 truncate">Fast responses</span>
                <span
                  aria-hidden
                  className={`relative ml-auto h-3.5 w-6 flex-none rounded-full transition-colors duration-150 ${fast ? "bg-neutral-900" : "bg-neutral-300"}`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 size-2.5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-[translate,scale] duration-220 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:scale-90 motion-reduce:transition-none ${fast ? "translate-x-2.5" : ""}`}
                  />
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const CLOSE_MS = 160;
const ITEM =
  "flex min-h-6 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-[12px] font-medium text-neutral-500 outline-none transition-colors duration-150 [corner-shape:squircle] hover:bg-neutral-100 hover:text-neutral-900 focus-visible:bg-neutral-100 focus-visible:text-neutral-900";
const Bolt = () => (
  <svg
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M14.75 7.25H9.5l.31-5.26c.01-.21-.26-.31-.39-.14L3.05 10.35c-.12.16 0 .4.2.4H8.5l-.31 5.26c-.01.21.26.31.39.14l6.37-8.5c.12-.16 0-.4-.2-.4Z" />
  </svg>
);
const ALIGN = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" };
const EDGE = 8;
