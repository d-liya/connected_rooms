import type { Direction } from "../../core/types";

export type { Direction } from "../../core/types";

export type FloorId = number;
export type ClueId = string;

export type GameStatus =
  | "title"
  | "intro"
  | "playing"
  | "paused"
  | "transition"
  | "caught"
  | "opening"
  | "victory";

export type ClueState = Record<ClueId, boolean>;

export interface GuardState {
  id: string;
  kind: "watchman" | "chief";
  x: number;
  facing: Direction;
  suspicion: number;
  motion: "stationary" | "patrol";
  timer: number;
  pauseRemaining: number;
  alert: boolean;
}

export interface Dialogue {
  speaker: string;
  text: string;
  tone?: "normal" | "warning" | "success";
}

export interface GameState {
  status: GameStatus;
  floor: FloorId;
  playerX: number;
  playerFacing: Direction;
  moving: boolean;
  stillFor: number;
  hidden: boolean;
  hearts: number;
  clues: ClueState;
  failures: Record<FloorId, number>;
  guards: GuardState[];
  floorElapsed: number;
  clearedFloors: FloorId[];
  dialogue: Dialogue | null;
  dialogueUntil: number;
  finalObjective: "locked" | "opening" | "open";
  openStep: 0 | 1 | 2 | 3;
  transitionDirection: "up" | "down" | null;
  entrySide: Direction;
}

export interface InteractionPrompt {
  label: string;
  hint: string;
  action: "clue" | "door" | "final-objective" | "hidden";
}
