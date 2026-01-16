// app/PlanningPokerClient/components/PlanningPokerHeader.tsx
type PlanningPokerHeaderProps = {
  onChangeProfile: () => void
}

export function PlanningPokerHeader({
  onChangeProfile,
}: PlanningPokerHeaderProps) {
  return (
    <header className="flex h-12 w-full items-center justify-between bg-orange px-4 text-dark-blue">
      <div className="flex items-center font-semibold cursor-default">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 150 127.1"
          aria-hidden="true"
          className="mr-2 h-5 w-auto flex-none"
        >
          <path
            className="fill-current"
            d="M16.57,0H0l26.13,127.09h16.53c-.02-.06-.03-.13-.04-.19L16.57,0ZM119.91,46.16l4.96-24.49h-23.78l3.77-21.67H28.13l4.96,24.33h67.46l-2.25,13.21h-29.37l-33.15.12,5.87,27.99,22.26-.12h28.96l-.09.36c-4.12,12.77-17.06,15.87-20.98,17.36-1.97.75-6.36,1.53-10.26,2.12l-.04.02h49.87l5.61-25.83h-22.59l2.35-13.4h23.15Z"
          />
        </svg>
        <span className="flex-1">First Onsite Planning Poker</span>
      </div>
      <button
        type="button"
        onClick={onChangeProfile}
        className="rounded-md bg-dark-blue px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:cursor-pointer hover:bg-white hover:text-dark-blue focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-1"
      >
        Change Profile
      </button>
    </header>
  )
}