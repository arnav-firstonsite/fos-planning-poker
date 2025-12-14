import { BarChart, XAxis, Bar, ResponsiveContainer } from "recharts";
import type { SessionData } from "../../planningPokerShared";

type ChartDatum = {
  name: string;
  count: number;
};

function transformSession(session: SessionData, role: "dev" | "qa"): ChartDatum[] {
  const counts: Record<string, number> = {};

  for (const participant of session.participants) {
    if (participant.role !== role) continue;

    const vote = participant.vote;
    if (vote === null || vote === "coffee" || vote === "?") continue;

    counts[vote] = (counts[vote] ?? 0) + 1;
  }

  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

type ChartsProps = {
  session: SessionData;
};

export function Charts({ session }: ChartsProps) {
  if (session.storyStatus === "pending") {
    return null;
  }

  return (
    <div className="flex w-full flex-row flex-wrap items-center justify-center gap-4 px-4 text-center pt-4">
      <div className="flex-1 min-w-0">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
          Dev
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart
            data={transformSession(session, "dev")}
            style={{ fontFamily: "inherit" }}
          >
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <Bar dataKey="count" fill="var(--color-dark-blue)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
          QA
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart
            data={transformSession(session, "qa")}
            style={{ fontFamily: "inherit" }}
          >
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <Bar dataKey="count" fill="var(--color-orange)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}