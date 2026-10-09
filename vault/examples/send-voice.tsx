"use client";

import { SendVoice } from "@/components/lunato/send-voice";

export function Composer({ draft, onDraftChange, ...voice }: {
  draft: string;
  onDraftChange: (draft: string) => void;
  busy: boolean;
  listening: boolean;
  onSend: () => void;
  onStop: () => void;
  onVoice: () => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <textarea value={draft} onChange={(e) => onDraftChange(e.target.value)} />
      <SendVoice {...voice} disabled={!draft.trim()} />
    </div>
  );
}
