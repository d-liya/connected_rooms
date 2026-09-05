# Core toolkit

This directory is the reusable starting point for one-map browser games. It contains browser and
rendering infrastructure only. It must not import from `src/games/` or `src/mechanics/`.

Core owns camera/layout math, normalized input coordinates, frame timing, touch and keyboard input,
sprite-sheet rendering, timed sequences, element measurement, and manifest-driven audio.

Game rules and story vocabulary do not belong here. See `docs/ARCHITECTURE.md` and the repository
`AGENTS.md` before adding another abstraction.
