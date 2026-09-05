import { useCallback, useEffect, useRef, useState } from "react";
import { waitForGameImages } from "../../assets";
import { pickVoice } from "../../core/audio";
import { useAnimationFrame } from "../../core/hooks";
import { useHorizontalControls } from "../../core/input";
import { ACTIVE_GAME, createGameAudio, type AudioController } from "../../game";
import {
  CLUES,
  FINAL_OBJECTIVE,
  FLOOR_CLUE,
  FLOORS,
  NAVIGATION,
  REQUIRED_CLUE,
  SPAWNS,
  canGuardSeePlayer,
  createClueState,
  createFailureState,
  createGuards,
  detectionWindup,
  updateGuardPatrol,
} from "./model";
import type {
  ClueId,
  Direction,
  GameState,
  GuardState,
  InteractionPrompt,
} from "./model";

const PLAYER_STEPS = ["step-1", "step-2", "step-3", "step-4"] as const;
const GUARD_STEPS = ["guard-step-1", "guard-step-2", "guard-step-3", "guard-step-4"] as const;

function initialState(status: GameState["status"] = "title"): GameState {
  const firstFloor = ACTIVE_GAME.world.floorOrder[0];
  return {
    status,
    floor: firstFloor,
    playerX: FLOORS[firstFloor].spawns.left,
    playerFacing: "right",
    moving: false,
    stillFor: 0,
    hidden: false,
    hearts: ACTIVE_GAME.mechanics.maxHearts,
    clues: createClueState(),
    failures: createFailureState(),
    guards: createGuards(firstFloor),
    floorElapsed: 0,
    clearedFloors: [],
    dialogue: null,
    dialogueUntil: 0,
    finalObjective: "locked",
    openStep: 0,
    transitionDirection: null,
    entrySide: "left",
  };
}

interface InternalGameState extends GameState {
  entrySide: Direction;
}

export interface StealthEngine {
  state: InternalGameState;
  prompt: InteractionPrompt | null;
  muted: boolean;
  assetsReady: boolean;
  assetProgress: number;
  startGame: () => void;
  completeIntro: () => void;
  restartGame: () => void;
  returnToTitle: () => void;
  interact: () => void;
  togglePause: () => void;
  toggleMuted: () => void;
  setTouchDirection: (direction: Direction, active: boolean) => void;
  moveTo: (worldX: number) => void;
}

