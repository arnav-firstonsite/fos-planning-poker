// app/planningPokerShared.ts

export type Vote = "0" | "1" | "2" | "3" | "5" | "8" | "13" | "?" | "coffee";

export type Participant = {
  id: string;
  name: string;
  role: "dev" | "qa";
  vote: Vote | null;
};

export type SessionData = {
  participants: Participant[];
  storyStatus: "pending" | "revealed";
};

// In-memory store keyed by roomId (NOT production-safe, but great for learning)
const sessions = new Map<string, SessionData>();


export function getSession(roomId: string): SessionData {
  const existing = sessions.get(roomId);
  if (!existing) {
    // For unknown rooms, just create a blank one
    const blank: SessionData = { storyStatus: "pending", participants: [] };
    sessions.set(roomId, blank);
    return blank;
  }
  return existing;
}

export function updateSession(roomId: string, update: (session: SessionData) => SessionData) {
  const current = getSession(roomId);
  const next = update(current);
  sessions.set(roomId, next);
  return next;
}

export function voteValue(vote: Vote | null) {
  if (vote === null) return -1;
  const numeric = Number(vote);
  return Number.isNaN(numeric) ? -1 : numeric;
}

export function rolePriority(p: Participant) {
  if (p.role === "dev") return 0;
  if (p.role === "qa") return 1;
  return 2;
}

export function averageForRole(session: SessionData, role: Participant["role"]) {
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