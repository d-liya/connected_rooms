# Arena starter

One fixed full-stage arena, exactly two fighters, lateral movement, held block, light/heavy/special attacks, best-of rounds, AI opponent, timeout, pause and replay. The included vector training figures are neutral fixtures, not generated game content.

## Data contract
src/generated/game.json holds the prepared asset catalog and presentation. src/generated/arena.json holds fighter IDs, names, spawns, health, speeds, bounds, shared ground, rounds, reaction window and default moves. Code generation supplies the canonical design, per-fighter move rules and audio events through GAME_SPEC.md and prepared JSON; author experience.tsx and game-local modules to implement them. Do not reuse fixture names, move tuning or content blindly.

Reuse ActorSprite, image decode gate, shared audio, TouchActions and MapViewport inputs. Keep full arena visible; left/right movement buttons sit at opposite corners. No connected-room traversal. Preserve keyboard/touch, hold release/cancel, pause, retry and replay. Import arena.css after shared styles. No new dependencies.

npm run dev / npm run typecheck / npm run build
bun test tests/arena-combat.test.ts