export function useStealthEngine(): StealthEngine {
  const [state, setState] = useState<InternalGameState>(() => initialState() as InternalGameState);
  const stateRef = useRef(state);
  const [muted, setMuted] = useState(false);
  const [loadState, setLoadState] = useState({ fraction: 0, ready: false });
  const readyRef = useRef(false);
  const audio = useRef<AudioController | null>(null);
  const stepAlternator = useRef(0);
  const autoTarget = useRef<number | null>(null);

  if (!audio.current) audio.current = createGameAudio();
  stateRef.current = state;

  const beginPlay = useCallback(() => {
    const fresh = initialState("playing") as InternalGameState;
    fresh.dialogue = {
      speaker: ACTIVE_GAME.copy.playerName,
      text: ACTIVE_GAME.copy.openingLine,
    };
    fresh.dialogueUntil = performance.now() + 4200;
    setState(fresh);
    autoTarget.current = null;
    audio.current?.start();
    audio.current?.setSecondaryLoop(fresh.floor === FINAL_OBJECTIVE.floor);
  }, []);

  const startGame = useCallback(() => {
    if (!readyRef.current) return;
    const fresh = initialState("intro") as InternalGameState;
    setState(fresh);
    autoTarget.current = null;
    audio.current?.start();
    audio.current?.setSecondaryLoop(fresh.floor === FINAL_OBJECTIVE.floor);
  }, []);

  const restartGame = useCallback(() => {
    beginPlay();
  }, [beginPlay]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      audio.current?.setMuted(next);
      if (!next) audio.current?.setSecondaryLoop(state.floor === FINAL_OBJECTIVE.floor);
      return next;
    });
  }, [state.floor]);

  const togglePause = useCallback(() => {
    setState((current) => {
      if (current.status === "playing") return { ...current, status: "paused", moving: false };
      if (current.status === "paused") return { ...current, status: "playing" };
      return current;
    });
  }, []);

  const moveTo = useCallback(
    (worldX: number) => {
      if (state.status !== "playing") return;
      autoTarget.current = clamp(
        worldX,
        ACTIVE_GAME.mechanics.playerBounds.min,
        ACTIVE_GAME.mechanics.playerBounds.max,
      );
    },
    [state.status],
  );

  const moveThroughDoor = useCallback((side: Direction) => {
    autoTarget.current = null;
    setState((current) => {
      if (current.status !== "playing") return current;
      const destination = NAVIGATION[`${current.floor}-${side}`];
      if (!destination) return current;

      const movingUp = floorIndex(destination.floor) > floorIndex(current.floor);
      const requiredClue = movingUp ? REQUIRED_CLUE[current.floor] : undefined;
      if (requiredClue && !current.clues[requiredClue]) {
        return {
          ...current,
          dialogue: {
            speaker: ACTIVE_GAME.copy.playerName,
            text: "I should search this floor before going on.",
          },
          dialogueUntil: performance.now() + 3000,
        };
      }

      audio.current?.play("door", 500);
      audio.current?.setSecondaryLoop(destination.floor === FINAL_OBJECTIVE.floor);
      const enterVoice = FLOORS[destination.floor].onEnterVoice;
      const spokenEnter = enterVoice ? speak(audio.current!, enterVoice.bank) : null;
      const clearedFloors = movingUp
        ? [...new Set([...current.clearedFloors, current.floor])]
        : current.clearedFloors;

      return {
        ...current,
        status: "transition",
        floor: destination.floor,
        playerX: SPAWNS[destination.floor][destination.side],
        playerFacing: destination.side === "left" ? "right" : "left",
        moving: false,
        hidden: false,
        stillFor: 0,
        hearts: ACTIVE_GAME.mechanics.maxHearts,
        guards: createGuards(destination.floor),
        floorElapsed: 0,
        clearedFloors,
        transitionDirection: movingUp ? "up" : "down",
        entrySide: destination.side,
        dialogue:
          spokenEnter && enterVoice
            ? {
                speaker: enterVoice.speaker,
                text: spokenEnter.text,
                tone: enterVoice.textTone,
              }
            : null,
        dialogueUntil: spokenEnter ? performance.now() + 4200 : 0,
      };
    });
  }, []);

  const collectClue = useCallback((clueId: ClueId) => {
    autoTarget.current = null;
    setState((current) => {
      if (current.clues[clueId] || current.status !== "playing") return current;
      audio.current?.play("clue");
      const line = speak(audio.current!, CLUES[clueId].voiceBank);
      return {
        ...current,
        clues: { ...current.clues, [clueId]: true },
        dialogue: { speaker: ACTIVE_GAME.copy.playerName, text: line.text, tone: "success" },
        dialogueUntil: performance.now() + 3900,
      };
    });
  }, []);

  const openFinalObjective = useCallback(() => {
    autoTarget.current = null;
    setState((current) => {
      if (current.status !== "playing" || current.floor !== FINAL_OBJECTIVE.floor) return current;
      const clueCount = Object.values(current.clues).filter(Boolean).length;
      if (clueCount < Object.keys(CLUES).length) {
        audio.current?.play("lock", 500);
        const line = speak(audio.current!, ACTIVE_GAME.voices.finalLocked);
        return {
          ...current,
          dialogue: { speaker: ACTIVE_GAME.copy.playerName, text: line.text },
          dialogueUntil: performance.now() + 3400,
        };
      }

      audio.current?.play("open");
      return {
        ...current,
        status: "opening",
        finalObjective: "opening",
        openStep: 1,
        moving: false,
        dialogue: {
          speaker: ACTIVE_GAME.copy.playerName,
          text: "The pages match the lock's cipher…",
          tone: "success",
        },
        dialogueUntil: performance.now() + 3500,
      };
    });
  }, []);

  const prompt = getPrompt(state);

  const interact = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "playing") return;
    const clueId = FLOOR_CLUE[current.floor];
    if (clueId && !current.clues[clueId] && Math.abs(current.playerX - CLUES[clueId].x) <= 58) {
      collectClue(clueId);
      return;
    }
    if (
      current.floor === FINAL_OBJECTIVE.floor &&
      Math.abs(current.playerX - FINAL_OBJECTIVE.x) <= FINAL_OBJECTIVE.interactionRange
    ) {
      openFinalObjective();
      return;
    }
    if (current.playerX <= ACTIVE_GAME.mechanics.doorThresholds.left) {
      moveThroughDoor("left");
      return;
    }
    if (current.playerX >= ACTIVE_GAME.mechanics.doorThresholds.right) moveThroughDoor("right");
  }, [collectClue, moveThroughDoor, openFinalObjective]);

  const {
    clear: clearControls,
    directions: keys,
    setDirection: setTouchDirection,
  } = useHorizontalControls({
    onInteract: interact,
    onManualMove: () => {
      autoTarget.current = null;
    },
    onPause: togglePause,
  });

  const returnToTitle = useCallback(() => {
    clearControls();
    autoTarget.current = null;
    audio.current?.stop();
    setState(initialState() as InternalGameState);
  }, [clearControls]);

  useAnimationFrame(state.status === "playing", (dt, now) => {
    setState((current) =>
      tick(current, dt, now, keys.current, audio.current!, stepAlternator, autoTarget),
    );
  });

  useEffect(() => {
    if (state.status !== "transition") return;
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, status: "playing", transitionDirection: null }));
    }, 720);
    return () => window.clearTimeout(timer);
  }, [state.status, state.floor]);

  useEffect(() => {
    if (state.status !== "caught") return;
    const escort = window.setTimeout(() => {
      setState((current) => {
        if (current.status !== "caught") return current;
        const guardKind = current.guards.find((guard) => guard.alert)?.kind ?? "watchman";
        const line = speak(audio.current!, ACTIVE_GAME.voices.guard[guardKind].escort);
        return {
          ...current,
          dialogue: {
            speaker: guardName(guardKind),
            text: line.text,
            tone: "warning",
          },
          dialogueUntil: performance.now() + 2200,
        };
      });
    }, 1650);
    const timer = window.setTimeout(() => {
      audio.current?.play("caught", 700);
      setState((current) => {
        const line = speak(audio.current!, ACTIVE_GAME.voices.retry);
        return {
          ...current,
          status: "playing",
          playerX: SPAWNS[current.floor][current.entrySide],
          playerFacing: current.entrySide === "left" ? "right" : "left",
          moving: false,
          stillFor: 0,
          hidden: false,
          hearts: current.hearts <= 0 ? ACTIVE_GAME.mechanics.maxHearts : current.hearts,
          guards: createGuards(current.floor),
          floorElapsed: 0,
          dialogue: { speaker: ACTIVE_GAME.copy.playerName, text: line.text },
          dialogueUntil: performance.now() + 3200,
        };
      });
    }, 3300);
    return () => {
      window.clearTimeout(escort);
      window.clearTimeout(timer);
    };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "opening") return;
    const second = window.setTimeout(() => {
      setState((current) => ({ ...current, openStep: 2 }));
    }, 460);
    const third = window.setTimeout(() => {
      setState((current) => ({ ...current, openStep: 3, finalObjective: "open" }));
    }, 940);
    const finish = window.setTimeout(() => {
      audio.current?.play("victory");
      setState((current) => {
        const line = speak(audio.current!, ACTIVE_GAME.voices.victory);
        return {
          ...current,
          status: "victory",
          dialogue: { speaker: ACTIVE_GAME.copy.playerName, text: line.text, tone: "success" },
          dialogueUntil: Number.POSITIVE_INFINITY,
        };
      });
    }, 1900);
    return () => {
      window.clearTimeout(second);
      window.clearTimeout(third);
      window.clearTimeout(finish);
    };
  }, [state.status]);

  // Mobile browsers may block the first play() or suspend audio when the page
  // is backgrounded. Every gesture and foreground return re-asserts the
  // intended loops; play() on already-playing audio is a no-op.
  useEffect(() => {
    const unlock = () => audio.current?.unlock();
    const onVisibility = () => {
      if (document.visibilityState === "visible") unlock();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchend", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Tracked loading gate: images plus decoded audio report into one
  // fraction. Start stays disabled until everything has settled (loads and
  // failures both count), so pressing start never races an unloaded asset.
  useEffect(() => {
    let cancelled = false;
    let imagesLoaded = 0;
    let imagesTotal = 1;
    let audioLoaded = 0;
    let audioTotal = 1;
    const report = () => {
      if (cancelled) return;
      const fraction = (imagesLoaded + audioLoaded) / (imagesTotal + audioTotal);
      const ready = fraction >= 1;
      readyRef.current = ready;
      setLoadState({ fraction, ready });
    };
    audio.current?.preload((loaded, total) => {
      audioLoaded = loaded;
      audioTotal = Math.max(1, total);
      report();
    });
    void waitForGameImages(ACTIVE_GAME, ({ loaded, total }) => {
      imagesLoaded = loaded;
      imagesTotal = Math.max(1, total);
      report();
    }).then(report);
    return () => {
      cancelled = true;
      audio.current?.stop();
    };
  }, []);

  return {
    state,
    prompt,
    muted,
    assetsReady: loadState.ready,
    assetProgress: loadState.fraction,
    startGame,
    completeIntro: beginPlay,
    restartGame,
    returnToTitle,
    interact,
    togglePause,
    toggleMuted,
    setTouchDirection,
    moveTo,
  };
}

function tick(
  current: InternalGameState,
  dt: number,
  now: number,
  keys: { left: boolean; right: boolean },
  audio: AudioController,
  stepAlternator: { current: number },
  autoTarget: { current: number | null },
): InternalGameState {
  if (current.status !== "playing") return current;

  let direction = keys.left === keys.right ? 0 : keys.left ? -1 : 1;
  if (direction === 0 && autoTarget.current !== null) {
    const distance = autoTarget.current - current.playerX;
    if (Math.abs(distance) <= 2.5) {
      autoTarget.current = null;
    } else {
      direction = distance < 0 ? -1 : 1;
    }
  }
  const moving = direction !== 0;
  const playerX = moving
    ? clamp(
        current.playerX + direction * ACTIVE_GAME.mechanics.playerSpeed * dt,
        ACTIVE_GAME.mechanics.playerBounds.min,
        ACTIVE_GAME.mechanics.playerBounds.max,
      )
    : current.playerX;
  const stillFor = moving ? 0 : current.stillFor + dt;
  const inCover = FLOORS[current.floor].covers.some(
    (cover) => playerX >= cover.from && playerX <= cover.to,
  );
  const hidden = inCover && stillFor >= 0.16;
  const failures = current.failures[current.floor];
  let dialogue = current.dialogue;
  let dialogueUntil = current.dialogueUntil;

  if (dialogue && now >= dialogueUntil) dialogue = null;
  if (hidden && !current.hidden) {
    audio.play("hide", 800);
    if (!dialogue) {
      const line = Math.random() <= 0.45
        ? speak(audio, ACTIVE_GAME.voices.hide)
        : pickVoice(ACTIVE_GAME.voices.banks, ACTIVE_GAME.voices.hide);
      dialogue = { speaker: ACTIVE_GAME.copy.playerName, text: line.text };
      dialogueUntil = now + 2600;
    }
  }
  if (moving) {
    stepAlternator.current = (stepAlternator.current + 1) % PLAYER_STEPS.length;
    audio.play(PLAYER_STEPS[stepAlternator.current], 340, "player-step");
  }

  const guards = current.guards.map((guard) => {
    const patrolTick = updateGuardPatrol(guard, current.floor, dt, failures);
    const moved = patrolTick.guard;
    if (patrolTick.turned) audio.play("turn", 350);
    if (patrolTick.walking) {
      const stepIndex = Math.abs(Math.floor(moved.x / 24)) % GUARD_STEPS.length;
      audio.play(GUARD_STEPS[stepIndex], 510, "guard-step");
    }
    const seesPlayer = !hidden && canGuardSeePlayer(moved, playerX, current.floor);
    const previousSuspicion = moved.suspicion;
    const windup = detectionWindup(current.floor, moved.id);
    const suspicion = seesPlayer
      ? clamp(previousSuspicion + dt / windup, 0, 1)
      : clamp(
          previousSuspicion - dt * ACTIVE_GAME.mechanics.suspicionDrainPerSecond,
          0,
          1,
        );

    if (previousSuspicion === 0 && suspicion > 0) {
      audio.play("suspicion", 1200);
      if (!dialogue) {
        const line = speak(audio, ACTIVE_GAME.voices.guard[moved.kind].suspicion);
        dialogue = {
          speaker: guardName(moved.kind),
          text: line.text,
          tone: "warning",
        };
        dialogueUntil = now + 2200;
      }
    }
    if (previousSuspicion > 0.08 && suspicion === 0) audio.play("clear", 1200);
    return { ...moved, suspicion };
  });

  const caughtBy = guards.find((guard) => guard.suspicion >= 1);
  if (caughtBy) {
    autoTarget.current = null;
    audio.play("detected", 900);
    const spottedLine = speak(
      audio,
      ACTIVE_GAME.voices.guard[caughtBy.kind].spotted,
    );
    const nextFailures = {
      ...current.failures,
      [current.floor]: current.failures[current.floor] + 1,
    };
    return {
      ...current,
      status: "caught",
      playerX,
      playerFacing: direction < 0 ? "left" : direction > 0 ? "right" : current.playerFacing,
      moving: false,
      stillFor: 0,
      hidden: false,
      hearts: Math.max(0, current.hearts - 1),
      failures: nextFailures,
      guards: guards.map((guard) => ({ ...guard, alert: guard.id === caughtBy.id })),
      dialogue: {
        speaker: guardName(caughtBy.kind),
        text: spottedLine.text,
        tone: "warning",
      },
      dialogueUntil: now + 3000,
    };
  }

  const previousIdleSlot = Math.floor(current.floorElapsed / 18);
  const nextIdleSlot = Math.floor((current.floorElapsed + dt) / 18);
  if (guards.length > 0 && !dialogue && nextIdleSlot > previousIdleSlot && Math.random() <= 0.22) {
    const speakerKind = guards[0].kind;
    const line = speak(audio, ACTIVE_GAME.voices.guard[speakerKind].idle);
    dialogue = {
      speaker: guardName(speakerKind),
      text: line.text,
    };
    dialogueUntil = now + 3200;
  }

  return {
    ...current,
    playerX,
    playerFacing: direction < 0 ? "left" : direction > 0 ? "right" : current.playerFacing,
    moving,
    stillFor,
    hidden,
    floorElapsed: current.floorElapsed + dt,
    guards,
    dialogue,
    dialogueUntil,
  };
}

function getPrompt(state: InternalGameState): InteractionPrompt | null {
  if (state.status !== "playing") return null;
  const clueId = FLOOR_CLUE[state.floor];
  if (clueId && !state.clues[clueId] && Math.abs(state.playerX - CLUES[clueId].x) <= 58) {
    return { label: "Inspect page", hint: "Add this clue to the dossier", action: "clue" };
  }
  if (
    state.floor === FINAL_OBJECTIVE.floor &&
    Math.abs(state.playerX - FINAL_OBJECTIVE.x) <= FINAL_OBJECTIVE.interactionRange
  ) {
    return {
      label: ACTIVE_GAME.copy.finalActionLabel,
      hint: Object.values(state.clues).every(Boolean)
        ? ACTIVE_GAME.copy.finalReadyHint
        : ACTIVE_GAME.copy.finalLockedHint.replace("{count}", String(Object.keys(CLUES).length)),
      action: "final-objective",
    };
  }
  const side =
    state.playerX <= ACTIVE_GAME.mechanics.doorThresholds.left
      ? "left"
      : state.playerX >= ACTIVE_GAME.mechanics.doorThresholds.right
        ? "right"
        : null;
  if (side && NAVIGATION[`${state.floor}-${side}`]) {
    const destination = NAVIGATION[`${state.floor}-${side}`]!;
    return {
      label: floorIndex(destination.floor) > floorIndex(state.floor) ? "Go upstairs" : "Go downstairs",
      hint: `${FLOORS[destination.floor].name} · Floor ${destination.floor}`,
      action: "door",
    };
  }
  if (state.hidden) {
    return { label: "Hidden", hint: "Wait for a clear path", action: "hidden" };
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function floorIndex(floor: number): number {
  return ACTIVE_GAME.world.floorOrder.indexOf(floor);
}

function guardName(kind: GuardState["kind"]): string {
  return ACTIVE_GAME.copy.guardNames[kind];
}

function speak(audio: AudioController, bank: string) {
  const line = pickVoice(ACTIVE_GAME.voices.banks, bank);
  audio.playVoice(line.id);
  return line;
}
