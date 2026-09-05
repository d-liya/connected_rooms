import type { GameDefinition } from "./mechanics/stealth/model";

// Root URL for every game asset (images, audio, voices). Set VITE_ASSET_BASE_URL
// at build time to serve assets from a CDN such as Cloudflare R2, e.g.
// VITE_ASSET_BASE_URL=https://assets.example.com npm run build
// (with public/assets mirrored to https://assets.example.com/assets).
// When unset, assets resolve relative to the deployed index.html, so the same
// build works from Vite dev, any static host, or an R2 bucket.
const configured = ((import.meta.env.VITE_ASSET_BASE_URL as string | undefined) ?? "")
  .trim()
  .replace(/\/+$/, "");

export const ASSET_BASE_URL = configured;

export function asset(path: string): string {
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return configured ? `${configured}/${clean}` : `./${clean}`;
}

function collectImageUrls(game: GameDefinition): string[] {
  const sheets = Object.values(game.assets.characters).flatMap((set) =>
    Object.values(set).map((sheet) => sheet.src),
  );
  return [
    game.assets.titleArt,
    game.assets.world,
    game.assets.portrait,
    game.assets.clue,
    game.assets.finalObjective.locked,
    ...game.assets.finalObjective.opening,
    ...sheets,
  ];
}

export interface AssetLoadProgress {
  loaded: number;
  total: number;
}

// Resolve once every image has loaded or failed (either counts as settled),
// so a loading gate always completes. Audio is decoded through
// AudioController.preload instead, which reports its own counted progress.
export function waitForGameImages(
  game: GameDefinition,
  onProgress?: (progress: AssetLoadProgress) => void,
  timeoutMs = 15000,
): Promise<void> {
  const urls = [...new Set(collectImageUrls(game))];
  const total = urls.length;
  if (typeof window === "undefined" || total === 0) {
    onProgress?.({ loaded: total, total });
    return Promise.resolve();
  }
  onProgress?.({ loaded: 0, total });
  return new Promise((resolve) => {
    let loaded = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve();
    };
    const settle = () => {
      loaded += 1;
      onProgress?.({ loaded, total });
      if (loaded >= total) finish();
    };
    const timer = window.setTimeout(() => {
      onProgress?.({ loaded: total, total });
      finish();
    }, timeoutMs);
    for (const src of urls) {
      const image = new Image();
      image.decoding = "async";
      image.onload = settle;
      image.onerror = settle;
      image.src = src;
    }
  });
}

// Warm the browser image cache in the background right after first paint, so
// no CORS configuration is needed on the CDN. Safe to call once on startup;
// failures are ignored because waitForGameImages settles either way and every
// asset also loads on demand when first used.
export function preloadGameAssets(game: GameDefinition): void {
  const run = () => {
    void waitForGameImages(game);
  };
  if (typeof window === "undefined") return;
  const idle = (window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (idle) idle.bind(window)(run, { timeout: 2500 });
  else window.setTimeout(run, 800);
}
