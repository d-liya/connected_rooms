export interface AudioClipDefinition {
  src: string;
  volume: number;
}

export interface AudioManifest {
  music: AudioClipDefinition;
  ambience: AudioClipDefinition;
  secondaryLoop?: AudioClipDefinition;
  sfx: Record<string, AudioClipDefinition>;
  voices: {
    root: string;
    extension: string;
    volume: number;
    duckedMusicVolume: number;
  };
}

interface ActiveLoop {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

// Manifest-driven audio over the Web Audio API. Every clip is fetched and
// decoded once, then cached as an AudioBuffer: starting music never races an
// unloaded file, and rapid sounds (footsteps) replay from memory instead of
// creating a new element, request, and decoder each time. All playback goes
// through one master gain (mute) with a dedicated music bus (voice ducking).
export class AudioController {
  private readonly manifest: AudioManifest;
  private muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private loops = new Map<"music" | "ambience" | "secondary", ActiveLoop>();
  private eventLoops = new Map<string, { token: number; loop: ActiveLoop }>();
  private eventLoopTokens = new Map<string, number>();
  private eventLoopSeq = 0;
  private voice: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private voicePriority = 0;
  private voiceSeq = 0;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private lastPlayed = new Map<string, number>();
  private warned = new Set<string>();
  private loopsWanted = false;
  private secondaryActive = false;
  private ducked = false;
  private preloadStarted = false;

  constructor(manifest: AudioManifest) {
    this.manifest = manifest;
  }

  // Fetch and decode loops plus one-shot effects in the background, ideally
  // from the title screen, so gameplay sounds play from memory. Voices stay
  // on demand (dozens of files) and join the same cache on first use.
  // Reports (loaded, total) as each clip settles so a loading bar can track
  // progress; failures count as settled so loading always completes.
  preload(onProgress?: (loaded: number, total: number) => void): void {
    if (this.preloadStarted) return;
    this.preloadStarted = true;
    const manifest = this.manifest;
    const jobs: Array<Promise<unknown>> = [];
    if (manifest.secondaryLoop) {
      jobs.push(this.loadBuffer("loop:secondary", manifest.secondaryLoop.src));
    }
    jobs.push(
      this.loadBuffer("loop:music", manifest.music.src),
      this.loadBuffer("loop:ambience", manifest.ambience.src),
      ...Object.entries(manifest.sfx).map(([name, clip]) =>
        this.loadBuffer(`sfx:${name}`, clip.src),
      ),
    );
    const total = jobs.length;
    if (!this.context()) {
      onProgress?.(total, total);
      return;
    }
    let loaded = 0;
    onProgress?.(0, total);
    for (const job of jobs) {
      void job.then(() => {
        loaded += 1;
        onProgress?.(loaded, total);
      });
    }
  }

  start(): void {
    this.loopsWanted = true;
    this.unlock();
  }

  // Re-assert the currently intended loops. Safe from any gesture or
  // foreground return: resumes the context and starts anything still
  // decoding or interrupted. Never starts audio that was not wanted
  // (title screen stays silent until start()).
  unlock(): void {
    const ctx = this.context();
    if (!ctx) return;
    void ctx.resume().catch(() => undefined);
    if (!this.loopsWanted || this.muted) return;
    this.startLoop("music", this.manifest.music);
    this.startLoop("ambience", this.manifest.ambience);
    if (this.secondaryActive && this.manifest.secondaryLoop) {
      this.startLoop("secondary", this.manifest.secondaryLoop);
    }
  }

  setSecondaryLoop(active: boolean): void {
    this.secondaryActive = active;
    if (!this.manifest.secondaryLoop) return;
    if (active && this.loopsWanted && !this.muted) {
      this.startLoop("secondary", this.manifest.secondaryLoop);
      return;
    }
    this.stopLoop("secondary");
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
    if (!muted) this.unlock();
  }

  play(name: string, cooldownMs = 0, cooldownGroup?: string): void {
    if (this.muted) return;
    const clip = this.manifest.sfx[name];
    if (!clip) return;
    const now = performance.now();
    const cooldownKey = cooldownGroup ?? name;
    const previous = this.lastPlayed.get(cooldownKey) ?? -Infinity;
    if (now - previous < cooldownMs) return;
    this.lastPlayed.set(cooldownKey, now);

    const ctx = this.context();
    if (!ctx || !this.master) return;
    void this.loadBuffer(`sfx:${name}`, clip.src).then((buffer) => {
      if (!buffer || !this.ctx || !this.master) return;
      const gain = this.ctx.createGain();
      gain.gain.value = clip.volume;
      gain.connect(this.master);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.onended = () => gain.disconnect();
      source.start();
    });
  }

  playVoice(id: string, options?: { priority?: number; cooldownMs?: number }): void {
    if (this.muted) return;
    const priority = options?.priority ?? 0;
    if (this.voice && priority < this.voicePriority) return;
    const now = performance.now();
    const cooldownKey = `voice:${id}`;
    if (now - (this.lastPlayed.get(cooldownKey) ?? -Infinity) < (options?.cooldownMs ?? 0)) return;
    this.lastPlayed.set(cooldownKey, now);
    const ctx = this.context();
    if (!ctx || !this.master) return;
    this.stopVoice();
    const seq = ++this.voiceSeq;
    const { root, extension, volume } = this.manifest.voices;
    this.setDucked(true);
    void this.loadBuffer(`voice:${id}`, `${root}/${id}.${extension}`).then((buffer) => {
      if (seq !== this.voiceSeq) return;
      if (!buffer || !this.ctx || !this.master) {
        this.setDucked(false);
        return;
      }
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      gain.connect(this.master);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      this.voice = { source, gain };
      this.voicePriority = priority;
      source.onended = () => {
        gain.disconnect();
        if (this.voice?.source === source) {
          this.voice = null;
          this.voicePriority = 0;
        }
        this.setDucked(false);
      };
      source.start();
    });
  }

