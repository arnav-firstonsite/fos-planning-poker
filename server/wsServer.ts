// src/server/wsServer.ts
import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HttpServer } from 'http'
import { updateSession, getSession, sortSession } from '../app/planningPokerShared'

type RoomId = string
type RoomsMap = Map<RoomId, Set<WebSocket>>
type SocketInfo = { roomId: RoomId; userId: string }
type UserConnectionCounts = Map<string, number> // key: `${roomId}:${userId}`

const rooms: RoomsMap = new Map()
const socketInfo = new Map<WebSocket, SocketInfo>()
const userConnectionCounts: UserConnectionCounts = new Map()

export function attachWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
  })

  wss.on('connection', (socket: WebSocket) => {
    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())

        if (msg.type === 'join') {
          const roomId = String(msg.roomId ?? '')
          const userId = String(msg.userId ?? '').trim()
          if (!roomId || !userId) return

          if (!rooms.has(roomId)) rooms.set(roomId, new Set())
          rooms.get(roomId)!.add(socket)

          socketInfo.set(socket, { roomId, userId })

          const session = getSession(roomId)
          const sortedSession = sortSession(session)

          socket.send(
            JSON.stringify({
              type: 'session',
              roomId,
              session: sortedSession,
            }),
          )
        }
        // if you add more message types later, handle them here
      } catch (err) {
        console.error('[ws] failed to handle message', {
          error: err instanceof Error ? err.message : String(err),
          raw: data.toString(),
        })
      }
    })

    socket.on('close', () => {
      const info = socketInfo.get(socket)
      if (!info) return

      const { roomId, userId } = info

      const sockets = rooms.get(roomId)
      if (sockets) {
        sockets.delete(socket)
        if (sockets.size === 0) {
          rooms.delete(roomId)
        }
      }

      socketInfo.delete(socket)

      const userKey = `${roomId}:${userId}`
      const prevCount = userConnectionCounts.get(userKey) ?? 0

      if (prevCount <= 1) {
        userConnectionCounts.delete(userKey)

        try {
          updateSession(roomId, (session) => ({
            ...session,
            participants: session.participants.filter((p) => p.id !== userId),
          }))

          const session = getSession(roomId)
          const sortedSession = sortSession(session)

          broadcastToRoom(roomId, {
            type: 'session',
            roomId,
            session: sortedSession,
          })
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

    socket.on('error', (err) => {
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
