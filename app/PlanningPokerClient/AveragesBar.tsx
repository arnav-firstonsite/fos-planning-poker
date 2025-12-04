// app/components/AveragesBar.tsx

type AveragesBarProps = {
  isRevealed: boolean;
  devAverage: string;
  qaAverage: string;
};

export function AveragesBar({
  isRevealed,
  devAverage,
  qaAverage,
}: AveragesBarProps) {
  return (
    <div className="grid grid-cols-2 items-center justify-center gap-2 px-6 py-4 text-center text-sm font-semibold text-[hsl(var(--highlight))]">
      <span className="w-full">
        Dev Avg: {isRevealed ? devAverage : "—"}
      </span>
      <span className="w-full">
        QA Avg: {isRevealed ? qaAverage : "—"}
      </span>
    </div>
  );
}