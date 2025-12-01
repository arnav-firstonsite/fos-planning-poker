// app/actions/vote.ts
"use server";

import { revalidatePath } from "next/cache";
import {
  getSession,
  updateSession,
  Participant,
  Vote,
} from "../planningPokerShared";
import { broadcastToRoom } from "../../server/wsServer";

export async function submitVote(formData: FormData) {
  const voteRaw = formData.get("vote");
  const roomIdRaw = formData.get("roomId");
  const userIdRaw = formData.get("userId");

  if (
    typeof voteRaw !== "string" ||
    typeof roomIdRaw !== "string" ||
    typeof userIdRaw !== "string"
  ) {
    return;
  }

  const voteStr = voteRaw.trim();
  const roomId = roomIdRaw.trim();
  const userId = userIdRaw.trim();

  if (!voteStr || !roomId || !userId) return;

  const allowedVotes: Vote[] = ["0", "1", "2", "3", "5", "8", "13", "?", "coffee"];
  if (!allowedVotes.includes(voteStr as Vote)) return;

  const vote = voteStr as Vote;

  // Removed artificial delay here

  updateSession(roomId, (session) => {
    const hasParticipant = session.participants.some((p) => p.id === userId);
    if (!hasParticipant) return session;

    return {
      ...session,
      participants: session.participants.map((p) =>
        p.id === userId ? { ...p, vote } : p
      ),
    };
  });

  const session = getSession(roomId);

  // Broadcast updated session to all connected clients for this room
  broadcastToRoom(roomId, {
    type: "session",
    roomId,
    session,
  });

  revalidatePath("/");
}

export async function upsertParticipant(
  roomId: string,
  userId: string,
  name: string,
  role: "dev" | "qa"
) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  updateSession(roomId, (session) => {
    const existingIndex = session.participants.findIndex(
      (p) => p.id === userId
    );

    const updatedParticipant = {
      id: userId,
      name: trimmedName,
      role,
      // preserve existing vote if already present
      vote:
        existingIndex === -1
          ? null
          : session.participants[existingIndex].vote,
    };

    let participants;
    if (existingIndex === -1) {
      participants = [...session.participants, updatedParticipant];
    } else {
      participants = session.participants.map((p, idx) =>
        idx === existingIndex ? updatedParticipant : p
      );
    }

    return {
      ...session,
      participants,
    };
  });

  const session = getSession(roomId);

  broadcastToRoom(roomId, {
    type: "session",
    roomId,
    session,
  });
}