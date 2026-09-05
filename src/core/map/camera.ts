export const WORLD_SIZE = 1000;

export function coverWorldWidth(frameHeight: number, aspectRatio: number): number {
  return frameHeight * aspectRatio;
}

export function followingCameraOffset(
  focusX: number,
  frameWidth: number,
  worldWidth: number,
): number {
  return clamp(
    frameWidth / 2 - (focusX / WORLD_SIZE) * worldWidth,
    frameWidth - worldWidth,
    0,
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
