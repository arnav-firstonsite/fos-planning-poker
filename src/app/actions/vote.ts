"use server";

export async function submitVote(formData: FormData) {
  // Simulate a POST to persist the vote. Replace with real persistence.
  const vote = formData.get("vote");

  console.log("[vote] received", vote);
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 300));
}
