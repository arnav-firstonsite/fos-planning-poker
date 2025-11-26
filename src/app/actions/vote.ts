"use server";

import { revalidatePath } from "next/cache";
import { getSession, updateSession, Participant } from "../planningPokerShared";

export async function submitVote(formData: FormData) {
  // Simulate a POST to persist the vote. Replace with real persistence.
  const vote = formData.get("vote");

  console.log("[vote] received", vote);
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export async function upsertParticipant(
  roomId: string,
  userId: string,
  userName: string,
  userRole: "dev" | "qa"
) {
  const trimmedName = userName.trim();
  if (!roomId || !userId || !trimmedName || (userRole !== "dev" && userRole !== "qa")) {
    return;
  }

  updateSession(roomId, (session) => {
    const existing = session.participants.find(
      (p) => p.id === userId
    );

    if (existing) {
      // Update existing participant's name and role if changed
      return {
        ...session,
        participants: session.participants.map((p) =>
          p.id === userId ? { ...p, name: trimmedName, role: userRole } : p
        ),
      };
    }

    const newParticipant: Participant = {
      id: userId,
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
  getSession(roomId);

  // Re-render the home page on next request/render so the table reflects the updated participants
  revalidatePath("/");
}