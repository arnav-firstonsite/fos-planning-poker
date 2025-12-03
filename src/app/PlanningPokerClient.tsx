// app/PlanningPokerClient.tsx
"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import {
  Vote,
  Participant,
  SessionData,
  averageForRole,
  rolePriority,
  voteValue,
} from "./planningPokerShared";

const VOTE_OPTIONS: Vote[] = ["0", "1", "2", "3", "5", "8", "13", "?", "coffee"];
const ROOM_ID = "000";

function capitalizeFirstLetter(str: string): string {
  return str[0].toUpperCase() + str.slice(1);
}

function sortParticipants(
  participants: Participant[],
  storyStatus: SessionData["storyStatus"]
): Participant[] {
  const isRevealed = storyStatus === "revealed";

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

async function postJson(path: string, body: any) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with ${res.status}`);
  }
}

export function PlanningPokerClient() {
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<"dev" | "qa" | "">("");

  const [profileChecked, setProfileChecked] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Live session coming from WebSocket – single source of truth for game state
  const [liveSession, setLiveSession] = useState<SessionData | null>(null);

  const hasUserProfile =
    !!userId && !!userName && (userRole === "dev" || userRole === "qa");

  const [isWorking, startWork] = useTransition();

  // Bootstrap identity from localStorage and auto-join room if profile exists
  useEffect(() => {
    if (typeof window === "undefined") return;

    let storedId = window.localStorage.getItem("planningPokerUserId");
    if (!storedId) {
      storedId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      window.localStorage.setItem("planningPokerUserId", storedId);
    }
    setUserId(storedId);

    const storedName =
      window.localStorage.getItem("planningPokerUserName") ?? "";
    const storedRole = window.localStorage.getItem("planningPokerUserRole");

    const hasStoredProfile =
      !!storedName && (storedRole === "dev" || storedRole === "qa");

    if (storedName) setUserName(storedName);
    if (storedRole === "dev" || storedRole === "qa") setUserRole(storedRole);

    if (hasStoredProfile) {
      (async () => {
        try {
          await postJson("/api/upsert-participant", {
            roomId: ROOM_ID,
            userId: storedId,
            name: storedName,
            role: storedRole,
          });
          setShowProfileModal(false);
        } catch (err) {
          console.error("[profile] failed to auto-join room", err);
          setShowProfileModal(true);
        } finally {
          setProfileChecked(true);
        }
      })();
    } else {
      setShowProfileModal(true);
      setProfileChecked(true);
    }
  }, []);

  // WebSocket: subscribe to session updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId: ROOM_ID, userId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "session" && msg.roomId === ROOM_ID) {
          setLiveSession(msg.session as SessionData);
        }
      } catch (err) {
        console.error("[ws] bad message", err, { raw: event.data });
      }
    };

    ws.onerror = (event) => {
      console.error("[ws] socket error", event);
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  // If we don't have a liveSession yet, show an empty pending session
  const sessionToRender: SessionData =
    liveSession ?? { participants: [], storyStatus: "pending" };

  const participantsToRender = sortParticipants(
    sessionToRender.participants,
    sessionToRender.storyStatus
  );
  const isRevealedToRender = sessionToRender.storyStatus === "revealed";

  // Disable Reveal when no one has voted
  const hasAnyVote = sessionToRender.participants.some(
    (p) => p.vote !== null
  );

  const devAverageToRender = averageForRole(sessionToRender, "dev");
  const qaAverageToRender = averageForRole(sessionToRender, "qa");

  const currentUser = sessionToRender.participants.find(
    (p) => p.id === userId
  );

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = userName.trim();
    if (!trimmedName || !(userRole === "dev" || userRole === "qa")) {
      return;
    }

    if (!userId) {
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("planningPokerUserName", trimmedName);
      window.localStorage.setItem("planningPokerUserRole", userRole);
    }

    try {
      await postJson("/api/upsert-participant", {
        roomId: ROOM_ID,
        userId,
        name: trimmedName,
        role: userRole,
      });
      setShowProfileModal(false);
    } catch (err) {
      console.error("[profile] failed to save profile", err);
    }
  };

  const handleVoteClick = async (vote: Vote) => {
    if (!hasUserProfile || !userId) return;

    // Toggle based purely on server state for this user
    const currentVote: Vote | null = currentUser?.vote ?? null;
    const newVote: Vote | null = currentVote === vote ? null : vote;

    try {
      await postJson("/api/submit-vote", {
        roomId: ROOM_ID,
        userId,
        vote: newVote,
      });
    } catch (err) {
      console.error("[vote] failed to submit vote", err);
    }
  };

  const handleRevealClick = () => {
    startWork(async () => {
      try {
        await postJson("/api/reveal", { roomId: ROOM_ID });
      } catch (err) {
        console.error("[reveal] failed to reveal votes", err);
      }
    });
  };

  const handleResetClick = () => {
    startWork(async () => {
      try {
        await postJson("/api/reset", { roomId: ROOM_ID });
      } catch (err) {
        console.error("[reset] failed to reset votes", err);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-light-grey font-sans">
      <header className="flex items-center justify-between h-12 bg-orange w-full px-4 text-dark-blue">
        <div className="font-semibold">First Onsite Planning Poker</div>
        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="rounded-md bg-dark-blue text-white px-4 py-2 text-xs font-semibold shadow-sm transition hover:bg-white hover:text-dark-blue focus:outline-none focus:ring-2 focus:ring-dark-blue focus:ring-offset-1"
        >
          Change profile
        </button>
      </header>

      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-start px-4 pt-10 pb-4 md:justify-center md:px-6 md:py-16 md:-mt-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Vote buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 border-b border-gray-100 px-6 py-4">
              {VOTE_OPTIONS.map((vote) => {
                const isSelected = currentUser?.vote === vote;

                return (
                  <button
                    key={vote}
                    type="button"
                    disabled={!hasUserProfile}
                    onClick={() => handleVoteClick(vote)}
                    className={`rounded-md border border-[hsl(var(--accent))]/30 px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected
                        ? "bg-orange text-white shadow-none"
                        : "bg-white text-[hsl(var(--accent))] shadow-sm hover:bg-orange hover:text-white hover:shadow-none"
                    }`}
                  >
                    {vote === "coffee" ? "☕️" : vote}
                  </button>
                );
              })}
            </div>

            {/* Averages */}
            <div className="grid grid-cols-2 items-center justify-center gap-2 px-6 py-4 text-center text-sm font-semibold text-[hsl(var(--highlight))]">
              <span className="w-full">
                Dev Avg: {isRevealedToRender ? devAverageToRender : "—"}
              </span>
              <span className="w-full">
                QA Avg: {isRevealedToRender ? qaAverageToRender : "—"}
              </span>
            </div>

            {/* Participant table */}
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
                  {participantsToRender.map((participant) => {
                    const voteDisplay = isRevealedToRender
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

                    const selectedBadgeClasses = !isRevealedToRender
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

                    const isCurrentUser = participant.id === userId;

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
                        <td className="px-6 py-3 text-gray-600">
                          {roleLabel}
                        </td>
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

            {/* Reveal / Reset buttons */}
            <div className="flex items-center justify-center gap-3 px-6 py-4">
              {!isRevealedToRender ? (
                <button
                  type="button"
                  disabled={isWorking || !hasAnyVote}
                  onClick={handleRevealClick}
                  className="rounded-md bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-dark-blue focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isWorking ? "Working..." : "Reveal Votes"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={handleResetClick}
                  className="rounded-md bg-foreground text-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-dark-blue focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isWorking ? "Working..." : "Reset"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {profileChecked && showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Welcome
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
                  maxLength={50}
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
                      required
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