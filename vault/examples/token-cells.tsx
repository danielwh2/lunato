import { TokenCells } from "@/components/lunato/token-cells";

const CONTEXT_WINDOW = 200_000;

export function ContextUsage({ used, streaming }: {
  used: number;
  streaming: boolean;
}) {
  return <TokenCells used={used} limit={CONTEXT_WINDOW} live={streaming} />;
}
