// app/components/VoteControls.tsx

import type { Vote } from "../planningPokerShared";

type VoteControlsProps = {
  selectedVote: Vote | null;
  disabled: boolean;
  onVoteClick: (vote: Vote) => void;
};

const VOTE_OPTIONS: Vote[] = ["0", "1", "2", "3", "5", "8", "13", "?", "coffee"];

export function VoteControls({
  selectedVote,
  disabled,
  onVoteClick,
}: VoteControlsProps) {
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-gray-100 px-6 py-4">
      {VOTE_OPTIONS.map((vote) => {
        const isSelected = selectedVote === vote;

        return (
          <button
            key={vote}
            type="button"
            disabled={disabled}
            onClick={() => onVoteClick(vote)}
            className={`rounded-md border border-[hsl(var(--accent))]/30 px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
              isSelected
                ? "bg-orange text-white shadow-none"
                : "bg-white text-[hsl(var(--accent))] shadow-sm hover:text-dark-blue hover:shadow-none"
            }`}
          >
            {vote === "coffee" ? "☕️" : vote}
          </button>
        );
      })}
    </div>
  );
}