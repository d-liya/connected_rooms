import { ACTIVE_GAME } from "../../game";
import type { AudioManifest } from "../../core/audio";
import type { Direction } from "../../core/input";
import type { SpriteSheetDefinition } from "../../core/sprites";

export type { Direction } from "../../core/input";

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

export interface CharacterSpriteSet {
  idle: SpriteSheetDefinition;
  walk?: SpriteSheetDefinition;
  patrol?: SpriteSheetDefinition;
  interact?: SpriteSheetDefinition;
  alert?: SpriteSheetDefinition;
}

export interface GuardDefinition {
  id: string;
  kind: GuardState["kind"];
  x: number;
  facing: Direction;
  motion: GuardState["motion"];
  range: number;
  initialTimer?: number;
  turnInterval?: number;
  detectionWindup: number;
  patrol?: {
    min: number;
    max: number;
    speed: number;
    pause: number;
  };
}

export interface FloorDefinition {
  name: string;
  roman: string;
  eyebrow: string;
  groundY: number;
  spawns: Record<Direction, number>;
  objective: string;
  tip: string;
  band: { top: number; bottom: number };
  covers: Array<{ from: number; to: number; label: string }>;
  guards: GuardDefinition[];
  onEnterVoice?: {
    bank: string;
    speaker: string;
    textTone?: "normal" | "warning" | "success";
  };
}

export interface ClueDefinition {
  floor: FloorId;
  x: number;
  y: number;
  voiceBank: string;
}

export interface IntroBeat {
  id: string;
  floor: FloorId;
  kicker: string;
  title: string;
  description: string;
  focus: { x: number; y: number; zoom: number };
  marker?: "clue" | "final-objective";
  showPlayer?: boolean;
  showCaption?: boolean;
  showInRoute?: boolean;
  settleToGameplay?: boolean;
  cameraDurationMs?: number;
  durationMs: number;
}

export interface GameDefinition {
  id: string;
  mode: "stealth";
  presentation: {
    themeClass: string;
    aspectRatio: number;
    maxStageWidth: number;
  };
  assets: {
    titleArt: string;
    world: string;
    portrait: string;
    clue: string;
    finalObjective: {
      locked: string;
      opening: [string, string, string];
    };
    characters: {
      player: CharacterSpriteSet;
      watchman: CharacterSpriteSet;
      chief: CharacterSpriteSet;
    };
    audio: AudioManifest;
  };
  copy: {
    playerName: string;
    guardNames: Record<GuardState["kind"], string>;
    locationName: string;
    clockLabel: string;
    caseLabel: string;
    titleEyebrow: string;
    title: string;
    titleSummary: string;
    titleRules: [string, string, string];
    startLabel: string;
    openingLine: string;
    pauseTitle: string;
    pauseBody: string;
    helpTitle: string;
    finalObjectiveName: string;
    finalActionLabel: string;
    finalReadyHint: string;
    finalLockedHint: string;
    victoryEyebrow: string;
    victoryTitle: string;
    victoryBody: string;
    victoryWorldLabel: string;
    credits: string;
  };
  intro: {
    establishingMs: number;
    skipLabel: string;
    beats: IntroBeat[];
  };
  mechanics: {
    maxHearts: number;
    playerSpeed: number;
    playerBounds: { min: number; max: number };
    doorThresholds: { left: number; right: number };
    safeDoorZones: { left: number; right: number };
    suspicionDrainPerSecond: number;
    assistAfterFailures: number;
    adaptivePauseBonus: number;
  };
  world: {
    floorOrder: FloorId[];
    floors: Record<FloorId, FloorDefinition>;
    clues: Record<string, ClueDefinition>;
    floorClues: Partial<Record<FloorId, string>>;
    requiredClues: Partial<Record<FloorId, string>>;
    navigation: Partial<Record<string, { floor: FloorId; side: Direction }>>;
    finalObjective: { floor: FloorId; x: number; interactionRange: number };
  };
  voices: {
    banks: Record<string, readonly { id: string; text: string }[]>;
    hide: string;
    retry: string;
    finalLocked: string;
    victory: string;
    guard: Record<GuardState["kind"], {
      idle: string;
      suspicion: string;
      spotted: string;
      escort: string;
    }>;
  };
}

export const FLOORS = ACTIVE_GAME.world.floors;
export const FLOOR_IDS = ACTIVE_GAME.world.floorOrder;
export const CLUES = ACTIVE_GAME.world.clues;
export const FLOOR_CLUE = ACTIVE_GAME.world.floorClues;
export const REQUIRED_CLUE = ACTIVE_GAME.world.requiredClues;
export const NAVIGATION = ACTIVE_GAME.world.navigation;
export const FINAL_OBJECTIVE = ACTIVE_GAME.world.finalObjective;

