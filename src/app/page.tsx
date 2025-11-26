// app/page.tsx (Server Component)

import { Vote, Participant, SessionData, voteValue, rolePriority, averageForRole } from "./planningPokerShared";
import { PlanningPokerClient } from "./PlanningPokerClient";
// Temporary mock; later fetch from DB or session
const mockSession: SessionData = {
  storyStatus: "pending",
  participants: [
    { id: "p1", name: "Avery", role: "dev", vote: '5' },
    { id: "p2", name: "Blake", role: "dev", vote: "3" },
    { id: "p3", name: "Casey", role: "dev", vote: "5" },
    { id: "p4", name: "Devon", role: "dev", vote: "8" },
    { id: "p5", name: "Eden", role: "qa", vote: "3" },
    { id: "p6", name: "Finley", role: "qa", vote: "?"  },
    { id: "p7", name: "Gray", role: "qa", vote: "5" },
    { id: "p8", name: "Harper", role: "dev", vote: null },
  ],
};

export default async function Home() {
  // In real app, you'd do:
  // const session = await getSessionFromDbOrWhatever();
  const session = mockSession;

  const sortedParticipants = session.participants
    .slice()
    .sort((a, b) => {
      const roleDiff = rolePriority(a) - rolePriority(b);
      if (roleDiff !== 0) return roleDiff;

      const voteDiff = voteValue(b.vote) - voteValue(a.vote);
      if (voteDiff !== 0) return voteDiff;

      return a.name.localeCompare(b.name);
    });

  const devAverage = averageForRole(session, "dev");
  const qaAverage = averageForRole(session, "qa");

  return (
    <PlanningPokerClient
      participants={sortedParticipants}
      devAverage={devAverage}
      qaAverage={qaAverage}
      roomId="FO-1234"
    />
  );
}