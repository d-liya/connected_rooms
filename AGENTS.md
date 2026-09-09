# Game generation contract

Read GAME_SPEC.md. The template is general; no sample story or stealth runtime is present.

## Preserve tested systems

Do not rewrite src/core/, styles.css, or cinematic camera/timing code for content changes.
Use MapViewport onDirection for map-wide floating joystick input and TouchActions for compact actions. Preserve
zoom/follow scale, sprite calibration, portrait/landscape framing, audio ducking/unlock,
loading gates and reliable opening skip/handoff. Choose presentation per game. Existing coordinate conventions are documented
in docs/ARCHITECTURE.md; do not silently change units.

## Generation seams

- src/generated/game.json satisfies GameDefinition in src/game.ts. Supply real presentation,
  assets, menu copy, shot list, room geometry/connections, and player configuration.
- src/generated/metadata.json carries chatId, thumbnailUrl, optional copy overrides.
- src/opening.tsx is an editable starting point for an authored opening through GameOpening. Keep onComplete once-only, skip/continue and audio controls.
- src/ending.tsx authors the player-earned resolution through GameEnding and onReplay.
- src/experience.tsx implements the requested mechanic; replace the neutral traversal example.
- Keep story rules out of shared rendering and browser lifecycle modules.
- Keep files few and coherent. No speculative ECS, plugins or generic rule DSL.
- Assets use asset() for relative/CDN resolution. Prepare sprite sheets for the existing renderer.
- Retain reachable success and recoverable failure when required by the brief, along with
  keyboard, touch, pointer, pause and restart.

Return only complete changed/new files in <file name="relative/path">contents</file> blocks.
Do not reproduce unchanged files or binaries. npm run typecheck and npm run build must pass.
The host validates paths and publishes dist. Server adapter wiring is a separate task.

## Playback and presentation defaults
Author game-specific title/menu in src/title-screen.tsx and HUD CSS. Preserve title ready/progress/onStart behavior. Keep src/screens.tsx cinematic sequencing intact. ActorSprite accepts elapsedSeconds, durationSeconds, loop, paused and playbackKey. Synchronize these with gameplay action clocks; do not remount actors or override sprite CSS animations. Update ambient patrols across all rooms using core/ambient.ts; keep combat and voices local. Pause all actors when paused. Catch image-load failures and show retry; never bypass decoding.

## Experience direction
Use the creator's experience direction to develop actions, decisions and consequences across the game. Physical floor numbers are independent of visit order. Choose the opening, purposeful journey and player-caused payoff to serve this game. Treat the supplied design as a creative hypothesis and resolve supporting details with your judgment. Generated artwork supplies identity and geometry; game-local React, inline SVG, Canvas, CSS and shaders can provide interactive fixtures, diary panels, signals, lighting and transformations. Match the art direction and connect each visual to actual game state. Provide a lightweight fallback for elaborate effects.

## Stable mobile composition and damage feedback
Use game-shell gameplay-layout with a gameplay-hud header and TouchActions below MapViewport. Set --gameplay-hud-height per breakpoint for the largest HUD state, including boss status; keep that reservation stable. The map stays below the HUD and above actions with its aspect ratio intact. Pass transitionKey={roomId}, onDirection={controls.setDirection}, and inputEnabled={playing} to MapViewport. Touch dragging works on every floor and both sides of the map; never gate it by player-floor coordinates. Interactive descendants and data-no-joystick regions retain their own input. TouchActions accepts actions with id, label, optional icon/disabled, onPress and optional onRelease for held actions. Keep actions compact, normally at most three or four; use context-sensitive actions and a pause/help screen instead of stacking control bars. The old TouchControls component remains only for compatibility.

Attack anticipation/trails and confirmed impact effects belong in game-local code, synchronized with action clocks. On damage to the player as well as NPCs, show the shared damage pulse immediately even during another animation. Explicitly choose whether a hurt clip interrupts or overlays the current action; never silently omit feedback because the actor is busy. Preserve defeat precedence and distinguish misses, successful blocks, dodges and invulnerability from health loss. Optional short hit-stop must freeze simulation clocks together while its own timer advances; pause/restart and reduced motion apply to all effects.
Keep MapViewport dimensions stable when transient text or enemy status changes. Use bounded, persistent HUD/control slots for contextual text, including the empty state; keep their contents from changing stage height. Place boss status in safe reserved HUD space when the top floor has no headroom. Keep characters and attack cues visible; positions follow their container rather than guessed screen offsets.

ActorSprite accepts damageElapsedSeconds. On actual health loss, record each actor's lastDamageAt and pass gameplayTime - lastDamageAt to show an immediate chromatic hit pulse independently of the current animation. Omit before any hit, freeze gameplay time on pause, and reset on restart. A block or miss uses different feedback. The shared pulse preserves scale, ground anchors and frame playback, with a reduced-motion treatment. Supporting effects may be themed in game-local CSS.
