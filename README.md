# Connected Rooms

A small React + TypeScript + Vite foundation for agent-generated connected-rooms games.
The clean starter demonstrates movement, connected rooms, camera framing, touch controls,
a skippable intro, and pause/restart. It intentionally has no story-specific rules.
The complete original game is on `example/marlinspike`.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
```

Replace `GAME_SPEC.md` and `src/generated/*.json`, then implement gameplay in `src/game.tsx`.
Use `src/core/` for rendering, input, timing, audio, and world contracts.
See [architecture and asset contract](docs/ARCHITECTURE.md).

Vite builds relative paths into `dist/` for static hosting under any subpath.
`VITE_ASSET_BASE_URL` optionally prefixes image asset paths. Audio accepts explicit URLs.
The neutral starter makes no analytics requests. Add game-specific analytics when wiring hosting.
