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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return /^(input|textarea|select)$/i.test(target.tagName);
}

export interface KeyboardActionsOptions {
  /** Named actions mapped to event.key values (matched case-insensitively). */
  bindings: Record<string, readonly string[]>;
  enabled: boolean;
  onPress: (actionId: string) => void;
  onRelease?: (actionId: string) => void;
  /** Pass true for held-key auto-repeat; default ignores repeats. */
  repeat?: boolean;
}

/**
 * One explicit keyboard controller: named actions, per-key ownership (an
 * action stays held while any of its keys is down), typing-guard so gameplay
 * keys never hijack interface fields, and full release on blur/disable.
 */
export function useKeyboardActions({ bindings, enabled, onPress, onRelease, repeat = false }: KeyboardActionsOptions) {
  const heldKeys = useRef(new Map<string, string>());
  const callbacks = useRef({ onPress, onRelease });
  callbacks.current = { onPress, onRelease };
  const keysToAction = useRef(new Map<string, string>());
  keysToAction.current = new Map(Object.entries(bindings).flatMap(([action, keys]) => keys.map(key => [key.toLowerCase(), action])));

  const clear = useCallback(() => {
    if (heldKeys.current.size === 0) return;
    const released = new Set(heldKeys.current.values());
    heldKeys.current.clear();
    for (const action of released) callbacks.current.onRelease?.(action);
  }, []);

  useEffect(() => {
    if (!enabled) clear();
  }, [enabled, clear]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!enabled || isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const action = keysToAction.current.get(key);
      if (!action) return;
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) event.preventDefault();
      if (event.repeat && !repeat) return;
      if (heldKeys.current.has(key)) return;
      heldKeys.current.set(key, action);
      const first = [...heldKeys.current.values()].filter(current => current === action).length === 1;
      if (first) callbacks.current.onPress(action);
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const action = heldKeys.current.get(key);
      if (!action) return;
      heldKeys.current.delete(key);
      if (![...heldKeys.current.values()].includes(action)) callbacks.current.onRelease?.(action);
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [clear, enabled, repeat]);

  return { clear };
}

export interface ActionButtonProps {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  onPress: () => void;
  /** Supply for held actions; called on release/cancel. */
  onRelease?: () => void;
  /** Direct real-time actions fire on pointerdown. Ordinary UI buttons leave this false. */
  immediate?: boolean;
}

/**
 * Press/hold/release button with pointer ownership: exactly one pointer owns
 * the hold, release fires once, and blur/hidden/disabled always releases.
 * Immediate actions fire on pointerdown (never again on the following click);
 * ordinary actions fire on click. Keyboard activation always presses (and
 * immediately releases a held action).
 */
export function ActionButton({ label, icon, disabled, className, onPress, onRelease, immediate = false }: ActionButtonProps) {
  const held = useRef<number | null>(null);
  const firedOnDown = useRef(false);
  const pressCallback = useRef(onPress);
  pressCallback.current = onPress;
  const releaseCallback = useRef(onRelease);
  releaseCallback.current = onRelease;
  const release = useCallback(() => {
    if (held.current !== null) releaseCallback.current?.();
    held.current = null;
  }, []);
  // Disabled buttons receive no click, so a suppressed activation must not poison the next keyboard press.
  useEffect(() => { if (disabled) { firedOnDown.current = false; release(); } }, [disabled, release]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) release(); };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    return () => { release(); window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", hidden); };
  }, [release]);
  return <button disabled={disabled} aria-label={label} className={className}
    onContextMenu={event => event.preventDefault()}
    onPointerDown={event => {
      if (held.current !== null) return;
      if (!onRelease && !immediate) return;
      held.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId);
      firedOnDown.current = true; pressCallback.current();
    }}
    onPointerUp={event => { if (held.current === event.pointerId) release(); }}
    onPointerCancel={event => { if (held.current === event.pointerId) release(); }}
    onLostPointerCapture={event => { if (held.current === event.pointerId) release(); }}
    onClick={event => {
      // Pointer activations already pressed on the way down; keyboard activation (detail 0, no pointer) still presses here.
      if (event.detail !== 0 || firedOnDown.current) { firedOnDown.current = false; return; }
      pressCallback.current(); if (onRelease) releaseCallback.current?.();
    }}>
    {icon}<span>{label}</span>
  </button>;
}

