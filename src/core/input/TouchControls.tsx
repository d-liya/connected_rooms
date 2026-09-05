import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import type { Direction } from "../types";

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
      <button className="touch-controls__action" aria-label={actionLabel} onClick={onInteract}>
        <Hand aria-hidden="true" />
        <span>{actionLabel.toUpperCase()}</span>
      </button>
    </div>
  );
}
