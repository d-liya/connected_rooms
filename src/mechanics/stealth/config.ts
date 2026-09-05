import { ACTIVE_GAME } from "../../game/activeGame";
import type { GuardDefinition } from "./schema";
import type { ClueId, FloorId, GuardState } from "./types";

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
