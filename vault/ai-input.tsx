"use client";

import {
  type ChangeEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useImperativeHandle,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { AttachButton, type Attachment, Attachments, useFileDrop } from "./attachments";
import { type Model, ModelMenu } from "./model-menu";
import {
  type PanelShape,
  type PanelSize,
  PromptCount,
  PromptError,
  PromptHint,
  panelLook,
  sendOnEnter,
  usePromptHint,
  usePromptPanel,
} from "./prompt-panel";
import { SendButton } from "./send-button";
import { SendLabel } from "./send-label";
import { SendMorph } from "./send-morph";
import { SendPlane } from "./send-plane";
import { SendSnow } from "./send-snow";
import { SendVoice } from "./send-voice";
import "lunato/vault.css";

/**
 * AiInput: the prompt panel of an AI chat, a field with a model chip and a send button, and the files it carries in a
 * row of chips above. One line by default, with a beam of starlight circling its edge while the model works; with
 * multiline it is a composer, a box that grows to about eight lines over a toolbar of attach, model chip and send.
 * Needs ModelMenu, the six send buttons, Attachments and prompt-panel from the vault beside it.
 *
 * @example
 * <AiInput value={input} onChange={setInput} onSubmit={send}
 *   busy={status === "streaming"} onStop={stop} models={models} model={model}
 *   onModelChange={setModel} multiline size="lg" send="label" />
 *
 * @param value - What is typed. Controlled: pass it back through onChange.
 * @param onSubmit - Called on the send key or button while there is text or a file, nothing uploading and no file failed.
 * @param busy - True while the model is answering: the send button or Escape stops it.
 * @param onStop - Called on the send button or Escape while busy.
 * @param error - Why the last message did not go, shown in a note above the panel until you clear it.
 * @param onRetry - Called on the note's Retry.
 * @param models - The choices for the model chip; model and onModelChange drive it. Leave them out and the chip goes.
 * @param fast - Whether fast responses are on. With onFastChange, the chip's menu ends in a switch for it.
 * @param attachments - The files attached so far. One uploading or failed holds the send.
 * @param onAttach - Called with files picked, pasted or dropped. Leave it out and the attach button, paste and drop go.
 * @param onRemove - Called with an attachment's id when its chip's remove button is pressed.
 * @param multiline - A box that grows with the text over a toolbar, in place of the one-line row.
 * @param submitOn - With multiline: "enter" (the default) sends on Enter; "mod-enter" sends on Cmd or Ctrl+Enter, and Enter is a new line. On a touch screen Enter is always a new line, since its keyboard has no Shift+Enter, and the button sends.
 * @param send - Which send button: "night" (the default, "morph" with multiline), "label", "snow", "plane" or "voice".
 * @param onVoice - For send="voice": called on a press of the voice bars, shown while there is nothing to send.
 * @param listening - True while dictation runs, for send="voice".
 * @param size - "sm", "md" (the default) or "lg": the text, the field and every control inside scale together.
 * @param shape - "rounded" (the default) or "pill".
 * @param hints - Hints to roll through every 3s while the field is empty and unfocused, in the placeholder's place.
 * @param disabled - Switches the whole panel off. Say why through placeholder.
 * @param maxLength - The most a message may hold. Near it, what is left shows with its digits rolling; over it, nothing sends.
 * @param leading - Anything to sit after attach, before the field or at the start of the toolbar.
 * @param trailing - Anything to sit just before the send button.
 * @param ref - The field, to focus it from outside.
 */
export function AiInput({
  value,
  onChange,
  onSubmit,
  busy,
  onStop,
  error,
  onRetry,
  models,
  model,
  onModelChange,
  fast,
  onFastChange,
  onVoice,
  listening,
  attachments = NO_FILES,
  onAttach,
  onRemove,
  multiline = false,
  submitOn = "enter",
  send = multiline ? "morph" : "night",
  size,
  shape,
  hints,
  placeholder = "Send a message",
  disabled = false,
  maxLength,
  leading,
  trailing,
  ref,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onStop: () => void;
  error?: string;
  onRetry?: () => void;
  models?: Model[];
  model?: string;
  onModelChange?: (id: string) => void;
  fast?: boolean;
  onFastChange?: (fast: boolean) => void;
  onVoice?: () => void;
  listening?: boolean;
  attachments?: Attachment[];
  onAttach?: (files: File[]) => void;
  onRemove?: (id: string) => void;
  multiline?: boolean;
  submitOn?: "enter" | "mod-enter";
  send?: keyof typeof SENDS;
  size?: PanelSize;
  shape?: PanelShape;
  hints?: string[];
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  leading?: ReactNode;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  className?: string;
}) {
  const panel = usePromptPanel<HTMLInputElement | HTMLTextAreaElement>({
    value,
    busy,
    disabled,
    maxLength,
    attachments,
    onSubmit,
    onStop,
    onRetry,
  });
  useImperativeHandle(ref, () => panel.field.current!);
  const [focused, setFocused] = useState(false);
  if (disabled && focused) setFocused(false);
  const hint = usePromptHint({ placeholder, hints, busy, disabled, resting: !value && !focused });
  const look = panelLook(size, shape);
  const drop = useFileDrop(onAttach, disabled);
  const mac = useSyncExternalStore(never, isMac, () => false);
  const touch = useSyncExternalStore(never, isTouch, () => false);
  const enterSends = submitOn === "enter" && !touch;
  const Send = SENDS[send];
  const indent = onAttach || leading ? "0px" : "8px";
  useLayoutEffect(() => {
    const el = panel.field.current;
    if (!multiline || !el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, multiline, panel.field]);
  const field = {
    "aria-label": "Message",
    "aria-describedby": panel.near ? panel.counter : undefined,
    value,
    maxLength,
    disabled,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onPaste: drop.onPaste,
  };
  const count = maxLength !== undefined && (
    <PromptCount
      id={panel.counter}
      left={panel.left}
      near={panel.near}
      className={multiline ? "px-1" : "pointer-events-none absolute right-2"}
    />
  );
  const button = (
    <Send
      busy={busy}
      disabled={!panel.ready}
      onSend={panel.submit}
      onStop={panel.stop}
      onVoice={listening || (!value.trim() && !attachments.length) ? onVoice : undefined}
      listening={listening}
      keys={multiline && !enterSends ? `${mac ? "⌘" : "Ctrl"} Enter` : "Enter"}
    />
  );
  return (
    <form
      {...panel.form}
      data-busy={(!multiline && busy) || undefined}
      inert={disabled}
      style={look.style}
      {...drop.zone}
      className={`${multiline ? "" : "lunato-ai-input"} relative flex w-full flex-col rounded-[var(--lunato-panel-radius)] border bg-white p-[var(--lunato-panel-pad)] shadow-[0_14px_34px_-22px_rgb(0_0_0/0.3)] transition-[border-color,background-color,opacity] duration-150 [corner-shape:var(--lunato-corner)] focus-within:border-neutral-300 ${drop.dragging ? "border-neutral-400 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"} ${disabled ? "opacity-60" : ""} ${className}`}
    >
      <PromptError error={error} onRetry={panel.retry} />
      {(onAttach || attachments.length > 0) && (
        <Attachments items={attachments} onRemove={onRemove} />
      )}
      {multiline && (
        <span className="relative grid">
          <PromptHint
            hint={hint}
            hidden={!!value}
            className={`left-2 right-2 top-1.5 leading-snug ${look.text}`}
          />
          <textarea
            {...field}
            ref={panel.field as RefObject<HTMLTextAreaElement | null>}
            rows={1}
            enterKeyHint={enterSends ? "send" : "enter"}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              if (e.keyCode === 229) return e.preventDefault();
              if (enterSends ? e.shiftKey : !(e.metaKey || e.ctrlKey)) return;
              e.preventDefault();
              panel.submit();
            }}
            className={`field-sizing-content mb-1 max-h-40 w-full resize-none border-0 bg-transparent px-2 py-1.5 text-base leading-snug text-neutral-900 outline-none placeholder:text-transparent ${look.text}`}
          />
        </span>
      )}
      <div className="flex items-center gap-1">
        {onAttach && <AttachButton onAttach={onAttach} />}
        {leading}
        {!multiline && (
          <span className="relative flex min-w-0 flex-1 items-center">
            <PromptHint
              hint={hint}
              hidden={!!value}
              className={`right-0 ${look.text}`}
              style={{ left: indent }}
            />
            <input
              {...field}
              ref={panel.field as RefObject<HTMLInputElement | null>}
              autoComplete="off"
              enterKeyHint="send"
              placeholder={hint}
              style={{ paddingLeft: indent }}
              onKeyDown={sendOnEnter(panel.submit)}
              className={`h-[var(--lunato-size)] w-full min-w-0 border-0 bg-transparent px-2 text-base text-neutral-900 outline-none placeholder:text-transparent ${look.text} ${panel.near ? "pr-10" : ""}`}
            />
            {count}
          </span>
        )}
        {!!models?.length && onModelChange && (
          <ModelMenu
            models={models}
            value={model ?? models[0].id}
            onChange={onModelChange}
            fast={fast}
            onFastChange={onFastChange}
            side="top"
            align={multiline ? "start" : "end"}
          />
        )}
        {multiline ? (
          <div className="ml-auto flex items-center gap-1">
            {count}
            {trailing}
            {button}
          </div>
        ) : (
          <>
            {trailing}
            {button}
          </>
        )}
      </div>
    </form>
  );
}

const NO_FILES: Attachment[] = [];
const SENDS = {
  night: SendButton,
  morph: SendMorph,
  label: SendLabel,
  snow: SendSnow,
  plane: SendPlane,
  voice: SendVoice,
};
const never = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);
const isTouch = () => matchMedia("(pointer: coarse)").matches;
