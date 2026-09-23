import { TokenRing } from "@/components/lunato/token-ring";

const CONTEXT_WINDOW = 200_000;

export function ContextUsage({ used }: { used: number }) {
  return <TokenRing used={used} limit={CONTEXT_WINDOW} />;
}
