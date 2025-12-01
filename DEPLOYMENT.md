# Deployment Guide

This app runs as a **single Node.js service** that serves both:

- The **Next.js UI** (HTTP)
- The **WebSocket server** (for live session updates)

Everything runs in **one Node process** so the in-memory `sessions` store is shared between HTTP requests and WebSocket connections.

> ⚠️ This setup assumes **a single instance** of the app. If your host auto-scales to multiple instances, you must pin it to 1 instance or move session state into a shared store (Redis/DB) before scaling out.

---

## 1. Prerequisites

- **Node.js** ≥ 18
- **npm / pnpm / yarn** (examples below use `npm`)
- A host that supports:
  - Long-lived **WebSocket** connections
  - Running a Node app that listens on `process.env.PORT` (e.g. Render, Railway, Fly.io, a VPS, etc.)

The important files for deployment:

- `server.ts` – custom Node entrypoint that:
  - Bootstraps Next.js
  - Creates an HTTP server
  - Attaches the WebSocket server
- `src/server/wsServer.ts` – WebSocket server attached to the HTTP server
- `src/app/planningPokerShared.ts` – in-memory `sessions` map
- `src/app/page.tsx` + `src/app/PlanningPokerClient.tsx` – main UI

---

## 2. NPM Scripts

Make sure your `package.json` has scripts like:

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "next build",
    "start": "NODE_ENV=production tsx server.ts",
    "lint": "eslint"
  }
}