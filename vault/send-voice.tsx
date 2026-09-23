"use client";

import { morphChanges } from "lunato";
import { Arrow, ICON, type SendProps, Stop, press } from "./send";
import "lunato/vault.css";

/**
 * SendVoice: send and voice in one button, voice bars while there is nothing typed that fold into the send arrow once
 * there is, and into stop while the model answers. Leave out onVoice and it is a plain send button. Sized by a panel's
 * --lunato-size, --lunato-radius and --lunato-corner; round on its own.
 *
 * @example
 * <SendVoice busy={status === "streaming"} disabled={!input} onSend={send}
 *   onStop={stop} onVoice={toggleDictation} listening={dictating} />
 *
 * @param busy - True while the model is answering: the button stops it.
 * @param disabled - True when there is nothing to send: the bars show, or, without onVoice, the button is off.
 * @param onSend - Called on a press while there is something to send.
 * @param onStop - Called on a press while busy.
 * @param onVoice - Called on a press of the bars: to start dictation, or to stop it while listening.
 * @param listening - True while dictation runs: the bars show and dance even once text arrives, until it stops.
 */
export function SendVoice({
  busy,
  disabled = false,
  onSend,
  onStop,
  onVoice,
  listening = false,
  className = "",
}: SendProps & { onVoice?: () => void; listening?: boolean }) {
  const voice = !busy && !!onVoice && (disabled || listening);
  return (
    <button
      type="button"
      disabled={!busy && disabled && !onVoice}
      aria-label={busy ? "Stop generating" : voice ? "Dictate" : "Send"}
      aria-pressed={voice ? listening : undefined}
      {...press(busy, voice ? onVoice! : onSend, onStop)}
      className={`relative grid size-[var(--lunato-size,28px)] flex-none cursor-pointer place-items-center rounded-[var(--lunato-radius,9999px)] border-0 bg-neutral-900 text-white transition-[scale,opacity] duration-150 [corner-shape:var(--lunato-corner,round)] active:scale-[0.96] disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 data-pointer:focus-visible:outline-none motion-reduce:transition-none ${className}`}
    >
      <span
        ref={morphChanges}
        data-voice={voice || undefined}
        data-listening={(voice && listening) || undefined}
        className="lunato-voice grid"
      >
        {busy ? <Stop /> : voice ? <Bars /> : <Arrow />}
      </span>
    </button>
  );
}

const Bars = () => (
  <svg {...ICON}>
    <line x1="3.5" y1="5.5" x2="3.5" y2="8.5" />
    <line x1="7" y1="3.25" x2="7" y2="10.75" />
    <line x1="10.5" y1="4.75" x2="10.5" y2="9.25" />
  </svg>
);
