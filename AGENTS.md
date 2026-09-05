# Game generation contract

Read GAME_SPEC.md. The template is general; no sample story or stealth runtime is present.

## Preserve tested systems

Do not rewrite src/core/, styles.css, or cinematic camera/timing code for content changes.
Move-left stays at the left edge, action centered, move-right at the right edge. Preserve
zoom/follow scale, sprite calibration, portrait/landscape framing, audio ducking/unlock,
loading gates, cinematic shots/skip/handoff. Existing coordinate conventions are documented
in docs/ARCHITECTURE.md; do not silently change units.

## Generation seams

- src/generated/game.json satisfies GameDefinition in src/game.ts. Supply real presentation,
  assets, menu copy, shot list, room geometry/connections, and player configuration.
- src/generated/metadata.json carries chatId, thumbnailUrl, optional copy overrides.
- src/experience.tsx implements the requested mechanic; replace the neutral traversal example.
- Keep story rules out of shared rendering and browser lifecycle modules.
- Keep files few and coherent. No speculative ECS, plugins or generic rule DSL.
- Assets use asset() for relative/CDN resolution. Prepare sprite sheets for the existing renderer.
- Retain reachable success and recoverable failure when required by the brief, along with
  keyboard, touch, pointer, pause and restart.

Return only complete changed/new files in <file name="relative/path">contents</file> blocks.
Do not reproduce unchanged files or binaries. npm run typecheck and npm run build must pass.
The host validates paths and publishes dist. Server adapter wiring is a separate task.
