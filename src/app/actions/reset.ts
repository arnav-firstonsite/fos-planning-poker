// app/actions/reset.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateSession, getSession } from "../planningPokerShared";
import { broadcastToRoom } from "../../server/wsServer";

export async function resetVotes(formData: FormData) {
  const roomId = formData.get("roomId");
  if (typeof roomId !== "string") return;

  updateSession(roomId, (session) => ({
    ...session,
    storyStatus: "pending",
    participants: session.participants.map((p) => ({
      ...p,
      vote: null,
    })),
  }));

  const session = getSession(roomId);

  broadcastToRoom(roomId, {
    type: "session",
    roomId,
    session,
  });

  revalidatePath("/");
}