import { useEffect, useState } from "react";
import { asset } from "../assets";
import { useAnimationFrame } from "./hooks";

// The preparation stage converts pipeline metadata into this explicit render contract.
// height is the full rendered frame height, after subject-height calibration.
export interface SpriteClip {
  sources: string[]; frameWidth: number; frameHeight: number;
  frameCount: number; columns: number; fps: number; loop: boolean;
  height: number; anchor: { x: number; y: number };
  facing: "left" | "right" | "none"; mirror: boolean;
}
export interface SpriteAsset { fallback: SpriteClip; clips: Record<string, SpriteClip> }
export function Sprite({ definition, state = "idle", x, y, aspectRatio, facing = "right", paused = false, label }: {
  definition: SpriteAsset; state?: string; x: number; y: number; aspectRatio: number;
  facing?: "left" | "right"; paused?: boolean; label: string;
}) {
  const clip = definition.clips[state] ?? definition.fallback;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => setElapsed(0), [clip]);
  useAnimationFrame(!paused && clip.frameCount > 1, dt => setElapsed(time => time + dt));
  const raw = Math.floor(elapsed * clip.fps);
  const frame = clip.loop ? raw % clip.frameCount : Math.min(raw, clip.frameCount - 1);
  const separate = clip.sources.length > 1;
  const columns = separate ? 1 : clip.columns;
  const rows = separate ? 1 : Math.ceil(clip.frameCount / columns);
  const col = separate ? 0 : frame % columns;
  const row = separate ? 0 : Math.floor(frame / columns);
  const width = clip.height * clip.frameWidth / clip.frameHeight / aspectRatio;
  return <div role="img" aria-label={label} style={{
    position: "absolute", pointerEvents: "none",
    left: `${(x - width * clip.anchor.x) / 10}%`, top: `${(y - clip.height * clip.anchor.y) / 10}%`,
    width: `${width / 10}%`, height: `${clip.height / 10}%`,
    backgroundImage: `url("${asset(clip.sources[separate ? frame : 0])}")`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${columns > 1 ? col / (columns - 1) * 100 : 0}% ${rows > 1 ? row / (rows - 1) * 100 : 0}%`,
    transformOrigin: `${clip.anchor.x * 100}% ${clip.anchor.y * 100}%`,
    transform: clip.mirror && clip.facing !== "none" && clip.facing !== facing ? "scaleX(-1)" : undefined,
  }} />;
}
