# General template contract

## Gameplay viewport and touch input

Use game-shell gameplay-layout, a gameplay-hud header, MapViewport, then TouchActions. The header has a bounded height (--gameplay-hud-height, default 80px landscape / 112px portrait); author enough room for the largest status including boss bars without resizing it during combat. Compact/reflow content at each breakpoint. Action space is 76px plus the device bottom inset on touch layouts. These rows reserve actual space outside the world, including the highest/lowest floors. Desktop contains the map at its native aspect ratio aligned to the top of the gameplay frame. Smaller frames cover at 1.25 times frame height to allow vertical following, clamped inside the world.

MapViewport accepts transitionKey for a 620ms room-arrival transition, onDirection for map-wide joystick input, and inputEnabled for pause/intro/win gating. The joystick listens on the frame, not a particular room or a blocking overlay. Buttons, form controls and data-no-joystick regions are excluded. TouchActions accepts an array of id/label/icon/disabled/onPress/onRelease; onRelease marks a held action. Keep labels short and the set compact. Story rules, hit-stop duration, attack trails and impact art remain game-local; ActorSprite.damageElapsedSeconds supplies the shared actor damage pulse.

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
