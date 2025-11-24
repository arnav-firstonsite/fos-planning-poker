"use server";

export async function revealVotes(formData: FormData) {
  console.log("[vote_reveal] received");
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 300));
}
