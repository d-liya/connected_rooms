import { useEffect, useRef, type ReactNode } from "react";
import { ACTIVE_GAME } from "./game";
import { CinematicIntro } from "./screens";

export interface GameOpeningProps {
  muted: boolean;
  onMute: () => void;
  onComplete: () => void;
  playerSprite: ReactNode;
  startX: number;
}

/** Editable example. Author any fitting opening here or directly in the experience. */
export function GameOpening(props: GameOpeningProps) {
  const hasShots = ACTIVE_GAME.intro.beats.length > 0;
  const handedOff = useRef(false);
  useEffect(() => {
    if (!hasShots && !handedOff.current) {
      handedOff.current = true;
      props.onComplete();
    }
  }, [hasShots, props.onComplete]);
  return hasShots ? <CinematicIntro {...props} /> : null;
}
