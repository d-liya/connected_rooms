import { ArrowLeft, ArrowRight, Hand, Shield, Zap, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ACTIVE_GAME,createGameAudio} from './game';
import {waitForGameImages} from './assets';
import {ActorSprite} from './core/sprites';
import {MapViewport} from './core/map';
import {TouchActions,useHorizontalControls} from './core/input';
import {useAnimationFrame} from './core/hooks';
import {act,advance,busy,fighter,impact,moves,type Action} from './arena-combat';
const fresh=()=>({p:fighter(270),e:fighter(730),time:0,roundTime:60,round:1,score:[0,0],aiAt:1,message:'FIGHT!',feedbackAt:0});
export function GameExperience(){
 const sim=useRef(fresh());const [s,setS]=useState({...sim.current});const [mode,setMode]=useState<'title'|'playing'|'paused'|'round'|'over'>('title');const modeRef=useRef(mode);modeRef.current=mode;
 const [loaded,setLoaded]=useState(0),[error,setError]=useState(''),[muted,setMuted]=useState(false);const blocking=useRef(false);
 const audio=useRef<ReturnType<typeof createGameAudio>|null>(null);if(!audio.current)audio.current=createGameAudio();
 const pause=()=>setMode(m=>m==='playing'?'paused':m==='paused'?'playing':m);
 const controls=useHorizontalControls({onPause:pause,onInteract:()=>{},onManualMove:()=>{}});
 const attack=(a:Action)=>{if(modeRef.current==='playing')act(sim.current.p,a,sim.current.time);};
 useEffect(()=>{let alive=true;void waitForGameImages(ACTIVE_GAME,p=>{if(alive)setLoaded(p.loaded/p.total);}).catch(e=>{if(alive)setError(String(e));});audio.current?.preload();
 const down=(e:KeyboardEvent)=>{if([' ','j','k','l'].includes(e.key.toLowerCase()))e.preventDefault();if(e.repeat)return;const k=e.key.toLowerCase();if(k===' ')blocking.current=true;if(k==='j')attack('light');if(k==='k')attack('heavy');if(k==='l')attack('special');};
 const up=(e:KeyboardEvent)=>{if(e.key===' ')blocking.current=false;};const blur=()=>{blocking.current=false;setMode(m=>m==='playing'?'paused':m);};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
 return()=>{alive=false;audio.current?.stop();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};},[]);
 useEffect(()=>{controls.clear();blocking.current=false;if(mode==='playing')audio.current?.start();else audio.current?.stop();},[mode,controls.clear]);
 const sync=()=>setS({...sim.current,p:{...sim.current.p},e:{...sim.current.e},score:[...sim.current.score]});
 const start=()=>{sim.current=fresh();sync();audio.current?.unlock();audio.current?.play('announce_round_1',0);setMode('playing');};
 useAnimationFrame(mode==='playing',dt=>{const v=sim.current;v.time+=dt;v.roundTime=Math.max(0,v.roundTime-dt);advance(v.p,dt);advance(v.e,dt);
 const direction=Number(controls.directions.current.right)-Number(controls.directions.current.left);
 if(!busy(v.p)){const next=blocking.current?'block':direction?'walk':'idle';if(v.p.action!==next){v.p.action=next;v.p.age=0;}if(next==='walk')v.p.x=Math.max(110,Math.min(v.e.x-100,v.p.x+direction*190*dt));}
 const distance=v.e.x-v.p.x;
 if(!busy(v.e)){if(distance>145){if(v.e.action!=='walk'){v.e.action='walk';v.e.age=0;}v.e.x=Math.max(v.p.x+100,v.e.x-135*dt);}else if(v.time>=v.aiAt){const roll=Math.random();act(v.e,roll<0.24?'block':roll<0.65?'light':roll<0.91?'heavy':'special',v.time);v.aiAt=v.time+1.5+Math.random()*0.9;}else if(v.e.action==='walk'||(v.e.action==='block'&&v.e.age>0.65)){v.e.action='idle';v.e.age=0;}}
 for(const [a,b] of [[v.p,v.e],[v.e,v.p]]){if(a.hp<=0)continue;const result=impact(a,b,v.time);if(result){audio.current?.play(result,0);v.message=result==='block'?'BLOCKED':result==='whiff'?'MISS':'HIT!';v.feedbackAt=v.time;}}
 if(v.p.hp===0||v.e.hp===0||v.roundTime===0){const winner=v.p.hp===v.e.hp?-1:v.p.hp>v.e.hp?0:1;if(winner>=0)v.score[winner]++;v.message=winner<0?'DRAW':winner===0?'PETER WINS':'STEWIE WINS';if(winner>=0){const win=winner===0?v.p:v.e,lose=winner===0?v.e:v.p;win.action='celebrate';win.age=0;lose.action='defeated';lose.age=0;}audio.current?.play(v.roundTime===0?'announce_time':'announce_ko',0);setMode(v.score.some(n=>n>=2)?'over':'round');}sync();
 });
 useAnimationFrame(mode==='round'||mode==='over',dt=>{sim.current.p.age+=dt;sim.current.e.age+=dt;sync();});
 const nextRound=()=>{const v=sim.current;v.p=fighter(270);v.e=fighter(730);v.round++;v.roundTime=60;v.aiAt=v.time+1;v.message='FIGHT!';v.feedbackAt=v.time;sync();audio.current?.play(`announce_round_${Math.min(3,v.round)}`,0);setMode('playing');};
 const sprite=(who:'p'|'e')=>{const f=s[who],id=who==='p'?'peter_griffin':'stewie_griffin',sheet=ACTIVE_GAME.assets.characters[id][f.action];return <ActorSprite key={who} aspectRatio={16/9} sheet={sheet} x={f.x} groundY={900} facing={who==='p'?'right':'left'} label={`${who==='p'?'Peter':'Stewie'} ${f.action}`} elapsedSeconds={f.age} durationSeconds={f.action in moves?moves[f.action as keyof typeof moves].duration:undefined} loop={['idle','walk','block'].includes(f.action)} paused={mode==='paused'} damageElapsedSeconds={s.time-f.damageAt}/>;};
 const health=(who:'p'|'e')=>{const sheet=ACTIVE_GAME.assets.characters[who==='p'?'peter_griffin':'stewie_griffin'].idle;return <div className={`arena-health arena-health--${who}`}><div className="arena-portrait" style={{backgroundImage:`url(${sheet.src})`,backgroundSize:`${sheet.frames*220}% 220%`,backgroundPosition:`${6000/(sheet.frames*220-100)}% 18%`}}/><div className="arena-meter"><strong>{who==='p'?'PETER':'STEWIE'}</strong><div role="progressbar" aria-label={`${who==='p'?'Peter':'Stewie'} health`} aria-valuenow={s[who].hp} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${s[who].hp}%`}}/></div><div className="arena-pips" aria-label={`${s.score[who==='p'?0:1]} rounds won`}>{[0,1].map(n=><i key={n} className={s.score[who==='p'?0:1]>n?'won':''}/>)}</div></div></div>;};
 const hud=<header className="arena-hud">{health('p')}<div className="arena-clock"><strong>{Math.ceil(s.roundTime)}</strong><small>ROUND {s.round}</small></div>{health('e')}</header>;
 return <div className="game-root arena" style={{'--game-aspect':16/9,'--game-max-width':'1440px'} as CSSProperties}>
 <main className="game-shell gameplay-layout"><div className="arena-topline"><span>GRIFFIN <b>STREET BRAWL</b></span><div className="arena-tools"><button aria-label={muted?'Unmute':'Mute'} onClick={()=>{setMuted(!muted);audio.current?.setMuted(!muted);}}>{muted?<VolumeX/>:<Volume2/>}</button><button aria-label="Pause" onClick={pause} disabled={mode!=='playing'&&mode!=='paused'}><Pause/></button><button aria-label="Restart" onClick={start} disabled={loaded<1}><RotateCcw/></button></div></div>
 <MapViewport ariaLabel="Griffin Street arena" aspectRatio={16/9} focusX={(s.p.x+s.e.x)/2} focusY={62} transitionKey="street" onDirection={controls.setDirection} inputEnabled={mode==='playing'}>{()=> <><img className="game-stage__background" src={ACTIVE_GAME.assets.world} alt="Griffin family street" draggable={false}/>{sprite('p')}{sprite('e')}{hud}<div className="arena-impact" aria-live="polite">{s.time-s.feedbackAt<0.55?s.message:''}</div></>}</MapViewport>
 <div className="arena-controls"><div className="arena-movement"><small>MOVE</small><TouchActions actions={[{id:'left',label:'Move left',icon:<ArrowLeft/>,disabled:mode!=='playing',onPress:()=>controls.setDirection('left',true),onRelease:()=>controls.setDirection('left',false)},{id:'right',label:'Move right',icon:<ArrowRight/>,disabled:mode!=='playing',onPress:()=>controls.setDirection('right',true),onRelease:()=>controls.setDirection('right',false)}]}/><small>A / D</small></div><div className="arena-attacks"><TouchActions actions={[{id:'light',label:'Slap',icon:<><Hand/><kbd>J</kbd></>,onPress:()=>attack('light')},{id:'heavy',label:'Heavy',icon:<><Hand/><kbd>K</kbd></>,onPress:()=>attack('heavy')},{id:'special',icon:<><Zap/><kbd>L</kbd></>,label:`Special${Math.max(0,5-(s.time-s.p.specialAt))>0?' · '+Math.ceil(5-(s.time-s.p.specialAt))+'s':''}`,disabled:s.time-s.p.specialAt<5,onPress:()=>attack('special')},{id:'block',label:'Block',icon:<><Shield/><kbd>SPACE</kbd></>,onPress:()=>{blocking.current=true;},onRelease:()=>{blocking.current=false;}}].map(a=>({...a,disabled:mode!=='playing'||a.disabled}))}/></div></div>
 <p className="arena-help">First to two rounds wins <span>Drag to move · Hold block · Esc to pause</span></p>
 {mode!=='playing'&&<div className="modal-backdrop"><section className="modal-card arena-modal" role="dialog" aria-modal="true" aria-label={mode==='title'?'Griffin Street Brawl':mode==='paused'?'Paused':s.message}>
 <small>QUAHOG, RHODE ISLAND</small><h1>{mode==='title'?'Griffin Street Brawl':mode==='paused'?'Paused':s.message}</h1>
 <p>{mode==='title'?'You’re Peter. Close the gap, block Stewie’s swings, and take two rounds.':mode==='paused'?'J: slap · K: heavy · L: special · hold Space: block. Special recharges in 5 seconds.':`${s.score[0]} — ${s.score[1]} · ${mode==='over'?'Match complete.':'Ready for the next round?'}`}</p>
 {mode==='title'&&<><p className="arena-note">YOU PLAY PETER <span>VS</span> CPU STEWIE</p>{error?<p role="alert">{error}<button onClick={()=>location.reload()}>Retry loading</button></p>:<button className="primary-button" disabled={loaded<1} onClick={start}>{loaded<1?`Loading sprites ${Math.round(loaded*100)}%`:'LET’S FIGHT!'}</button>}</>}
 {mode==='paused'&&<button className="primary-button" onClick={()=>setMode('playing')}>Resume</button>}{mode==='round'&&<button className="primary-button" onClick={nextRound}>Next round</button>}{mode==='over'&&<button className="primary-button" onClick={start}>Play again</button>}
 </section></div>}
 </main></div>;
}
