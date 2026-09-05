# Game generation contract

`GAME_SPEC.md` is the input brief for the game currently being built. It may be structured or plain
prose. Read it before changing implementation code.

## Preserve the stable foundation

Do not edit `src/core/` for story changes or mechanic-specific behavior. The core contract is:

- one normalized 1000 × 1000 world coordinate system rendered from one map image;
- an authored aspect ratio with full-map landscape framing and cover/follow portrait framing;
- sprite sheets described by metadata rather than hard-coded in the renderer;
- keyboard, pointer, and touch input;
- requestAnimationFrame timing with clamped deltas;
- manifest-driven audio (local files or CDN) with voice ducking;
- timed cinematic beats and a skippable handoff into gameplay.

Change core only when the new brief explicitly changes one of those invariants.

## Choose the smallest implementation path

1. If the brief is another stealth game, create a story package under `src/games/` that satisfies
   the `GameDefinition` in `src/mechanics/stealth/model.ts`. Reuse the stealth runtime unchanged
   whenever possible.
2. If the brief has a different primary loop, create `src/mechanics/<mode>/` with its own state,
   rules, stage, HUD, and experience component. Reuse `src/core/` directly; do not add combat or
   dialogue-adventure fields to stealth types.
3. Select the story in `src/game.ts` and the runtime in `src/main.tsx` (one import line each).
4. Keep story copy, coordinates, tuning, voice banks, and asset manifests out of core.

Do not introduce an entity-component system, plugin registry, generic rule DSL, global event bus, or
unified state type for hypothetical future mechanics. Extract a new shared abstraction only after a
second real implementation needs the same behavior.

## Keep the file count low

Agent cost scales with files read. Prefer fewer, larger files over many small ones:

- Do not create a new file for code with a single consumer or under ~100 lines; fold it into its
  consumer.
- Do not create a folder for a single file.
- Do not split a module until it exceeds ~600 lines or gains a second consumer.
- Asset URLs always go through `asset()` in `src/assets.ts`; never hard-code `/assets/...`.

## Assets and deployment

- `public/assets/` is the local asset source, served by Vite in dev.
- `VITE_ASSET_BASE_URL` (see `.env.example`) switches every asset to a CDN such as Cloudflare R2
  at build time. When unset, assets resolve relative to the deployed `index.html`.
- `vite.config.ts` uses `base: "./"` so `dist/` works from any host or subpath, including an R2
  bucket. Upload `public/assets` to the CDN, build with the CDN base URL, and upload `dist/`.
- `preloadGameAssets()` in `src/assets.ts` warms the browser cache in the background after first
  paint; every asset also loads on demand, so preload failures are never fatal.

## Definition of a first playable version

- The title screen can start the game.
- The cinematic can complete and be skipped.
- Keyboard and touch controls both operate the primary loop.
- Portrait and landscape preserve the map ratio and keep the player visible.
- The game has a reachable success state and a recoverable failure state.
- All referenced assets resolve locally or from the configured CDN.
- `npm run typecheck` and `npm run build` pass.

## Tested behavior must survive template cleanup

Do not replace the tested camera framing/zoom/follow calculations, sprite calibration,
cinematic timing and handoff, audio controller, or touch-control layout as template cleanup.
Move-left stays at the left edge, the action stays centered, and move-right stays at the right
edge. Remove story-specific content by changing data and copy, not by rebuilding these systems.

The pipeline writes src/generated/metadata.json with chatId, thumbnailUrl, and optional copy
(overrides matching the active story copy fields). GAME_ID uses VITE_GAME_ID, then chatId,
then the example ID. Title artwork uses VITE_THUMBNAIL_URL, then thumbnailUrl, then example art.
An empty file intentionally preserves the working example. Real runs must populate metadata;
do not derive a thumbnail URL from chatId. The server adapter is not wired yet.
