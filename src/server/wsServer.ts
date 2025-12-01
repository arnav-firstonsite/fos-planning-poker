// src/server/wsServer.ts
import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { updateSession, getSession } from "../app/planningPokerShared";

type RoomId = string;
type RoomsMap = Map<RoomId, Set<WebSocket>>;
type SocketInfo = { roomId: RoomId; userId: string };
type UserConnectionCounts = Map<string, number>; // key: `${roomId}:${userId}`

const rooms: RoomsMap = new Map();
const socketInfo = new Map<WebSocket, SocketInfo>();
const userConnectionCounts: UserConnectionCounts = new Map();

/**
 * Attach a WebSocket server to an existing HTTP server.
 * This keeps everything in a single Node process, sharing the in-memory sessions.
 */
export function attachWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({
    server,
    path: "/ws", // only handle WebSocket upgrades on /ws
  });

  wss.on("connection", (socket: WebSocket) => {
    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "join") {
          const roomId = String(msg.roomId ?? "");
          const userId = String(msg.userId ?? "").trim();
          if (!roomId || !userId) return;

          // Track socket per room
          if (!rooms.has(roomId)) rooms.set(roomId, new Set());
          rooms.get(roomId)!.add(socket);

          // Remember which room/user this socket represents
          socketInfo.set(socket, { roomId, userId });

          console.log("[ws] join", { roomId, userId });

          // Increment per-user connection count
          const userKey = `${roomId}:${userId}`;
          const prevCount = userConnectionCounts.get(userKey) ?? 0;
          userConnectionCounts.set(userKey, prevCount + 1);

          // Send the current session snapshot to the newly joined client
          const session = getSession(roomId);

          socket.send(
            JSON.stringify({
              type: "session",
              roomId,
              session,
            })
          );
        }
      } catch (err) {
        console.error("[ws] failed to parse message", err);
      }
    });

    socket.on("close", () => {
      const info = socketInfo.get(socket);
      if (!info) return;

      const { roomId, userId } = info;
      console.log("[ws] close", { roomId, userId });

      // Clean up socket from room map
      const sockets = rooms.get(roomId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          rooms.delete(roomId);
        }
      }

      socketInfo.delete(socket);

      // Handle per-user connection count and conditional participant removal
      const userKey = `${roomId}:${userId}`;
      const prevCount = userConnectionCounts.get(userKey) ?? 0;

      if (prevCount <= 1) {
        // This was the last active connection for this user in this room:
        // remove them from the session and delete the counter entry.
        userConnectionCounts.delete(userKey);

        try {
          updateSession(roomId, (session) => ({
            ...session,
            participants: session.participants.filter((p) => p.id !== userId),
          }));

          const session = getSession(roomId);

          broadcastToRoom(roomId, {
            type: "session",
            roomId,
            session,
          });
        } catch (err) {
          console.error(
            `[ws] failed to remove user ${userId} from room ${roomId} on disconnect`,
            err
          );
        }
      } else {
        // Other connections for this user are still active; just decrement.
        userConnectionCounts.set(userKey, prevCount - 1);
      }
    });

    socket.on("error", (err) => {
      console.error("[ws] socket error", err);
    });
  });

  console.log("[ws] WebSocket server attached to HTTP server at /ws");
}

/**
 * Broadcast a payload to all clients subscribed to a room.
 */
export function broadcastToRoom(roomId: string, payload: unknown) {
  const sockets = rooms.get(roomId);
  if (!sockets) return;

  const msg = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(msg);
    }
  }
}