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
} from "../planningPokerShared";
import { PlanningPokerHeader } from "./PlanningPokerHeader";
import { VoteControls } from "./VoteControls";
import { AveragesBar } from "./AveragesBar";
import { ParticipantsTable } from "./ParticipantsTable";
import { SessionActions } from "./SessionActions";
import { ProfileModal } from "./ProfileModal";

const VOTE_OPTIONS: Vote[] = ["0", "1", "2", "3", "5", "8", "13", "?", "coffee"];
const ROOM_ID = "000";

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

    if (!userId) {
      return;
    }

    if (!(userRole === "dev" || userRole === "qa")) {
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
      <PlanningPokerHeader onChangeProfile={() => setShowProfileModal(true)} />

      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-start px-4 pt-10 pb-4 md:justify-center md:px-6 md:py-16 md:-mt-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-sm">
            <VoteControls
              options={VOTE_OPTIONS}
              selectedVote={currentUser?.vote ?? null}
              disabled={!hasUserProfile}
              onVoteClick={handleVoteClick}
            />

            <AveragesBar
              isRevealed={isRevealedToRender}
              devAverage={devAverageToRender}
              qaAverage={qaAverageToRender}
            />

            <ParticipantsTable
              participants={participantsToRender}
              currentUserId={userId}
              isRevealed={isRevealedToRender}
            />

            <SessionActions
              isRevealed={isRevealedToRender}
              canReveal={hasAnyVote && !isWorking}
              canReset={!isWorking}
              onReveal={handleRevealClick}
              onReset={handleResetClick}
            />
          </div>
        </div>
      </main>

      {profileChecked && showProfileModal && (
        <ProfileModal
          name={userName}
          role={userRole}
          onNameChange={setUserName}
          onRoleChange={setUserRole}
          onSubmit={handleProfileSubmit}
        />
      )}
    </div>
  );
}