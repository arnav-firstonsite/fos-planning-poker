// server.ts
import http, { IncomingMessage, ServerResponse } from "http";
import next from "next";
import { attachWebSocketServer, broadcastToRoom } from "./wsServer";
import {
  updateSession,
  getSession,
  Vote,
  sortSession,
} from "../app/planningPokerShared";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || "3000", 10);

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

async function handleApiRequest(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || "";
  const method = req.method || "GET";

  if (method === "POST" && url === "/api/upsert-participant") {
    let body: any;
    try {
      body = await parseJsonBody(req);
    } catch (err) {
      console.error("[api] upsert-participant invalid JSON", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const { roomId, userId, name, role } = body ?? {};

    if (
      typeof roomId !== "string" ||
      typeof userId !== "string" ||
      typeof name !== "string" ||
      (role !== "dev" && role !== "qa")
    ) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid payload" }));
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Name is required" }));
      return;
    }

    try {
      updateSession(roomId, (session) => {
        const existingIndex = session.participants.findIndex(
          (p) => p.id === userId
        );

        const updatedParticipant = {
          id: userId,
          name: trimmedName,
          role,
          vote:
            existingIndex === -1
              ? null
              : session.participants[existingIndex].vote,
        };

        let participants;
        if (existingIndex === -1) {
          participants = [...session.participants, updatedParticipant];
        } else {
          participants = session.participants.map((p, idx) =>
            idx === existingIndex ? updatedParticipant : p
          );
        }

        return {
          ...session,
          participants,
        };
      });

      const session = getSession(roomId);
      const sortedSession = sortSession(session);

      broadcastToRoom(roomId, {
        type: "session",
        roomId,
        session: sortedSession,
      });

      res.statusCode = 204;
      res.end();
    } catch (err) {
      console.error("[api] upsert-participant failed", { roomId, userId }, err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
    return;
  }

  if (method === "POST" && url === "/api/submit-vote") {
    let body: any;
    try {
      body = await parseJsonBody(req);
    } catch (err) {
      console.error("[api] submit-vote invalid JSON", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const { roomId, userId, vote } = body ?? {};

    if (
      typeof roomId !== "string" ||
      typeof userId !== "string" ||
      !(typeof vote === "string" || vote === null)
    ) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid payload" }));
      return;
    }

    const trimmedRoomId = roomId.trim();
    const trimmedUserId = userId.trim();

    const allowedVotes: Vote[] = [
      "0",
      "1",
      "2",
      "3",
      "5",
      "8",
      "13",
      "?",
      "coffee",
    ];

    const nextVote: Vote | null =
      vote === null ? null : (vote.trim() as Vote);

    if (nextVote !== null && !allowedVotes.includes(nextVote)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid vote" }));
      return;
    }

    try {
      updateSession(trimmedRoomId, (session) => {
        const hasParticipant = session.participants.some(
          (p) => p.id === trimmedUserId
        );
        if (!hasParticipant) return session;

        return {
          ...session,
          participants: session.participants.map((p) =>
            p.id === trimmedUserId ? { ...p, vote: nextVote } : p
          ),
        };
      });

      const session = getSession(trimmedRoomId);
      const sortedSession = sortSession(session);

      broadcastToRoom(trimmedRoomId, {
        type: "session",
        roomId: trimmedRoomId,
        session: sortedSession,
      });

      res.statusCode = 204;
      res.end();
    } catch (err) {
      console.error("[api] submit-vote failed", { roomId: trimmedRoomId, userId: trimmedUserId }, err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
    return;
  }

  if (method === "POST" && url === "/api/reveal") {
    let body: any;
    try {
      body = await parseJsonBody(req);
    } catch (err) {
      console.error("[api] reveal invalid JSON", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const { roomId } = body ?? {};

    if (typeof roomId !== "string") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid payload" }));
      return;
    }

    try {
      updateSession(roomId, (session) => ({
        ...session,
        storyStatus: "revealed",
      }));

      const session = getSession(roomId);
      const sortedSession = sortSession(session);

      broadcastToRoom(roomId, {
        type: "session",
        roomId,
        session: sortedSession,
      });

      res.statusCode = 204;
      res.end();
    } catch (err) {
      console.error("[api] reveal failed", { roomId }, err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
    return;
  }

  if (method === "POST" && url === "/api/reset") {
    let body: any;
    try {
      body = await parseJsonBody(req);
    } catch (err) {
      console.error("[api] reset invalid JSON", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const { roomId } = body ?? {};

    if (typeof roomId !== "string") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid payload" }));
      return;
    }

    try {
      updateSession(roomId, (session) => ({
        ...session,
        storyStatus: "pending",
        participants: session.participants.map((p) => ({
          ...p,
          vote: null,
        })),
      }));

      const session = getSession(roomId);
      const sortedSession = sortSession(session);

      broadcastToRoom(roomId, {
        type: "session",
        roomId,
        session: sortedSession,
      });

      res.statusCode = 204;
      res.end();
    } catch (err) {
      console.error("[api] reset failed", { roomId }, err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Not found" }));
}

async function main() {
  await app.prepare();

  const server = http.createServer(async (req, res) => {
    try {
      const url = req.url || "";
      if (url.startsWith("/api/")) {
        await handleApiRequest(req, res);
        return;
      }

      handle(req, res);
    } catch (err) {
      console.error("[http] unhandled error", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  });

  attachWebSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});