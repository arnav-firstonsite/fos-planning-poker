// src/server/wsServer.ts
import { WebSocketServer, WebSocket } from "ws";

type RoomId = string;
type RoomSockets = Map<RoomId, Set<WebSocket>>;

// Use a global to avoid multiple servers in dev (HMR)
declare global {
  // eslint-disable-next-line no-var
  var __fosPlanningPokerWSS:
    | {
        wss: WebSocketServer;
        rooms: RoomSockets;
      }
    | undefined;
}

function createServer() {
  const rooms: RoomSockets = new Map();

  const wss = new WebSocketServer({ port: 8080 });

  wss.on("connection", (socket: WebSocket) => {
    let currentRoom: RoomId | null = null;

    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "join" && typeof msg.roomId === "string") {
          const roomId = msg.roomId as RoomId;
          currentRoom = roomId;

          if (!rooms.has(roomId)) rooms.set(roomId, new Set());
          rooms.get(roomId)!.add(socket);
        }
      } catch (err) {
        console.error("[ws] failed to parse message", err);
      }
    });

    socket.on("close", () => {
      if (currentRoom && rooms.has(currentRoom)) {
        rooms.get(currentRoom)!.delete(socket);
      }
    });

    socket.on("error", (err) => {
      console.error("[ws] socket error", err);
    });
  });

  console.log("[ws] WebSocket server listening on ws://localhost:8080");

  return { wss, rooms };
}

const server =
  global.__fosPlanningPokerWSS ||
  (global.__fosPlanningPokerWSS = createServer());

export const rooms = server.rooms;

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