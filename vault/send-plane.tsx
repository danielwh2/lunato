"use client";

import { useEffect, useRef, useState } from "react";
import { type SendProps, press } from "./send";
import "lunato/vault.css";

/**
 * SendPlane: a paper plane that takes off when pressed, leaving moving air behind it while the model answers, and
 * glides back in once it is done. Sized by a panel's --lunato-size, --lunato-radius and --lunato-corner; a 28px
 * squircle on its own.
 *
 * @example
 * <SendPlane busy={status === "streaming"} disabled={!input} onSend={send}
 *   onStop={stop} />
 *
 * @param busy - True while the model is answering: the wind flows, and a press stops the answer.
 * @param disabled - True when there is nothing to send. Ignored while busy, so stop always works.
 * @param onSend - Called on a press while idle.
 * @param onStop - Called on a press while busy.
 */
export function SendPlane({ busy, disabled = false, onSend, onStop, className = "" }: SendProps) {
  const air = useRef<HTMLCanvasElement>(null);
  const [flown, setFlown] = useState(false);
  if (busy && !flown) setFlown(true);
  useEffect(() => {
    if (!busy || !air.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return blow(air.current);
  }, [busy]);
  return (
    <button
      type="button"
      data-busy={busy || undefined}
      data-back={(!busy && flown) || undefined}
      disabled={!busy && disabled}
      aria-label={busy ? "Stop generating" : "Send"}
      {...press(busy, onSend, onStop)}
      onClick={(e) => {
        if (busy) return e.detail < 2 && onStop();
        e.currentTarget.dataset.fresh = "";
        onSend();
      }}
      onPointerLeave={(e) => delete e.currentTarget.dataset.fresh}
      className={`lunato-plane ${className}`}
    >
      <canvas ref={air} aria-hidden className="lunato-plane-air" />
      <span className="lunato-plane-plane">
        <svg
          width="15"
          height="15"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5.75 10.022v4.246c0 .409.464.645.794.404l.74-.539" />
          <path d="M15.58 2.569 5.75 10.022" />
          <path d="M2.883 6.935 15.182 2.542c.363-.13.73.183.66.562l-2.196 11.86c-.067.363-.492.531-.789.311L2.754 7.807c-.322-.238-.248-.738.129-.873Z" />
        </svg>
      </span>
      <span className="lunato-plane-stop">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
        </svg>
      </span>
    </button>
  );
}

type Mote = { x: number; y: number; speed: number; age: number; life: number; strength: number };

function blow(canvas: HTMLCanvasElement) {
  const draw = canvas.getContext("2d");
  if (!draw) return;
  const { width, height } = canvas.getBoundingClientRect();
  const scale = devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  draw.scale(scale, scale);
  draw.strokeStyle = getComputedStyle(canvas).color;
  draw.lineCap = "round";
  draw.lineWidth = 1;
  const place = (mote: Partial<Mote>): Mote =>
    Object.assign(mote, {
      x: (Math.random() * 1.1 - 0.2) * width,
      y: (Math.random() * 1.1 + 0.1) * height,
      speed: 0.35 + Math.random() * 0.55,
      age: 0,
      life: 40 + Math.random() * 50,
      strength: 0.3 + Math.random() * 0.35,
    });
  const motes = Array.from({ length: MOTES }, () => place({}));
  for (const mote of motes) mote.age = Math.random() * mote.life;
  let frame = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const step = Math.min(3, (now - last) / 16.7);
    last = now;
    draw.globalCompositeOperation = "destination-out";
    draw.globalAlpha = TRAIL;
    draw.fillRect(0, 0, width, height);
    draw.globalCompositeOperation = "source-over";
    for (const m of motes) {
      const bend =
        Math.sin(m.x * 0.28 + now * 0.0011) * 0.45 + Math.cos(m.y * 0.31 - now * 0.0008) * 0.35;
      const x = m.x + Math.cos(HEADING + bend) * m.speed * step;
      const y = m.y + Math.sin(HEADING + bend) * m.speed * step;
      draw.globalAlpha = Math.sin(Math.PI * Math.min(1, m.age / m.life)) * m.strength;
      draw.beginPath();
      draw.moveTo(m.x, m.y);
      draw.lineTo(x, y);
      draw.stroke();
      Object.assign(m, { x, y, age: m.age + step });
      if (m.age > m.life || x > width + 2 || y < -2) place(m);
    }
    frame = requestAnimationFrame(tick);
  };
  draw.clearRect(0, 0, width, height);
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

const MOTES = 22;
const HEADING = -Math.PI / 4;
const TRAIL = 0.22;
