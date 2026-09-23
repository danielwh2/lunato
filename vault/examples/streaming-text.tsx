import { StreamingText } from "@/components/lunato/streaming-text";

export function Answer({ text }: { text: string }) {
  return <StreamingText text={text} />;
}
