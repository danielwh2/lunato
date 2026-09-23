import { LoaderOrbit } from "@/components/lunato/loader-orbit";
import { ThinkingIndicator } from "@/components/lunato/thinking-indicator";

export function Thinking({ step, seconds, run }: {
  step: string;
  seconds: number;
  run: "thinking" | "done" | "stopped";
}) {
  const status = run === "done" ? `Thought for ${seconds}s`
    : run === "stopped" ? "Stopped" : step;

  return (
    <ThinkingIndicator
      status={status}
      done={run === "done"}
      stopped={run === "stopped"}
      loader={<LoaderOrbit />}
    />
  );
}
