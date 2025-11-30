"use server";

import { revalidatePath } from "next/cache";
import { getSession, updateSession, Participant, Vote } from "../planningPokerShared";

export async function submitVote(formData: FormData) {
  const voteRaw = formData.get("vote");
  const roomIdRaw = formData.get("roomId");
  const userIdRaw = formData.get("userId");

  // Ensure all required fields are present and strings
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

  // Require non-empty values
  if (!voteStr || !roomId || !userId) {
    return;
  }

  // Ensure the vote is one of the allowed values at runtime
  const allowedVotes: Vote[] = ["0", "1", "2", "3", "5", "8", "13", "?", "coffee"];
  if (!allowedVotes.includes(voteStr as Vote)) {
    return;
  }

  const vote = voteStr as Vote;

  // Simulated latency (optional)
  await new Promise((resolve) => setTimeout(resolve, 300));

  updateSession(roomId, (session) => {
    const hasParticipant = session.participants.some((p) => p.id === userId);
    if (!hasParticipant) {
      // If somehow this user isn't in the room, do nothing
      return session;
    }

    return {
      ...session,
      participants: session.participants.map((p) =>
        p.id === userId ? { ...p, vote } : p
      ),
    };
  });

  // Optional: touch the updated session for logging / debugging
  getSession(roomId);

  // Re-render the home page on next request/render so the table reflects updated votes
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
      // Update existing participant's name and role if changed
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

  // Optional: force evaluation or logging
  getSession(trimmedRoomId);

  // Re-render the home page on next request/render so the table reflects the updated participants
  revalidatePath("/");
}