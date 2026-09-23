import { ThinkingPhases } from "@/components/lunato/thinking-phases";

const PHASES = ["Reading", "Planning", "Writing"];

export function Progress({ phase, run }: {
  phase: number;
  run: "thinking" | "done" | "stopped";
}) {
  return (
    <ThinkingPhases
      phases={PHASES}
      phase={phase}
      done={run === "done"}
      stopped={run === "stopped"}
    />
  );
}
