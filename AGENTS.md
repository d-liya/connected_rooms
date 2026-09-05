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
- manifest-driven local audio with voice ducking;
- timed cinematic beats and a skippable handoff into gameplay.

Change core only when the new brief explicitly changes one of those invariants.

## Choose the smallest implementation path

1. If the brief is another stealth game, create a story package under `src/games/` that satisfies
   `src/mechanics/stealth/schema.ts`. Reuse the stealth runtime unchanged whenever possible.
2. If the brief has a different primary loop, create `src/mechanics/<mode>/` with its own state,
   rules, stage, HUD, and experience component. Reuse `src/core/` directly; do not add combat or
   dialogue-adventure fields to stealth types.
3. Select the story in `src/game/activeGame.ts` and the runtime in `src/game/activeRuntime.ts`.
4. Keep story copy, coordinates, tuning, voice banks, and asset manifests out of core.

Do not introduce an entity-component system, plugin registry, generic rule DSL, global event bus, or
unified state type for hypothetical future mechanics. Extract a new shared abstraction only after a
second real implementation needs the same behavior.

## Definition of a first playable version

- The title screen can start the game.
- The cinematic can complete and be skipped.
- Keyboard and touch controls both operate the primary loop.
- Portrait and landscape preserve the map ratio and keep the player visible.
- The game has a reachable success state and a recoverable failure state.
- All referenced assets are local.
- `npm run typecheck` and `npm run build` pass.