export interface TouchAction {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  /** Supply for held actions such as shielding; called on release/cancel. */
  onRelease?: () => void;
  /** Direct real-time actions fire on pointerdown. Ordinary UI buttons leave this false. */
  immediate?: boolean;
}

export function TouchActions({ actions }: { actions: TouchAction[] }) {
  return <div className="touch-actions" aria-label="Game actions">{actions.map(action =>
    <ActionButton key={action.id} label={action.label} icon={action.icon} disabled={action.disabled} onPress={action.onPress} onRelease={action.onRelease} immediate={action.immediate} />)}</div>;
}

export interface BufferedPress {
  action: string;
  /** Original input timestamp; games reuse it for timing judgments. */
  at: number;
}

/**
 * Short recovery-aware input buffer. Games push presses as they arrive and
 * consume the oldest unexpired press they accept right now. Each press is
 * consumed at most once, expires, and is never forced past eligibility:
 * push and consume must share one clock.
 */
export class InputBuffer {
  private presses: BufferedPress[] = [];
  constructor(private expiryMs = 180, private maxLength = 8) {}
  push(action: string, now = performance.now()): void {
    this.presses.push({ action, at: now });
    if (this.presses.length > this.maxLength) this.presses.splice(0, this.presses.length - this.maxLength);
  }
  consume(now: number, eligible: (press: BufferedPress) => boolean): BufferedPress | null {
    this.presses = this.presses.filter(press => now - press.at <= this.expiryMs);
    const index = this.presses.findIndex(eligible);
    if (index < 0) return null;
    const [press] = this.presses.splice(index, 1);
    return press!;
  }
  clear(): void {
    this.presses = [];
  }
  get size(): number {
    return this.presses.length;
  }
}

export interface PointerDragState {
  pointerId: number | null;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

export interface PointerDragOptions {
  enabled: boolean;
  onStart?: (state: PointerDragState) => void;
  onMove?: (state: PointerDragState) => void;
  onEnd?: (state: PointerDragState) => void;
}

const IDLE_DRAG: PointerDragState = { pointerId: null, originX: 0, originY: 0, x: 0, y: 0 };

/**
 * Single-pointer drag/aim tracking on a surface, in pixels relative to the
 * surface. One pointer owns the gesture; blur/cancel always ends it.
 */
export function usePointerDrag({ enabled, onStart, onMove, onEnd }: PointerDragOptions) {
  const [state, setState] = useState<PointerDragState>(IDLE_DRAG);
  const callbacks = useRef({ onStart, onMove, onEnd });
  callbacks.current = { onStart, onMove, onEnd };
  const end = useCallback((pointerId: number | null) => {
    setState(current => {
      if (current.pointerId === null || (pointerId !== null && current.pointerId !== pointerId)) return current;
      callbacks.current.onEnd?.(current);
      return IDLE_DRAG;
    });
  }, []);
  useEffect(() => {
    if (!enabled) end(null);
  }, [enabled, end]);
  useEffect(() => {
    const cancel = () => end(null);
    const hidden = () => { if (document.hidden) end(null); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hidden);
    return () => { end(null); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", hidden); };
  }, [end]);
  return {
    state,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (!enabled || event.button !== 0) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const next = { pointerId: event.pointerId, originX: event.clientX - bounds.left, originY: event.clientY - bounds.top, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        let started = false;
        setState(current => {
          if (current.pointerId !== null) return current;
          started = true;
          return next;
        });
        if (!started) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        callbacks.current.onStart?.(next);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
        setState(current => {
          if (current.pointerId !== event.pointerId) return current;
          const next = { ...current, x, y };
          callbacks.current.onMove?.(next);
          return next;
        });
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => end(event.pointerId),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => end(event.pointerId),
      onLostPointerCapture: (event: PointerEvent<HTMLElement>) => end(event.pointerId),
    },
  };
}
