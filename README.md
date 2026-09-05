# The Secret of Marlinspike Manor

A stealth game built with React, Vite, and TypeScript.

Artwork and audio live in `public/assets/` for local dev and can be served from a CDN (e.g.
Cloudflare R2) in production. The game includes character voice lines, player and guard
footsteps, guard turns and alerts, clue/door/strongbox cues, manor ambience, attic radio hum, and music.
Beginning a new investigation plays a skippable camera briefing that starts at the final objective,
moves down through each floor's key obstacle, and settles at the player's entrance.

After first paint the app preloads all game assets in the background (images via `Image`, audio
via preload hints), so the manor, sprites, and sounds are usually cached before they are needed.
Every asset also loads on demand, so a slow network only delays — never breaks — the game.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

## Controls

- Move: `A` / `D`, left / right arrow keys, click or tap the active floor, or use the on-screen controls.
- Interact: `E`, Space, or click the interaction prompt.
- Pause: `P` or Escape.

Collected clues persist after being spotted. Hearts refill when entering a new floor; losing all three hearts restarts only the current floor.

## Responsive camera

- Landscape keeps the full authored map composition visible.
- Portrait treats the screen as a camera viewport: the map keeps its original aspect ratio, fills
  the screen height, overflows horizontally, and follows the player with edge clamping.
- Touch controls appear on touch-first devices in either orientation.
- Desktop map rendering is capped by `presentation.maxStageWidth` (1000px for this game), allowing
  the bundled 2K source art to remain crisp on high-density screens.

## Production build and R2 deploy

The build uses relative URLs (`base: "./"` in `vite.config.ts`), so `dist/` works from any host,
subpath, or bucket without code changes.

1. Mirror `public/assets` to R2 (or any static host with a public URL), preserving paths:
   `assets/manor.png` → e.g. `https://assets.example.com/assets/manor.png`.
2. Build with the CDN origin as the asset root (see `.env.example`):
   ```bash
   VITE_ASSET_BASE_URL=https://assets.example.com npm run build
   ```
   With the variable unset, the build instead loads `./assets/*` relative to `index.html`.
3. Upload `dist/*` to your web host (R2 static hosting, Cloudflare Pages, etc.) and open the
   served `index.html`. No server-side code is required.

```bash
npm run build
npm run preview
```

## Template structure

The project has two explicit selection points instead of a general-purpose game framework:

- `src/game.ts` selects the story package. The current package in
  `src/games/marlinspike.ts` owns narrative copy, world/floor layout, intro camera beats, clue and
  guard placement, tuning, asset paths, sprite metadata, audio manifest, voice banks, and theme class.
- `src/main.tsx` selects the gameplay family with one import (currently the stealth
  experience). A substantially different game, such as combat, should add a sibling runtime and
  switch this one import instead of adding combat conditionals to the stealth engine.
- `src/assets.ts` resolves every asset URL (`asset()`) from `VITE_ASSET_BASE_URL` and preloads
  the active game's assets in the background after first paint.
- `src/core/` contains the reusable map camera, sprite renderer, input, frame loop, timed sequence,
  resize, and audio building blocks.
- `src/mechanics/stealth/` contains the complete current runtime: `model.ts` (state types, story
  schema, world lookups, guard rules), `engine.ts` (frame state), `stage.tsx` (world rendering and
  actor sprites), and `experience.tsx` (screens, HUD, and shell wiring).

Replace `GAME_SPEC.md` with a new brief before assigning the repository to a coding agent. See
`docs/ARCHITECTURE.md` and `src/games/README.md` for the intended extension path.
