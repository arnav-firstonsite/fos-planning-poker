/** @jsxImportSource react */
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type Vote = "0" | "1" | "2" | "3" | "5" | "8" | "13" | "?" | "coffee";

type Participant = {
  id: string;
  name: string;
  role: "dev" | "qa" | "facilitator";
  vote: Vote | null;
};

type Story = {
  status: "pending" | "revealed";
  average: number | null;
};

type SessionData = {
  facilitatorId: string;
  participants: Participant[];
  currentStory: Story;
};

// Example mock payload for the Planning Poker UI to consume.
const mockSession: SessionData = {
  facilitatorId: "p1",
  currentStory: {
    status: "pending",
    average: null,
  },
  participants: [
    { id: "p1", name: "Avery", role: "facilitator", vote: null },
    { id: "p2", name: "Blake", role: "dev", vote: "3" },
    { id: "p3", name: "Casey", role: "dev", vote: "5" },
    { id: "p4", name: "Devon", role: "dev", vote: "8" },
    { id: "p5", name: "Eden", role: "qa", vote: "3" },
    { id: "p6", name: "Finley", role: "qa", vote: "?"  },
    { id: "p7", name: "Gray", role: "qa", vote: "5" },
    { id: "p8", name: "Harper", role: "dev", vote: null },
  ],
};

function capitalizeFirstLetter(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

export default function Home() {
  const [isRevealed, setIsRevealed] = useState(
    mockSession.currentStory.status === "revealed"
  );

  const sortedParticipants = useMemo(() => {
    const voteValue = (vote: Vote | null) => {
      if (vote === null) return -1;
      const numeric = Number(vote);
      return Number.isNaN(numeric) ? -1 : numeric;
    };

    const rolePriority = (p: Participant) => {
      if (p.role === "dev") return 0;
      if (p.role === "qa") return 1;
      return 2;
    };

    return mockSession.participants
      .filter((p) => p.id !== mockSession.facilitatorId)
      .slice()
      .sort((a, b) => {
        const roleDiff = rolePriority(a) - rolePriority(b);
        if (roleDiff !== 0) return roleDiff;

        const voteDiff = voteValue(b.vote) - voteValue(a.vote);
        if (voteDiff !== 0) return voteDiff;

        return a.name.localeCompare(b.name);
      });
  }, []);

  const { devAverage, qaAverage } = useMemo(() => {
    const averageForRole = (role: Participant["role"]) => {
      const votes = mockSession.participants
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
    };

    return {
      devAverage: averageForRole("dev"),
      qaAverage: averageForRole("qa"),
    };
  }, []);

  const facilitator = useMemo(
    () =>
      mockSession.participants.find(
        (p) => p.id === mockSession.facilitatorId
      ) ?? null,
    []
  );

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-light-grey font-sans ">
      <header className="flex flex-col justify-center h-12 bg-orange w-full text-dark-blue text-center">
        First Onsite Planning Poker
      </header>
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* <h1 className="flex items-center gap-3 text-3xl font-semibold leading-10 tracking-tight text-dark-blue">
            <Image
              src="/logo.svg"
              alt="First Onsite logo"
              width={160}
              height={16}
            />
            <span>Planning Poker</span>
          </h1> */}
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 text-sm font-semibold text-[hsl(var(--highlight))]">
              <span>Dev Avg: {isRevealed ? devAverage : "—"}</span>
              <span>QA Avg: {isRevealed ? qaAverage : "—"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm text-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-800">
                      Participant
                    </th>
                    <th className="px-6 py-3 font-semibold text-gray-800">
                      Role
                    </th>
                    <th className="px-6 py-3 font-semibold text-gray-800">
                      Vote
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedParticipants.map((participant) => {
                    const voteDisplay = isRevealed
                      ? participant.vote ?? "—"
                      : participant.vote
                      ? "✓"
                      : "—";
                    const roleLabel =
                      participant.role === "qa"
                        ? "QA"
                        : capitalizeFirstLetter(participant.role);
                    const rowTone =
                      participant.role === "dev"
                        ? "bg-blue-50/80"
                        : participant.role === "qa"
                        ? "bg-orange-50/80"
                        : "bg-gray-50";

                    return (
                      <tr
                        key={participant.id}
                        className={`${rowTone} hover:brightness-95`}
                      >
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {participant.name}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {roleLabel}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isRevealed && participant.vote
                                ? "bg-orange-50 text-orange-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
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

            <div className="flex items-center justify-center gap-3 px-6 py-4">
              {!isRevealed ? (
                <button
                  type="button"
                  onClick={() => setIsRevealed(true)}
                  className="rounded-md bg-foreground text-dark-blue px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
                >
                  Reveal Votes
                </button>
              ) : (
                <span className="rounded-md border-2 border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">
                  Votes revealed
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
