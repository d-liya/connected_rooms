# Single-screen game template

This template supports games on one fixed side-view screen. The sample mechanics are replaceable. Implement the authored GAME_SPEC.md and prepared arena.json using the supplied media and scene geometry.

The template owns src/sdk.ts, src/core, game.ts and the shared rendering, input and audio infrastructure. Game-specific implementation belongs in experience.tsx and local simulation/style modules. Generated asset data is authoritative. Keep keyboard/touch controls, pause and restart usable. Run npm run typecheck and npm run build.

## Game services
Use the single read-only `src/sdk.ts` module: `import { sdk } from './sdk'`.
It loads the hosted client lazily and uses host-injected `window.gameId`; offline play makes no service calls.
When requested, implement multiplayer in the first pass: local controls for local multiplayer, or online room-code create/join, guest identity, ready/waiting state, synchronized turns/actions/results and leave/rematch/error handling.
Online API: `sdk.auth.ensureGuestSession()`, `sdk.multiplayer.joinRoom(code, metadata)`, `getRoomPlayers()`, `getRoomState()`, `updateRoomState(fullState)`, `leaveRoom()`, and `subscribe(onState, onError)` which returns cleanup. Subscriptions must be cleaned up on unmount/leave. Do not silently replace requested humans with AI.
Room updates replace state with optimistic versions. On HTTP 409 fetch latest state and recompute the intended action; never replay a stale replacement. On errors stop polling and offer retry; respect 429 backoff. No requests in animation/render loops. Membership presence does not detect disconnects reliably.
This is HTTP shared state, suitable for paced or turn-based multiplayer, not rollback or authoritative realtime fighting. Preserve the creator's requested mode and expose limitations honestly. Define turn/ownership rules in gameplay. Cloud saves: `sdk.save`; per-user storage: `sdk.storage`; optional analytics: `sdk.enableAnalytics()`.
