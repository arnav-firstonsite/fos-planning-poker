

// app/actions/reset.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateSession } from "../planningPokerShared";

//------------------------------------------------------
// Source - https://stackoverflow.com/a
// Posted by Bergi, modified by community. See post 'Timeline' for change history
// Retrieved 2025-11-26, License - CC BY-SA 4.0

function timeout(ms) {
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
    participants: [
      { id: "p1", name: "Avery", role: "dev", vote: "5" },
      { id: "p2", name: "Blake", role: "dev", vote: "3" },
      { id: "p3", name: "Casey", role: "dev", vote: "5" },
      { id: "p4", name: "Devon", role: "dev", vote: "8" },
      { id: "p5", name: "Eden", role: "qa", vote: "3" },
      { id: "p6", name: "Finley", role: "qa", vote: "?" },
      { id: "p7", name: "Gray", role: "qa", vote: "5" },
      { id: "p8", name: "Harper", role: "dev", vote: null },
    ],
  }));

  // Re-render the home page on next request/render
  revalidatePath("/");
}