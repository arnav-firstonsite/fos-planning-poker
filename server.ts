// server.ts
import http from "http";
import next from "next";
import { attachWebSocketServer } from "./src/server/wsServer";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || "3000", 10);

async function main() {
  await app.prepare();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  // Attach your WebSocket server to the same HTTP server
  attachWebSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});