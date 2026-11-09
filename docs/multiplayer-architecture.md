# Multiplayer architecture proposal

## Current baseline

The repository currently contains a single static `index.html` demo (version 0.1). It has no package manifest, server, database, WebSocket endpoint, player identity service, or deployment configuration. The browser demo is local-only: each visitor runs an independent game. A room code shown by the page would not connect players, so this proposal does not claim that online play exists.

## Recommended architecture

Use a small Node.js service with Socket.IO (WebSocket transport with reconnect support) as the authoritative room server. Keep the static browser client separate and connect it to the service over HTTPS/WSS.

- **Room lifecycle:** host creates a private room; server generates a unique six-character code using a cryptographically secure random source; guests join by code; rooms expire automatically when idle.
- **Identity:** assign each connection a server-side session/player ID. Treat display names as untrusted presentation data. Do not put secrets or privileged server credentials in browser code.
- **Authority:** server owns room membership, host, phase, timer, role assignments, clues, votes and win conditions. Clients send actions; server validates them and broadcasts the resulting state. Never trust a client-reported role, vote total, timer or win.
- **Realtime events (proposed contract):**
  - Client → server: `room:create`, `room:join`, `room:leave`, `game:action`, `meeting:vote`.
  - Server → client: `room:created`, `room:updated`, `room:error`, `game:state`, `meeting:results`.
  - Every event should include a protocol version and server-generated room revision. Validate payload shape, size, membership and allowed phase before applying it.
- **Disconnects:** mark a player temporarily disconnected and allow a short reconnect grace period; remove abandoned rooms after their TTL. Transfer host only under a documented rule.
- **Abuse resistance:** rate-limit room creation and join attempts, cap room size, use unpredictable codes, reject malformed payloads, and avoid exposing private room state to non-members.
- **Deployment:** host the Node service on a platform that supports persistent WebSocket connections; configure the browser's public `VITE_*`/runtime endpoint to the HTTPS service URL. Keep any signing keys or admin secrets only in server-side environment variables.

## Implemented now: testable room core

`src/room-manager.mjs` implements an in-memory room lifecycle core: create, join, leave, host transfer, host-only start, capacity checks, code validation and expiry. It uses Node's `crypto.randomInt` for room codes. The module is deliberately transport-agnostic so it can later be called by Socket.IO handlers.

This is **not yet a live multiplayer backend**. Rooms exist only inside one Node process, disappear when it stops, and are not reachable from the current browser page. There is no authentication, persistent storage, network transport, reconnect grace period or shared deployment yet.

## Next integration steps

1. Add a Socket.IO server that maps the proposed events to `RoomManager`.
2. Add server-issued session IDs and reconnect tokens with safe expiry.
3. Define and test authoritative game-state transitions (roles, clue collection, meetings and voting).
4. Add a browser lobby UI and connect it to the server endpoint.
5. Deploy the server with WSS, configure the public endpoint, then run a two-browser end-to-end test.

## Run the room-core tests

Requires Node.js 20 or newer:

```bash
npm test
```
