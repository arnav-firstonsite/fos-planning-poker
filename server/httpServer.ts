// server/httpServer.ts
import http, { IncomingMessage, ServerResponse } from 'http'
import next from 'next'
import { attachWebSocketServer, broadcastToRoom } from './wsServer'
import {
  updateSession,
  getSession,
  Vote,
  sortSession,
} from '../app/planningPokerShared'

const app = next({ dev: process.env.NODE_ENV !== 'production' })
const handle = app.getRequestHandler()
const port = parseInt(process.env.PORT || '3000', 10)

// ----- Types -----
type UpsertParticipantBody = {
  roomId: string
  userId: string
  name: string
}

type SubmitVoteBody = {
  roomId: string
  userId: string
  vote: string | null
}

type RoomOnlyBody = {
  roomId: string
}

// Single place for allowed votes
const ALLOWED_VOTES: Vote[] = [
  '0',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '?',
  'coffee',
]

// ----- Helpers -----
function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      if (!data) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(data)
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', (err) => {
      reject(err)
    })
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function sendNoContent(res: ServerResponse) {
  res.statusCode = 204
  res.end()
}

function broadcastRoomUpdate(roomId: string) {
  const session = getSession(roomId)
  const sortedSession = sortSession(session)

  broadcastToRoom(roomId, {
    type: 'session',
    roomId,
    session: sortedSession,
  })
}

// ----- Route Handlers -----
async function handleUpsertParticipant(
  req: IncomingMessage,
  res: ServerResponse,
) {
  let body: unknown
  try {
    body = await parseJsonBody(req)
  } catch (err) {
    console.error('[api] upsert-participant invalid JSON', err)
    return sendJson(res, 400, { error: 'Invalid JSON' })
  }

  const { roomId, userId, name } = (body ??
    {}) as Partial<UpsertParticipantBody>

  if (
    typeof roomId !== 'string' ||
    typeof userId !== 'string' ||
    typeof name !== 'string'
  ) {
    return sendJson(res, 400, { error: 'Invalid payload' })
  }

  const trimmedRoomId = roomId.trim()
  const trimmedUserId = userId.trim()
  const trimmedName = name.trim()

  if (!trimmedRoomId || !trimmedUserId || !trimmedName) {
    return sendJson(res, 400, { error: 'Name and IDs are required' })
  }

  try {
    updateSession(trimmedRoomId, (session) => {
      const existingIndex = session.participants.findIndex(
        (p) => p.id === trimmedUserId,
      )

      const updatedParticipant = {
        id: trimmedUserId,
        name: trimmedName,
        vote:
          existingIndex === -1
            ? null
            : session.participants[existingIndex].vote,
      }

      let participants
      if (existingIndex === -1) {
        participants = [...session.participants, updatedParticipant]
      } else {
        participants = session.participants.map((p, idx) =>
          idx === existingIndex ? updatedParticipant : p,
        )
      }

      return {
        ...session,
        participants,
      }
    })

    broadcastRoomUpdate(trimmedRoomId)
    sendNoContent(res)
  } catch (err) {
    console.error(
      '[api] upsert-participant failed',
      { roomId: trimmedRoomId, userId: trimmedUserId },
      err,
    )
    sendJson(res, 500, { error: 'Internal Server Error' })
  }
}

async function handleSubmitVote(req: IncomingMessage, res: ServerResponse) {
  let body: unknown
  try {
    body = await parseJsonBody(req)
  } catch (err) {
    console.error('[api] submit-vote invalid JSON', err)
    return sendJson(res, 400, { error: 'Invalid JSON' })
  }

  const { roomId, userId, vote } = (body ?? {}) as Partial<SubmitVoteBody>

  if (
    typeof roomId !== 'string' ||
    typeof userId !== 'string' ||
    !(typeof vote === 'string' || vote === null)
  ) {
    return sendJson(res, 400, { error: 'Invalid payload' })
  }

  const trimmedRoomId = roomId.trim()
  const trimmedUserId = userId.trim()

  if (!trimmedRoomId || !trimmedUserId) {
    return sendJson(res, 400, { error: 'Invalid IDs' })
  }

  const nextVote: Vote | null = vote === null ? null : (vote.trim() as Vote)

  if (nextVote !== null && !ALLOWED_VOTES.includes(nextVote)) {
    return sendJson(res, 400, { error: 'Invalid vote' })
  }

  try {
    updateSession(trimmedRoomId, (session) => {
      const hasParticipant = session.participants.some(
        (p) => p.id === trimmedUserId,
      )
      if (!hasParticipant) return session

      return {
        ...session,
        participants: session.participants.map((p) =>
          p.id === trimmedUserId ? { ...p, vote: nextVote } : p,
        ),
      }
    })

    broadcastRoomUpdate(trimmedRoomId)
    sendNoContent(res)
  } catch (err) {
    console.error(
      '[api] submit-vote failed',
      { roomId: trimmedRoomId, userId: trimmedUserId, vote: nextVote },
      err,
    )
    sendJson(res, 500, { error: 'Internal Server Error' })
  }
}

