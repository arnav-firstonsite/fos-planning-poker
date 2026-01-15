import { BarChart, XAxis, Bar, ResponsiveContainer } from 'recharts'
import type { SessionData } from '../../planningPokerShared'

type ChartDatum = {
  name: string
  count: number
}

function sessionToChartData(session: SessionData): ChartDatum[] {
  const counts: Record<string, number> = {
    '0': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '5': 0,
    '8': 0,
    '13': 0,
  }

  for (const participant of session.participants) {
    const vote = participant.vote
    if (vote === null || vote === 'coffee' || vote === '?') continue

    counts[vote] = (counts[vote] ?? 0) + 1
  }

  return Object.entries(counts).map(([name, count]) => ({ name, count }))
}

type VoteChartProps = {
  title: string
  data: ChartDatum[]
  barColor: string
}

function VoteChart({ title, data, barColor }: VoteChartProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
        {title}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} style={{ fontFamily: 'inherit' }}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <Bar dataKey="count" fill={barColor} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

type ChartsProps = {
  session: SessionData
}

export function Charts({ session }: ChartsProps) {
  if (session.storyStatus === 'pending') {
    return null
  }

  const data = sessionToChartData(session)

  return (
    <div className="flex w-full flex-row flex-wrap items-center justify-center gap-4 px-4 text-center pt-4">
      <VoteChart title="Votes" data={data} barColor="var(--color-dark-blue)" />
    </div>
  )
}
