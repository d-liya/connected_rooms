# Connected rooms generation contract

Read GAME_SPEC.md first. This template uses React, TypeScript, and Vite.

- src/core/ contains reusable rendering, room geometry, input, timing, and audio. Keep story rules out of it.
- src/game.tsx is the replaceable game: title, intro, state, interactions, HUD, progression, and outcomes.
- src/generated/world.json, assets.json, and audio.json are prepared input data. Import them rather than transcribing them.
- All world coordinates use 0..1000 on both axes. Sprite anchors use fractions 0..1.
- Use asset() for image paths. Audio manifest src values must already be deployment-ready URLs (relative ./assets/... or absolute CDN URLs).
- Preserve sprite aspect ratios and calibrated frame heights. Never substitute collision dimensions for artwork dimensions.
- Keep keyboard, pointer, touch, pause, and restart usable. Use dt for gameplay timing.
- Do not introduce an ECS, rule DSL, plugin registry, or universal gameplay state. Implement the requested mechanic directly.
- Keep file count small. Split only for a clear responsibility or substantial size.
- A generated game must have reachable success and recoverable failure where the brief requires them.
- npm run typecheck and npm run build must pass. Deploy dist/, never the TypeScript source tree.

For one-call generation, return only complete new or changed UTF-8 files:
<file name="src/game.tsx">complete contents</file>
Do not return unchanged files, binary assets, dependencies, lockfile churn, Markdown fences, or a plan.
Treat these as file delimiters, not XML-escaped source. The host must validate paths and completeness before applying them.

The original playable stealth example is preserved on example/marlinspike.
