# General template contract

## Preserved implementation

All src/core modules and styles.css are retained byte-for-byte from the tested game.
Cinematic camera calculations, timing, skip, player reveal, loading gate, audio unlock,
and title layout remain. Only content bindings for markers/menu rules are generalized.
Unused style selectors are intentionally retained to avoid changing the tested cascade.

## Data and mechanics

GameDefinition in src/game.ts has no stealth types. Assets use arbitrary IDs and animation
state names. Intro markers reference assets.images IDs. Rooms and explicit directed
connections describe traversal; gameplay owns any locks, objectives or encounters.
Replace src/experience.tsx for a new primary mechanic. No engine registry or rule DSL is needed.

Preserve the existing coordinate conventions: player/world x and groundY are 0..1000;
room bands and camera focusY are percentages 0..100; cinematic focus x/y are percentages;
sprite anchors are fractions. Convert pipeline coordinates at preparation boundaries.
Do not change these tested APIs to make their units look uniform.

SpriteSheetDefinition retains calibrated frame dimensions, frames, fps, rendered height and
anchors. The pipeline adapter must prepare compatible sprite sheets from its outputs rather
than reinterpret body scale inside the renderer. Separate pose frames require preprocessing
into a sheet before this renderer can consume them. Audio retains its existing music/ambience,
optional secondary loop, SFX map and voice-root/extension contract and ducking behavior.

## One-call generation (server wiring remains separate)

Clone a pinned commit, prepare game.json and metadata.json plus local/CDN assets, include
source and those JSON files once in the prompt, and request complete changed files wrapped
in <file name="relative/path">...</file>. Do not include binaries, node_modules or dist.
Validate paths and complete blocks, apply changes, then typecheck/build. No critique or
repair-agent phase is required. Supply chatId and the actual generated thumbnail URL;
never infer a thumbnail URL from chatId. Environment overrides remain available.
