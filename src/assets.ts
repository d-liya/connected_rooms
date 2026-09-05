// Local paths are relative to the deployment; absolute CDN URLs pass through.
const base = (import.meta.env.VITE_ASSET_BASE_URL ?? "").trim().replace(/\/+$/, "");
export function asset(path: string): string {
  if (/^https?:\/\//.test(path) || path.startsWith("data:")) return path;
  const clean = path.replace(/^\.?\//, "");
  return base ? `${base}/${clean}` : `./${clean}`;
}
export function preloadImages(urls: string[]): void {
  for (const url of new Set(urls)) { const image = new Image(); image.src = asset(url); }
}
