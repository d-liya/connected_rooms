import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

export type Direction = "left" | "right";

/** Map-wide drag input; interactive descendants retain their own pointers. */
export function useMapJoystick(onDirection: ((direction: Direction, active: boolean) => void) | undefined, enabled: boolean) {
  const callback = useRef(onDirection);
  callback.current = onDirection;
  const pointer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const [position, setPosition] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const stop = useCallback(() => {
    if (pointer.current !== null) {
      callback.current?.("left", false); callback.current?.("right", false);
    }
    pointer.current = null; setPosition(null);
  }, []);
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop(); };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => { stop(); window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", hidden); };
  }, [stop]);
  const end = (event: PointerEvent<HTMLDivElement>) => { if (pointer.current === event.pointerId) stop(); };
  return {
    handlers: {
      onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
        if (!enabled || !onDirection || event.button !== 0) return;
        if (event.pointerType === "mouse" && !window.matchMedia("(max-width: 760px)").matches) return;
        if ((event.target as Element).closest("button, a, input, select, textarea, [role=button], [data-no-joystick]")) return;
        event.preventDefault();
        if (pointer.current !== null) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        pointer.current = event.pointerId;
        origin.current = { x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top };
        event.currentTarget.setPointerCapture(event.pointerId);
        setPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, dx: 0, dy: 0 });
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        if (pointer.current !== event.pointerId) return;
        const dx = event.clientX - origin.current.x, dy = event.clientY - origin.current.y;
        const scale = Math.min(1, 34 / (Math.hypot(dx, dy) || 1));
        setPosition({ x: origin.current.x - origin.current.left, y: origin.current.y - origin.current.top, dx: dx * scale, dy: dy * scale });
        callback.current?.("left", dx < -9); callback.current?.("right", dx > 9);
      },
      onPointerUp: end, onPointerCancel: end, onLostPointerCapture: end,
    },
    indicator: position && <div className="map-joystick" aria-hidden="true" style={{ left: position.x, top: position.y }}>
      <i style={{ transform: `translate(${position.dx}px, ${position.dy}px)` }} />
    </div>,
  };
}

export interface TouchAction {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  /** Supply for held actions such as shielding; called on release/cancel. */
  onRelease?: () => void;
}

function TouchActionButton({ action }: { action: TouchAction }) {
  const held = useRef<number | null>(null);
  const releaseCallback = useRef(action.onRelease);
  releaseCallback.current = action.onRelease;
  const release = useCallback(() => {
    if (held.current !== null) releaseCallback.current?.();
    held.current = null;
  }, []);
  useEffect(() => { if (action.disabled) release(); }, [action.disabled, release]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) release(); };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    return () => { release(); window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", hidden); };
  }, [release]);
  return <button disabled={action.disabled} aria-label={action.label}
    onContextMenu={event => event.preventDefault()}
    onPointerDown={event => {
      if (!action.onRelease || held.current !== null) return;
      held.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); action.onPress();
    }}
    onPointerUp={event => { if (held.current === event.pointerId) release(); }}
    onPointerCancel={event => { if (held.current === event.pointerId) release(); }}
    onLostPointerCapture={event => { if (held.current === event.pointerId) release(); }}
    onClick={event => { if (!action.onRelease || event.detail === 0) { action.onPress(); if (action.onRelease) action.onRelease(); } }}>
    {action.icon}<span>{action.label}</span>
  </button>;
}

export function TouchActions({ actions }: { actions: TouchAction[] }) {
  return <div className="touch-actions" aria-label="Game actions">{actions.map(action => <TouchActionButton key={action.id} action={action} />)}</div>;
}

interface HorizontalControlsOptions {
  onInteract: () => void;
  onManualMove: () => void;
  onPause: () => void;
}

export function useHorizontalControls({
  onInteract,
  onManualMove,
  onPause,
}: HorizontalControlsOptions) {
  const directions = useRef({ left: false, right: false });
  const callbacks = useRef({ onInteract, onManualMove, onPause });
  callbacks.current = { onInteract, onManualMove, onPause };

  const clear = useCallback(() => {
    directions.current.left = false;
    directions.current.right = false;
  }, []);

  const setDirection = useCallback((direction: Direction, active: boolean) => {
    directions.current[direction] = active;
    if (active) callbacks.current.onManualMove();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (key === "arrowleft" || key === "a") setDirection("left", true);
      if (key === "arrowright" || key === "d") setDirection("right", true);
      if ((key === "e" || key === " ") && !event.repeat) callbacks.current.onInteract();
      if ((key === "p" || key === "escape") && !event.repeat) callbacks.current.onPause();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") setDirection("left", false);
      if (key === "arrowright" || key === "d") setDirection("right", false);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    };
  }, [clear, setDirection]);

  return { clear, directions, setDirection };
}

interface TouchControlsProps {
  actionLabel?: string;
  onDirection: (direction: Direction, active: boolean) => void;
  onInteract: () => void;
}

export function TouchControls({
  actionLabel = "Act",
  onDirection,
  onInteract,
}: TouchControlsProps) {
  const bindDirection = (direction: Direction) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      onDirection(direction, true);
    },
    onPointerUp: () => onDirection(direction, false),
    onPointerCancel: () => onDirection(direction, false),
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  });

  return (
    <div className="touch-controls" aria-label="Touch controls">
      <div className="touch-controls__move">
        <button aria-label="Move left" {...bindDirection("left")}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <button aria-label="Move right" {...bindDirection("right")}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <button
        className="touch-controls__action"
        aria-label={actionLabel}
        onClick={onInteract}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Hand aria-hidden="true" />
        <span>{actionLabel.toUpperCase()}</span>
      </button>
    </div>
  );
}
