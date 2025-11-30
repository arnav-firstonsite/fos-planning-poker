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

import "../server/wsServer";

const ROOM_ID = "000";

export default async function Home() {
  // In real life, you might read roomId from search params, URL, auth, etc.
  const session: SessionData = getSession(ROOM_ID);

  const isRevealed = session.storyStatus === "revealed";

  const sortedParticipants: Participant[] = session.participants
    .slice()
    .sort((a, b) => {
      // Devs on top, QA on bottom (assuming rolePriority implements that)
      const roleDiff = rolePriority(a) - rolePriority(b);
      if (roleDiff !== 0) return roleDiff;

      // BEFORE reveal: keep order stable and independent of votes
      // → A–Z within each role group
      if (!isRevealed) {
        return a.name.localeCompare(b.name);
      }

      // AFTER reveal: sort within each role group by vote (high → low),
      // falling back to name A–Z for ties / missing values.
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
      isRevealed={isRevealed}
      roomId={ROOM_ID}
    />
  );
}