export const SPAWNS = Object.fromEntries(
  FLOOR_IDS.map((floorId) => [floorId, FLOORS[floorId].spawns]),
) as Record<FloorId, { left: number; right: number }>;

export const FLOOR_ROMAN = Object.fromEntries(
  FLOOR_IDS.map((floorId) => [floorId, FLOORS[floorId].roman]),
) as Record<FloorId, string>;

export function createClueState(): Record<ClueId, boolean> {
  return Object.fromEntries(Object.keys(CLUES).map((clueId) => [clueId, false]));
}

export function createFailureState(): Record<FloorId, number> {
  return Object.fromEntries(FLOOR_IDS.map((floorId) => [floorId, 0]));
}

export function createGuards(floor: FloorId): GuardState[] {
  return FLOORS[floor].guards.map((guard) => ({
    id: guard.id,
    kind: guard.kind,
    x: guard.x,
    facing: guard.facing,
    suspicion: 0,
    motion: guard.motion,
    timer: guard.initialTimer ?? 0,
    pauseRemaining: 0,
    alert: false,
  }));
}

export function getGuardDefinition(floor: FloorId, guardId: string): GuardDefinition {
  const definition = FLOORS[floor].guards.find((guard) => guard.id === guardId);
  if (!definition) throw new Error(`Missing guard definition: ${floor}/${guardId}`);
  return definition;
}

export function guardRange(floor: FloorId, guardId: string): number {
  return getGuardDefinition(floor, guardId).range;
}

export interface GuardTick {
  guard: GuardState;
  turned: boolean;
  walking: boolean;
}

export function updateGuardPatrol(
  guard: GuardState,
  floor: FloorId,
  dt: number,
  failures: number,
): GuardTick {
  const definition = getGuardDefinition(floor, guard.id);
  const assist = failures >= ACTIVE_GAME.mechanics.assistAfterFailures;

  if (guard.motion === "stationary") {
    const interval = (definition.turnInterval ?? 5) +
      (assist ? ACTIVE_GAME.mechanics.adaptivePauseBonus : 0);
    let timer = guard.timer + dt;
    let facing = guard.facing;
    let turned = false;
    if (timer >= interval) {
      timer -= interval;
      facing = flip(facing);
      turned = true;
    }
    return { guard: { ...guard, timer, facing }, turned, walking: false };
  }

  const patrol = definition.patrol;
  if (!patrol) return { guard, turned: false, walking: false };

  if (guard.pauseRemaining > 0) {
    const pauseRemaining = Math.max(0, guard.pauseRemaining - dt);
    if (pauseRemaining === 0) {
      return {
        guard: { ...guard, pauseRemaining, facing: flip(guard.facing) },
        turned: true,
        walking: false,
      };
    }
    return { guard: { ...guard, pauseRemaining }, turned: false, walking: false };
  }

  const sign = guard.facing === "right" ? 1 : -1;
  const x = guard.x + sign * patrol.speed * dt;
  if (x <= patrol.min || x >= patrol.max) {
    return {
      guard: {
        ...guard,
        x: clamp(x, patrol.min, patrol.max),
        pauseRemaining: patrol.pause +
          (assist ? ACTIVE_GAME.mechanics.adaptivePauseBonus : 0),
      },
      turned: false,
      walking: false,
    };
  }

  return { guard: { ...guard, x }, turned: false, walking: true };
}

export function canGuardSeePlayer(
  guard: GuardState,
  playerX: number,
  floor: FloorId,
): boolean {
  const { safeDoorZones } = ACTIVE_GAME.mechanics;
  if (playerX <= safeDoorZones.left || playerX >= safeDoorZones.right) return false;
  const delta = playerX - guard.x;
  const inFront = guard.facing === "right" ? delta > 10 : delta < -10;
  return inFront && Math.abs(delta) <= getGuardDefinition(floor, guard.id).range;
}

export function detectionWindup(floor: FloorId, guardId: string): number {
  return getGuardDefinition(floor, guardId).detectionWindup;
}

function flip(direction: GuardState["facing"]): GuardState["facing"] {
  return direction === "left" ? "right" : "left";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface InteractionPrompt {
  label: string;
  hint: string;
  action: "clue" | "door" | "final-objective" | "hidden";
}
