import { ArrowRight, Headphones } from "lucide-react";
import { ACTIVE_GAME } from "./game";
interface TitleScreenProps {
  onStart: () => void;
  ready: boolean;
  progress: number;
}

export function TitleScreen({ onStart, ready, progress }: TitleScreenProps) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <main className="title-screen">
      <img className="title-screen__art" src={ACTIVE_GAME.assets.titleArt} alt={ACTIVE_GAME.copy.title} />
      <div className="title-screen__veil" />
      <section className="case-file" aria-labelledby="case-file-heading">
        <div className="case-file__stamp">{ACTIVE_GAME.copy.caseLabel}</div>
        <p className="case-file__eyebrow">{ACTIVE_GAME.copy.titleEyebrow}</p>
        <h1 id="case-file-heading">{ACTIVE_GAME.copy.title}</h1>
        <p>{ACTIVE_GAME.copy.titleSummary}</p>
        <div className="case-file__rules">
          {ACTIVE_GAME.copy.titleRules.map((rule, index) => (
            <span key={index}><ArrowRight aria-hidden="true" /> {rule}</span>
          ))}
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
            <>Loading game… {percent}%</>
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
