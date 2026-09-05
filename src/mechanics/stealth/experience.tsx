import { ArrowRight, Eye, FileText, Footprints, Heart, HelpCircle, MoonStar, Pause, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { TouchControls } from "../../core/input";
import { ACTIVE_GAME } from "../../game";
import { CinematicIntro, TitleScreen } from "../../screens";
import { FLOORS, FLOOR_ROMAN } from "./model";
import type { GameState } from "./model";
import { useStealthEngine } from "./engine";
import { PlayerSprite, StealthStage } from "./stage";

export function StealthExperience() {
  const game = useStealthEngine();
  const [helpOpen, setHelpOpen] = useState(false);
  const firstFloor = FLOORS[ACTIVE_GAME.world.floorOrder[0]];
  const rootStyle = {
    "--game-aspect": ACTIVE_GAME.presentation.aspectRatio,
    "--game-max-width": `${ACTIVE_GAME.presentation.maxStageWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    if (game.state.status === "title") setHelpOpen(false);
  }, [game.state.status]);

  if (game.state.status === "title") {
    return (
      <div className={`game-root ${ACTIVE_GAME.presentation.themeClass}`} style={rootStyle}>
        <TitleScreen
          onStart={game.startGame}
          ready={game.assetsReady}
          progress={game.assetProgress}
        />
      </div>
    );
  }

  if (game.state.status === "intro") {
    return (
      <div className={`game-root ${ACTIVE_GAME.presentation.themeClass}`} style={rootStyle}>
        <CinematicIntro
          muted={game.muted}
          onComplete={game.completeIntro}
          onMute={game.toggleMuted}
          playerSprite={
            <PlayerSprite
              facing="right"
              groundY={firstFloor.groundY}
              hidden={false}
              interacting={false}
              moving={false}
              x={firstFloor.spawns.left}
            />
          }
          startX={firstFloor.spawns.left}
        />
      </div>
    );
  }

  return (
    <div className={`game-root ${ACTIVE_GAME.presentation.themeClass}`} style={rootStyle}>
      <main className="game-shell">
        <StealthHud
          muted={game.muted}
          onHelp={() => {
            if (game.state.status === "playing") game.togglePause();
            setHelpOpen(true);
          }}
          onMute={game.toggleMuted}
          onPause={game.togglePause}
          state={game.state}
        />

        <StealthStage
          onInteract={game.interact}
          onMove={game.moveTo}
          prompt={game.prompt}
          state={game.state}
        />
        <TouchControls onDirection={game.setTouchDirection} onInteract={game.interact} />

        {game.state.status === "paused" && !helpOpen && (
          <div className="modal-backdrop">
            <section
              className="modal-card pause-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pause-title"
            >
              <p className="modal-card__eyebrow">Case paused</p>
              <h2 id="pause-title">{ACTIVE_GAME.copy.pauseTitle}</h2>
              <p>{ACTIVE_GAME.copy.pauseBody}</p>
              <button className="primary-button" onClick={game.togglePause} autoFocus>
                Continue investigation <ArrowRight aria-hidden="true" />
              </button>
              <button className="text-button" onClick={game.returnToTitle}>Return to title</button>
            </section>
          </div>
        )}

        {helpOpen && (
          <div className="modal-backdrop">
            <section
              className="modal-card help-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-title"
            >
              <button
                className="modal-card__close icon-button"
                onClick={() => {
                  setHelpOpen(false);
                  if (game.state.status === "paused") game.togglePause();
                }}
                aria-label="Close controls"
              >
                <X aria-hidden="true" />
              </button>
              <p className="modal-card__eyebrow">Field notes</p>
              <h2 id="help-title">{ACTIVE_GAME.copy.helpTitle}</h2>
              <div className="help-grid">
                <div><Footprints aria-hidden="true" /><strong>Move</strong><span>A / D, ← / →, or click the floor</span></div>
                <div><FileText aria-hidden="true" /><strong>Interact</strong><span>E or Space near a prompt</span></div>
                <div><Eye aria-hidden="true" /><strong>Read the gaze</strong><span>Amber cones show where guards can see</span></div>
                <div><X aria-hidden="true" /><strong>Hide</strong><span>Stand still inside a recessed alcove</span></div>
              </div>
              <p className="help-card__note">
                Suspicion drains when you break line of sight. Being caught returns you to this floor’s
                entry; collected clues are never lost.
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  setHelpOpen(false);
                  if (game.state.status === "paused") game.togglePause();
                }}
                autoFocus
              >
                Back to the case <ArrowRight aria-hidden="true" />
              </button>
            </section>
          </div>
        )}

        {game.state.status === "victory" && (
          <div className="modal-backdrop modal-backdrop--victory">
            <section
              className="victory-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="victory-title"
            >
              <div className="victory-card__seal"><FileText aria-hidden="true" /></div>
              <p className="modal-card__eyebrow">{ACTIVE_GAME.copy.victoryEyebrow}</p>
              <h2 id="victory-title">{ACTIVE_GAME.copy.victoryTitle}</h2>
              <p>{ACTIVE_GAME.copy.victoryBody}</p>
              <div className="victory-card__result">
                <span>Evidence recovered</span>
                <strong>
                  {Object.keys(ACTIVE_GAME.world.clues).length} / {Object.keys(ACTIVE_GAME.world.clues).length}
                </strong>
                <span>{ACTIVE_GAME.copy.victoryWorldLabel}</span>
                <strong>{ACTIVE_GAME.world.floorOrder.length} floors</strong>
              </div>
              <button className="primary-button" onClick={game.restartGame}>
                <RotateCcw aria-hidden="true" /> Play again
              </button>
              <button className="text-button" onClick={game.returnToTitle}>Return to title</button>
            </section>
          </div>
        )}

        <div className="game-shell__footer">
          <span>{FLOORS[game.state.floor].eyebrow}</span>
          <span className="keyboard-hint">
            Move <kbd>A</kbd><kbd>D</kbd> · Interact <kbd>E</kbd> · Pause <kbd>P</kbd>
          </span>
        </div>
      </main>
    </div>
  );
}

interface HudProps {
  state: GameState;
  muted: boolean;
  onMute: () => void;
  onPause: () => void;
  onHelp: () => void;
}

function StealthHud({ state, muted, onMute, onPause, onHelp }: HudProps) {
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
