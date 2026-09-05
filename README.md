# The Secret of Marlinspike Manor

A self-contained, local stealth game built with React, Vite, and TypeScript.

All artwork and audio are bundled locally. The game includes character voice lines, player and guard
footsteps, guard turns and alerts, clue/door/strongbox cues, manor ambience, attic radio hum, and music.
Beginning a new investigation plays a skippable camera briefing that starts at the final objective,
moves down through each floor's key obstacle, and settles at the player's entrance.

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

## Production build

```bash
npm run build
npm run preview
```

## Template structure

The project has two explicit selection points instead of a general-purpose game framework:

- `src/game/activeGame.ts` selects the story package. The current package in
  `src/games/marlinspike.ts` owns narrative copy, world/floor layout, intro camera beats, clue and
  guard placement, tuning, asset paths, sprite metadata, audio roots, and the theme class.
- `src/game/activeRuntime.ts` selects the gameplay family. It currently exports the stealth
  experience. A substantially different game, such as combat, should add a sibling runtime and
  switch this one export instead of adding combat conditionals to the stealth engine.
- `src/core/` contains the reusable map camera, sprite renderer, input, frame loop, timed sequence,
  resize, and audio building blocks.
- `src/mechanics/stealth/` contains the complete current runtime, including its schema, state,
  patrol rules, stage, HUD, and actor roles.

Replace `GAME_SPEC.md` with a new brief before assigning the repository to a coding agent. See
`docs/ARCHITECTURE.md` and `src/games/README.md` for the intended extension path.
