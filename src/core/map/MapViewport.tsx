import type { PointerEvent, ReactNode } from "react";
import { useElementSize } from "../hooks/useElementSize";
import { coverWorldWidth, followingCameraOffset, WORLD_SIZE } from "./camera";

interface MapViewportContext {
  portrait: boolean;
}

interface MapViewportProps {
  ariaLabel: string;
  aspectRatio: number;
  children: (context: MapViewportContext) => ReactNode;
  focusX: number;
  overlay?: ReactNode;
  transitioning?: boolean;
  onWorldPointerDown?: (point: { x: number; y: number }) => void;
}

export function MapViewport({
  ariaLabel,
  aspectRatio,
  children,
  focusX,
  overlay,
  transitioning = false,
  onWorldPointerDown,
}: MapViewportProps) {
  const { ref: frameRef, size: frameSize } = useElementSize<HTMLDivElement>();
  const portrait = frameSize.height > frameSize.width;
  const worldWidth = portrait ? coverWorldWidth(frameSize.height, aspectRatio) : frameSize.width;
  const cameraOffset = portrait
    ? followingCameraOffset(focusX, frameSize.width, worldWidth)
    : 0;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onWorldPointerDown || (event.target as HTMLElement).closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onWorldPointerDown({
      x: ((event.clientX - bounds.left) / bounds.width) * WORLD_SIZE,
      y: ((event.clientY - bounds.top) / bounds.height) * WORLD_SIZE,
    });
  };

  return (
    <div className="stage-frame" ref={frameRef}>
      <div
        aria-label={ariaLabel}
        className={`game-stage ${portrait ? "game-stage--camera" : ""} ${
          transitioning ? "game-stage--camera-transition" : ""
        }`}
        onPointerDown={handlePointerDown}
        style={
          portrait
            ? {
                width: `${worldWidth}px`,
                transform: `translate3d(${cameraOffset}px, 0, 0)`,
              }
            : undefined
        }
      >
        {children({ portrait })}
      </div>
      {overlay}
    </div>
  );
}
