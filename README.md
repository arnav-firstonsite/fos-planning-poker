Nice, congrats on getting it all working 🎉
Here are drop-in contents for README.md and DEPLOYMENT.md.

⸻

README.md

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

	•	Session state is held in memory on the server:
	•	SessionData and helpers live in src/app/planningPokerShared.ts
	•	A Map<string, SessionData> stores all room sessions
	•	This means:
	•	No persistent storage
	•	Sessions reset when the process restarts

WebSockets
	•	Implemented in src/server/wsServer.ts
	•	Attached to the same HTTP server as Next in server.ts:

import { attachWebSocketServer } from "./src/server/wsServer";

attachWebSocketServer(server);


	•	Path: /ws
	•	Protocol:
	•	ws:// in dev
	•	wss:// in production (via your hosting provider)
	•	Client behavior:
	•	Connects once userId is known
	•	Sends { type: "join", roomId, userId } on open
	•	Server responds with a full session snapshot
	•	Subsequent updates are pushed from the server whenever:
	•	Someone joins/updates profile
	•	Someone votes
	•	Story is revealed
	•	Story is reset
	•	A user disconnects (last tab closed)

HTTP API

Endpoints are implemented directly in server.ts:
	•	POST /api/upsert-participant
	•	Body: { roomId, userId, name, role }
	•	Validates payload
	•	Adds or updates the participant in the session
	•	Broadcasts updated session to /ws clients
	•	POST /api/submit-vote
	•	Body: { roomId, userId, vote }
	•	Validates vote against allowed values
	•	Updates that user’s vote in the session
	•	Broadcasts updated session
	•	POST /api/reveal
	•	Body: { roomId }
	•	Sets storyStatus to "revealed"
	•	Broadcasts updated session
	•	POST /api/reset
	•	Body: { roomId }
	•	Resets storyStatus to "pending" and clears all votes
	•	Broadcasts updated session

Client-Side App
	•	Main client component: src/app/PlanningPokerClient.tsx
	•	Responsibilities:
	•	Manage local user profile (ID, name, role)
	•	Call the HTTP API endpoints
	•	Connect to WebSocket and maintain liveSession
	•	Derive sorted participant list and averages for rendering
	•	Show a modal to collect profile if missing/invalid

⸻

Local Development

Requirements
	•	Node 18+
	•	npm (or another compatible package manager)

Install

npm install

Run in development

npm run dev

This runs:

tsx server.ts

Which:
	•	Prepares Next in dev mode
	•	Starts an HTTP server
	•	Attaches the WebSocket server at /ws

Open:
	•	http://localhost:3000

Build for production

npm run build

This runs:

next build

Run in production mode locally

NODE_ENV=production npm start

This runs:

NODE_ENV=production tsx server.ts

and serves the built app at:
	•	http://localhost:3000 (or the PORT your host provides)

⸻

Scripts

From package.json:

"scripts": {
  "dev": "tsx server.ts",
  "build": "next build",
  "start": "NODE_ENV=production tsx server.ts",
  "lint": "eslint"
}


⸻

Notes & Limitations
	•	In-memory state only
	•	Sessions and participants are not persisted; restarting the server clears everything.
	•	Single room
	•	The app currently uses a fixed ROOM_ID = "000". Adding multiple rooms would require:
	•	Generating room IDs
	•	Routing based on path or query (e.g. /rooms/[roomId])
	•	Not horizontally scalable yet
	•	Because state is in-memory and WS connections are tied to a single process, you should run a single instance of this service (no load balancing) unless you introduce a shared datastore + broadcast mechanism (e.g. Redis).

⸻

License

Internal tool for First Onsite. License as appropriate for your org.

---

## DEPLOYMENT.md

