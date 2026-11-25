import type { SampleScript, VoiceProfile } from "../types/voice";

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "Kore",
    name: "Kore",
    timbre: "Warm & balanced",
    register: "Mid-alto",
    bestFor: "Narration, explainers, product demos",
    sampleLine:
      "Welcome to Cadence Studio. Every phrase is mastered for crisp clarity and instant MP3 export.",
    defaultStyle: "Warm, articulate studio narrator",
  },
  {
    id: "Puck",
    name: "Puck",
    timbre: "Bright & energetic",
    register: "Tenor",
    bestFor: "Podcast intros, promos, upbeat hooks",
    sampleLine:
      "Hey everyone, welcome back to the show! Today we are breaking down the fastest way to ship great audio.",
    defaultStyle: "Upbeat, conversational host",
  },
  {
    id: "Charon",
    name: "Charon",
    timbre: "Deep & authoritative",
    register: "Baritone",
    bestFor: "Documentaries, trailers, news briefs",
    sampleLine:
      "Across three thousand miles of open ocean, a quiet signal begins to map the unseen floor below.",
    defaultStyle: "Measured, authoritative documentary voice",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    timbre: "Resonant & bold",
    register: "Low-mid",
    bestFor: "Audiobooks, character reads, announcements",
    sampleLine:
      "The lantern flickered once at the edge of the ridge, and the long march finally began.",
    defaultStyle: "Grounded, expressive storyteller",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    timbre: "Smooth & airy",
    register: "Soft soprano",
    bestFor: "Guided calm, customer care, tutorials",
    sampleLine:
      "Take a slow, steady breath in, and let your shoulders settle as we begin today's walkthrough.",
    defaultStyle: "Calm, reassuring guide",
  },
];

export const STYLE_PRESETS: string[] = [
  "Clear, professional news anchor",
  "Warm documentary narrator",
  "Energetic podcast host",
  "Calm guided tutorial voice",
  "Dramatic audiobook reader",
  "Crisp commercial announcer",
];

export const SAMPLE_SCRIPTS: SampleScript[] = [
  {
    id: "launch-spot",
    label: "Product Launch",
    mode: "single",
    style: "Crisp, modern product keynote presenter",
    text: "Introducing a cleaner way to produce studio narration. Type your script, shape the delivery style, and export broadcast-ready MP3 audio in seconds.",
  },
  {
    id: "documentary",
    label: "Documentary",
    mode: "single",
    style: "Warm, measured documentary narrator",
    text: "Long before satellites mapped every coastline, navigators read the ocean through swell patterns, starlight, and memory passed down across generations.",
  },
  {
    id: "podcast-duo",
    label: "Podcast Dialogue",
    mode: "dialogue",
    style: "Natural two-host conversation",
    speaker1: {
      name: "Alex",
      voiceName: "Puck",
      style: "Enthusiastic, bright podcast host",
    },
    speaker2: {
      name: "Maya",
      voiceName: "Kore",
      style: "Curious, articulate co-host",
    },
    turns: [
      {
        speaker: "speaker1",
        text: "Welcome back! <breath> Today we are testing dual-speaker voice generation right inside the studio.",
      },
      {
        speaker: "speaker2",
        text: "Honestly, |yeah| the pacing feels remarkably natural when you can direct each speaker's tone separately.",
      },
      {
        speaker: "speaker1",
        text: "And the best part is downloading the finished episode straight to MP3 with one click.",
      },
    ],
  },
  {
    id: "calm-guide",
    label: "Guided Tutorial",
    mode: "single",
    style: "Calm, unhurried instructional guide",
    text: "Step one: paste your draft into the script editor. Step two: choose a voice and delivery direction. When the waveform settles, download your MP3 file.",
  },
];

export const EXPRESSIVE_TAGS = [
  { tag: "<breath>", label: "Breath", modes: ["single", "dialogue"] as const },
  { tag: "<laugh>", label: "Laugh", modes: ["single", "dialogue"] as const },
  { tag: "<gasp>", label: "Gasp", modes: ["single", "dialogue"] as const },
  { tag: "|yeah|", label: "|yeah|", modes: ["dialogue"] as const },
  { tag: "|mhm|", label: "|mhm|", modes: ["dialogue"] as const },
];
