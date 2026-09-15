import type { CSSProperties, ReactNode } from "react";

export interface SingleSceneProps {
  ariaLabel: string;
  aspectRatio: number;
  children: ReactNode;
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Fixed single-scene viewport. The whole authored scene stays visible at the
 * authored aspect ratio: no camera-follow, no room transitions, no offscreen
 * traversal. Sizing comes from .stage-frame--fixed in the game stylesheet.
 */
export function SingleScene({ ariaLabel, aspectRatio, children, overlay, className = "", style }: SingleSceneProps) {
  return (
    <div className={`stage-frame stage-frame--fixed${className ? ` ${className}` : ""}`} style={{ aspectRatio: `${aspectRatio}`, ...style }}>
      <div aria-label={ariaLabel} className="game-stage" role="img">
        {children}
      </div>
      {overlay}
    </div>
  );
}
