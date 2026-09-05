import { ArrowRight, Eye, FastForward, FileSearch, Headphones, KeyRound, Volume2, VolumeX } from "lucide-react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useElementSize, useTimedSequence } from "./core/hooks";
import { coverWorldWidth, followingCameraOffset } from "./core/map";
import { ACTIVE_GAME } from "./game";

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
          left: `${followingCameraOffset(startX / 1000, frameSize.width, gameplayWorldWidth)}px`,
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

interface TitleScreenProps {
  onStart: () => void;
  ready: boolean;
  progress: number;
}

export function TitleScreen({ onStart, ready, progress }: TitleScreenProps) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <main className="title-screen">
      <img className="title-screen__art" src={ACTIVE_GAME.assets.titleArt} alt="Marlinspike Manor at night" />
      <div className="title-screen__veil" />
      <section className="case-file" aria-labelledby="case-file-heading">
        <div className="case-file__stamp">{ACTIVE_GAME.copy.caseLabel}</div>
        <p className="case-file__eyebrow">{ACTIVE_GAME.copy.titleEyebrow}</p>
        <h1 id="case-file-heading">{ACTIVE_GAME.copy.title}</h1>
        <p>{ACTIVE_GAME.copy.titleSummary}</p>
        <div className="case-file__rules">
          <span><Eye aria-hidden="true" /> {ACTIVE_GAME.copy.titleRules[0]}</span>
          <span><FileSearch aria-hidden="true" /> {ACTIVE_GAME.copy.titleRules[1]}</span>
          <span><KeyRound aria-hidden="true" /> {ACTIVE_GAME.copy.titleRules[2]}</span>
        </div>
        <button
          className="primary-button"
          onClick={onStart}
          disabled={!ready}
          aria-busy={!ready}
          autoFocus
        >
          {ready ? (
            <>{ACTIVE_GAME.copy.startLabel} <ArrowRight aria-hidden="true" /></>
          ) : (
            <>Loading the manor… {percent}%</>
          )}
        </button>
        {!ready && (
          <div
            className="case-file__loadbar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Loading game assets"
          >
            <span style={{ width: `${percent}%` }} />
          </div>
        )}
        <div className="case-file__audio">
          <Headphones aria-hidden="true" size={15} /> Best played with sound
        </div>
      </section>
      <div className="title-screen__credit">{ACTIVE_GAME.copy.credits}</div>
    </main>
  );
}
