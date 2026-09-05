# Creating another game

This codebase is a template, but it deliberately is not a game engine. Reuse the stable shell and
make a direct choice at one of two seams.

## Another stealth story

1. Replace `GAME_SPEC.md`, then copy `marlinspike.ts` and its audio/voice files.
2. Replace copy, floors, intro beats, assets, voice cues, and tuning in the new definition.
3. Add the new local assets under `public/`.
4. Change the single export in `../game/activeGame.ts`.
5. Add a theme class to `styles.css` if the new story needs a different visual language.

No changes to movement, patrol, suspicion, input, checkpoints, or audio playback should be needed.

## A different mechanic

For combat, dialogue adventure, or another genuinely different play loop, create a sibling to
`../mechanics/stealth/`. Give that runtime its own state hook, rules file, stage, HUD,
and input model, then change the export in `../game/activeRuntime.ts`.

Share the title screen, cinematic component, schema fields, or audio controller only when they still
fit. Do not widen the stealth state with health bars, weapons, inventories, or branching dialogue
until a real second game proves those concepts are shared.

## Camera briefing

`intro.beats` is an ordered shot list. Every beat owns its text, duration, floor, optional clue/final
objective marker, and a normalized camera focus:

- `x` and `y` are percentages of the world artwork.
- `zoom` is a scale where `1` shows the complete world.
- The first shot should establish the final goal; the last should land on the player entrance.

Keep the list short enough to watch and always retain the skip control.
