First Onsite Planning Poker
===========================

Collaborative planning poker application for development teams, built with Next.js, React, TypeScript, and a custom HTTP + WebSocket server. The app supports real-time voting in a shared room with a clean UI optimized for both desktop and mobile.

---

## Features

### Core workflow

- Single shared room (currently `000`) for quick sessions.
- Profile modal on first visit:
  - Collects name and role (`Dev` or `QA`).
  - Saves profile to `localStorage`.
  - Uses the stored profile to auto-join on subsequent visits.
- “Change Profile” button in the header to update name and role.

### Voting

- Fibonacci-style voting controls:
  - Options: `0, 1, 2, 3, 5, 8, 13, ?, coffee`.
  - `coffee` displayed as `☕️` in both the controls and the table.
- Vote selection:
  - Click to select a vote; the button highlights with an orange background and white text.
  - Clicking the same vote again clears the selection and removes the highlight immediately.
- Voting is disabled until a valid profile (name + role) exists.

### Reveal & reset

- **Reveal Votes**:
  - Disabled when no participant has cast a vote.
  - When triggered, changes story status to `revealed` and shows actual vote values.
- **Reset**:
  - Clears all votes.
  - Sets story status back to `pending`.
  - Leaves the participant list intact.
- The primary action button toggles between **Reveal Votes** and **Reset** depending on story status.
- Actions are blocked while a request is in flight to prevent double submits.

### Participants table

- Display of all participants in the room:
  - Columns: Participant, Role, Vote.
  - Role displayed as `Dev` or `QA`.
- Row styling:
  - Dev rows use a light blue background tone.
  - QA rows use a deeper orange background tone.
  - Hover state slightly darkens the row using a brightness change.
- Current user:
  - Marked with “(you)” after the name.
- Vote indicator:
  - Before reveal:
    - `✓` if a vote has been cast.
    - `—` if no vote yet.
  - After reveal:
    - Actual vote value (including `☕️`) if present.
    - `—` if no vote was given.
  - Votes are wrapped in a fixed-width rounded badge (`min-w-[2.5rem]`) to avoid table layout shifts as votes change.
- Dynamic row padding:
  - Larger vertical padding for small rooms.
  - Reduced padding when participant count exceeds 10 and then 14 to keep more content on screen.

### Charts

- Two bar charts rendered once the story is revealed:
  - **Dev** chart: distribution of numeric votes cast by Devs.
  - **QA** chart: distribution of numeric votes cast by QA.
- Chart data:
  - Only numeric votes (`0, 1, 2, 3, 5, 8, 13`) are counted.
  - `?` and `coffee` are excluded from the numeric charts.
  - All numeric buckets are always present with a count, even when zero, so the chart visually conveys absence of numeric votes.
- Rendering:
  - Implemented with Recharts and `ResponsiveContainer` so charts fit inside the existing panel without expanding it.
  - Dev and QA charts are displayed side by side on wider screens and wrap on narrow screens.
  - Titles “Dev” and “QA” appear above the respective charts.
  - Axes inherit the page font and use a small tick font size to keep the charts visually subtle.

### Real-time behavior

- Custom WebSocket server mounted on the same HTTP server under `/ws`.
- On connection:
  - Client sends a `join` message with `roomId` and `userId`.
  - Server tracks which sockets are in which rooms.
  - Server sends an initial session snapshot back to the joining socket.
- On actions (join, leave, vote, reveal, reset):
  - HTTP API mutates in-memory `SessionData`.
  - Server broadcasts an updated, sorted `SessionData` snapshot to all sockets in the room.
- Multi-tab safety:
  - Each `(roomId, userId)` pair tracks a connection count.
  - Closing one tab decrements the count but does not remove the participant unless it was the last active connection.
  - When the last connection for a user in a room closes, that user is removed from the session and a new snapshot is broadcast.

---

## Architecture

### Overview

