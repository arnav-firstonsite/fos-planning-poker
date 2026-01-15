// app/planningPokerShared.ts

export type Vote =
  | '0'
  | '1'
  | '2'
  | '3'
  | '5'
  | '8'
  | '13'
  | '21'
  | '?'
  | 'coffee'

export type Participant = {
  id: string
  name: string
  vote: Vote | null
}

export type SessionData = {
  participants: Participant[]
  storyStatus: 'pending' | 'revealed'
}

// In-memory store keyed by roomId
const sessions = new Map<string, SessionData>()

export function getSession(roomId: string): SessionData {
  const existing = sessions.get(roomId)
  if (!existing) {
    // For unknown rooms, just create a blank one
    const blank: SessionData = { storyStatus: 'pending', participants: [] }
    sessions.set(roomId, blank)
    return blank
  }
  return existing
}

export function updateSession(
  roomId: string,
  update: (session: SessionData) => SessionData,
) {
  const current = getSession(roomId)
  const next = update(current)
  sessions.set(roomId, next)
  return next
}

function voteValue(vote: Vote | null) {
  if (vote === null) return -1
  const numeric = Number(vote)
  return Number.isNaN(numeric) ? -1 : numeric
}

export function sortSession(session: SessionData): SessionData {
  const isRevealed = session.storyStatus === 'revealed'

  const sortedParticipants = session.participants.slice().sort((a, b) => {
    // Before reveal: sort alphabetically by name
    if (!isRevealed) {
      return a.name.localeCompare(b.name)
    }

    // After reveal: sort by vote (highest first), then name
    const voteDiff = voteValue(b.vote) - voteValue(a.vote)
    if (voteDiff !== 0) return voteDiff

    return a.name.localeCompare(b.name)
  })

  return {
    ...session,
    participants: sortedParticipants,
  }
}
