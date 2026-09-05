import type { CSSProperties } from "react";
import type { Direction } from "../types";

export interface SpriteSheetDefinition {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

interface ActorSpriteProps {
  aspectRatio: number;
  sheet: SpriteSheetDefinition;
  x: number;
  groundY: number;
  facing: Direction;
  className?: string;
  hidden?: boolean;
  label: string;
}

export function ActorSprite({
  aspectRatio,
  sheet,
  x,
  groundY,
  facing,
  className = "",
  hidden = false,
  label,
}: ActorSpriteProps) {
  const frameWorldWidth =
    (sheet.height * (sheet.frameWidth / sheet.frameHeight)) / aspectRatio;
  const left = x - frameWorldWidth * sheet.anchorX;
  const top = groundY - sheet.height * sheet.anchorY;
  const style = {
    left: `${left / 10}%`,
    top: `${top / 10}%`,
    width: `${frameWorldWidth / 10}%`,
    height: `${sheet.height / 10}%`,
    backgroundImage: `url(${sheet.src})`,
    backgroundSize: `${sheet.frames * 100}% 100%`,
    "--sprite-duration": `${sheet.frames / sheet.fps}s`,
    "--sprite-steps": Math.max(1, sheet.frames - 1),
    "--sprite-anchor": `${sheet.anchorX * 100}%`,
  } as CSSProperties;

  return (
    <div
      aria-label={label}
      className={`character-sprite ${sheet.frames > 1 ? "character-sprite--animated" : ""} ${
        facing === "left" ? "character-sprite--left" : ""
      } ${hidden ? "character-sprite--hidden" : ""} ${className}`}
      role="img"
      style={style}
    />
  );
}