- Next.js App Router for routing and rendering.
- Custom Node HTTP server (`server/httpServer.ts`) that:
  - Wraps Next’s request handler for all non-API routes.
  - Hosts a small REST-style API under `/api/*` for mutations.
- WebSocket server (`server/wsServer.ts`) attached to the same HTTP server for real-time updates.
- Shared session logic in `app/planningPokerShared`:
  - Types: `SessionData`, `Participant`, `Vote`, etc.
  - Utilities: `getSession`, `updateSession`, `sortSession`.

### HTTP server (`server/httpServer.ts`)

The HTTP server:

- Prepares the Next app.
- Creates a Node HTTP server.
- Routes:
  - Requests whose path starts with `/api/` → API router.
  - Everything else → Next request handler.

API endpoints (all `POST`):

1. `POST /api/upsert-participant`

   **Body:**

       {
         "roomId": string,
         "userId": string,
         "name": string,
         "role": "dev" | "qa"
       }

   **Behavior:**

   - Validates the payload.
   - Trims `roomId`, `userId`, and `name`.
   - Adds a new participant or updates an existing participant (by `userId`).
   - Preserves an existing vote when updating name or role.
   - Broadcasts an updated sorted session snapshot to the room.
   - Returns `204 No Content` on success.

2. `POST /api/submit-vote`

   **Body:**

       {
         "roomId": string,
         "userId": string,
         "vote": string | null
       }

   **Behavior:**

   - Validates `roomId`, `userId`, and `vote`.
   - Allowed votes: `0, 1, 2, 3, 5, 8, 13, ?, coffee`, or `null` to clear.
   - Normalizes IDs and vote strings.
   - If the user is not an existing participant, the request is a no-op.
   - Updates the participant’s `vote` field.
   - Broadcasts an updated sorted session snapshot.
   - Returns `204 No Content` on success.

3. `POST /api/reveal`

   **Body:**

       {
         "roomId": string
       }

   **Behavior:**

   - Validates `roomId`.
   - Sets `storyStatus` for the room to `"revealed"`.
   - Broadcasts an updated sorted session snapshot.
   - Returns `204 No Content` on success.

4. `POST /api/reset`

   **Body:**

       {
         "roomId": string
       }

   **Behavior:**

   - Validates `roomId`.
   - Sets `storyStatus` to `"pending"`.
   - Sets all participant votes to `null`.
   - Broadcasts an updated sorted session snapshot.
   - Returns `204 No Content` on success.

The server uses shared helpers:

- `parseJsonBody(req)` to safely parse JSON.
- `sendJson(res, status, payload)` for consistent JSON responses.
- `sendNoContent(res)` for sending `204` responses.
- `broadcastRoomUpdate(roomId)` to retrieve, sort, and broadcast the current session.

### WebSocket server (`server/wsServer.ts`)

The WebSocket server:

- Attaches a `WebSocketServer` to the same Node HTTP server under path `/ws`.
- Maintains:
  - `rooms: Map<roomId, Set<WebSocket>>` – open sockets per room.
  - `socketInfo: Map<WebSocket, { roomId, userId }>` – metadata per socket.
  - `userConnectionCounts: Map<string, number>` – key format `roomId:userId`.

Client message shape:

- `JoinMessage`:

      {
        "type": "join",
        "roomId": string,
        "userId": string
      }

On `message`:

- Parses incoming JSON.
- Uses a type guard to validate `JoinMessage`.
- On a valid `join` message:
  - Trims `roomId` and `userId`.
  - Adds the socket to the room’s set.
  - Stores socket metadata.
  - Increments `(roomId, userId)` connection count.
  - Retrieves and sorts the current `SessionData`.
  - Sends a `session` payload to the joining socket with the latest session snapshot.

On `close`:

- Reads socket metadata.
- Removes the socket from the room’s set.
- Decrements the connection count for the `(roomId, userId)` key.
- When the connection count reaches zero:
  - Calls `updateSession` to remove the participant from the room.
  - Calls `broadcastSession(roomId)` to push a fresh sorted session snapshot.

