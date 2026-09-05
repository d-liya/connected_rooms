import type { PointerEvent, ReactNode } from "react";
import { useElementSize } from "./hooks";

export const WORLD_SIZE = 1000;

export function coverWorldWidth(frameHeight: number, aspectRatio: number): number {
  return frameHeight * aspectRatio;
}

export function followingCameraOffset(
  focusFraction: number,
  frameLength: number,
  worldLength: number,
): number {
  return clamp(
    frameLength / 2 - focusFraction * worldLength,
    frameLength - worldLength,
    0,
  );
}

// Full-map landscape is the desktop presentation. Small screens go full-bleed
// (up to the 1k max width) and follow instead: any portrait frame, or a
// landscape frame narrower than this width.
export const FOLLOW_BELOW_WIDTH = 900;

export function shouldFollowCamera(frameWidth: number, frameHeight: number): boolean {
  if (frameWidth <= 0 || frameHeight <= 0) return false;
  return frameHeight > frameWidth || frameWidth < FOLLOW_BELOW_WIDTH;
}

export interface CameraFrame {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  followX: boolean;
  followY: boolean;
}

// Cover-scale the 1000-unit world over the frame and center the focus point,
// clamping at the world edges so out-of-bounds area is never shown. focusX is
// 0..1000, focusY is 0..1000, just like focusX.
// Returns null when the frame should show the complete map instead.
export function cameraFrame(
  frameWidth: number,
  frameHeight: number,
  aspectRatio: number,
  focusX: number,
  focusY: number,
): CameraFrame | null {
  if (!shouldFollowCamera(frameWidth, frameHeight)) return null;
  const scale = Math.max(frameWidth / WORLD_SIZE, (frameHeight * aspectRatio) / WORLD_SIZE);
  const width = scale * WORLD_SIZE;
  const height = (scale * WORLD_SIZE) / aspectRatio;
  return {
    width,
    height,
    offsetX: followingCameraOffset(focusX / WORLD_SIZE, frameWidth, width),
    offsetY: followingCameraOffset(focusY / WORLD_SIZE, frameHeight, height),
    followX: width > frameWidth + 1,
    followY: height > frameHeight + 1,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface MapViewportContext {
  followX: boolean;
}

interface MapViewportProps {
  ariaLabel: string;
  aspectRatio: number;
  children: (context: MapViewportContext) => ReactNode;
  focusX: number;
  focusY: number;
  overlay?: ReactNode;
  transitioning?: boolean;
  onWorldPointerDown?: (point: { x: number; y: number }) => void;
}

export function MapViewport({
  ariaLabel,
  aspectRatio,
  children,
  focusX,
  focusY,
  overlay,
  transitioning = false,
  onWorldPointerDown,
}: MapViewportProps) {
  const { ref: frameRef, size: frameSize } = useElementSize<HTMLDivElement>();
  const frame = cameraFrame(frameSize.width, frameSize.height, aspectRatio, focusX, focusY);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!onWorldPointerDown || (event.target as HTMLElement).closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onWorldPointerDown({
      x: ((event.clientX - bounds.left) / bounds.width) * WORLD_SIZE,
      y: ((event.clientY - bounds.top) / bounds.height) * WORLD_SIZE,
    });
  };

  return (
    <div style={{ aspectRatio }} className={`stage-frame${frame ? " stage-frame--follow" : ""}`} ref={frameRef}>
      <div
        aria-label={ariaLabel}
        className={`game-stage${frame ? " game-stage--camera" : ""} ${
          transitioning ? "game-stage--camera-transition" : ""
        }`}
        onPointerDown={handlePointerDown}
        style={
          frame
            ? {
                width: `${frame.width}px`,
                height: `${frame.height}px`,
                transform: `translate3d(${frame.offsetX}px, ${frame.offsetY}px, 0)`,
              }
            : undefined
        }
      >
        {children({ followX: frame?.followX ?? false })}
      </div>
      {overlay}
    </div>
  );
}
