import { HelpCircle, Pause, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ACTIVE_GAME, createGameAudio } from "./game";
import { waitForGameImages } from "./assets";
import { useAnimationFrame } from "./core/hooks";
import { TouchControls, useHorizontalControls, type Direction } from "./core/input";
import { MapViewport, clamp } from "./core/map";
import { ActorSprite } from "./core/sprites";
import { CinematicIntro, TitleScreen } from "./screens";

// Replace this neutral traversal loop with the requested gameplay. The shared
// screens, camera, audio, sprite renderer and touch layout are not mechanic code.
export function GameExperience() {
  const [status, setStatus] = useState<"title" | "intro" | "playing" | "paused">("title");
  const firstRoom = ACTIVE_GAME.world.rooms.find(room => room.id === ACTIVE_GAME.world.startRoom)!;
  const [roomId, setRoomId] = useState(firstRoom.id);
  const room = ACTIVE_GAME.world.rooms.find(item => item.id === roomId)!;
  const [x, setX] = useState(firstRoom.spawnX);
  const [facing, setFacing] = useState<Direction>("right");
  const [moving, setMoving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [load, setLoad] = useState({ ready: false, fraction: 0 });
  const target = useRef<number | null>(null);
  const audio = useRef<ReturnType<typeof createGameAudio> | null>(null);
  if (!audio.current) audio.current = createGameAudio();
  const connection = ACTIVE_GAME.world.connections.find(edge => edge.from === roomId && Math.abs(edge.x - x) < 65);
  const controls = useHorizontalControls({
    onManualMove: () => { target.current = null; },
    onInteract: () => {
      if (status !== "playing" || !connection) return;
      setRoomId(connection.to); setX(connection.targetX); target.current = null;
      audio.current?.play("door", 500);
    },
    onPause: () => setStatus(value => value === "playing" ? "paused" : value === "paused" ? "playing" : value),
  });
  const interact = () => {
    if (status !== "playing" || !connection) return;
    setRoomId(connection.to); setX(connection.targetX); target.current = null;
    audio.current?.play("door", 500);
  };
  useEffect(() => { controls.clear(); target.current = null; setMoving(false); }, [status, controls.clear]);
  useEffect(() => {
    let cancelled = false;
    let imagesLoaded = 0, imagesTotal = 1, audioLoaded = 0, audioTotal = 1;
    const report = () => {
      if (cancelled) return;
      const fraction = (imagesLoaded + audioLoaded) / (imagesTotal + audioTotal);
      setLoad({ fraction, ready: fraction >= 1 });
    };
    audio.current?.preload((loaded, total) => { audioLoaded = loaded; audioTotal = total; report(); });
    void waitForGameImages(ACTIVE_GAME, ({ loaded, total }) => { imagesLoaded = loaded; imagesTotal = total; report(); });
    const unlock = () => audio.current?.unlock();
    const visibility = () => { if (document.visibilityState === "visible") unlock(); };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true; audio.current?.stop();
      window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useAnimationFrame(status === "playing", dt => {
    const direction = Number(controls.directions.current.right) - Number(controls.directions.current.left);
    const step = ACTIVE_GAME.player.speed * dt;
    const delta = direction ? direction * step : target.current === null ? 0 : clamp(target.current - x, -step, step);
    const next = clamp(x + delta, room.bounds.left, room.bounds.right);
    setMoving(next !== x);
    if (next !== x) { setFacing(next > x ? "right" : "left"); setX(next); }
  });
  const toggleMuted = () => { setMuted(value => { audio.current?.setMuted(!value); return !value; }); };
  const reset = () => { setRoomId(firstRoom.id); setX(firstRoom.spawnX); setFacing("right"); setStatus("playing"); };
  const sprites = ACTIVE_GAME.assets.characters[ACTIVE_GAME.player.assetId];
  const player = <ActorSprite aspectRatio={ACTIVE_GAME.presentation.aspectRatio}
    sheet={moving ? sprites.walk ?? sprites.idle : sprites.idle} x={x} groundY={room.groundY} facing={facing} label="Player" />;
  const rootStyle = { "--game-aspect": ACTIVE_GAME.presentation.aspectRatio,
    "--game-max-width": `${ACTIVE_GAME.presentation.maxStageWidth}px` } as CSSProperties;
  return <div className={`game-root ${ACTIVE_GAME.presentation.themeClass}`} style={rootStyle}>
    {status === "title" ? <TitleScreen ready={load.ready} progress={load.fraction}
      onStart={() => { if (load.ready) { audio.current?.start(); setStatus("intro"); } }} />
    : status === "intro" ? <CinematicIntro muted={muted} onMute={toggleMuted}
      onComplete={() => setStatus("playing")} playerSprite={player} startX={firstRoom.spawnX} />
    : <main className="game-shell">
      <header className="hud">
        <div className="hud__identity"><div className="hud__identity-copy"><strong>{room.label}</strong></div></div>
        <div className="hud__objective">{connection?.label ?? "Move with arrows or A/D. E / Space to interact."}</div>
        <div className="hud__buttons"><button className="icon-button" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMuted}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <button className="icon-button" aria-label="Show controls" onClick={() => setStatus("paused")}><HelpCircle /></button>
          <button className="icon-button" aria-label="Pause" onClick={() => setStatus("paused")}><Pause /></button></div>
      </header>
      <MapViewport ariaLabel={room.label} aspectRatio={ACTIVE_GAME.presentation.aspectRatio}
        focusX={x} focusY={(room.band.top + room.band.bottom) / 2}
        onWorldPointerDown={point => { if (status === "playing" && point.y / 10 >= room.band.top && point.y / 10 <= room.band.bottom) target.current = point.x; }}>
        {() => <><img className="game-stage__background" src={ACTIVE_GAME.assets.world} alt="" draggable={false} />{player}</>}
      </MapViewport>
      <TouchControls actionLabel={connection?.label ?? "Interact"} onDirection={controls.setDirection} onInteract={interact} />
      {status === "paused" && <div className="modal-backdrop"><section className="modal-card" role="dialog" aria-modal="true" aria-label="Paused">
        <h2>Paused</h2><p>Move with A/D, arrows, or touch. Use E / Space or the center button to interact.</p><button className="primary-button" onClick={() => setStatus("playing")}>Resume</button>
        <button className="text-button" onClick={reset}>Restart</button>
        <button className="text-button" onClick={() => { audio.current?.stop(); setRoomId(firstRoom.id); setX(firstRoom.spawnX); setStatus("title"); }}>Return to title</button>
      </section></div>}
    </main>}
  </div>;
}
