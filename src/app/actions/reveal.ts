// app/actions/reveal.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateSession } from "../planningPokerShared";

export async function revealVotes(formData: FormData) {
  const roomId = formData.get("roomId");
  if (typeof roomId !== "string") return;

  updateSession(roomId, (session) => ({
    ...session,
    storyStatus: "revealed",
  }));

  // Tell Next to re-render the home page on next request/render
  revalidatePath("/");
}