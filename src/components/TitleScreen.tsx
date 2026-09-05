import { ArrowRight, Eye, FileSearch, Headphones, KeyRound } from "lucide-react";
import { ACTIVE_GAME } from "../game/activeGame";

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
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
        <button className="primary-button" onClick={onStart} autoFocus>
          {ACTIVE_GAME.copy.startLabel} <ArrowRight aria-hidden="true" />
        </button>
        <div className="case-file__audio">
          <Headphones aria-hidden="true" size={15} /> Best played with sound
        </div>
      </section>
      <div className="title-screen__credit">{ACTIVE_GAME.copy.credits}</div>
    </main>
  );
}
