// server.ts
import http, { IncomingMessage, ServerResponse } from "http";
import next from "next";
import { attachWebSocketServer, broadcastToRoom } from "./src/server/wsServer";
import {
  updateSession,
  getSession,
  Vote,
} from "./src/app/planningPokerShared";

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

  // Simple routing
  if (method === "POST" && url === "/api/upsert-participant") {
    const body = await parseJsonBody(req);
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

    console.log("[api] upsert-participant", { roomId, userId, trimmedName, role });

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

    console.log("[api] upsert-participant updated session", {
      roomId,
      participants: session.participants.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        vote: p.vote,
      })),
    });

    broadcastToRoom(roomId, {
      type: "session",
      roomId,
      session,
    });

    res.statusCode = 204;
    res.end();
    return;
  }

  if (method === "POST" && url === "/api/submit-vote") {
    const body = await parseJsonBody(req);
    const { roomId, userId, vote } = body ?? {};

    if (
      typeof roomId !== "string" ||
      typeof userId !== "string" ||
      typeof vote !== "string"
    ) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid payload" }));
      return;
    }

    const voteStr = vote.trim() as Vote;
    const allowedVotes: Vote[] = ["0", "1", "2", "3", "5", "8", "13", "?", "coffee"];
    if (!allowedVotes.includes(voteStr)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid vote" }));
      return;
    }

    console.log("[api] submit-vote", { roomId, userId, vote: voteStr });

    updateSession(roomId, (session) => {
      const hasParticipant = session.participants.some((p) => p.id === userId);
      if (!hasParticipant) return session;

      return {
        ...session,
        participants: session.participants.map((p) =>
          p.id === userId ? { ...p, vote: voteStr } : p
        ),
      };
    });

    const session = getSession(roomId);

    broadcastToRoom(roomId, {
      type: "session",
      roomId,
      session,
    });

    res.statusCode = 204;
    res.end();
    return;
  }

  if (method === "POST" && url === "/api/reveal") {
    const body = await parseJsonBody(req);
    const { roomId } = body ?? {};

    if (typeof roomId !== "string") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid payload" }));
      return;
    }

    console.log("[api] reveal", { roomId });

    updateSession(roomId, (session) => ({
      ...session,
      storyStatus: "revealed",
    }));

    const session = getSession(roomId);

    broadcastToRoom(roomId, {
      type: "session",
      roomId,
      session,
    });

    res.statusCode = 204;
    res.end();
    return;
  }

  if (method === "POST" && url === "/api/reset") {
    const body = await parseJsonBody(req);
    const { roomId } = body ?? {};

    if (typeof roomId !== "string") {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid payload" }));
      return;
    }

    console.log("[api] reset", { roomId });

    updateSession(roomId, (session) => ({
      ...session,
      storyStatus: "pending",
      participants: session.participants.map((p) => ({
        ...p,
        vote: null,
      })),
    }));

    const session = getSession(roomId);

    broadcastToRoom(roomId, {
      type: "session",
      roomId,
      session,
    });

    res.statusCode = 204;
    res.end();
    return;
  }

  // Not one of our API routes
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

      // Let Next handle everything else
      handle(req, res);
    } catch (err) {
      console.error("[http] error", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  });

  // Attach WebSocket server to the same HTTP server
  attachWebSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});