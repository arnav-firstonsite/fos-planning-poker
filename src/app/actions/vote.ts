"use server";

import { revalidatePath } from "next/cache";
import { getSession, updateSession, Participant, Vote } from "../planningPokerShared";
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

  await new Promise((resolve) => setTimeout(resolve, 300));

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

  // 🔴 NEW: broadcast updated session to all connected clients for this room
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
  userName: string,
  userRole: "dev" | "qa"
) {
  const trimmedRoomId = roomId.trim();
  const trimmedUserId = userId.trim();
  const trimmedName = userName.trim();

  if (
    !trimmedRoomId ||
    !trimmedUserId ||
    !trimmedName ||
    (userRole !== "dev" && userRole !== "qa")
  ) {
    return;
  }

  updateSession(trimmedRoomId, (session) => {
    const existing = session.participants.find((p) => p.id === trimmedUserId);

    if (existing) {
      return {
        ...session,
        participants: session.participants.map((p) =>
          p.id === trimmedUserId ? { ...p, name: trimmedName, role: userRole } : p
        ),
      };
    }

    const newParticipant: Participant = {
      id: trimmedUserId,
      name: trimmedName,
      role: userRole,
      vote: null,
    };

    return {
      ...session,
      participants: [...session.participants, newParticipant],
    };
  });

  const session = getSession(trimmedRoomId);

  // 🔴 NEW: broadcast updated session to all clients
  broadcastToRoom(trimmedRoomId, {
    type: "session",
    roomId: trimmedRoomId,
    session,
  });

  revalidatePath("/");
}