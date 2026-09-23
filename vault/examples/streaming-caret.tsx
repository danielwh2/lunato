import { StreamingCaret } from "@/components/lunato/streaming-caret";

export function Answer({ text, streaming }: {
  text: string;
  streaming: boolean;
}) {
  return <StreamingCaret text={text} streaming={streaming} />;
}
