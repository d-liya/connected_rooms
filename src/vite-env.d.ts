/// <reference types="vite/client" />

// Set by the pinned game-api-client build (loaded lazily by the shared
// loadGameApiClient in sdk.ts). Only the surface this game uses is typed.
interface GameServerClientInstance {
  getSession(): Promise<{ user?: unknown } | null>;
  signInGuest(): Promise<unknown>;
  startPlaytimeTracking(gameId: string): unknown;
}

interface Window {
  GameServerClient?: new (options?: Record<string, string>) => GameServerClientInstance;
}
