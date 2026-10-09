"use client";

import { useState } from "react";
import { AiPill } from "@/components/lunato/ai-pill";

export function Composer({ busy, error, onSend, onStop, onRetry }: {
  busy: boolean;
  error?: string;
  onSend: (text: string) => void;
  onStop: () => void;
  onRetry: () => void;
}) {
  const [text, setText] = useState("");

  function send() {
    onSend(text);
    setText("");
  }

  return (
    <AiPill value={text} onChange={setText} onSubmit={send} busy={busy}
      onStop={onStop} error={error} onRetry={onRetry}
      hints={["Ask anything", "Plan a trip to Lisbon"]} />
  );
}