```md
# Deployment

This app uses a **custom Node server** (`server.ts`) that runs:

- Next.js 16 (App Router)
- A WebSocket server at `/ws`
- JSON HTTP endpoints under `/api/*` for room/session mutations

Everything runs in a **single Node process**, which is perfect for generic Node hosts (Render, Railway, Fly, etc.).

---

## 1. Build & Run Locally (Production Mode)

Before deploying, verify the production build locally:

```bash
npm install
npm run build
NODE_ENV=production npm start

Then open:
	•	http://localhost:3000

Test:
	•	Joining from 2 browser windows (or 1 + incognito)
	•	Voting, revealing, resetting
	•	Closing tabs and ensuring presence updates

If this works, you’re ready to deploy.

⸻

2. Runtime Expectations
	•	Node 18+ (or newer)
	•	PORT environment variable will be provided by most hosts
	•	The app listens on:

const port = parseInt(process.env.PORT || "3000", 10);

	•	WebSocket endpoint is always relative to the host: /ws
	•	In production, clients will use wss://<your-host>/ws.

⸻

3. Render Deployment (recommended for fast + free)

3.1. Repo Setup

Ensure your repo has:
	•	server.ts at the root
	•	package.json with:

"scripts": {
  "dev": "tsx server.ts",
  "build": "next build",
  "start": "NODE_ENV=production tsx server.ts"
}


	•	tsx listed as a dependency or devDependency
	•	All TypeScript sources committed

Push to GitHub (or GitLab/Bitbucket) if you haven’t already.

3.2. Create the Render Service
	1.	Go to the Render dashboard.
	2.	Click New → Web Service.
	3.	Connect the repo that contains this app.
	4.	Set:
	•	Environment: Node
	•	Build Command:

npm install
npm run build


	•	Start Command:

npm start


	5.	Choose the Free plan (for internal/demo use).
	6.	Click Create Web Service.

Render will:
	•	Install dependencies
	•	Run next build
	•	Start server.ts with NODE_ENV=production and the proper PORT

The app will be available at:
	•	https://<your-service-name>.onrender.com

3.3. Verify in Render

Open the deployed URL in two separate browser contexts:
	•	Window A: normal tab
	•	Window B: incognito (or another browser)

Verify:
	•	Both can set profiles (name + role).
	•	Both see each other in the participant table.
	•	Votes, reveal, and reset update in real time on both.
	•	Closing the last tab for a user removes them from the room for everyone.
	•	Multiple tabs for the same user are treated as a single participant.

If anything fails:
	•	Check Render logs for:
	•	[api] ... failed
	•	[ws] ... error
	•	[http] unhandled error
	•	Check browser console for:
	•	[ws] socket error
	•	[profile] failed ...
	•	[vote] failed ...

⸻

4. Deploying to Other Node Hosts

The pattern is the same for most Node platforms:

Generic Node Host (Railway, Fly, etc.)
	1.	Build in the container / build phase:

npm install
npm run build


	2.	Start with:

npm start


	3.	Ensure:
	•	PORT is set (the platform usually does this automatically).
	•	No reverse proxy strips WebSocket upgrade headers.
	•	HTTP and WS are served from the same host.

Example Procfile (for Heroku-style platforms):

web: npm start


⸻

5. Scaling & Limitations

Currently, the app assumes:
	•	A single Node process:
	•	In-memory sessions map
	•	In-memory WebSocket rooms map

If you try to scale horizontally (multiple instances behind a load balancer):
	•	Each instance will have its own sessions, and clients may connect to different instances.
	•	State will diverge across instances.

To scale beyond one instance, you would need:
	•	A shared data store (e.g. Redis) for session state, and
	•	A pub/sub mechanism to broadcast session updates across all instances.

For now, the recommended setup is:
	•	1 instance of this service
	•	Automatic restarts if it crashes (handled by your host)

⸻

6. Environment Variables

Right now, there are no required custom env vars.

Optional you may want in future:
	•	ROOM_ID (if you want to parameterize the room instead of hardcoding "000")
	•	Secrets for connecting to a DB/cache if you add persistence later

⸻

7. Quick Checklist Before Deploying to a New Host
	•	npm run build succeeds locally.
	•	NODE_ENV=production npm start runs and works locally.
	•	Node runtime on the host is ≥ 18.
	•	Build command: npm install && npm run build.
	•	Start command: npm start.
	•	WebSockets are supported and not blocked.
	•	You’re running a single instance (or have added a shared store).

Once those are true, this app should run on most generic Node platforms with minimal fuss.

If you want, next step we can tweak the README intro/branding or add a short “How to use in a planning session” section for non-technical teammates.
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

---

## License

Internal tool for First Onsite. License as appropriate for your org.