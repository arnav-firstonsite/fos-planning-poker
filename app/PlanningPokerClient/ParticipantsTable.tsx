// app/components/ParticipantsTable.tsx

import { Participant, rolePriority, voteValue } from "../planningPokerShared";

type ParticipantsTableProps = {
  participants: Participant[];
  currentUserId: string;
  isRevealed: boolean;
};

function capitalizeFirstLetter(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

function sortParticipants(
  participants: Participant[],
  isRevealed: boolean
): Participant[] {
  return participants.slice().sort((a, b) => {
    const roleDiff = rolePriority(a) - rolePriority(b);
    if (roleDiff !== 0) return roleDiff;

    if (!isRevealed) {
      return a.name.localeCompare(b.name);
    }

    const voteDiff = voteValue(b.vote) - voteValue(a.vote);
    if (voteDiff !== 0) return voteDiff;

    return a.name.localeCompare(b.name);
  });
}

export function ParticipantsTable({
  currentUserId,
  participants,
  isRevealed,
}: ParticipantsTableProps) {
    const participantsToRender = sortParticipants(
    participants,
    isRevealed
  );
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100 text-left text-sm text-gray-700">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 font-semibold text-gray-800">
              Participant
            </th>
            <th className="px-6 py-3 font-semibold text-gray-800">Role</th>
            <th className="px-6 py-3 font-semibold text-gray-800">Vote</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {participantsToRender.map((participant) => {
            const voteDisplay = isRevealed
              ? participant.vote === "coffee"
                ? "☕️"
                : participant.vote ?? "—"
              : participant.vote
              ? "✓"
              : "—";

            const hasVote = participant.vote !== null;

            const badgeClasses = {
              gray: "bg-gray-100 text-gray-700 border-gray-300",
              green: "bg-green-100 text-green-800 border-green-300",
              white: "bg-white text-gray-900 border-gray-300",
            };

            const selectedBadgeClasses = !isRevealed
              ? hasVote
                ? badgeClasses.green
                : badgeClasses.gray
              : hasVote
              ? badgeClasses.white
              : badgeClasses.gray;

            const roleLabel =
              participant.role === "qa"
                ? "QA"
                : capitalizeFirstLetter(participant.role);

            const isCurrentUser = participant.id === currentUserId;

            const baseRowTone =
              participant.role === "dev"
                ? "bg-light-blue/20"
                : participant.role === "qa"
                ? "bg-orange/40"
                : "bg-light-grey";

            return (
              <tr
                key={participant.id}
                className={`${baseRowTone} hover:brightness-95`}
              >
                <td className="px-6 py-3 font-medium text-gray-900">
                  {participant.name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs font-normal text-gray-700">
                      (you)
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-gray-600">{roleLabel}</td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold border min-w-[2.5rem] ${selectedBadgeClasses}`}
                  >
                    {voteDisplay}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}