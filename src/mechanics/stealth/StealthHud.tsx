import {
  FileText,
  Heart,
  HelpCircle,
  MoonStar,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ACTIVE_GAME } from "../../game/activeGame";
import { FLOOR_ROMAN, FLOORS } from "./config";
import type { GameState } from "./types";

interface HudProps {
  state: GameState;
  muted: boolean;
  onMute: () => void;
  onPause: () => void;
  onHelp: () => void;
}

export function StealthHud({ state, muted, onMute, onPause, onHelp }: HudProps) {
  const clueCount = Object.values(state.clues).filter(Boolean).length;
  const clueTotal = Object.keys(ACTIVE_GAME.world.clues).length;
  return (
    <div className="hud" aria-label="Case status">
      <div className="hud__identity ink-panel">
        <div className="hud__portrait">
          <img src={ACTIVE_GAME.assets.portrait} alt="" />
        </div>
        <div className="hud__identity-copy">
          <span className="hud__name">{ACTIVE_GAME.copy.playerName.toUpperCase()}</span>
          <div className="hearts" aria-label={`${state.hearts} of ${ACTIVE_GAME.mechanics.maxHearts} hearts remaining`}>
            {Array.from({ length: ACTIVE_GAME.mechanics.maxHearts }, (_, index) => index + 1).map((heart) => (
              <Heart
                aria-hidden="true"
                className={heart <= state.hearts ? "heart heart--full" : "heart heart--empty"}
                fill="currentColor"
                key={heart}
                size={18}
                strokeWidth={2.4}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hud__objective ink-panel">
        <div className="hud__objective-row">
          <MoonStar aria-hidden="true" size={17} />
          <span>{ACTIVE_GAME.copy.clockLabel}</span>
          <span className="hud__floor">Floor {FLOOR_ROMAN[state.floor]}</span>
        </div>
        <strong>{FLOORS[state.floor].objective}</strong>
      </div>

      <div className={`hud__clues ink-panel ${clueCount === clueTotal ? "hud__clues--complete" : ""}`}>
        <FileText aria-hidden="true" size={19} />
        <span>CLUES</span>
        <strong>{clueCount}/{clueTotal}</strong>
      </div>

      <div className="hud__buttons">
        <button className="icon-button" onClick={onMute} aria-label={muted ? "Turn sound on" : "Mute sound"}>
          {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
        <button className="icon-button" onClick={onHelp} aria-label="Show controls">
          <HelpCircle aria-hidden="true" />
        </button>
        <button className="icon-button" onClick={onPause} aria-label="Pause game">
          <Pause aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
