import { TokenMeter } from "@/components/lunato/token-meter";

const CONTEXT_WINDOW = 200_000;

export function ContextUsage({ used }: { used: number }) {
  return <TokenMeter used={used} limit={CONTEXT_WINDOW} />;
}
