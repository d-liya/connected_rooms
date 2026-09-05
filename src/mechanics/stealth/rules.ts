import { ACTIVE_GAME } from "../../game/activeGame";
import { getGuardDefinition } from "./config";
import type { FloorId, GuardState } from "./types";

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
