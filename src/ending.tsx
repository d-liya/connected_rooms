import { ACTIVE_GAME } from "./game";

export interface GameEndingProps {
  muted: boolean;
  onMute: () => void;
  onReplay: () => void;
}

/** Editable example. Compose this game's player-earned resolution and replay. */
export function GameEnding({ muted, onMute, onReplay }: GameEndingProps) {
  return <section aria-label="Game complete">
    <h1>{ACTIVE_GAME.copy.title}</h1>
    <p>Your adventure is complete.</p>
    <button type="button" onClick={onMute}>{muted ? "Turn sound on" : "Mute sound"}</button>
    <button type="button" onClick={onReplay}>Play again</button>
  </section>;
}
