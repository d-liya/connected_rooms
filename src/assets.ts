import type { GameDefinition } from "./game";

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
  if (/^https?:\/\//i.test(path)) return path;
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
    ...Object.values(game.assets.images),
    ...sheets,
  ];
}

export interface AssetLoadProgress {
  loaded: number;
  total: number;
}

const decoded = new Map<string, Promise<HTMLImageElement>>();
export function decodeGameImage(src: string): Promise<HTMLImageElement> {
  const cached = decoded.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => image.decode().then(() => resolve(image), reject);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
  decoded.set(src, promise);
  void promise.catch(() => decoded.delete(src));
  return promise;
}

export async function waitForGameImages(game: GameDefinition, onProgress?: (progress: AssetLoadProgress) => void): Promise<void> {
  const urls = [...new Set(collectImageUrls(game))];
  let loaded = 0;
  onProgress?.({ loaded, total: urls.length });
  // Limit concurrent decoding; failure never counts as ready.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, urls.length) }, async () => {
    while (next < urls.length) {
      await decodeGameImage(urls[next++]!);
      onProgress?.({ loaded: ++loaded, total: urls.length });
    }
  }));
}
export function preloadGameAssets(game: GameDefinition): void {
  if (typeof window !== "undefined") void waitForGameImages(game).catch(() => undefined);
}
