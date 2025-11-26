// app/page.tsx (Server Component)

import {
  SessionData,
  Participant,
  voteValue,
  rolePriority,
  averageForRole,
  getSession,
} from "./planningPokerShared";
import { PlanningPokerClient } from "./PlanningPokerClient";

const ROOM_ID = "000";

export default async function Home() {
  // In real life, you might read roomId from search params, URL, auth, etc.
  const session: SessionData = getSession(ROOM_ID);

  const sortedParticipants: Participant[] = session.participants
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
  const isRevealed = session.storyStatus === "revealed";

  return (
    <PlanningPokerClient
      participants={sortedParticipants}
      devAverage={devAverage}
      qaAverage={qaAverage}
      isRevealed={isRevealed}
      roomId={ROOM_ID}
    />
  );
}