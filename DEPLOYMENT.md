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
```

Then open:

- http://localhost:3000

Test:

- Joining from 2 browser windows (or 1 + incognito)
- Voting, revealing, resetting
- Closing tabs and ensuring presence updates

If this works, you’re ready to deploy.

---

## 2. Runtime Expectations

- Node 18+ (or newer)
- `PORT` environment variable will be provided by most hosts
- The app listens on:

```ts
const port = parseInt(process.env.PORT || '3000', 10)
```

- WebSocket endpoint is always relative to the host: `/ws`
- In production, clients will use `wss://<your-host>/ws`.

---

## 3. Render Deployment (recommended for fast + free)

### 3.1. Repo Setup

Ensure your repo has:

- `server.ts` at the root
- `package.json` with:

  ```json
  {
    "scripts": {
      "dev": "tsx server.ts",
      "build": "next build",
      "start": "NODE_ENV=production tsx server.ts"
    }
  }
  ```

- `tsx` listed as a dependency or devDependency
- All TypeScript sources committed

Push to GitHub (or GitLab/Bitbucket) if you haven’t already.

### 3.2. Create the Render Service

1. Go to the Render dashboard.
2. Click **New → Web Service**.
3. Connect the repo that contains this app.
4. Set:
   - **Environment**: Node
   - **Build Command**:

     ```bash
     npm install
     npm run build
     ```

   - **Start Command**:

     ```bash
     npm start
     ```

5. Choose the **Free** plan (for internal/demo use).
6. Click **Create Web Service**.

Render will:

- Install dependencies
- Run `next build`
- Start `server.ts` with `NODE_ENV=production` and the proper `PORT`

The app will be available at:

- `https://<your-service-name>.onrender.com`

### 3.3. Verify in Render

Open the deployed URL in two separate browser contexts:

- Window A: normal tab
- Window B: incognito (or another browser)

Verify:

- Both can set profiles (name + role).
- Both see each other in the participant table.
- Votes, reveal, and reset update in real time on both.
- Closing the last tab for a user removes them from the room for everyone.
- Multiple tabs for the same user are treated as a single participant.

If anything fails:

- Check Render logs for:
  - `[api] ... failed`
  - `[ws] ... error`
  - `[http] unhandled error`
- Check browser console for:
  - `[ws] socket error`
  - `[profile] failed ...`
  - `[vote] failed ...`

---

## 4. Deploying to Other Node Hosts

The pattern is the same for most Node platforms:

### Generic Node Host (Railway, Fly, etc.)

1. Build in the container / build phase:

   ```bash
   npm install
   npm run build
   ```

2. Start with:

   ```bash
   npm start
   ```

3. Ensure:
   - `PORT` is set (the platform usually does this automatically).
   - No reverse proxy strips WebSocket upgrade headers.
   - HTTP and WS are served from the same host.

Example `Procfile` (for Heroku-style platforms):

```procfile
web: npm start
```

---

## 5. Scaling & Limitations

Currently, the app assumes:

- A **single Node process**:
  - In-memory `sessions` map
  - In-memory WebSocket `rooms` map

If you try to scale horizontally (multiple instances behind a load balancer):

- Each instance will have its own `sessions`, and clients may connect to different instances.
- State will diverge across instances.

To scale beyond one instance, you would need:

- A shared data store (e.g. Redis) for session state, and
- A pub/sub mechanism to broadcast session updates across all instances.

For now, the recommended setup is:

- 1 instance of this service
- Automatic restarts if it crashes (handled by your host)

---

## 6. Environment Variables

Right now, there are no required custom env vars.

Optional you may want in future:

- `ROOM_ID` (if you want to parameterize the room instead of hardcoding `"000"`)
- Secrets for connecting to a DB/cache if you add persistence later

---

## 7. Quick Checklist Before Deploying to a New Host

- `npm run build` succeeds locally.
- `NODE_ENV=production npm start` runs and works locally.
- Node runtime on the host is ≥ 18.
- Build command: `npm install && npm run build`.
- Start command: `npm start`.
- WebSockets are supported and not blocked.
- You’re running a single instance (or have added a shared store).

Once those are true, this app should run on most generic Node platforms with minimal fuss.
