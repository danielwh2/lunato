"use client";

import { useState } from "react";
import { SendMorph } from "@/components/lunato/send-morph";

export function Composer({ busy, onSend, onStop }: {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");

  function send() {
    onSend(text);
    setText("");
  }

  return (
    <div className="flex items-end gap-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <SendMorph busy={busy} disabled={!text.trim()} onSend={send}
        onStop={onStop} />
    </div>
  );
}
