/// <reference types="vite/client" />

// Set by https://assets.capybara.build/js/game-api-client.js (loaded lazily
// by startGameAnalytics in game.ts). Only the surface this game uses is typed.
interface GameServerClientInstance {
  startPlaytimeTracking(gameId: string): unknown;
}

interface Window {
  GameServerClient?: new (options?: Record<string, string>) => GameServerClientInstance;
}
