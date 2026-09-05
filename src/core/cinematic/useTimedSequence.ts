import { useCallback, useEffect, useRef, useState } from "react";

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
