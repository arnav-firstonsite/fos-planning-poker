// app/page.tsx (Server Component)
import { PlanningPokerClient } from "./PlanningPokerClient";

const ROOM_ID = "000";

export default function Home() {
  return <PlanningPokerClient roomId={ROOM_ID} />;
}