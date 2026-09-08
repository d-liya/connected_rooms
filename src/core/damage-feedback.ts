/** A short, single hit pulse, driven by the caller's paused gameplay clock. */
export function damageFeedback(elapsedSeconds: number | undefined) {
  if (elapsedSeconds === undefined || !Number.isFinite(elapsedSeconds) || elapsedSeconds < 0 || elapsedSeconds >= 0.18) return null;
  const strength = 1 - elapsedSeconds / 0.18;
  return {
    filter: `brightness(${1 + strength * 0.9}) drop-shadow(${strength * 2}px 0 0 rgba(255,60,80,${strength})) drop-shadow(${-strength * 2}px 0 0 rgba(50,220,255,${strength}))`,
    reducedMotionFilter: `brightness(${1 + strength * 0.35})`,
  };
}
