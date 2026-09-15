# Single-scene generation contract

Implement GAME_SPEC.md using the canonical design and supplied reference images, game.json, arena.json, placements.json and audio-events.json. This is a fixed-scene foundation, not a fighting-game specification. Existing sample rules, controls and presentation are replaceable.

Read-only during game generation: src/core/**, src/sdk.ts, src/styles.css, src/assets.ts, src/main.tsx and src/game.ts, prepared media/metadata JSON and dependency configuration. Preserve the existing host gameId and SDK integration.

Include src/experience.tsx and src/arena.css, plus src/generated/content.json when the game changes presentation copy, intro or player speed. An override must keep copy.title, an intro.beats array and a positive playerSpeed. Add game-local modules under src as needed. Use actual exports from the seeded source; do not assume helpers or fields that are not supplied.

Use the prepared asset IDs, coordinate conventions, anchors, facing normalization and animation-event mappings. Preserve uninterrupted source-frame ordering while synchronizing game-local retiming and rule-permitted interruptions. Missing analysis does not remove authored mechanics or authorize fabricated metadata.

Derive controls, physics, AI when requested, feedback, interface and outcome handling from this game. Keep the whole authored scene visible; no offscreen traversal or additional connected stages. Keep input, animation, pause, audio and reset behavior coherent.

Use sdk services only as required by the requested mode or existing host integration. Online play must use real remote sessions and respect the actual SDK's versioning, cleanup and transport limitations.

Return complete <file name="src/...">contents</file> blocks only. The pipeline runs npm run typecheck and npm run build after applying them; do not claim these ran during an output-only generation call.
