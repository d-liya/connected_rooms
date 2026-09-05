import type { AudioManifest } from "../core/audio/AudioController";

const sfx = (name: string, extension: "mp3" | "wav", volume: number) => ({
  src: `/assets/audio/sfx/${name}.${extension}`,
  volume,
});

export const MARLINSPIKE_AUDIO: AudioManifest = {
  music: { src: "/assets/audio/music.mp3", volume: 0.18 },
  ambience: { src: "/assets/audio/ambience.wav", volume: 0.08 },
  secondaryLoop: { src: "/assets/audio/radio.wav", volume: 0.06 },
  voices: {
    root: "/assets/audio/voices",
    extension: "wav",
    volume: 0.78,
    duckedMusicVolume: 0.08,
  },
  sfx: {
    clue: sfx("clue", "wav", 0.38),
    hide: sfx("hide", "mp3", 0.22),
    suspicion: sfx("suspicion", "wav", 0.27),
    clear: sfx("clear", "wav", 0.18),
    detected: sfx("detected", "wav", 0.48),
    caught: sfx("caught", "wav", 0.32),
    lock: sfx("lock", "mp3", 0.36),
    open: sfx("open", "wav", 0.48),
    victory: sfx("victory", "mp3", 0.55),
    door: sfx("door", "wav", 0.34),
    turn: sfx("turn", "mp3", 0.16),
    "step-1": sfx("step-1", "mp3", 0.08),
    "step-2": sfx("step-2", "mp3", 0.08),
    "step-3": sfx("step-3", "mp3", 0.08),
    "step-4": sfx("step-4", "mp3", 0.08),
    "guard-step-1": sfx("guard-step-1", "mp3", 0.11),
    "guard-step-2": sfx("guard-step-2", "mp3", 0.11),
    "guard-step-3": sfx("guard-step-3", "mp3", 0.11),
    "guard-step-4": sfx("guard-step-4", "mp3", 0.11),
  },
};
