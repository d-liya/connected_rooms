import { decodeGameImage } from "../assets";
import { useAnimationFrame } from "./hooks";
import { useEffect, useState, useRef, type CSSProperties } from "react";
import type { Direction } from "./input";

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
  elapsedSeconds?: number;
  durationSeconds?: number;
  loop?: boolean;
  paused?: boolean;
  playbackKey?: string | number;
}

export function ActorSprite({
  aspectRatio,
  sheet,
  x,
  groundY,
  facing,
  className = "",
  hidden = false,
  label, elapsedSeconds, durationSeconds, loop = true, paused = false, playbackKey,
}: ActorSpriteProps) {
  const [readySheet, setReadySheet] = useState<SpriteSheetDefinition | null>(null);
  const [clock, setClock] = useState(0);
  const clockRef = useRef(0);
  useEffect(() => {
    let cancelled = false;
    void decodeGameImage(sheet.src).then(() => { if (!cancelled) setReadySheet(sheet); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [sheet]);
  useEffect(() => { clockRef.current = 0; setClock(0); }, [sheet.src, playbackKey]);
  useAnimationFrame(elapsedSeconds === undefined && !paused && readySheet?.src === sheet.src, dt => {
    clockRef.current += dt; setClock(clockRef.current);
  });
  if (!readySheet) return null;
  const active = readySheet;
  const seconds = Math.max(0, elapsedSeconds ?? clock);
  const duration = durationSeconds ?? active.frames / active.fps;
  const progress = seconds / Math.max(duration, 0.001);
  const frame = loop ? Math.floor(progress * active.frames) % active.frames : Math.min(active.frames - 1, Math.floor(progress * active.frames));
  // Keep the requested sheet immutable: the decode effect closes over it.
  const frameWorldWidth =
    (active.height * (active.frameWidth / active.frameHeight)) / aspectRatio;
  const left = x - frameWorldWidth * active.anchorX;
  const top = groundY - active.height * active.anchorY;
  const style = {
    left: `${left / 10}%`,
    top: `${top / 10}%`,
    width: `${frameWorldWidth / 10}%`,
    height: `${active.height / 10}%`,
    backgroundImage: `url(${active.src})`,
    animation: "none",
    backgroundPosition: `${active.frames > 1 ? frame / (active.frames - 1) * 100 : 0}% 0`,
    backgroundSize: `${active.frames * 100}% 100%`,
    "--sprite-duration": `${active.frames / active.fps}s`,
    "--sprite-steps": Math.max(1, active.frames - 1),
    "--sprite-anchor": `${active.anchorX * 100}%`,
  } as CSSProperties;

  return (
    <div
      aria-label={label}
      className={`character-sprite ${active.frames > 1 ? "character-sprite--animated" : ""} ${
        facing === "left" ? "character-sprite--left" : ""
      } ${hidden ? "character-sprite--hidden" : ""} ${className}`}
      role="img"
      style={style}
    />
  );
}
