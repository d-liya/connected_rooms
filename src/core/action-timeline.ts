export interface TimelineEvent {
  /** Zero-based original-sheet frame this landmark belongs to. */
  frame: number;
  name: string;
}

export interface ActionTimelineOptions {
  /** Original frame count (N). */
  frames: number;
  /** Chosen action duration; may retime the native clip. */
  durationSeconds: number;
  loop: boolean;
  events?: readonly TimelineEvent[];
}

export interface TimelineStep {
  /** Current zero-based frame, matching ActorSprite. */
  frame: number;
  /** True once a one-shot reaches its duration (loops never complete). */
  done: boolean;
  /** Landmarks crossed by this advance, in frame order, each once. */
  crossed: TimelineEvent[];
}

/** Zero-based frame k of N begins at k/N of the chosen duration. */
export function eventTimeSeconds(frame: number, frames: number, durationSeconds: number): number {
  return (Math.max(0, frame) / Math.max(1, frames)) * Math.max(0.001, durationSeconds);
}

export function timelineFrame(elapsedSeconds: number, frames: number, durationSeconds: number, loop: boolean): number {
  const count = Math.max(1, Math.floor(frames));
  const progress = Math.max(0, elapsedSeconds) / Math.max(0.001, durationSeconds);
  const frame = Math.floor(progress * count);
  return loop ? ((frame % count) + count) % count : Math.min(count - 1, frame);
}

/**
 * One authoritative action clock per action instance for sprite frames,
 * attachment phases and analyzed frame events. Matches ActorSprite frame
 * math; one-shots hold their final pose after completion.
 */
export class ActionTimeline {
  private elapsed = 0;
  private fired = new Set<number>();
  private frames: number;
  private durationSeconds: number;
  private loop: boolean;
  private events: readonly TimelineEvent[];

  constructor(options: ActionTimelineOptions) {
    this.frames = Math.max(1, Math.floor(options.frames));
    this.durationSeconds = Math.max(0.001, options.durationSeconds);
    this.loop = options.loop;
    this.events = options.events ?? [];
  }

  get elapsedSeconds(): number {
    return this.elapsed;
  }

  get done(): boolean {
    return !this.loop && this.elapsed >= this.durationSeconds;
  }

  get frame(): number {
    return timelineFrame(this.elapsed, this.frames, this.durationSeconds, this.loop);
  }

  /** Start a new action instance, optionally retimed. Clears event state. */
  reset(durationSeconds?: number): void {
    this.elapsed = 0;
    this.fired.clear();
    if (durationSeconds !== undefined) this.durationSeconds = Math.max(0.001, durationSeconds);
  }

  advance(dtSeconds: number): TimelineStep {
    this.elapsed = Math.max(0, this.elapsed + Math.max(0, dtSeconds));
    const crossed: TimelineEvent[] = [];
    this.events.forEach((event, index) => {
      if (this.fired.has(index)) return;
      if (eventTimeSeconds(event.frame, this.frames, this.durationSeconds) <= this.elapsed) {
        this.fired.add(index);
        crossed.push(event);
      }
    });
    crossed.sort((a, b) => a.frame - b.frame);
    return { frame: this.frame, done: this.done, crossed };
  }
}
