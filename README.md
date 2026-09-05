# Connected Rooms

General React/Vite template with the tested camera, split touch controls, sprite renderer,
audio, title/loading screen and cinematic playback preserved. The original sample game is
archived on the `example/marlinspike` branch; main does not import or include it.

Run `npm ci`, `npm run dev`, `npm run typecheck`, and `npm run build`. Deploy `dist/`.

- `src/generated/game.json`: presentation, menu copy, assets, intro shots, rooms and connections.
- `src/generated/metadata.json`: generated thumbnailUrl, analytics chatId, optional copy overrides.
- `src/experience.tsx`: replaceable gameplay. The default only demonstrates traversal.
- `src/core/`: tested browser systems. Do not rewrite them during content generation.
- `src/screens.tsx`: shared title and cinematic components with their original timing/framing.

The blank game ID disables analytics in the neutral fixture. Generated runs supply chatId.
Silent fixture audio keeps the existing AudioManifest shape without adding a soundtrack.
See docs/ARCHITECTURE.md for exact coordinate and generation contracts.
