// Story selection point for the template. To ship another stealth story, point
// ACTIVE_GAME at a different story package. (The gameplay runtime is selected
// by the ActiveExperience import in main.tsx.)
import { AudioController } from "./core/audio";
import { marlinspikeGame as ACTIVE_GAME } from "./games/marlinspike";

export { ACTIVE_GAME };

// Gameplay analytics (Capybara game server). Every story's GameDefinition.id is
// the remote gameId reported by the client below; a deploy can override it
// with VITE_GAME_ID without touching the story package. Analytics is enabled
// by default — set VITE_ANALYTICS_ENABLED=false to opt out.
const GAME_API_CLIENT_URL =
  ((import.meta.env.VITE_GAME_API_CLIENT_URL as string | undefined) ?? "").trim() ||
  "https://assets.capybara.build/js/game-api-client.js";

export const GAME_ID =
  ((import.meta.env.VITE_GAME_ID as string | undefined) ?? "").trim() || ACTIVE_GAME.id;

export function isGameAnalyticsEnabled(): boolean {
  const raw = ((import.meta.env.VITE_ANALYTICS_ENABLED as string | undefined) ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return true;
  return !["0", "false", "off", "no", "disabled"].includes(raw);
}

interface PlaytimeClient {
  startPlaytimeTracking(gameId: string): unknown;
}

let clientLoad: Promise<new (options?: Record<string, string>) => PlaytimeClient> | null = null;
let sharedClient: PlaytimeClient | null = null;
let analyticsStartedFor: string | null = null;

function loadGameApiClient(): Promise<new (options?: Record<string, string>) => PlaytimeClient> {
  if (window.GameServerClient) return Promise.resolve(window.GameServerClient);
  if (!clientLoad) {
    clientLoad = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GAME_API_CLIENT_URL;
      script.async = true;
      script.dataset.gameApiClient = "true";
      script.onload = () => {
        if (window.GameServerClient) resolve(window.GameServerClient);
        else {
          clientLoad = null;
          reject(new Error("game API client did not register window.GameServerClient"));
        }
      };
      script.onerror = () => {
        clientLoad = null;
        reject(new Error(`failed to load game API client from ${GAME_API_CLIENT_URL}`));
      };
      document.head.appendChild(script);
    });
  }
  return clientLoad;
}

// Load the game API client once and start playtime tracking for this game's
// id. Safe to call at startup: failures only warn, so the game always remains
// playable offline or when the analytics host is unreachable.
export function startGameAnalytics(): void {
  if (!isGameAnalyticsEnabled()) return;
  const gameId = GAME_ID.trim();
  if (!gameId || analyticsStartedFor === gameId) return;
  analyticsStartedFor = gameId;
  loadGameApiClient()
    .then((Client) => {
      if (!sharedClient) {
        const baseUrl = ((import.meta.env.VITE_GAME_SERVER_URL as string | undefined) ?? "").trim();
        sharedClient = new Client(baseUrl ? { baseUrl } : undefined);
      }
      sharedClient.startPlaytimeTracking(gameId);
    })
    .catch((error) => {
      analyticsStartedFor = null;
      console.warn("[analytics] gameplay analytics unavailable; continuing without it.", error);
    });
}

export function createGameAudio(): AudioController {
  return new AudioController(ACTIVE_GAME.assets.audio);
}

export type { AudioController } from "./core/audio";
