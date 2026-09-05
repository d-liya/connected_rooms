# Active game brief

This is the single input document a coding agent should read first. Replace its contents when
generating a different game; the brief can remain natural language as long as the goal, actors,
interactions, progression, and available assets are clear.

## Identity

- Title: The Secret of Marlinspike Manor
- Primary loop: side-view stealth and timing
- Player: reporter Tintin
- Goal: recover three torn dossier pages and open the attic strongbox before dawn
- Tone: illustrated mid-century mystery; tense but accessible

## Fixed presentation

- One 2K manor cutaway image contains the complete playable world.
- Runtime coordinates are normalized from 0 to 1000 on both axes.
- The map is authored at 16:9 and renders at no more than 1000 CSS pixels on large screens.
- Landscape shows the complete map. Portrait fills the screen height, crops horizontal overflow,
  and follows the player.
- Existing player, watchman, and chief sprite-sheet shapes and anchors are authoritative.

## Progression

1. Wine cellar: learn movement and collect page one.
2. Kitchen and pantry: avoid a turning lookout, use cover, and collect page two.
3. Portrait gallery: cross two opposing sightlines.
4. Maritime library: follow a patrol, hide, and collect page three.
5. Attic radio room: evade the chief and open the strongbox.

Collected clues survive capture. Capture returns the player to the current floor entrance. Repeated
failures slightly slow the encounter and eventually reveal cover hints.

## Controls

- Move: A/D, arrow keys, click/tap destination, or touch arrows.
- Interact: E, Space, prompt button, or touch action.
- Pause: P or Escape.

## Opening

Start with a skippable circular-spotlight camera tour. Reveal the final objective first, move down
through each floor's important clue or obstacle, reveal the player at the cellar entrance, then open
the spotlight and slowly pull back to the exact gameplay camera framing.

## Audio

Serve music, ambience, location loop, footsteps, alerts, interactions, and contextual player and
guard voices from the asset base (local `public/assets` in dev, CDN in production) and preload them
in the background on load. Voice playback ducks the music and mute affects every channel.

## Completion

Opening the strongbox with all three clues reveals the evidence and presents a replay/title choice.
