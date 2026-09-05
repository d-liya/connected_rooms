# Architecture for agent-generated games

The repository has three layers. This is enough structure to generate a first game quickly without
turning the project into a general-purpose engine.

Keep the file count low: one module per layer area, not one module per function. Do not add a file
for a single consumer or split a module until it exceeds ~600 lines or gains a second consumer.

## 1. Stable core

`src/core/` should survive when the current story and mechanic are removed. It must not import from
`src/games/` or `src/mechanics/`. It owns camera/layout math, normalized input coordinates, frame
timing, touch and keyboard input, sprite-sheet rendering, timed sequences, element measurement, and
manifest-driven audio.

| Module | Reusable responsibility |
| --- | --- |
| `map.tsx` | World/camera math plus landscape framing, portrait cover/follow camera, normalized pointer coordinates, overlay layer |
| `sprites.tsx` | Metadata-driven sprite-sheet rendering and anchoring |
| `input.tsx` | Held left/right state plus interact and pause keyboard bindings, pointer-safe mobile controls |
| `hooks.ts` | Pausable frame loop with safe delta clamping, resize/orientation observation, lead-in/timed-beat/skip sequences |
| `audio.ts` | Manifest-driven loops, sound effects, mute, voices, music ducking, voice-bank selection |

These APIs are intentionally small. They describe capabilities already used by the game rather than
forecasting every possible game genre.

## 2. Replaceable story package

`src/games/marlinspike.ts` is a single file containing assets, copy, camera shots, world
coordinates, actors, encounter tuning, story-specific audio, and voice banks. Another stealth
story should replace this file and change only the story export in `src/game.ts`.

The stealth schema lives in `src/mechanics/stealth/model.ts` because a combat game should not be
forced to describe guards, suspicion, covers, or clues.

All asset URLs go through `asset()` in `src/assets.ts`, which prefixes `VITE_ASSET_BASE_URL` when
set (CDN production) and falls back to paths relative to `index.html` (local dev and same-origin
deploys). `preloadGameAssets()` warms the cache in the background after first paint.

## 3. Replaceable mechanic package

`src/mechanics/stealth/` owns the current gameplay state, rules, stage, HUD, actor roles, and complete
experience: `model.ts` (state types, story schema, world lookups, guard rules), `engine.ts` (frame
state), `stage.tsx` (world rendering and actor sprites), `experience.tsx` (screens, HUD, shell
wiring). A different primary loop gets a sibling directory and is selected by one import in
`src/main.tsx`.

The mechanic may compose any core modules it needs. It should not modify core to encode its own win
condition, enemies, inventory, dialogue graph, or HUD.

## Shared shell

`src/screens.tsx` holds the title screen and cinematic briefing, both driven by the active
definition. Keep it when the new brief uses the same launch/tour structure; replace it locally when
it does not. It is not registered through a plugin system.

`src/styles.css` is one stylesheet. A second shipped visual theme is the right time to
split structural camera/sprite styles from theme styles; doing it before then would create files
without proving a useful boundary.

## The extraction test

To judge a new abstraction, imagine deleting `src/games/marlinspike.ts` and
`src/mechanics/stealth/`. If the code still has a clear use for any one-map browser game, it belongs
in core. If it mentions clues, suspicion, guards, strongboxes, hearts, or victory copy, it belongs in
the story or mechanic package.

Add an abstraction only when one of these is true:

1. Two real consumers already need it.
2. It protects a fixed format invariant such as map coordinates, camera behavior, asset playback, or
   touch input.
3. It removes browser lifecycle complexity from mechanic code.
