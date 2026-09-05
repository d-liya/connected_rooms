# Creating another game

This codebase is a template, but it deliberately is not a game engine. Reuse the stable shell and
make a direct choice at one of two seams.

## Another stealth story

1. Replace `GAME_SPEC.md`, then copy `marlinspike.ts` (audio manifest and voice banks included).
2. Replace copy, floors, intro beats, assets, voice cues, and tuning in the new definition.
   Keep `id` unique per story: it is the gameId reported to gameplay analytics.
3. Add the new assets under `public/` and reference them through `asset()` from `../../assets`
   so they work locally and from the CDN without code changes.
4. Change the single story export in `../game.ts`.
5. Add a theme class to `styles.css` if the new story needs a different visual language.

No changes to movement, patrol, suspicion, input, checkpoints, or audio playback should be needed.

## A different mechanic

For combat, dialogue adventure, or another genuinely different play loop, create a sibling to
`../mechanics/stealth/`. Give that runtime its own model, engine, stage, and experience files,
then change the single runtime import in `../main.tsx`.

Share the title screen, cinematic component, or audio controller only when they still
fit. Do not widen the stealth state with health bars, weapons, inventories, or branching dialogue
until a real second game proves those concepts are shared.

## Camera briefing

`intro.beats` is an ordered shot list. Every beat owns its text, duration, floor, optional clue/final
objective marker, and a normalized camera focus:

- `x` and `y` are percentages of the world artwork.
- `zoom` is a scale where `1` shows the complete world.
- The first shot should establish the final goal; the last should land on the player entrance.

Keep the list short enough to watch and always retain the skip control.
