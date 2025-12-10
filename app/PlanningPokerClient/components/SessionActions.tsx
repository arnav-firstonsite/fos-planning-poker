// app/components/SessionActions.tsx

type SessionActionsProps = {
  isRevealed: boolean;
  canReveal: boolean;
  canReset: boolean;
  onReveal: () => void;
  onReset: () => void;
};

export function SessionActions({
  isRevealed,
  canReveal,
  canReset,
  onReveal,
  onReset,
}: SessionActionsProps) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-4">
      {!isRevealed ? (
        <button
          type="button"
          disabled={!canReveal}
          onClick={onReveal}
          className="rounded-md bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-dark-blue hover:cursor-pointer focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Reveal Votes
        </button>
      ) : (
        <button
          type="button"
          disabled={!canReset}
          onClick={onReset}
          className="rounded-md bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-dark-blue hover:cursor-pointer focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Reset
        </button>
      )}
    </div>
  );
}