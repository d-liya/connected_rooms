import { useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";

export type EffectKind = "ring" | "spark" | "slash" | "text" | "flash";

export interface EffectSpec {
  kind: EffectKind;
  /** Stage percentages (0-100), matching world layout. */
  x: number;
  y: number;
  color?: string;
  scale?: number;
  durationMs?: number;
  /** Label for the text kind. */
  text?: string;
  /** Direction in degrees for spark/slash. */
  angleDeg?: number;
  /** Fires once when the effect completes or is evicted. */
  onDone?: () => void;
}

export interface ActiveEffect extends EffectSpec {
  id: number;
  startedAt: number;
  duration: number;
}

export const EFFECT_DEFAULTS: Record<EffectKind, { durationMs: number }> = {
  ring: { durationMs: 420 },
  spark: { durationMs: 380 },
  slash: { durationMs: 300 },
  text: { durationMs: 900 },
  flash: { durationMs: 220 },
};

/** Bounded layer: at most this many live effects; oldest is evicted first. */
export const MAX_EFFECTS = 64;

export interface EffectsHandle {
  /** Spawn from a confirmed gameplay event. Returns the effect id, or -1 when suppressed. */
  spawn: (spec: EffectSpec) => number;
  clear: () => void;
  shake: (magnitudePx?: number, durationMs?: number) => void;
  /** Hit-stop: presentation freeze; games scale their own dt by timeScale(). */
  freeze: (durationMs?: number) => void;
  /** 0 while frozen, else 1. Read per frame; never triggers renders. */
  timeScale: () => number;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export interface EffectsLayerProps {
  children: ReactNode;
  /** Ref to the coordinator handle games call from confirmed event paths. */
  handleRef?: React.MutableRefObject<EffectsHandle | null>;
  /** World-effect layer depth: above sprites (7), below HUD overlays. */
  layerZ?: number;
}

/**
 * Single effect coordinator. Games spawn from confirmed gameplay outcomes
 * (never mere input); the layer owns presentation-only state with bounded
 * counts, timeouts and cleanup. Shake wraps the scene; freeze pauses effect
 * clocks while games scale their own simulation by timeScale().
 */
export function EffectsLayer({ children, handleRef, layerZ = 8 }: EffectsLayerProps) {
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const nextId = useRef(1);
  const freezeUntil = useRef(0);
  const shakeUntil = useRef(0);
  const shakeMagnitude = useRef(0);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const timeScale = () => (performance.now() < freezeUntil.current ? 0 : 1);

  useEffect(() => {
    let frameId = 0;
    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const now = performance.now();
      if (now >= freezeUntil.current) {
        setEffects(current => {
          if (current.length === 0) return current;
          const live = current.filter(effect => now - effect.startedAt < effect.duration);
          if (live.length === current.length) return current;
          for (const effect of current) {
            if (now - effect.startedAt >= effect.duration) effect.onDone?.();
          }
          return live;
        });
      }
      if (now < shakeUntil.current && !reducedRef.current) {
        const m = shakeMagnitude.current;
        setShakeOffset({ x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m });
      } else {
        setShakeOffset(current => (current.x === 0 && current.y === 0 ? current : { x: 0, y: 0 }));
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useImperativeHandle(handleRef, () => ({
    spawn: (spec: EffectSpec) => {
      if (reducedRef.current && (spec.kind === "flash")) return -1;
      const duration = spec.durationMs ?? EFFECT_DEFAULTS[spec.kind].durationMs;
      const effect: ActiveEffect = { ...spec, id: nextId.current++, startedAt: performance.now(), duration };
      setEffects(current => {
        const next = current.length >= MAX_EFFECTS ? current.slice(current.length - MAX_EFFECTS + 1) : current;
        if (next.length !== current.length) {
          for (const evicted of current.slice(0, current.length - next.length)) evicted.onDone?.();
        }
        return [...next, effect];
      });
      return effect.id;
    },
    clear: () => {
      setEffects(current => {
        for (const effect of current) effect.onDone?.();
        return [];
      });
      shakeUntil.current = 0;
      setShakeOffset({ x: 0, y: 0 });
    },
    shake: (magnitudePx = 6, durationMs = 260) => {
      if (reducedRef.current) return;
      shakeMagnitude.current = magnitudePx;
      shakeUntil.current = performance.now() + durationMs;
    },
    freeze: (durationMs = 90) => {
      freezeUntil.current = performance.now() + durationMs;
    },
    timeScale,
  }), []);

  return (
    <div className="fx-shake" style={{ transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)` }}>
      {children}
      <div className="fx-layer" aria-hidden="true" style={{ zIndex: layerZ }}>
        {effects.map(effect => <EffectNode key={effect.id} effect={effect} />)}
      </div>
    </div>
  );
}

function EffectNode({ effect }: { effect: ActiveEffect }) {
  const style = {
    left: `${effect.x}%`,
    top: `${effect.y}%`,
    color: effect.color,
    ["--fx-scale" as string]: effect.scale ?? 1,
    ["--fx-angle" as string]: `${effect.angleDeg ?? 0}deg`,
    animationDuration: `${effect.duration}ms`,
  };
  if (effect.kind === "text") {
    return <div className="fx fx-text" style={style}>{effect.text}</div>;
  }
  return <div className={`fx fx-${effect.kind}`} style={style} />;
}
