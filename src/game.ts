import { AudioController, type AudioManifest } from "./core/audio";
import type { SpriteSheetDefinition } from "./core/sprites";
import { asset } from "./assets";
import definition from "./generated/game.json";
import generatedMetadata from "./generated/metadata.json";

export interface IntroBeat {
  id: string; kicker: string; title: string; description: string;
  focus: { x: number; y: number; zoom: number }; // percentages, matching tested cinematic
  marker?: string; showPlayer?: boolean; showCaption?: boolean; showInRoute?: boolean;
  settleToGameplay?: boolean; cameraDurationMs?: number; durationMs: number;
}
export interface GameDefinition {
  id: string;
  presentation: { themeClass: string; aspectRatio: number; maxStageWidth: number };
  assets: {
    titleArt: string; world: string; images: Record<string, string>;
    characters: Record<string, Record<string, SpriteSheetDefinition>>;
    audio: AudioManifest;
  };
  copy: {
    caseLabel: string; locationName: string; titleEyebrow: string; title: string;
    titleSummary: string; titleRules: string[]; startLabel: string; credits: string;
  };
  intro: { establishingMs: number; skipLabel: string; beats: IntroBeat[] };
  world: {
    startRoom: string;
    rooms: Array<{ id: string; label: string; groundY: number;
      band: { top: number; bottom: number }; bounds: { left: number; right: number }; spawnX: number }>;
    connections: Array<{ id: string; from: string; to: string; x: number; targetX: number; label: string }>;
  };
  player: { assetId: string; speed: number };
}
interface GameMetadata { chatId?: string; thumbnailUrl?: string; copy?: Partial<GameDefinition["copy"]> }
const metadata: GameMetadata = generatedMetadata;
const source: GameDefinition = definition;
export const GAME_ID = (import.meta.env.VITE_GAME_ID ?? "").trim() || metadata.chatId?.trim() || source.id;
const thumbnail = (import.meta.env.VITE_THUMBNAIL_URL ?? "").trim() || metadata.thumbnailUrl?.trim() || source.assets.titleArt;
export const ACTIVE_GAME: GameDefinition = {
  ...source, id: GAME_ID,
  copy: { ...source.copy, ...metadata.copy },
  assets: {
    ...source.assets, titleArt: asset(thumbnail), world: asset(source.assets.world),
    images: Object.fromEntries(Object.entries(source.assets.images).map(([id, url]) => [id, asset(url)])),
    characters: Object.fromEntries(Object.entries(source.assets.characters).map(([id, states]) =>
      [id, Object.fromEntries(Object.entries(states).map(([state, sheet]) => [state, { ...sheet, src: asset(sheet.src) }]))])),
    audio: {
      ...source.assets.audio,
      music: { ...source.assets.audio.music, src: asset(source.assets.audio.music.src) },
      ambience: { ...source.assets.audio.ambience, src: asset(source.assets.audio.ambience.src) },
      secondaryLoop: source.assets.audio.secondaryLoop
        ? { ...source.assets.audio.secondaryLoop, src: asset(source.assets.audio.secondaryLoop.src) } : undefined,
      sfx: Object.fromEntries(Object.entries(source.assets.audio.sfx).map(([id, clip]) => [id, { ...clip, src: asset(clip.src) }])),
      voices: { ...source.assets.audio.voices, root: asset(source.assets.audio.voices.root) },
    },
  },
};

// Gameplay analytics (Capybara game server). Every story's GameDefinition.id is
// the remote gameId reported by the client below; a deploy can override it
// with VITE_GAME_ID without touching the story package. Analytics is enabled
// by default — set VITE_ANALYTICS_ENABLED=false to opt out.
const GAME_API_CLIENT_URL =
  ((import.meta.env.VITE_GAME_API_CLIENT_URL as string | undefined) ?? "").trim() ||
  "https://assets.capybara.build/js/game-api-client.js";


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