On `error`:

- Logs a warning including the error message.

The module exports:

- `attachWebSocketServer(server)` – to integrate with the HTTP server.
- `broadcastToRoom(roomId, payload)` – to send messages to all sockets in a room.

---

## Frontend structure

### Entry point

- `app/page.tsx` renders `PlanningPokerClient` as the main interactive screen.

### `PlanningPokerClient`

_File: `app/PlanningPokerClient/index.tsx`_

- Declared as a client component.
- Uses two custom hooks:
  - `useUserProfile(roomId)`:
    - Manages `userId`, `userName`, `userRole`.
    - Persists profile to `localStorage`.
    - Exposes:
      - `profileChecked` to indicate that `localStorage` has been read.
      - `showProfileModal` and `setShowProfileModal` for modal visibility.
      - `hasUserProfile` to gate voting and automatic joining.
      - `handleProfileSubmit` to call the upsert API and close the modal on success.
  - `useSession(roomId, userId, hasUserProfile)`:
    - Connects to the WebSocket endpoint and joins the room when profile data is available.
    - Stores a `session` object derived from either the initial data or WebSocket updates.
    - Exposes:
      - `isRevealed`
      - `hasAnyVote`
      - `currentUser`
      - `isWorking` (tracks in-flight HTTP requests).
      - `submitVote`, `reveal`, `reset` – thin wrappers over HTTP API endpoints.

Layout:

- Root `div`:
  - Full viewport height.
  - Light grey background.
  - Global font family.
- `PlanningPokerHeader`:
  - Orange header with app title and a “Change Profile” button.
- `main`:
  - Centers a card (`max-w-3xl`) with:
    - `VoteControls`
    - `Charts` (only when story status is not `pending`)
    - `ParticipantsTable`
    - `SessionActions`
- `ProfileModal`:
  - Rendered when `profileChecked` is true and `showProfileModal` is true.

### UI components

- `PlanningPokerHeader`:
  - Props: `onChangeProfile`.
  - Displays the site header and a button that opens the profile modal.
  - Site title is non-interactive; the button has hover and focus states.

- `ProfileModal`:
  - Props:
    - `name`, `role`
    - `onNameChange`, `onRoleChange`
    - `onSubmit`, `onCancel`
  - Modal overlay with:
    - Name text input:
      - `maxLength={50}`
      - Validates that the name is not blank or only spaces.
      - Uses `autoFocus`.
    - Role radio group (`Dev`, `QA`) with pointer cursor styles.
    - Buttons:
      - Cancel (closes without saving).
      - Save (submits the form).
    - Save and Cancel buttons use pointer cursors and focus styles.

- `VoteControls`:
  - Props:
    - `selectedVote`
    - `disabled`
    - `onVoteClick`
  - Renders cards for all vote options.
  - Selected vote:
    - Orange background, white text, no shadow.
  - Hover state:
    - Slight upward translation and outline change.
  - Handles the `coffee` option as `☕️`.

- `ParticipantsTable`:
  - Props:
    - `participants`
    - `currentUserId`
    - `isRevealed`
  - Computes vertical padding based on participant count.
  - Renders a responsive table with:
    - Participant + “(you)” for the current user.
    - Role (`Dev` / `QA`).
    - Vote badge with fixed width.
  - Vote display logic adapts to `isRevealed` as described above.
  - Background colors:
    - Dev rows: lighter blue.
    - QA rows: darker orange.
  - Hover effect: `hover:brightness-95`.

- `SessionActions`:
  - Props:
    - `isRevealed`
    - `canReveal`
    - `canReset`
    - `onReveal`
    - `onReset`
  - Renders:
    - “Reveal Votes” button when not revealed.
    - “Reset” button when revealed.
  - Shared styling:
    - Rounded corners, dark blue foreground background, white text.
    - Hover and focus states.
    - Disabled state with reduced opacity and `not-allowed` cursor.

