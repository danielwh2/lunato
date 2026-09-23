import { StreamingBlur } from "@/components/lunato/streaming-blur";

export function Answer({ text }: { text: string }) {
  return <StreamingBlur text={text} />;
}
