import { Pause, Play, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ACTIVE_GAME, createGameAudio } from './game';
import { waitForGameImages } from './assets';
import { useKeyboardActions } from './core/input';
import { SingleScene } from './core/single-scene';

// Neutral single-scene shell: loading, audio unlock/mute, title/mode state and
// replay. Generated games replace this file with the authored experience.
export function GameExperience() {
  const [mode, setMode] = useState<'title' | 'playing' | 'paused'>('title');
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const audio = useRef<ReturnType<typeof createGameAudio> | null>(null);
  if (!audio.current) audio.current = createGameAudio();

  useEffect(() => {
    let alive = true;
    audio.current?.preload();
    void waitForGameImages(ACTIVE_GAME, p => { if (alive) setLoaded(p.total ? p.loaded / p.total : 1); })
      .catch(e => { if (alive) setError(String(e)); });
    return () => { alive = false; audio.current?.stop(); };
  }, []);

  useEffect(() => {
    if (mode === 'playing') audio.current?.start();
    else audio.current?.stop();
  }, [mode]);

  useEffect(() => {
    const blur = () => setMode(m => m === 'playing' ? 'paused' : m);
    window.addEventListener('blur', blur);
    return () => window.removeEventListener('blur', blur);
  }, []);
  useKeyboardActions({
    bindings: { pause: ['escape', 'p'], start: ['enter'] },
    enabled: !error,
    onPress: action => {
      if (action === 'pause') setMode(m => m === 'playing' ? 'paused' : m === 'paused' ? 'playing' : m);
      else if (action === 'start') setMode(m => m === 'title' ? 'playing' : m);
    },
  });

  const start = () => { audio.current?.unlock(); setMode('playing'); };
  const restart = () => setMode('title');
  const togglePause = () => setMode(m => m === 'playing' ? 'paused' : m === 'paused' ? 'playing' : m);
  const toggleMute = () => setMuted(m => { audio.current?.setMuted(!m); return !m; });
  const ready = loaded >= 1 && !error;

  return <div className="game-root arena" style={{ '--game-aspect': ACTIVE_GAME.presentation.aspectRatio, '--game-max-width': `${ACTIVE_GAME.presentation.maxStageWidth}px` } as CSSProperties}>
    <main className="game-shell gameplay-layout">
      <div className="arena-topline">
        <span>{ACTIVE_GAME.copy.title}</span>
        <div className="arena-tools">
          <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <button aria-label={mode === 'paused' ? 'Resume' : 'Pause'} onClick={togglePause} disabled={mode === 'title'}>{mode === 'paused' ? <Play /> : <Pause />}</button>
          <button aria-label="Restart" onClick={restart} disabled={mode === 'title'}><RotateCcw /></button>
        </div>
      </div>
      <SingleScene ariaLabel={ACTIVE_GAME.copy.locationName} aspectRatio={ACTIVE_GAME.presentation.aspectRatio}>
        <img className="game-stage__background" src={ACTIVE_GAME.assets.world} alt={ACTIVE_GAME.copy.locationName} draggable={false} />
      </SingleScene>
      {mode !== 'playing' && <div className="modal-backdrop">
        <section className="modal-card arena-modal" role="dialog" aria-modal="true" aria-label={mode === 'title' ? ACTIVE_GAME.copy.title : 'Paused'}>
          <small>{ACTIVE_GAME.copy.titleEyebrow}</small>
          <h1>{mode === 'title' ? ACTIVE_GAME.copy.title : 'Paused'}</h1>
          <p>{mode === 'title' ? ACTIVE_GAME.copy.titleSummary : 'Take a breath. The scene is waiting.'}</p>
          {error
            ? <p role="alert">{error}<button onClick={() => location.reload()}>Retry loading</button></p>
            : mode === 'title'
              ? <button className="primary-button" disabled={!ready} onClick={start}>{ready ? ACTIVE_GAME.copy.startLabel : `Loading ${Math.round(loaded * 100)}%`}</button>
              : <><button className="primary-button" onClick={togglePause}>Resume</button><button onClick={restart}>Restart</button></>}
        </section>
      </div>}
    </main>
  </div>;
}
