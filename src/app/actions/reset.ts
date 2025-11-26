// app/actions/reset.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateSession } from "../planningPokerShared";

//------------------------------------------------------
// Source - https://stackoverflow.com/a
// Posted by Bergi, modified by community. See post 'Timeline' for change history
// Retrieved 2025-11-26, License - CC BY-SA 4.0

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//------------------------------------------------------

export async function resetVotes(formData: FormData) {
  const roomId = formData.get("roomId");
  if (typeof roomId !== "string") return;

  await timeout(300);
  updateSession(roomId, (session) => ({
    ...session,
    storyStatus: "pending",
    participants: session.participants.map((p) => ({
      ...p,
      vote: null,
    })),
  }));

  // Re-render the home page on next request/render
  revalidatePath("/");
}