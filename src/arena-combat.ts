import arena from './generated/arena.json';
export type Action = 'idle'|'walk'|'light'|'heavy'|'special'|'block'|'hurt'|'defeated'|'celebrate';
export type Fighter = {x:number;hp:number;action:Action;age:number;hit:boolean;damageAt:number;specialAt:number};
export const moves = arena.moves;
export const fighter=(x:number,hp=100):Fighter=>({x,hp,action:'idle',age:0,hit:false,damageAt:-100,specialAt:-10});
export const busy=(f:Fighter)=> !['idle','walk','block'].includes(f.action);
export function act(f:Fighter,a:Action,time:number) {if(busy(f)||f.hp<=0||(a==='special'&&time-f.specialAt<5))return false;f.action=a;f.age=0;f.hit=false;if(a==='special')f.specialAt=time;return true;}
export function impact(a:Fighter,b:Fighter,time:number):'block'|'whiff'|'hit_light'|'hit_heavy'|'hit_special'|null {
 if(!(a.action in moves)||a.hit)return null;
 const key=a.action as keyof typeof moves,m=moves[key];if(a.age<m.impact)return null;a.hit=true;
 if(Math.abs(a.x-b.x)>m.range)return 'whiff';if(b.action==='block')return 'block';
 b.hp=Math.max(0,b.hp-m.damage);b.damageAt=time;b.action=b.hp?'hurt':'defeated';b.age=0;b.hit=false;
 b.x=Math.max(arena.bounds.left,Math.min(arena.bounds.right,b.x+(b.x>a.x?1:-1)*18));return `hit_${key}`;
}
export function advance(f:Fighter,dt:number){f.age+=dt;const duration=f.action in moves?moves[f.action as keyof typeof moves].duration:f.action==='hurt'?0.35:Infinity;if(f.age>=duration){f.action='idle';f.age=0;}}
