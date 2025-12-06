import { useEffect, useState } from "react";
import {
  Vote,
  SessionData,
  averageForRole,
  postJson
} from "../../planningPokerShared";

/**
 * Handles:
 * - WebSocket connection and liveSession
 * - derived session data (isRevealed, hasAnyVote, averages, currentUser)
 * - vote / reveal / reset mutations
 */
export default function usePlanningPokerSession(
  roomId: string,
  userId: string,
  hasUserProfile: boolean
) {
  const [liveSession, setLiveSession] = useState<SessionData | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  // WebSocket: subscribe to session updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId, userId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "session" && msg.roomId === roomId) {
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
  }, [roomId, userId]);

  const session: SessionData =
    liveSession ?? { participants: [], storyStatus: "pending" };

  const isRevealed = session.storyStatus === "revealed";
  const hasAnyVote = session.participants.some((p) => p.vote !== null);

  const devAverage = averageForRole(session, "dev");
  const qaAverage = averageForRole(session, "qa");

  const currentUser = session.participants.find((p) => p.id === userId) ?? null;

  const submitVote = async (vote: Vote) => {
    if (!hasUserProfile || !userId) return;

    const currentVote: Vote | null = currentUser?.vote ?? null;
    const newVote: Vote | null = currentVote === vote ? null : vote;

    try {
      await postJson("/api/submit-vote", {
        roomId,
        userId,
        vote: newVote,
      });
    } catch (err) {
      console.error("[vote] failed to submit vote", err);
    }
  };

  const reveal = async () => {
    setIsWorking(true);
    try {
      await postJson("/api/reveal", { roomId });
    } catch (err) {
      console.error("[reveal] failed to reveal votes", err);
    } finally {
      setIsWorking(false);
    }
  };

  const reset = async () => {
    setIsWorking(true);
    try {
      await postJson("/api/reset", { roomId });
    } catch (err) {
      console.error("[reset] failed to reset votes", err);
    } finally {
      setIsWorking(false);
    }
  };

  return {
    session,
    isRevealed,
    hasAnyVote,
    devAverage,
    qaAverage,
    currentUser,
    isWorking,
    submitVote,
    reveal,
    reset,
  };
}