async function handleReveal(req: IncomingMessage, res: ServerResponse) {
  let body: unknown
  try {
    body = await parseJsonBody(req)
  } catch (err) {
    console.error('[api] reveal invalid JSON', err)
    return sendJson(res, 400, { error: 'Invalid JSON' })
  }

  const { roomId } = (body ?? {}) as Partial<RoomOnlyBody>

  if (typeof roomId !== 'string') {
    return sendJson(res, 400, { error: 'Invalid payload' })
  }

  const trimmedRoomId = roomId.trim()

  if (!trimmedRoomId) {
    return sendJson(res, 400, { error: 'Invalid roomId' })
  }

  try {
    updateSession(trimmedRoomId, (session) => ({
      ...session,
      storyStatus: 'revealed',
    }))

    broadcastRoomUpdate(trimmedRoomId)
    sendNoContent(res)
  } catch (err) {
    console.error('[api] reveal failed', { roomId: trimmedRoomId }, err)
    sendJson(res, 500, { error: 'Internal Server Error' })
  }
}

async function handleReset(req: IncomingMessage, res: ServerResponse) {
  let body: unknown
  try {
    body = await parseJsonBody(req)
  } catch (err) {
    console.error('[api] reset invalid JSON', err)
    return sendJson(res, 400, { error: 'Invalid JSON' })
  }

  const { roomId } = (body ?? {}) as Partial<RoomOnlyBody>

  if (typeof roomId !== 'string') {
    return sendJson(res, 400, { error: 'Invalid payload' })
  }

  const trimmedRoomId = roomId.trim()

  if (!trimmedRoomId) {
    return sendJson(res, 400, { error: 'Invalid roomId' })
  }

  try {
    updateSession(trimmedRoomId, (session) => ({
      ...session,
      storyStatus: 'pending',
      participants: session.participants.map((p) => ({
        ...p,
        vote: null,
      })),
    }))

    broadcastRoomUpdate(trimmedRoomId)
    sendNoContent(res)
  } catch (err) {
    console.error('[api] reset failed', { roomId: trimmedRoomId }, err)
    sendJson(res, 500, { error: 'Internal Server Error' })
  }
}

// ----- API Router -----
type ApiHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void> | void

const postHandlers: Record<string, ApiHandler> = {
  '/api/upsert-participant': handleUpsertParticipant,
  '/api/submit-vote': handleSubmitVote,
  '/api/reveal': handleReveal,
  '/api/reset': handleReset,
}

async function handleApiRequest(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || ''
  const method = req.method || 'GET'
  const [path] = url.split('?', 1) // ignore query string for routing

  if (method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  const handler = postHandlers[path]
  if (!handler) {
    return sendJson(res, 404, { error: 'Not found' })
  }

  try {
    await handler(req, res)
  } catch (err) {
    console.error('[api] unhandled error', { method, path }, err)
    sendJson(res, 500, { error: 'Internal Server Error' })
  }
}

// ----- Server bootstrap -----
async function main() {
  await app.prepare()

  const server = http.createServer(async (req, res) => {
    try {
      const url = req.url || ''
      if (url.startsWith('/api/')) {
        await handleApiRequest(req, res)
        return
      }

      handle(req, res)
    } catch (err) {
      console.error('[http] unhandled error', err)
      sendJson(res, 500, { error: 'Internal Server Error' })
    }
  })

  attachWebSocketServer(server)

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
