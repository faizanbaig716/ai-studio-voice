export type VoiceId = "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";

export type GenerationMode = "single" | "dialogue";

export type ModelTier = "lite" | "studio";

export type BitrateKbps = 128 | 192 | 320;

export interface VoiceProfile {
  id: VoiceId;
  name: string;
  timbre: string;
  register: string;
  bestFor: string;
  sampleLine: string;
  defaultStyle: string;
}

export interface DialogueTurn {
  id: string;
  speaker: "speaker1" | "speaker2";
  text: string;
}

export interface SpeakerSettings {
  name: string;
  voiceName: VoiceId;
  style: string;
}

export interface SampleScript {
  id: string;
  label: string;
  mode: GenerationMode;
  style: string;
  text?: string;
  speaker1?: SpeakerSettings;
  speaker2?: SpeakerSettings;
  turns?: Array<{ speaker: "speaker1" | "speaker2"; text: string }>;
}

export interface GeneratedClip {
  id: string;
  title: string;
  mode: GenerationMode;
  voiceLabel: string;
  styleLabel: string;
  scriptPreview: string;
  mp3Base64: string;
  wavBase64: string;
  durationSeconds: number;
  mp3SizeBytes: number;
  wavSizeBytes: number;
  bitrateKbps: BitrateKbps;
  sampleRate: number;
  modelUsed: string;
  createdAt: number;
  waveformPeaks: number[];
}
