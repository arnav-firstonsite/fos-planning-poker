// app/PlanningPokerClient/components/ParticipantsTable.tsx

import { Participant } from '../../planningPokerShared'

type ParticipantsTableProps = {
  participants: Participant[]
  currentUserId: string
  isRevealed: boolean
}

export function ParticipantsTable({
  currentUserId,
  participants,
  isRevealed,
}: ParticipantsTableProps) {
  const paddingY =
    participants.length > 14
      ? 'py-1.5'
      : participants.length > 9
        ? 'py-2'
        : 'py-3'

  const thClassNames = `px-6 ${paddingY} font-semibold text-gray-800`

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100 text-left text-sm text-gray-700">
        <thead className="bg-gray-50">
          <tr>
            <th className={thClassNames}>Participant</th>
            <th className={thClassNames}>Vote</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {participants.map((participant) => {
            const voteDisplay = isRevealed
              ? participant.vote === 'coffee'
                ? '☕️'
                : (participant.vote ?? '—')
              : participant.vote
                ? '✓'
                : '—'

            const hasVote = participant.vote !== null

            const badgeClasses = {
              gray: 'bg-gray-100 text-gray-700 border-gray-300',
              green: 'bg-green-100 text-green-800 border-green-300',
              white: 'bg-white text-gray-900 border-gray-300',
            }

            const selectedBadgeClasses = !isRevealed
              ? hasVote
                ? badgeClasses.green
                : badgeClasses.gray
              : hasVote
                ? badgeClasses.white
                : badgeClasses.gray

            const isCurrentUser = participant.id === currentUserId

            // Always use the "dev" style background now
            const baseRowTone = 'bg-light-blue/20'

            return (
              <tr
                key={participant.id}
                className={`${baseRowTone} hover:brightness-95`}
              >
                <td className={`px-6 ${paddingY} font-medium text-gray-900`}>
                  {participant.name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs font-normal text-gray-700">
                      (you)
                    </span>
                  )}
                </td>
                <td className={`px-6 ${paddingY}`}>
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold border min-w-[2.5rem] ${selectedBadgeClasses}`}
                  >
                    {voteDisplay}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}