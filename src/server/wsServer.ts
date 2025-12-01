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

export function attachWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  wss.on("connection", (socket: WebSocket) => {
    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "join") {
          const roomId = String(msg.roomId ?? "");
          const userId = String(msg.userId ?? "").trim();
          if (!roomId || !userId) return;

          if (!rooms.has(roomId)) rooms.set(roomId, new Set());
          rooms.get(roomId)!.add(socket);

          socketInfo.set(socket, { roomId, userId });
          console.log("[ws] join", { roomId, userId });

          const userKey = `${roomId}:${userId}`;
          const prevCount = userConnectionCounts.get(userKey) ?? 0;
          userConnectionCounts.set(userKey, prevCount + 1);

          const session = getSession(roomId);
          console.log("[ws] join snapshot", {
            roomId,
            participants: session.participants.map((p) => ({
              id: p.id,
              name: p.name,
              role: p.role,
              vote: p.vote,
            })),
          });

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

      const sockets = rooms.get(roomId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          rooms.delete(roomId);
        }
      }

      socketInfo.delete(socket);

      const userKey = `${roomId}:${userId}`;
      const prevCount = userConnectionCounts.get(userKey) ?? 0;

      if (prevCount <= 1) {
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
        userConnectionCounts.set(userKey, prevCount - 1);
      }
    });

    socket.on("error", (err) => {
      console.error("[ws] socket error", err);
    });
  });

  console.log("[ws] WebSocket server attached to HTTP server at /ws");
}

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