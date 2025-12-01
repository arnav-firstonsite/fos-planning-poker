// app/page.tsx (Server Component)
import { PlanningPokerClient } from "./PlanningPokerClient";

const ROOM_ID = "000";

export default function Home() {
  // Initial values are placeholders; the client will get the real session via WebSocket.
  return (
    <PlanningPokerClient
      participants={[]}
      devAverage="—"
      qaAverage="—"
      isRevealed={false}
      roomId={ROOM_ID}
    />
  );
}