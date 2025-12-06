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
  - You can change or clear your vote any time (even after reveal)
- 📊 **Per-role averages**
  - Separate Dev and QA averages once votes are revealed
- 👋 **Presence management**
  - Multiple tabs for the same user are treated as one participant
  - Closing your last tab removes you from the room for everyone else
- 🧹 **Validation & safety**
  - Name is required and cannot be just whitespace
  - Role selection is required
  - Reveal is disabled until at least one vote exists

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4
- **Runtime:** Node 18+
- **WebSockets:** [`ws`](https://github.com/websockets/ws)
- **Dev runtime:** [`tsx`](https://github.com/esbuild-kit/tsx) for the custom HTTP server
- **Language:** TypeScript

---

## Architecture Overview

The app uses a **custom Node HTTP server** that runs:

- The Next.js app
- A WebSocket server at `/ws`
- JSON HTTP endpoints under `/api/*`

### Server Layout

- **HTTP + Next server:** `server/httpServer.ts`
  - Creates a Node HTTP server
  - Prepares and mounts Next.js
  - Dispatches `/api/*` requests to JSON handlers
  - Forwards all other requests to Next’s request handler
- **WebSocket server:** `server/wsServer.ts`
  - Attached to the same HTTP server in `httpServer.ts`
  - Handles `/ws` connections
  - Manages join/leave and session broadcasts

### Room & Session Model

- There is currently a **single room** with ID `"000"`:
  - The ID is hardcoded in the client (see `PlanningPokerClient`)
- Session state is held **in memory** on the server:
  - Shared types & helpers live in `app/planningPokerShared.ts`
  - The server keeps a `Map<string, SessionData>` for rooms
  - This means:
    - No persistent storage
    - Sessions reset when the process restarts

#### SessionData

Conceptually, a session looks like:

- `storyStatus: "pending" | "revealed"`
- `participants: Participant[]`, where each participant has:
  - `id` (stable `userId`)
  - `name`
  - `role` (`"dev"` or `"qa"`)
  - `vote` (`Vote | null`)

Votes are constrained to the allowed `Vote` union (e.g. `"0" | "1" | "2" | "3" | "5" | "8" | "13" | "?" | "coffee"`).

### WebSockets

- Implemented in `server/wsServer.ts`
- Attached in `server/httpServer.ts`
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
    - A user disconnects (last tab for that `userId` closes)

### HTTP API

Endpoints are implemented in `server/httpServer.ts` and operate on the shared in-memory session map.

- `POST /api/upsert-participant`
  - Body: `{ roomId, userId, name, role }`
  - Validates payload (roomId, non-empty name, valid role)
  - Adds or updates the participant in the session
  - Broadcasts updated session to `/ws` clients
- `POST /api/submit-vote`
  - Body: `{ roomId, userId, vote }`
  - Validates vote against allowed values (or `null` to clear)
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

The main client tree lives under `app/PlanningPokerClient/` and is imported from `app/page.tsx`.

Responsibilities of the client:

- Manage local user profile (ID, name, role)
  - `userId` stored in `localStorage` as `planningPokerUserId`
  - Name + role in `planningPokerUserName` and `planningPokerUserRole`
- Call the HTTP API endpoints for:
  - Upserting participants
  - Submitting votes
  - Revealing
  - Resetting
- Connect to WebSocket and maintain `liveSession`
- Derive sorted participant list and per-role averages for rendering
- Show a modal to collect profile if missing/invalid

Main component is in `PlanningPokerClient/index.tsx`

Stateful client logic is encapsulated in custom hooks under the `PlanningPokerClient` feature folder:

- `PlanningPokerClient/hooks/useUserProfile.ts` – manages local identity (userId, name, role), localStorage syncing, and profile modal behavior, including auto-joining the room when a valid profile exists.
- `PlanningPokerClient/hooks/useSession.ts` – manages the WebSocket connection, keeps a live `SessionData` snapshot, derives per-role averages and current user, and sends commands via the HTTP API (submit vote, reveal, reset).

The UI is split into small presentational components scoped to the feature:

- `PlanningPokerClient/components/PlanningPokerHeader.tsx`
- `PlanningPokerClient/components/VoteControls.tsx`
- `PlanningPokerClient/components/AveragesBar.tsx`
- `PlanningPokerClient/components/ParticipantsTable.tsx`
- `PlanningPokerClient/components/SessionActions.tsx`
- `PlanningPokerClient/components/ProfileModal.tsx`

---

## Local Development

### Requirements

- Node 18+
- npm (or another compatible package manager)

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This runs:

```bash
tsx server/httpServer.ts
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
NODE_ENV=production tsx server/httpServer.ts
```

and serves the built app at:

- http://localhost:3000 (or the `PORT` your host provides)

---

## Scripts

From `package.json`:

```json
{
  "scripts": {
    "dev": "tsx server/httpServer.ts",
    "build": "next build",
    "start": "NODE_ENV=production tsx server/httpServer.ts",
    "lint": "eslint"
  }
}
```

---

## Notes & Limitations

- **In-memory state only**
  - Sessions and participants are not persisted; restarting the server clears everything.
- **Single room**
  - The app currently uses a fixed room ID `"000"`. Adding multiple rooms would require:
    - Generating room IDs
    - Routing based on path or query (e.g. `/rooms/[roomId]`)
- **Not horizontally scalable yet**
  - Because state is in-memory and WS connections are tied to a single process, you should run a **single instance** of this service (no load balancing) unless you introduce a shared datastore + broadcast mechanism (e.g. Redis).
