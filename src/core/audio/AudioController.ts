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

export class AudioController {
  private readonly manifest: AudioManifest;
  private muted = false;
  private music: HTMLAudioElement | null = null;
  private ambience: HTMLAudioElement | null = null;
  private secondary: HTMLAudioElement | null = null;
  private secondaryActive = false;
  private voice: HTMLAudioElement | null = null;
  private lastPlayed = new Map<string, number>();

  constructor(manifest: AudioManifest) {
    this.manifest = manifest;
  }

  start(): void {
    if (!this.music) {
      this.music = this.createLoop(this.manifest.music);
      this.ambience = this.createLoop(this.manifest.ambience);
      if (this.manifest.secondaryLoop) {
        this.secondary = this.createLoop(this.manifest.secondaryLoop);
      }
    }
    if (this.muted) return;
    void this.music?.play().catch(() => undefined);
    void this.ambience?.play().catch(() => undefined);
    if (this.secondaryActive) void this.secondary?.play().catch(() => undefined);
  }

  setSecondaryLoop(active: boolean): void {
    this.secondaryActive = active;
    if (active && !this.muted) {
      void this.secondary?.play().catch(() => undefined);
      return;
    }
    this.secondary?.pause();
    if (this.secondary) this.secondary.currentTime = 0;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.music?.pause();
      this.ambience?.pause();
      this.secondary?.pause();
      this.voice?.pause();
      return;
    }
    this.restoreMusicVolume();
    this.start();
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

    const audio = new Audio(clip.src);
    audio.volume = clip.volume;
    void audio.play().catch(() => undefined);
  }

  playVoice(id: string): void {
    if (this.muted) return;
    this.voice?.pause();
    const { root, extension, volume, duckedMusicVolume } = this.manifest.voices;
    const voice = new Audio(`${root}/${id}.${extension}`);
    voice.volume = volume;
    voice.preload = "auto";
    this.voice = voice;
    if (this.music) this.music.volume = duckedMusicVolume;
    voice.addEventListener(
      "ended",
      () => {
        if (!this.muted) this.restoreMusicVolume();
        if (this.voice === voice) this.voice = null;
      },
      { once: true },
    );
    void voice.play().catch(() => this.restoreMusicVolume());
  }

  stop(): void {
    for (const track of [this.music, this.ambience, this.secondary, this.voice]) {
      track?.pause();
      if (track) track.currentTime = 0;
    }
    this.restoreMusicVolume();
    this.secondaryActive = false;
    this.voice = null;
  }

  private createLoop(clip: AudioClipDefinition): HTMLAudioElement {
    const audio = new Audio(clip.src);
    audio.loop = true;
    audio.volume = clip.volume;
    audio.preload = "auto";
    return audio;
  }

  private restoreMusicVolume(): void {
    if (this.music) this.music.volume = this.manifest.music.volume;
  }
}
