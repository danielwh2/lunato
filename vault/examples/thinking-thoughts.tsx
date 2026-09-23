import { ThinkingThoughts } from "@/components/lunato/thinking-thoughts";

export function Reasoning({ text, run }: {
  text: string;
  run: "thinking" | "done" | "stopped";
}) {
  return (
    <ThinkingThoughts
      thoughts={text}
      done={run === "done"}
      stopped={run === "stopped"}
    />
  );
}
