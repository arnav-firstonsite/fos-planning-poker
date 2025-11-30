// app/actions/reveal.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateSession, getSession } from "../planningPokerShared";
import { broadcastToRoom } from "../../server/wsServer";

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function revealVotes(formData: FormData) {
  const roomId = formData.get("roomId");
  if (typeof roomId !== "string") return;

  await timeout(300);
  updateSession(roomId, (session) => ({
    ...session,
    storyStatus: "revealed",
  }));

  const session = getSession(roomId);

  // 🔴 NEW
  broadcastToRoom(roomId, {
    type: "session",
    roomId,
    session,
  });

  revalidatePath("/");
}