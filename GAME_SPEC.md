# Griffin Street Brawl playtest

Single-screen Peter versus AI Stewie. Best of three 60-second rounds. A/D or arrows move; J light, K heavy, L special, hold Space to block. Touch: stage drag plus four actions. Escape pauses; restart is available while playing or paused. All generated clips are retained, with action clocks driving playback. Shared core and styles.css are unchanged. The stage retains MapViewport input but uses arena-local CSS to contain the complete stage in portrait and landscape, keeping both fighters visible. Shared camera code is unchanged.

## Known asset defects
Stewie mixed/front-facing clips and duplicated heavy-attack body are deliberately included for this user-requested prototype. Walk repeats at runtime despite the source clip not being loop-ready. No production validation rules have been weakened. These are provisional gameplay timings and collision distances, not a finished arena template.

## Run
npm run dev -- --host 127.0.0.1 --port 55447
npm run typecheck
npm run build

Local analytics are disabled in .env.local. Existing CDN media is used without generation calls.
