import { FastForward, Volume2, VolumeX } from "lucide-react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useTimedSequence } from "../core/cinematic/useTimedSequence";
import { useElementSize } from "../core/hooks/useElementSize";
import { coverWorldWidth, followingCameraOffset } from "../core/map/camera";
import { ACTIVE_GAME } from "../game/activeGame";

interface CinematicIntroProps {
  muted: boolean;
  onComplete: () => void;
  onMute: () => void;
  playerSprite: ReactNode;
  startX: number;
}

export function CinematicIntro({
  muted,
  onComplete,
  onMute,
  playerSprite,
  startX,
}: CinematicIntroProps) {
  const { ref: frameRef, size: frameSize } = useElementSize<HTMLDivElement>();
  const beats = ACTIVE_GAME.intro.beats;
  const routeBeats = beats.filter((item) => item.showInRoute !== false);
  const { finish, index: beatIndex, item: beat } = useTimedSequence({
    items: beats,
    leadInMs: ACTIVE_GAME.intro.establishingMs,
    onComplete,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["Escape", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish]);

  const focus = beat?.focus ?? { x: 50, y: 50, zoom: 1 };
  const portrait = frameSize.height > frameSize.width;
  const transitionDuration = `${
    beat?.cameraDurationMs ?? Math.min(1950, Math.max(900, (beat?.durationMs ?? 1700) - 520))
  }ms`;
  const gameplayWorldWidth = coverWorldWidth(
    frameSize.height,
    ACTIVE_GAME.presentation.aspectRatio,
  );
  const worldStyle = beat?.settleToGameplay
    ? portrait
      ? {
          left: `${followingCameraOffset(startX, frameSize.width, gameplayWorldWidth)}px`,
          top: "0px",
          width: `${gameplayWorldWidth}px`,
          height: `${frameSize.height}px`,
          "--intro-duration": transitionDuration,
        } as CSSProperties
      : {
          left: "0%",
          top: "0%",
          width: "100%",
          height: "100%",
          "--intro-duration": transitionDuration,
        } as CSSProperties
    : portrait
      ? {
        left: `${frameSize.width / 2 -
          (focus.x / 100) * frameSize.height * ACTIVE_GAME.presentation.aspectRatio * focus.zoom}px`,
        top: `${frameSize.height / 2 - (focus.y / 100) * frameSize.height * focus.zoom}px`,
        width: `${frameSize.height * ACTIVE_GAME.presentation.aspectRatio * focus.zoom}px`,
        height: `${frameSize.height * focus.zoom}px`,
        "--intro-duration": transitionDuration,
        } as CSSProperties
      : {
        left: `${50 - focus.x * focus.zoom}%`,
        top: `${50 - focus.y * focus.zoom}%`,
        width: `${focus.zoom * 100}%`,
        height: `${focus.zoom * 100}%`,
        "--intro-duration": transitionDuration,
        } as CSSProperties;

  return (
    <main className="cinematic" aria-label="Mission briefing">
      <div
        className={`cinematic__frame ${beat?.settleToGameplay ? "cinematic__frame--settling" : ""}`}
        ref={frameRef}
      >
        <div className="cinematic__world" style={worldStyle}>
          <img src={ACTIVE_GAME.assets.world} alt="" draggable={false} />
          {beat?.marker && (
            <div
              className={`cinematic__poi cinematic__poi--${beat.marker}`}
              style={{ left: `${beat.focus.x}%`, top: `${beat.focus.y}%` }}
            >
              <img
                src={
                  beat.marker === "final-objective"
                    ? ACTIVE_GAME.assets.finalObjective.locked
                    : ACTIVE_GAME.assets.clue
                }
                alt=""
              />
            </div>
          )}
          {beat?.showPlayer && (
            <div className="cinematic__player-reveal">
              {playerSprite}
            </div>
          )}
        </div>
        <div
          className={`cinematic__vignette ${
            beat?.settleToGameplay ? "cinematic__vignette--open" : ""
          }`}
        />
        <div
          className={`cinematic__spotlight ${beat ? "" : "cinematic__spotlight--establishing"} ${
            beat?.settleToGameplay ? "cinematic__spotlight--open" : ""
          }`}
          aria-hidden="true"
        >
          <span />
        </div>

        {beat && (
          <>
            {!beat.settleToGameplay && (
              <div className="cinematic__target" aria-hidden="true">
                <span />
              </div>
            )}
            {beat.showCaption !== false && (
              <section className="cinematic__caption" key={beat.id} aria-live="polite">
                <div>
                  <p>{beat.kicker}</p>
                  <h1>{beat.title}</h1>
                  <span>{beat.description}</span>
                </div>
              </section>
            )}
          </>
        )}

        {!beat && (
          <div className="cinematic__establishing">
            <span>{ACTIVE_GAME.copy.caseLabel}</span>
            <strong>{ACTIVE_GAME.copy.locationName}</strong>
          </div>
        )}

        <div className="cinematic__route" aria-label="Briefing progress">
          {routeBeats.map((item) => (
            <span
              className={beats.indexOf(item) <= beatIndex ? "cinematic__route-dot--visited" : ""}
              key={item.id}
              title={item.title}
            />
          ))}
        </div>

        <div className="cinematic__actions">
          <button className="cinematic__button" onClick={onMute} aria-label={muted ? "Turn sound on" : "Mute sound"}>
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
          <button className="cinematic__skip" onClick={finish}>
            {ACTIVE_GAME.intro.skipLabel} <FastForward aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
