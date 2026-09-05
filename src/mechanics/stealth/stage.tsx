import { ArrowDown, ArrowUp, Eye, EyeOff, LockKeyhole, Search } from "lucide-react";
import { MapViewport } from "../../core/map";
import { ActorSprite } from "../../core/sprites";
import { ACTIVE_GAME } from "../../game";
import { CLUES, FINAL_OBJECTIVE, FLOOR_CLUE, FLOOR_IDS, FLOOR_ROMAN, FLOORS, guardRange } from "./model";
import type { Direction, GameState, GuardState, InteractionPrompt } from "./model";

interface GameStageProps {
  state: GameState;
  prompt: InteractionPrompt | null;
  onInteract: () => void;
  onMove: (worldX: number) => void;
}

export function StealthStage({ state, prompt, onInteract, onMove }: GameStageProps) {
  const floor = FLOORS[state.floor];
  const clueId = FLOOR_CLUE[state.floor];
  const dialogueTop = floor.band.top < 5 ? 15 : floor.band.bottom > 95 ? 73 : floor.band.top + 0.8;
  const overlay = (
    <>
      {state.status === "caught" && (
        <div className="caught-flash" aria-live="assertive">
          <Search aria-hidden="true" />
          <strong>SPOTTED!</strong>
          <span>{state.hearts > 0 ? "Back to the floor entrance…" : "Regrouping at the checkpoint…"}</span>
        </div>
      )}

      {state.status === "transition" && (
        <div className="transition-card" aria-live="polite">
          {state.transitionDirection === "up" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
          <span>{state.transitionDirection === "up" ? "Upstairs" : "Back downstairs"}</span>
          <strong>{FLOORS[state.floor].name}</strong>
        </div>
      )}
    </>
  );

  return (
    <MapViewport
      ariaLabel={`${floor.name}, floor ${state.floor}`}
      aspectRatio={ACTIVE_GAME.presentation.aspectRatio}
      focusX={state.playerX}
      focusY={(floor.band.top + floor.band.bottom) / 2}
      onWorldPointerDown={({ x, y }) => {
          const relativeY = y / 10;
          if (relativeY < floor.band.top || relativeY > floor.band.bottom) return;
          onMove(x);
      }}
      overlay={overlay}
      transitioning={state.status === "transition"}
    >
      {({ followX }) => (
        <>
        <img className="game-stage__background" src={ACTIVE_GAME.assets.world} alt="" draggable={false} />

        <div
          className="floor-focus"
          style={{ top: `${floor.band.top}%`, height: `${floor.band.bottom - floor.band.top}%` }}
        />

        {FLOOR_IDS.map((floorId) => {
          const band = FLOORS[floorId].band;
          return (
            <div
              className={`floor-shade ${floorId === state.floor ? "floor-shade--active" : ""}`}
              key={floorId}
              style={{ top: `${band.top}%`, height: `${band.bottom - band.top}%` }}
            />
          );
        })}

        <div className="floor-plaque" style={{ top: `${floor.band.top + 1.1}%` }}>
          <span>FLOOR {FLOOR_ROMAN[state.floor]}</span>
          <strong>{floor.name}</strong>
        </div>

        {state.failures[state.floor] >= ACTIVE_GAME.mechanics.assistAfterFailures + 2 &&
          floor.covers.map((cover) => (
            <div
              className="cover-hint"
              key={cover.label}
              style={{
                left: `${cover.from / 10}%`,
                top: `${floor.band.top + 1.5}%`,
                width: `${(cover.to - cover.from) / 10}%`,
                height: `${floor.band.bottom - floor.band.top - 3}%`,
              }}
            >
              <span>{cover.label}</span>
            </div>
          ))}

        {state.guards.map((guard) => (
          <GuardView failures={state.failures[state.floor]} floor={state.floor} guard={guard} key={guard.id} />
        ))}

        {clueId && !state.clues[clueId] && (
          <div
            className="clue-prop"
            style={{ left: `${CLUES[clueId].x / 10}%`, top: `${CLUES[clueId].y / 10}%` }}
          >
            <span className="clue-prop__spark" />
            <img src={ACTIVE_GAME.assets.clue} alt="Torn clue page" />
          </div>
        )}

        {state.floor === FINAL_OBJECTIVE.floor && (
          <FinalObjective state={state.finalObjective} openStep={state.openStep} />
        )}

        <PlayerSprite
          facing={state.playerFacing}
          groundY={floor.groundY}
          hidden={state.hidden}
          interacting={state.status === "opening"}
          moving={state.moving}
          x={state.playerX}
        />

        {prompt && (
          <button
            className={`interaction-prompt interaction-prompt--${prompt.action}`}
            onClick={prompt.action === "hidden" ? undefined : onInteract}
            style={{
              left: `${state.playerX / 10}%`,
              top: `${Math.max(4, (floor.groundY - 202) / 10)}%`,
            }}
            aria-label={prompt.action === "hidden" ? prompt.label : `${prompt.label}: ${prompt.hint}`}
          >
            <span className="interaction-prompt__key">
              {prompt.action === "hidden" ? <EyeOff aria-hidden="true" size={15} /> : "E"}
            </span>
            <span>
              <strong>{prompt.label}</strong>
              <small>{prompt.hint}</small>
            </span>
          </button>
        )}

        {state.dialogue && (
          <div
            aria-live="polite"
            className={`dialogue dialogue--${state.dialogue.tone ?? "normal"}`}
            style={{
              left: followX ? `${state.playerX / 10}%` : undefined,
              top: `${dialogueTop}%`,
            }}
          >
            <span>{state.dialogue.speaker}</span>
            <p>{state.dialogue.text}</p>
          </div>
        )}

        <div className="floor-tip" style={{ top: `${floor.band.bottom - 3.6}%` }}>
          {floor.tip}
        </div>
        </>
      )}
    </MapViewport>
  );
}

function GuardView({ guard, floor, failures }: { guard: GuardState; floor: GameState["floor"]; failures: number }) {
  const range = guardRange(floor, guard.id);
  const groundY = FLOORS[floor].groundY;
  const left = guard.facing === "left" ? guard.x - range : guard.x;
  const coneTop = groundY - (guard.kind === "chief" ? 182 : 150);
  const coneHeight = guard.kind === "chief" ? 170 : 140;

  return (
    <>
      <div
        className={`vision-cone vision-cone--${guard.facing} ${
          failures >= ACTIVE_GAME.mechanics.assistAfterFailures ? "vision-cone--assisted" : ""
        }`}
        style={{
          left: `${left / 10}%`,
          top: `${coneTop / 10}%`,
          width: `${range / 10}%`,
          height: `${coneHeight / 10}%`,
          opacity: 0.38 + guard.suspicion * 0.42,
        }}
      />
      <div
        className={`suspicion ${guard.suspicion > 0 ? "suspicion--awake" : ""}`}
        style={{ left: `${guard.x / 10}%`, top: `${(groundY - (guard.kind === "chief" ? 205 : 188)) / 10}%` }}
        aria-label={`${Math.round(guard.suspicion * 100)} percent suspicion`}
      >
        <Eye aria-hidden="true" size={13} />
        <div className="suspicion__track">
          <span style={{ width: `${guard.suspicion * 100}%` }} />
        </div>
      </div>
      <GuardSprite guard={guard} groundY={groundY} />
    </>
  );
}

function FinalObjective({ state, openStep }: { state: GameState["finalObjective"]; openStep: GameState["openStep"] }) {
  const src =
    state === "locked"
      ? ACTIVE_GAME.assets.finalObjective.locked
      : ACTIVE_GAME.assets.finalObjective.opening[Math.max(1, openStep) - 1];
  return (
    <div className={`final-objective final-objective--${state}`}>
      <img
        src={src}
        alt={`${state === "open" ? "Open" : "Locked"} ${ACTIVE_GAME.copy.finalObjectiveName}`}
      />
      {state === "locked" && (
        <span className="final-objective__lock" aria-hidden="true">
          <LockKeyhole size={13} />
        </span>
      )}
    </div>
  );
}

interface PlayerSpriteProps {
  x: number;
  groundY: number;
  facing: Direction;
  moving: boolean;
  hidden: boolean;
  interacting: boolean;
}

export function PlayerSprite(props: PlayerSpriteProps) {
  const sprites = ACTIVE_GAME.assets.characters.player;
  const sheet = props.interacting
    ? sprites.interact ?? sprites.idle
    : props.moving
      ? sprites.walk ?? sprites.idle
      : sprites.idle;
  return (
    <ActorSprite
      aspectRatio={ACTIVE_GAME.presentation.aspectRatio}
      className="character-sprite--player"
      facing={props.facing}
      groundY={props.groundY}
      hidden={props.hidden}
      label={props.hidden ? `${ACTIVE_GAME.copy.playerName}, concealed` : ACTIVE_GAME.copy.playerName}
      sheet={sheet}
      x={props.x}
    />
  );
}

interface GuardSpriteProps {
  guard: GuardState;
  groundY: number;
}

export function GuardSprite({ guard, groundY }: GuardSpriteProps) {
  const states = ACTIVE_GAME.assets.characters[guard.kind];
  const sheet = guard.alert
    ? states.alert ?? states.idle
    : guard.motion === "patrol" && guard.pauseRemaining <= 0
      ? states.patrol ?? states.idle
      : states.idle;
  return (
    <ActorSprite
      aspectRatio={ACTIVE_GAME.presentation.aspectRatio}
      className={`character-sprite--guard character-sprite--${guard.kind}`}
      facing={guard.facing}
      groundY={groundY}
      label={ACTIVE_GAME.copy.guardNames[guard.kind]}
      sheet={sheet}
      x={guard.x}
    />
  );
}
