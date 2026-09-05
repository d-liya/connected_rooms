# Template and generation contract

## Boundaries

`src/core/world.ts` defines rooms and explicit directed connections. A room may be a floor
or a horizontal portion of one floor. Connections carry their destination spawn; they do
not imply linear floor order or gameplay unlock rules. Gameplay owns locks and progression.

`src/core/map.tsx` renders one authored map with full-map large-screen framing and cover/follow
framing on portrait or narrow screens. All world inputs, including camera focus and pointer
outputs, use 0..1000. `src/core/sprites.tsx` preserves source aspect ratios and foot anchors.
`src/core/input.tsx`, hooks.ts, and audio.ts own browser lifecycle concerns.

`src/game.tsx` is intentionally replaceable. Title, intro copy, player state, interactions,
and outcomes belong here. Build combat, stealth, puzzles, dialogue, or collection directly;
there is no required stealth schema or universal gameplay DSL.

## Prepared asset data (version 1)

world.json satisfies WorldDefinition; assets.json maps stable asset IDs to SpriteAsset;
audio.json satisfies AudioManifest. The small checked-in fixtures are a runnable example.
These are target contracts, not raw pipeline payloads. The server adapter is a later step.

Each SpriteClip supplies sources, frameWidth, frameHeight, frameCount, columns, fps, loop,
height, anchor, facing, and mirror. One source means an atlas (columns supports multiple rows).
Multiple sources mean equally sized individual frames, in playback order; their count must
match frameCount. Static images use one frame. Missing animation states use fallback.
Normalize unequal pose canvases before writing the manifest. Dimensions must be positive,
counts and columns positive integers, fps positive, and anchors fractions in 0..1.

Preparation must convert pipeline seedUrl to fallback; clip.sheet/url to a one-source atlas;
clip.frames/urls to individual sources; frameCount/fps/loop and direction metadata explicitly.
For sheets, derive full-frame world height from canonical visible subject height and the
source content-height calibration, including clip scale. For poses, apply normalization's
scaleMultiplier to canonical renderSize.height and divide feetAnchor by 1000. Do not use
padded sheet height as the pose baseline. Preserve authored image aspect ratios.

Audio music and ambience are optional; sfx and voices.clips are maps keyed by stable IDs.
Every audio clip has an explicit src and volume. Voice IDs need not share an extension or
folder. Resolve local/CDN paths before creating AudioController. The empty manifest is valid.

## One-call integration (not wired into the server yet)

1. Clone a pinned template commit.
2. Prepare local assets and the three JSON inputs; validate dimensions, IDs and connections.
3. Include GAME_SPEC.md, AGENTS.md, all relevant source/config files, and each prepared JSON
   once in the prompt. Attach visual references separately; exclude binary assets, dist,
   node_modules, .git, and lockfile contents from model context.
4. Request complete changed files using `<file name="relative/path">...</file>` delimiters.
5. Reject absolute/traversal paths, duplicates, malformed/truncated blocks and protected files.
   Apply only validated output to the seeded repository; keep untouched files.
6. Run TypeScript/Vite build and publish dist. Record failures without an automatic model loop.

No planning, critique, or testing-agent call is required. A testing agent can be added later.
Pin the template commit and data-contract version in generation checkpoint fingerprints.
