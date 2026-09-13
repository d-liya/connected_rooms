# Arena generation contract

Read GAME_SPEC.md. This branch is a neutral single-stage arena starter. Implement the supplied arena design using prepared game.json, arena.json, placements.json and audio-events.json. Copy and theme belong in content.json and game-local CSS. Never invent connected rooms, doors or traversal.

Preserve src/core, src/assets.ts, src/game.ts, src/main.tsx and src/styles.css. Author src/experience.tsx, src/arena-combat.ts, src/arena.css and supporting game-local modules. Use authoritative fighter IDs, stats, moves, spawns, bounds and animation playback. The simple training loop is a starting point, not the finished generated game.

Keep a fixed whole-stage camera, feet anchors and full animation frame playback. Use ActorSprite action clocks and damage feedback. Keep pause and restart synchronized with audio and animation. Keep movement arrows in opposite corners with attacks between them; touch press/release/cancel and keyboard must work. Keep all controls visible in portrait and landscape.

Render the supplied screenshot HUD style as live HTML/CSS. Provide title/loading, fair AI, round transitions, timeout tie replay, reachable victory, loss and rematch. Load only prepared media and surface image failures with retry. No invented media URLs.

Return complete files in <file name="src/..."> blocks. Must replace experience.tsx and author content.json. npm run typecheck and npm run build must pass.
