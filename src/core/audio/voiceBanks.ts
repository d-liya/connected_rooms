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
