import { useEffect, useRef } from "react";

export function useAnimationFrame(
  enabled: boolean,
  onFrame: (deltaSeconds: number, now: number) => void,
): void {
  const callbackRef = useRef(onFrame);
  callbackRef.current = onFrame;

  useEffect(() => {
    if (!enabled) return;

    let previous: number | null = null;
    let frameId = 0;
    const frame = (now: number) => {
      const deltaSeconds = Math.min((now - (previous ?? now)) / 1000, 0.05);
      previous = now;
      callbackRef.current(deltaSeconds, now);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [enabled]);
}
