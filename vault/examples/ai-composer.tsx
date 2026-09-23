"use client";

import { useState } from "react";
import { AiInput } from "@/components/lunato/ai-input";

const MODELS = [
  { id: "fast", label: "Fast" },
  { id: "pro", label: "Pro" },
];

export function Composer({
  busy,
  onSend,
  onStop,
}: {
  busy: boolean;
  onSend: (text: string, model: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const [model, setModel] = useState("fast");
  function send() {
    onSend(text, model);
    setText("");
  }

  return (
    <AiInput
      multiline
      value={text}
      onChange={setText}
      onSubmit={send}
      busy={busy}
      onStop={onStop}
      models={MODELS}
      model={model}
      onModelChange={setModel}
    />
  );
}
