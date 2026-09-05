import { ActorSprite } from "../../core/sprites/ActorSprite";
import { ACTIVE_GAME } from "../../game/activeGame";
import type { Direction, GuardState } from "./types";

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
