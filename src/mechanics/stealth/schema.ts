import type { Direction, FloorId, GuardState } from "./types";
import type { AudioManifest } from "../../core/audio/AudioController";
import type { SpriteSheetDefinition } from "../../core/sprites/ActorSprite";

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
