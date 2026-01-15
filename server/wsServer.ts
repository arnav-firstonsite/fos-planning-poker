// src/server/wsServer.ts
import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HttpServer } from 'http'
import {
  updateSession,
  getSession,
  sortSession,
} from '../app/planningPokerShared'

type RoomId = string
type RoomsMap = Map<RoomId, Set<WebSocket>>
type SocketInfo = { roomId: RoomId; userId: string }
type UserConnectionCounts = Map<string, number> // key: `${roomId}:${userId}`

const rooms: RoomsMap = new Map()
const socketInfo = new Map<WebSocket, SocketInfo>()
const userConnectionCounts: UserConnectionCounts = new Map()

const HEARTBEAT_INTERVAL_MS = 30000 // 30 seconds heartbeat

type JoinMessage = {
  type: 'join'
  roomId: string
  userId: string
}

type ClientMessage = JoinMessage // extendable later

function isJoinMessage(msg: unknown): msg is JoinMessage {
  if (!msg || typeof msg !== 'object') return false
  const m = msg as Record<string, unknown>
  return (
    m.type === 'join' &&
    typeof m.roomId === 'string' &&
    typeof m.userId === 'string'
  )
}

function getSortedSession(roomId: RoomId) {
  const session = getSession(roomId)
  return sortSession(session)
}

function broadcastSession(roomId: RoomId) {
  const sortedSession = getSortedSession(roomId)
  broadcastToRoom(roomId, {
    type: 'session',
    roomId,
    session: sortedSession,
  })
}

export function attachWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
  })

  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as WebSocket & { isAlive?: boolean }

      if (ws.isAlive === false) {
        // This will trigger ws.on('close') and cleanup logic
        ws.terminate()
        return
      }

      ws.isAlive = false
      ws.ping()
    })
  }, HEARTBEAT_INTERVAL_MS)

  wss.on('close', () => {
    clearInterval(interval)
  })

  wss.on('connection', (socket: WebSocket) => {
    const ws = socket as WebSocket & { isAlive?: boolean }
    ws.isAlive = true

    ws.on('pong', () => {
      ws.isAlive = true
    })

    ws.on('message', (data) => {
      try {
        const raw = data.toString()
        const msg: ClientMessage = JSON.parse(raw)

        if (isJoinMessage(msg)) {
          const roomId = msg.roomId.trim()
          const userId = msg.userId.trim()
          if (!roomId || !userId) return

          if (!rooms.has(roomId)) rooms.set(roomId, new Set())
          rooms.get(roomId)!.add(ws)

          socketInfo.set(ws, { roomId, userId })

          const userKey = `${roomId}:${userId}`
          const prevCount = userConnectionCounts.get(userKey) ?? 0
          userConnectionCounts.set(userKey, prevCount + 1)

          const sortedSession = getSortedSession(roomId)

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'session',
                roomId,
                session: sortedSession,
              }),
            )
          }

          return
        }

        console.warn('[ws] unknown message type', { raw })
      } catch (err) {
        console.error('[ws] failed to handle message', {
          error: err instanceof Error ? err.message : String(err),
          raw: data.toString(),
        })
      }
    })

    ws.on('close', () => {
      const info = socketInfo.get(ws)
      if (!info) return

      const { roomId, userId } = info

      const sockets = rooms.get(roomId)
      if (sockets) {
        sockets.delete(ws)
        if (sockets.size === 0) {
          rooms.delete(roomId)
        }
      }

      socketInfo.delete(ws)

      const userKey = `${roomId}:${userId}`
      const prevCount = userConnectionCounts.get(userKey) ?? 0

      if (prevCount <= 1) {
        userConnectionCounts.delete(userKey)

        try {
          updateSession(roomId, (session) => ({
            ...session,
            participants: session.participants.filter((p) => p.id !== userId),
          }))

          broadcastSession(roomId)
        } catch (err) {
          console.error('[ws] error during disconnect cleanup', {
            roomId,
            userId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      } else {
        userConnectionCounts.set(userKey, prevCount - 1)
      }
    })

    ws.on('error', (err) => {
      console.warn('[ws] socket error', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  })
}

export function broadcastToRoom(roomId: string, payload: unknown) {
  const sockets = rooms.get(roomId)
  if (!sockets) return

  const msg = JSON.stringify(payload)
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(msg)
    }
  }
}
