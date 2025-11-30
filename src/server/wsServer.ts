// src/server/wsServer.ts
import { WebSocketServer, WebSocket } from "ws";
import { updateSession, getSession } from "../app/planningPokerShared";

type RoomId = string;
type RoomsMap = Map<RoomId, Set<WebSocket>>;
type SocketInfo = { roomId: RoomId; userId: string };

// Use a global so we don't create multiple servers during dev HMR
declare global {
  // eslint-disable-next-line no-var
  var __FOS_WS_SERVER__:
    | {
        wss: WebSocketServer;
        rooms: RoomsMap;
        socketInfo: Map<WebSocket, SocketInfo>;
      }
    | undefined;
}

function createServer() {
  const rooms: RoomsMap = new Map();
  const socketInfo = new Map<WebSocket, SocketInfo>();

  const wss = new WebSocketServer({ port: 8080 });

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

      // Immediately remove this user from the session and broadcast the update
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
    });

    socket.on("error", (err) => {
      console.error("[ws] socket error", err);
    });
  });

  console.log("[ws] WebSocket server listening on ws://localhost:8080");

  return { wss, rooms, socketInfo };
}

const server =
  global.__FOS_WS_SERVER__ ?? (global.__FOS_WS_SERVER__ = createServer());

export const rooms = server.rooms;
export const socketInfo = server.socketInfo;

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