import { ThinkingSteps } from "@/components/lunato/thinking-steps";

export function AgentSteps({ steps, run }: {
  steps: string[];
  run: "thinking" | "done" | "stopped";
}) {
  return (
    <ThinkingSteps
      steps={steps}
      done={run === "done"}
      stopped={run === "stopped"}
    />
  );
}
