// app/components/PlanningPokerHeader.tsx

type PlanningPokerHeaderProps = {
  onChangeProfile: () => void
}

export function PlanningPokerHeader({ onChangeProfile }: PlanningPokerHeaderProps) {
  return (
    <header className="flex items-center justify-between h-12 bg-orange w-full px-4 text-dark-blue">
      <div className="font-semibold cursor-default">First Onsite Planning Poker</div>
      <button
        type="button"
        onClick={onChangeProfile}
        className="rounded-md bg-dark-blue text-white px-4 py-2 text-xs font-semibold shadow-sm transition hover:bg-white hover:text-dark-blue hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-1"
      >
        Change Profile
      </button>
    </header>
  )
}
