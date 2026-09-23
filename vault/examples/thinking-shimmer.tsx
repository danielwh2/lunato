import { ThinkingShimmer } from "@/components/lunato/thinking-shimmer";

export function Thinking({ step, seconds, run }: {
  step: string;
  seconds: number;
  run: "thinking" | "done" | "stopped";
}) {
  const status = run === "done" ? `Thought for ${seconds}s`
    : run === "stopped" ? "Stopped" : step;

  return <ThinkingShimmer status={status} done={run !== "thinking"} />;
}
