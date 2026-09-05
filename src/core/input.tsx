import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export type Direction = "left" | "right";

interface HorizontalControlsOptions {
  onInteract: () => void;
  onManualMove: () => void;
  onPause: () => void;
}

export function useHorizontalControls({
  onInteract,
  onManualMove,
  onPause,
}: HorizontalControlsOptions) {
  const directions = useRef({ left: false, right: false });
  const callbacks = useRef({ onInteract, onManualMove, onPause });
  callbacks.current = { onInteract, onManualMove, onPause };

  const clear = useCallback(() => {
    directions.current.left = false;
    directions.current.right = false;
  }, []);

  const setDirection = useCallback((direction: Direction, active: boolean) => {
    directions.current[direction] = active;
    if (active) callbacks.current.onManualMove();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (key === "arrowleft" || key === "a") setDirection("left", true);
      if (key === "arrowright" || key === "d") setDirection("right", true);
      if ((key === "e" || key === " ") && !event.repeat) callbacks.current.onInteract();
      if ((key === "p" || key === "escape") && !event.repeat) callbacks.current.onPause();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") setDirection("left", false);
      if (key === "arrowright" || key === "d") setDirection("right", false);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    };
  }, [clear, setDirection]);

  return { clear, directions, setDirection };
}

interface TouchControlsProps {
  actionLabel?: string;
  onDirection: (direction: Direction, active: boolean) => void;
  onInteract: () => void;
}

export function TouchControls({
  actionLabel = "Act",
  onDirection,
  onInteract,
}: TouchControlsProps) {
  const bindDirection = (direction: Direction) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      onDirection(direction, true);
    },
    onPointerUp: () => onDirection(direction, false),
    onPointerCancel: () => onDirection(direction, false),
    onLostPointerCapture: () => onDirection(direction, false),
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  });

  return (
    <div className="touch-controls" aria-label="Touch controls">
      <div className="touch-controls__move">
        <button aria-label="Move left" {...bindDirection("left")}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <button aria-label="Move right" {...bindDirection("right")}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <button
        className="touch-controls__action"
        aria-label={actionLabel}
        onClick={onInteract}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Hand aria-hidden="true" />
        <span>{actionLabel.toUpperCase()}</span>
      </button>
    </div>
  );
}
