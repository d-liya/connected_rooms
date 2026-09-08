# General template contract

## Preserved implementation

All src/core modules and styles.css are retained byte-for-byte from the tested game.
Cinematic camera calculations, timing, skip, player reveal, loading gate, audio unlock,
and title loading behavior remain available. Game-specific presentation is authored outside those helpers.
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

Resolve and clone a template commit once per build, prepare game.json and metadata.json plus local/CDN assets, include
source and those JSON files once in the prompt, and request complete changed files wrapped
in <file name="relative/path">...</file>. Do not include binaries, node_modules or dist.
Validate paths and complete blocks, apply changes, then typecheck/build. No critique or
repair-agent phase is required. Supply chatId and the actual generated thumbnail URL;
never infer a thumbnail URL from chatId. Environment overrides remain available.

## Authored opening and ending

src/opening.tsx is an editable example: it uses CinematicIntro when shots are supplied and hands off immediately when the shot list is empty. Generated code may replace it with any fitting React/SVG/Canvas scene or compose the opening in experience.tsx. Keep onComplete once-only and skip/continue accessible. There are no presentation modes to satisfy.

src/ending.tsx is an editable example for the player-earned resolution and onReplay action. Mount it after the actual objective is satisfied. The neutral traversal starter has no win condition; generated gameplay supplies that condition and the ending.

Use existing audio, loading readiness, coordinates, sprites and camera helpers. Game-local modules can draw procedural interactions and effects matching the art direction. Let the intended experience determine the presentation and supporting behavior.
