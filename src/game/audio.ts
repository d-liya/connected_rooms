import { AudioController } from "../core/audio/AudioController";
import { ACTIVE_GAME } from "./activeGame";

export function createGameAudio(): AudioController {
  return new AudioController(ACTIVE_GAME.assets.audio);
}

export type { AudioController } from "../core/audio/AudioController";
