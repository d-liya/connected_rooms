import { useCallback, useEffect, useRef } from "react";
import type { Direction } from "../types";

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
