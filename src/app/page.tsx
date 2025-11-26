// app/page.tsx (Server Component)

import { PlanningPokerClient } from "./PlanningPokerClient";

type Vote = "0" | "1" | "2" | "3" | "5" | "8" | "13" | "?" | "coffee";
type Participant = {
  id: string;
  name: string;
  role: "dev" | "qa";
  vote: Vote | null;
};
type SessionData = {
  participants: Participant[];
  storyStatus: "pending" | "revealed";
};

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

function voteValue(vote: Vote | null) {
  if (vote === null) return -1;
  const numeric = Number(vote);
  return Number.isNaN(numeric) ? -1 : numeric;
}

function rolePriority(p: Participant) {
  if (p.role === "dev") return 0;
  if (p.role === "qa") return 1;
  return 2;
}

function averageForRole(session: SessionData, role: Participant["role"]) {
  const votes = session.participants
    .filter((p) => p.role === role)
    .map((p) => p.vote)
    .filter((vote): vote is Exclude<Vote, "?" | "coffee"> => {
      if (vote === null) return false;
      return vote !== "?" && vote !== "coffee";
    })
    .map((vote) => Number(vote))
    .filter((v) => !Number.isNaN(v));

  if (!votes.length) return "—";
  const avg = votes.reduce((sum, v) => sum + v, 0) / votes.length;
  return Number.isInteger(avg) ? avg.toString() : avg.toFixed(1);
}

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
  // const isRevealed = session.storyStatus === "revealed";

  return (
    <PlanningPokerClient
      participants={sortedParticipants}
      devAverage={devAverage}
      qaAverage={qaAverage}
      // isRevealed={isRevealed}
      roomId="FO-1234"
    />
  );
}