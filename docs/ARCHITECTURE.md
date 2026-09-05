# Architecture for agent-generated games

The repository has three layers. This is enough structure to generate a first game quickly without
turning the project into a general-purpose engine.

## 1. Stable core

`src/core/` should survive when the current story and mechanic are removed.

| Module | Reusable responsibility |
| --- | --- |
| `map/MapViewport.tsx` | Landscape framing, portrait cover/follow camera, normalized pointer coordinates, overlay layer |
| `map/camera.ts` | Pure world-width and clamped camera calculations |
| `sprites/ActorSprite.tsx` | Metadata-driven sprite-sheet rendering and anchoring |
| `input/useHorizontalControls.ts` | Held left/right state plus interact and pause keyboard bindings |
| `input/TouchControls.tsx` | Pointer-safe mobile controls with a configurable action label |
| `loop/useAnimationFrame.ts` | Pausable frame loop with safe delta clamping |
| `cinematic/useTimedSequence.ts` | Lead-in, timed beats, skip, and one-shot completion |
| `audio/AudioController.ts` | Manifest-driven loops, sound effects, mute, voices, and music ducking |
| `audio/voiceBanks.ts` | Voice-bank selection independent of a particular story |
| `hooks/useElementSize.ts` | Resize/orientation observation used by camera systems |

These APIs are intentionally small. They describe capabilities already used by the game rather than
forecasting every possible game genre.

## 2. Replaceable story package

`src/games/marlinspike.ts`, `marlinspikeAudio.ts`, and `marlinspikeVoices.ts` contain assets, copy,
camera shots, world coordinates, actors, encounter tuning, and story-specific audio. Another stealth
story should replace these files and change only `src/game/activeGame.ts`.

The stealth schema lives with the stealth mechanic because a combat game should not be forced to
describe guards, suspicion, covers, or clues.

## 3. Replaceable mechanic package

`src/mechanics/stealth/` owns the current gameplay state, rules, stage, HUD, actor roles, and complete
experience. A different primary loop gets a sibling directory and is selected by
`src/game/activeRuntime.ts`.

The mechanic may compose any core modules it needs. It should not modify core to encode its own win
condition, enemies, inventory, dialogue graph, or HUD.

## Shared shell

`src/components/TitleScreen.tsx` and `CinematicIntro.tsx` are lightweight shell views driven by the
active definition. Keep them when the new brief uses the same launch/tour structure; replace them
locally when it does not. They are not registered through a plugin system.

`src/styles.css` remains one stylesheet for now. A second shipped visual theme is the right time to
split structural camera/sprite styles from theme styles; doing it before then would create files
without proving a useful boundary.

## The extraction test

To judge a new abstraction, imagine deleting `src/games/marlinspike*` and
`src/mechanics/stealth/`. If the code still has a clear use for any one-map browser game, it belongs
in core. If it mentions clues, suspicion, guards, strongboxes, hearts, or victory copy, it belongs in
the story or mechanic package.

Add an abstraction only when one of these is true:

1. Two real consumers already need it.
2. It protects a fixed format invariant such as map coordinates, camera behavior, asset playback, or
   touch input.
3. It removes browser lifecycle complexity from mechanic code.
