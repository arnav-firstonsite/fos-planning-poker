// app/PlanningPokerClient.tsx
"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitVote, upsertParticipant } from "./actions/vote";
import { revealVotes } from "./actions/reveal";
import { resetVotes } from "./actions/reset";
import { Vote, Participant } from "./planningPokerShared";

const VOTE_OPTIONS: Vote[] = ["0", "1", "2", "3", "5", "8", "13", "?", "coffee"];

type Props = {
  participants: Participant[];
  devAverage: string;
  qaAverage: string;
  isRevealed: boolean;
  roomId: string;
};

function capitalizeFirstLetter(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

export function PlanningPokerClient({
  participants,
  devAverage,
  qaAverage,
  isRevealed,
  roomId,
}: Props) {
  const router = useRouter();

  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<"dev" | "qa" | "">("");
  const [showProfileModal, setShowProfileModal] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Ensure we have a stable userId
    let storedId = window.localStorage.getItem("planningPokerUserId");
    if (!storedId) {
      storedId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.localStorage.setItem("planningPokerUserId", storedId);
    }
    setUserId(storedId);

    const storedName = window.localStorage.getItem("planningPokerUserName") ?? "";
    const storedRole = window.localStorage.getItem("planningPokerUserRole");

    if (storedName) setUserName(storedName);
    if (storedRole === "dev" || storedRole === "qa") setUserRole(storedRole);

    // NOTE: Do NOT close modal automatically
  }, []);

  const hasUserProfile = !!userName && (userRole === "dev" || userRole === "qa");

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = userName.trim();
    if (!trimmedName || !(userRole === "dev" || userRole === "qa")) {
      return;
    }

    if (!userId) {
      // Should not normally happen because we initialize userId in useEffect,
      // but guard just in case.
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("planningPokerUserName", trimmedName);
      window.localStorage.setItem("planningPokerUserRole", userRole);
    }

    // Insert or update this user in the global room data on the server
    await upsertParticipant(roomId, userId, trimmedName, userRole);

    // Refresh the data so the table reflects the updated participants
    router.refresh();

    // User explicitly confirms → close modal
    setShowProfileModal(false);
  };

  const [isWorking, startWork] = useTransition();

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-light-grey font-sans ">
      <header className="flex flex-col justify-center h-12 bg-orange w-full text-dark-blue text-center">
        First Onsite Planning Poker
      </header>
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Vote buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 border-b border-gray-100 px-6 py-4">
              {VOTE_OPTIONS.map((vote) => (
                <form key={vote} action={submitVote} className="flex">
                  <input type="hidden" name="vote" value={vote} />
                  <input type="hidden" name="roomId" value={roomId} />
                  <input type="hidden" name="userId" value={userId} />
                  <button
                    type="submit"
                    className="rounded-md border border-[hsl(var(--accent))]/30 bg-white px-3 py-2 text-sm font-semibold text-[hsl(var(--accent))] shadow-sm transition hover:-translate-y-0.5 hover:shadow-none hover:bg-orange hover:text-white focus:shadow-none focus:bg-orange focus:text-white "
                  >
                    {vote === "coffee" ? "☕️" : vote}
                  </button>
                </form>
              ))}
            </div>

            {/* Averages */}
            <div className="grid grid-cols-2 items-center justify-center gap-2 px-6 py-4 text-center text-sm font-semibold text-[hsl(var(--highlight))]">
              <span className="w-full">Dev Avg: {isRevealed ? devAverage : "—"}</span>
              <span className="w-full">QA Avg: {isRevealed ? qaAverage : "—"}</span>
            </div>

            {/* Participant table */}
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

            {/* Reveal / Reset buttons */}
            <div className="flex items-center justify-center gap-3 px-6 py-4">
              {!isRevealed ? (
                <form
                  action={(formData) =>
                    startWork(async () => {
                      await revealVotes(formData);
                    })
                  }
                >
                  <input type="hidden" name="roomId" value={roomId} />
                  <button
                    type="submit"
                    disabled={isWorking}
                    className="rounded-md bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-dark-blue focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isWorking ? "Working..." : "Reveal Votes"}
                  </button>
                </form>
              ) : (
                <form action={(formData) =>
                    startWork(async () => {
                      await resetVotes(formData);
                    })
                  }>
                  <input type="hidden" name="roomId" value={roomId} />
                  <button
                    type="submit"
                    disabled={isWorking}
                    className="rounded-md bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-dark-blue focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isWorking ? "Working..." : "Reset"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
    </main>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Please tell us who you are
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Please enter your name and role so we can attach your votes.
            </p>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="text-left">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="text-left">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Role
                </span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="role"
                      value="dev"
                      checked={userRole === "dev"}
                      onChange={() => setUserRole("dev")}
                      className="h-4 w-4"
                    />
                    Dev
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="role"
                      value="qa"
                      checked={userRole === "qa"}
                      onChange={() => setUserRole("qa")}
                      className="h-4 w-4"
                    />
                    QA
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dark-blue focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}