- `Charts`:
  - Props: `session: SessionData`.
  - Hidden when `session.storyStatus === 'pending'`.
  - Uses `sessionToChartData` to build numeric vote distributions per role.
  - Renders two `RoleChart` components inside a flex container.
  - Each `RoleChart`:
    - Title (`Dev` or `QA`) above the chart.
    - `ResponsiveContainer` wrapping a `BarChart` with:
      - `XAxis` using the vote value as the label.
      - `Bar` using the `count` field and a role-specific color.
      - `style={{ fontFamily: 'inherit' }}` and small tick font size.

---

## Technology stack

- Runtime: Node.js (developed with Node 22; Node 20+ recommended).
- Framework: Next.js 16 (App Router).
- UI: React 19.
- Language: TypeScript.
- Styling: Tailwind-style utility classes with a small custom color palette.
- Real-time: `ws` WebSocket server and client.
- Charts: Recharts.

---

## Scripts

Common scripts in `package.json` (names may vary slightly):

- `dev`  
  Starts the custom HTTP + WebSocket server in development mode, typically on `http://localhost:3000`.

- `build`  
  Runs the Next.js production build.

- `start`  
  Starts the custom HTTP + WebSocket server in production mode, serving the built Next.js app.

- `lint`  
  Runs ESLint using the flat config (`eslint.config.mjs`) with Next’s recommended rules.

- `lint:fix`  
  Runs ESLint with automatic fixing enabled.

- `format`  
  Runs Prettier over the codebase, if configured.

For exact scripts, refer to `package.json` in the repository.

---

## Local development

Prerequisites:

- Node.js 20 or newer (development and deployment currently use Node 22.x).
- npm or another compatible package manager.

Install dependencies:

    npm install

Start the development server:

    npm run dev

By default:

- The app listens on `http://localhost:3000` (configurable via `PORT`).
- The WebSocket endpoint is available at `ws://localhost:3000/ws`.
- The same process hosts both HTTP and WebSocket traffic.

---

## Production build and runtime

Create a production build:

    npm run build

Start the production server:

    npm start

Common environment variables:

- `PORT` – HTTP port (defaults to `3000` if omitted).
- `NODE_ENV` – `production` for production mode.

The production server:

- Serves the Next.js build output.
- Handles `/api/*` routes for upsert, voting, reveal, and reset.
- Hosts WebSocket traffic under `/ws`.

---

## Linting and formatting

- ESLint:
  - Configured via `eslint.config.mjs`.
  - Extends:
    - `eslint-config-next/core-web-vitals`
    - `eslint-config-next/typescript`
  - Adds project-specific rules for TypeScript and React hooks, and integrates with Prettier via `eslint-config-prettier`.

- Prettier:
  - Controls formatting (spacing, quotes, line width).
  - ESLint is configured to avoid conflicting style rules.

---

## Deployment

The application is designed to run as a single Node.js web service that:

- Serves the Next.js application.
- Provides `/api/*` endpoints.
- Hosts WebSocket connections on `/ws`.

Typical deployment flow:

1. Build the app with `npm run build`.
2. Start the server with `npm start`.

This model fits platforms that:

- Support long-lived WebSocket connections.
- Forward all HTTP and WebSocket traffic to the same Node process (or provide sticky sessions if scaled horizontally with a shared session state).

Further details for a specific hosting provider (such as Render) are described in `DEPLOYMENT.md` in the repository.

---

## Future directions

The current design provides a base for further enhancements, such as:

- Multiple rooms with shareable URLs.
- Async sessions tied to Jira issues, backed by a persistent database.
- Jira integration to fetch story details and push final estimates.
- Persistent session state beyond in-memory storage to support horizontal scaling.
- Additional analytics or visualizations on voting patterns over time.