  /**
   * Event-owned short loop from the sfx dictionary (beam hum, rally bed).
   * Games start it on the loop's start event and stop it on the stop event;
   * unlike ambience it never persists beyond its owner. Returns a generation
   * token: stale completions and stale stops never affect a newer start.
   */
  startEventLoop(id: string, sfxName: string): number {
    const token = ++this.eventLoopSeq;
    this.eventLoopTokens.set(id, token);
    this.stopLiveEventLoop(id);
    const clip = this.manifest.sfx[sfxName];
    if (!clip) {
      this.warnOnce(`event-loop:${id}`, sfxName, new Error(`Unknown event-loop clip: ${sfxName}`));
      return token;
    }
    const ctx = this.context();
    if (!ctx || !this.master || this.muted) return token;
    void this.loadBuffer(`event:${id}:${token}`, clip.src).then((buffer) => {
      if (!buffer || !this.ctx || !this.master) return;
      if (this.eventLoopTokens.get(id) !== token) return;
      const gain = this.ctx.createGain();
      gain.gain.value = clip.volume;
      gain.connect(this.master);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      this.eventLoops.set(id, { token, loop: { source, gain } });
    });
    return token;
  }

  /**
   * Stop an event-owned loop. With a token, stops only when it still matches
   * the latest start; without one, stops unconditionally.
   */
  stopEventLoop(id: string, token?: number): void {
    if (token !== undefined && this.eventLoopTokens.get(id) !== token) return;
    this.eventLoopTokens.delete(id);
    this.stopLiveEventLoop(id);
  }

  stopAllEventLoops(): void {
    this.eventLoopTokens.clear();
    for (const id of [...this.eventLoops.keys()]) this.stopLiveEventLoop(id);
  }

  /**
   * Restrained procedural UI cue on the shared context/mixer for activations
   * with no suitable supplied sound. Never layered over an existing cue.
   */
  playUiClick(kind: "confirm" | "back" | "toggle" = "confirm"): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx || !this.master) return;
    void ctx.resume().catch(() => undefined);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "back" ? 330 : kind === "toggle" ? 520 : 660;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  stop(): void {
    this.loopsWanted = false;
    this.secondaryActive = false;
    this.setDucked(false);
    for (const kind of ["music", "ambience", "secondary"] as const) this.stopLoop(kind);
    this.stopAllEventLoops();
    this.stopVoice();
  }

  private startLoop(
    kind: "music" | "ambience" | "secondary",
    clip: AudioClipDefinition,
  ): void {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    if (this.loops.has(kind)) return;
    void this.loadBuffer(`loop:${kind}`, clip.src).then((buffer) => {
      if (!buffer || !this.ctx || !this.master || this.loops.has(kind)) return;
      if (kind === "secondary" && !this.secondaryActive) return;
      if (kind !== "secondary" && !this.loopsWanted) return;
      const gain = this.ctx.createGain();
      gain.gain.value = kind === "music" && this.ducked
        ? this.manifest.voices.duckedMusicVolume
        : clip.volume;
      gain.connect(this.master);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      this.loops.set(kind, { source, gain });
    });
  }

  private stopLoop(kind: "music" | "ambience" | "secondary"): void {
    const loop = this.loops.get(kind);
    if (!loop) return;
    this.loops.delete(kind);
    try {
      loop.source.stop();
    } catch {
      // Already stopped: fall through to disconnect.
    }
    loop.source.disconnect();
    loop.gain.disconnect();
  }

  private stopLiveEventLoop(id: string): void {
    const live = this.eventLoops.get(id);
    if (!live) return;
    this.eventLoops.delete(id);
    try {
      live.loop.source.stop();
    } catch {
      // Already stopped: fall through to disconnect.
    }
    live.loop.source.disconnect();
    live.loop.gain.disconnect();
  }

  private stopVoice(): void {
    this.voiceSeq++;
    const voice = this.voice;
    if (!voice) return;
    this.voice = null;
    this.voicePriority = 0;
    try {
      voice.source.stop();
    } catch {
      // Already stopped: fall through to disconnect.
    }
    voice.source.disconnect();
    voice.gain.disconnect();
  }

  private setDucked(ducked: boolean): void {
    this.ducked = ducked;
    const music = this.loops.get("music");
    if (music && this.ctx) {
      music.gain.gain.setTargetAtTime(
        ducked ? this.manifest.voices.duckedMusicVolume : this.manifest.music.volume,
        this.ctx.currentTime,
        0.08,
      );
    }
  }

  private loadBuffer(key: string, src: string): Promise<AudioBuffer | null> {
    const hit = this.buffers.get(key);
    if (hit) return hit;
    const ctx = this.context();
    if (!ctx) return Promise.resolve(null);
    const pending = fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .catch((error: unknown) => {
        this.buffers.delete(key);
        this.warnOnce(key, src, error);
        return null;
      });
    this.buffers.set(key, pending);
    return pending;
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      this.warnOnce("context", "webaudio", new Error("AudioContext is not available"));
      return null;
    }
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  private warnOnce(key: string, src: string, error: unknown): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(`[audio] playback failed for ${src}:`, error);
  }
}

export interface VoiceLine {
  id: string;
  text: string;
}

export type VoiceBanks = Record<string, readonly VoiceLine[]>;

export function pickVoice(banks: VoiceBanks, bank: string): VoiceLine {
  const lines = banks[bank];
  if (!lines?.length) throw new Error(`Missing voice bank: ${bank}`);
  return lines[Math.floor(Math.random() * lines.length)];
}
