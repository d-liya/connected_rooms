import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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

interface ElementSize {
  width: number;
  height: number;
}

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const bounds = element.getBoundingClientRect();
      setSize({ width: bounds.width, height: bounds.height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

interface TimedItem {
  durationMs: number;
}

interface TimedSequenceOptions<T extends TimedItem> {
  items: readonly T[];
  leadInMs: number;
  onComplete: () => void;
}

export function useTimedSequence<T extends TimedItem>({
  items,
  leadInMs,
  onComplete,
}: TimedSequenceOptions<T>) {
  const [index, setIndex] = useState(-1);
  const completed = useRef(false);
  const item = index >= 0 ? items[index] : null;

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (index >= items.length - 1) finish();
      else setIndex((current) => current + 1);
    }, item?.durationMs ?? leadInMs);
    return () => window.clearTimeout(timer);
  }, [finish, index, item?.durationMs, items.length, leadInMs]);

  return { finish, index, item };
}
