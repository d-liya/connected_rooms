import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, afterAll } from 'bun:test';
const GAME_SDK_SOURCE = await readFile(new URL('../src/sdk.ts', import.meta.url), 'utf8');
const js = new Bun.Transpiler({loader:'ts'}).transformSync(GAME_SDK_SOURCE);
const directory=await mkdtemp(join(tmpdir(),'game-sdk-test-'));
const path=join(directory,'sdk.mjs');await writeFile(path,js);
const {createGameSDK}=await import(path);
afterAll(()=>rm(directory,{recursive:true,force:true}));

function service() {
 const rooms=new Map<string,{state:Record<string,unknown>;version:number;players:Set<string>}>();
 let guestCalls=0,stateReads=0,updates=0;
 function host(userId:string){return {gameId:'game',GameServerClient:class {
  signedIn=false;
  async getSession(){if(!this.signedIn)throw {status:401};return {user:{id:userId,name:userId}};}
  async signInGuest(){guestCalls++;await Promise.resolve();this.signedIn=true;return {user:{id:userId,name:userId}};}
  async joinRoom(_game:string,id:string){let r=rooms.get(id);if(!r){r={state:{},version:0,players:new Set()};rooms.set(id,r);}r.players.add(userId);return {state:{state:r.state,version:r.version}};}
  async leaveRoom(_game:string,id:string){rooms.get(id)?.players.delete(userId);}
  async getRoomState(_game:string,id:string){stateReads++;const r=rooms.get(id)!;return {state:r.state,version:r.version};}
  async updateRoomState(_game:string,id:string,state:Record<string,unknown>,version:number){const r=rooms.get(id)!;if(r.version!==version)throw {status:409};updates++;r.state=state;r.version++;return {state:r.state,version:r.version};}
  async getRoomPresence(_game:string,id:string){return {players:[...rooms.get(id)!.players].map(userId=>({userId,metadata:{}}))};}
  async getSave(){throw {status:404};}
 }};}
 return {host,stats:()=>({guestCalls,stateReads,updates})};
}

test('two clients join, synchronize, reject stale writes and leave',async()=>{
 const s=service(),a=createGameSDK(s.host('a')),b=createGameSDK(s.host('b'));
 await Promise.all([a.multiplayer.joinRoom('duel'),b.multiplayer.joinRoom('duel')]);
 expect((await a.multiplayer.getRoomPlayers()).length).toBe(2);
 await a.multiplayer.updateRoomState({turn:'b',score:1});
 await expect(b.multiplayer.updateRoomState({turn:'a',score:9})).rejects.toMatchObject({status:409});
 expect(await b.multiplayer.getRoomState()).toEqual({turn:'b',score:1});
 await b.multiplayer.updateRoomState({turn:'a',score:2});
 expect(await a.multiplayer.getRoomState()).toEqual({turn:'a',score:2});
 await b.multiplayer.leaveRoom();
 expect((await a.multiplayer.getRoomPlayers()).length).toBe(1);
 await expect(b.multiplayer.getRoomState()).rejects.toThrow('Join a room');
 expect(s.stats().updates).toBe(2);
});

test('concurrent service requests share guest initialization and missing save is null',async()=>{
 const s=service(),sdk=createGameSDK(s.host('a'));
 await Promise.all([sdk.auth.ensureGuestSession(),sdk.auth.ensureGuestSession(),sdk.save.loadGameData()]);
 expect(s.stats().guestCalls).toBe(1);
 expect(await sdk.save.loadGameData()).toBeNull();
});

test('subscription cleanup suppresses in-flight callbacks',async()=>{
 const s=service(),sdk=createGameSDK(s.host('a'));await sdk.multiplayer.joinRoom('duel');
 let calls=0;const stop=sdk.multiplayer.subscribe(()=>{calls++;},()=>{calls++;});stop();
 await sdk.multiplayer.getRoomState();expect(calls).toBe(0);
});

test('missing hosted configuration fails explicitly',async()=>{
 await expect(createGameSDK({}).auth.ensureGuestSession()).rejects.toThrow('game ID');
});
