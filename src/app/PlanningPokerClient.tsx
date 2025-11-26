// app/PlanningPokerClient.tsx
"use client";

import { useState, useTransition } from "react";
import { submitVote } from "./actions/vote";
import { revealVotes } from "./actions/reveal";

type Vote = "0" | "1" | "2" | "3" | "5" | "8" | "13" | "?" | "coffee";
const VOTE_OPTIONS: Vote[] = ["0", "1", "2", "3", "5", "8", "13", "?", "coffee"];

type Participant = {
  id: string;
  name: string;
  role: "dev" | "qa";
  vote: Vote | null;
};

type Props = {
  participants: Participant[];
  devAverage: string;
  qaAverage: string;
//   isRevealed: boolean;
  roomId: string;
};

function capitalizeFirstLetter(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

export function PlanningPokerClient({
  participants,
  devAverage,
  qaAverage,
//   isRevealed,
  roomId,
}: Props) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevealing, startReveal] = useTransition();

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-light-grey font-sans ">
      <header className="flex flex-col justify-center h-12 bg-orange w-full text-dark-blue text-center">
        First Onsite Planning Poker
      </header>
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-3 border-b border-gray-100 px-6 py-4">
              {VOTE_OPTIONS.map((vote) => (
                <form key={vote} action={submitVote} className="flex">
                  <input type="hidden" name="vote" value={vote} />
                  <input type="hidden" name="roomId" value={roomId} />
                  <button
                    type="submit"
                    className="rounded-md border border-[hsl(var(--accent))]/30 bg-white px-3 py-2 text-sm font-semibold text-[hsl(var(--accent))] shadow-sm transition hover:-translate-y-0.5 hover:shadow-none hover:bg-orange hover:text-white focus:shadow-none focus:bg-orange focus:text-white "
                  >
                    {vote === "coffee" ? "☕️" : vote}
                  </button>
                </form>
              ))}
            </div>

            <div className="grid grid-cols-2 items-center justify-center gap-2 px-6 py-4 text-center text-sm font-semibold text-[hsl(var(--highlight))]">
              <span className="w-full">Dev Avg: {isRevealed ? devAverage : "—"}</span>
              <span className="w-full">QA Avg: {isRevealed ? qaAverage : "—"}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm text-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-800">Participant</th>
                    <th className="px-6 py-3 font-semibold text-gray-800">Role</th>
                    <th className="px-6 py-3 font-semibold text-gray-800">Vote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {participants.map((participant) => {
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
                      <tr key={participant.id} className={`${rowTone} hover:brightness-95`}>
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {participant.name}
                        </td>
                        <td className="px-6 py-3 text-gray-600">{roleLabel}</td>
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
                <form
                  action={(formData) =>
                    startReveal(async () => {
                      setIsRevealed(true)
                      await revealVotes(formData);
                    })
                  }
                >
                  <input type="hidden" name="roomId" value={roomId} />
                  <button
                    type="submit"
                    disabled={isRevealing}
                    className="rounded-md bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-dark-blue focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isRevealing ? "Revealing..." : "Reveal Votes"}
                  </button>
                </form>
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