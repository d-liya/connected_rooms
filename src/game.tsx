import { useEffect, useMemo, useState } from "react";
import { asset, preloadImages } from "./assets";
import { AudioController } from "./core/audio";
import { useAnimationFrame, useTimedSequence } from "./core/hooks";
import { TouchControls, useHorizontalControls } from "./core/input";
import { MapViewport, clamp } from "./core/map";
import { Sprite, type SpriteAsset } from "./core/sprites";
import { validateWorld } from "./core/world";
import world from "./generated/world.json";
import assets from "./generated/assets.json";
import audioManifest from "./generated/audio.json";

validateWorld(world);
const player: SpriteAsset = assets.player as SpriteAsset;
const intro = [{ durationMs: 1800, text: "One map. Connected rooms. Your gameplay." }];
function Intro({ onComplete }: { onComplete: () => void }) {
  const { item, finish } = useTimedSequence({ items: intro, leadInMs: 0, onComplete });
  return <div className="overlay"><h1>{item?.text ?? "Welcome"}</h1><button onClick={finish}>Skip intro</button></div>;
}
export function Game() {
  const [status, setStatus] = useState<"title" | "intro" | "playing" | "paused">("title");
  const [roomId, setRoomId] = useState(world.startRoom);
  const room = world.rooms.find(item => item.id === roomId)!;
  const [x, setX] = useState(room.spawn.x);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [target, setTarget] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const audio = useMemo(() => new AudioController(audioManifest), []);
  useEffect(() => { preloadImages([world.image, ...player.fallback.sources]); return () => audio.stop(); }, [audio]);
  const connection = world.connections.find(edge => edge.from === roomId && Math.abs(edge.x - x) < 65);
  const interact = () => {
    if (status !== "playing" || !connection) return;
    setRoomId(connection.to); setX(connection.targetX); setTarget(null);
  };
  const controls = useHorizontalControls({ onInteract: interact, onManualMove: () => setTarget(null),
    onPause: () => setStatus(value => value === "playing" ? "paused" : value === "paused" ? "playing" : value) });
  useEffect(() => { controls.clear(); setTarget(null); }, [status, controls.clear]);
  useAnimationFrame(status === "playing", dt => {
    const direction = Number(controls.directions.current.right) - Number(controls.directions.current.left);
    const delta = direction ? direction * 220 * dt : target !== null ? clamp(target - x, -220 * dt, 220 * dt) : 0;
    if (delta) { setFacing(delta > 0 ? "right" : "left"); setX(clamp(x + delta, room.bounds.left, room.bounds.right)); }
  });
  const restart = () => { const start = world.rooms.find(item => item.id === world.startRoom)!;
    setRoomId(start.id); setX(start.spawn.x); setTarget(null); controls.clear(); setStatus("playing"); };
  return <main style={{ maxWidth: `min(1200px, calc((100dvh - 210px) * ${world.aspectRatio}))` }}>
    <header><strong>Connected Rooms</strong><span>{room.label}</span><button onClick={() => { audio.setMuted(!muted); setMuted(!muted); }}>{muted ? "Unmute" : "Mute"}</button>
      {status === "playing" && <button onClick={() => setStatus("paused")}>Pause</button>}</header>
    <MapViewport ariaLabel="Connected rooms map" aspectRatio={world.aspectRatio} focusX={x} focusY={room.groundY - 150}
      onWorldPointerDown={point => { if (status === "playing") setTarget(clamp(point.x, room.bounds.left, room.bounds.right)); }}>
      {() => <><img className="world" src={asset(world.image)} alt="" />
        {world.connections.map(edge => <div key={edge.id} className="door" style={{ left: `${edge.x / 10}%`, top: `${world.rooms.find(r => r.id === edge.from)!.groundY / 10}%` }}>↕</div>)}
        <Sprite definition={player} x={x} y={room.groundY} aspectRatio={world.aspectRatio} facing={facing} paused={status !== "playing"} label="Player" />
      </>}
    </MapViewport>
    <footer><p>{connection?.label ?? "Move with A/D, arrow keys, touch, or click the map."} · E / Space to interact</p>
      <TouchControls actionLabel={connection?.label ?? "Interact"} onDirection={controls.setDirection} onInteract={interact} /></footer>
    {status === "title" && <div className="overlay"><small>READY FOR YOUR GAME</small><h1>Connected Rooms</h1><p>A clean starting point for a world of your own.</p><button onClick={() => { audio.start(); setStatus("intro"); }}>Start</button></div>}
    {status === "intro" && <Intro onComplete={() => setStatus("playing")} />}
    {status === "paused" && <div className="overlay"><h1>Paused</h1><button onClick={() => setStatus("playing")}>Resume</button><button onClick={restart}>Restart</button></div>}
  </main>;
}
