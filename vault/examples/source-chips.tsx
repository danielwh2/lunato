import { SourceChips, type Source } from "@/components/lunato/source-chips";

export function Research({ sources, reading, onOpen }: {
  sources: Source[];
  reading?: string;
  onOpen: (source: Source) => void;
}) {
  return (
    <SourceChips sources={sources} active={reading} onSelect={onOpen} />
  );
}
