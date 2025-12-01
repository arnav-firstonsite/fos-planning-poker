# First Onsite Planning Poker

A simple, real-time planning poker app built with Next.js, React, and WebSockets.  
Designed for dev/QA estimation sessions at First Onsite.

Users join a single room, pick a role (Dev or QA), cast votes, reveal/reset as a group, and see everyone update live.

---

## Features

- 🔁 **Real-time updates** via WebSockets (`/ws`) – everyone sees joins, leaves, and votes instantly
- 👤 **Per-user profiles** stored in `localStorage`
  - Stable `userId` per browser
  - Name + role (`dev` or `qa`) persisted across sessions
- 🧑‍💻 **Dev vs QA roles**
  - Devs always appear above QA
  - Sorting:
    - **Before reveal**: Role priority, then alphabetically by name
    - **After reveal**: Role priority, then highest vote value first
- ✅ **Voting UX**
  - Fibonacci-ish values + `?` + `☕️`
  - Button stays highlighted for your selected vote
  - You can change your vote any time (even after reveal)
- 📊 **Per-role averages**
  - Separate Dev and QA averages once votes are revealed
- 👋 **Presence management**
  - Multiple tabs for the same user are treated as one participant
  - Closing your last tab removes you from the room for everyone else

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4
- **Runtime:** Node 18+
- **WebSockets:** [`ws`](https://github.com/websockets/ws)
- **Dev runtime:** [`tsx`](https://github.com/esbuild-kit/tsx) for `server.ts`
- **Language:** TypeScript

---

## Architecture Overview

The app uses a **custom Node server** (`server.ts`) that runs:

- The Next.js app
- A WebSocket server at `/ws`
- JSON HTTP endpoints under `/api/*`

### Room & Session Model

- There is currently a **single room**, with ID `"000"`:

  ```ts
  // app/page.tsx
  const ROOM_ID = "000";
  ```

- Session state is held **in memory** on the server:
  - `SessionData` and helpers live in `src/app/planningPokerShared.ts`
  - A `Map<string, SessionData>` stores all room sessions
  - This means:
    - No persistent storage
    - Sessions reset when the process restarts

### WebSockets

- Implemented in `src/server/wsServer.ts`
- Attached to the same HTTP server as Next in `server.ts`:

  ```ts
  import { attachWebSocketServer } from "./src/server/wsServer";

  attachWebSocketServer(server);
  ```

- Path: `/ws`
- Protocol:
  - `ws://` in dev
  - `wss://` in production (via your hosting provider)
- Client behavior:
  - Connects once `userId` is known
  - Sends `{ type: "join", roomId, userId }` on open
  - Server responds with a full `session` snapshot
  - Subsequent updates are pushed from the server whenever:
    - Someone joins/updates profile
    - Someone votes
    - Story is revealed
    - Story is reset
    - A user disconnects (last tab closed)

### HTTP API

Endpoints are implemented directly in `server.ts`:

- `POST /api/upsert-participant`
  - Body: `{ roomId, userId, name, role }`
  - Validates payload
  - Adds or updates the participant in the session
  - Broadcasts updated session to `/ws` clients
- `POST /api/submit-vote`
  - Body: `{ roomId, userId, vote }`
  - Validates vote against allowed values
  - Updates that user’s vote in the session
  - Broadcasts updated session
- `POST /api/reveal`
  - Body: `{ roomId }`
  - Sets `storyStatus` to `"revealed"`
  - Broadcasts updated session
- `POST /api/reset`
  - Body: `{ roomId }`
  - Resets `storyStatus` to `"pending"` and clears all votes
  - Broadcasts updated session

### Client-Side App

- Main client component: `src/app/PlanningPokerClient.tsx`
- Responsibilities:
  - Manage local user profile (ID, name, role)
  - Call the HTTP API endpoints
  - Connect to WebSocket and maintain `liveSession`
  - Derive sorted participant list and averages for rendering
  - Show a modal to collect profile if missing/invalid

---

## Local Development

### Requirements

- Node 18+
- npm (or another compatible package manager)

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This runs:

```bash
tsx server.ts
```

Which:

- Prepares Next in dev mode
- Starts an HTTP server
- Attaches the WebSocket server at `/ws`

Open:

- http://localhost:3000

### Build for production

```bash
npm run build
```

This runs:

```bash
next build
```

### Run in production mode locally

```bash
NODE_ENV=production npm start
```

This runs:

```bash
NODE_ENV=production tsx server.ts
```

and serves the built app at:

- http://localhost:3000 (or the `PORT` your host provides)

---

## Scripts

From `package.json`:

```json
"scripts": {
  "dev": "tsx server.ts",
  "build": "next build",
  "start": "NODE_ENV=production tsx server.ts",
  "lint": "eslint"
}
```

---

## Notes & Limitations

- **In-memory state only**
  - Sessions and participants are not persisted; restarting the server clears everything.
- **Single room**
  - The app currently uses a fixed `ROOM_ID = "000"`. Adding multiple rooms would require:
    - Generating room IDs
    - Routing based on path or query (e.g. `/rooms/[roomId]`)
- **Not horizontally scalable yet**
  - Because state is in-memory and WS connections are tied to a single process, you should run a **single instance** of this service (no load balancing) unless you introduce a shared datastore + broadcast mechanism (e.g. Redis).
