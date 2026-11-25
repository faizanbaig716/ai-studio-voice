import { useState } from "react";
import { ScriptStudio } from "./components/ScriptStudio";
import { SessionHistory } from "./components/SessionHistory";
import { TopBar, type ActiveSection } from "./components/TopBar";
import { VoiceDirectoryPanel } from "./components/VoiceDirectoryPanel";
import { WaveformPlayer } from "./components/WaveformPlayer";
import { SAMPLE_SCRIPTS } from "./data/voices";
import type {
  BitrateKbps,
  DialogueTurn,
  GeneratedClip,
  GenerationMode,
  ModelTier,
  SampleScript,
  SpeakerSettings,
  VoiceId,
} from "./types/voice";
import { extractWaveformPeaks } from "./utils/audio";

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("studio");
  const [mode, setMode] = useState<GenerationMode>("single");

  const [clipTitle, setClipTitle] = useState("Product launch intro");
  const [singleText, setSingleText] = useState(
    SAMPLE_SCRIPTS[0].text ?? ""
  );
  const [voiceName, setVoiceName] = useState<VoiceId>("Kore");
  const [styleDirection, setStyleDirection] = useState(
    SAMPLE_SCRIPTS[0].style
  );
  const [modelTier, setModelTier] = useState<ModelTier>("lite");
  const [bitrateKbps, setBitrateKbps] = useState<BitrateKbps>(192);

  const [speaker1, setSpeaker1] = useState<SpeakerSettings>({
    name: "Alex",
    voiceName: "Puck",
    style: "Enthusiastic, bright podcast host",
  });
  const [speaker2, setSpeaker2] = useState<SpeakerSettings>({
    name: "Maya",
    voiceName: "Kore",
    style: "Curious, articulate co-host",
  });
  const [turns, setTurns] = useState<DialogueTurn[]>([
    {
      id: "turn-1",
      speaker: "speaker1",
      text: "Welcome back! <breath> Today we are testing dual-speaker voice generation right inside the studio.",
    },
    {
      id: "turn-2",
      speaker: "speaker2",
      text: "Honestly, |yeah| the pacing feels remarkably natural when you can direct each speaker's tone separately.",
    },
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const activeClip = clips.find((c) => c.id === activeClipId) ?? clips[0] ?? null;

  const deriveClipTitle = (): string => {
    const trimmedTitle = clipTitle.trim();
    if (trimmedTitle) return trimmedTitle;

    const rawSource =
      mode === "single"
        ? singleText.trim()
        : turns.map((t) => t.text.trim()).find(Boolean) ?? "Dialogue clip";
    const words = rawSource.split(/\s+/).slice(0, 5).join(" ");
    return words || "Voice clip";
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const payload =
        mode === "single"
          ? {
              mode: "single" as const,
              text: singleText,
              voiceName,
              style: styleDirection,
              modelTier,
              bitrateKbps,
            }
          : {
              mode: "dialogue" as const,
              speaker1,
              speaker2,
              turns: turns.map((t) => ({
                speaker: t.speaker === "speaker1" ? speaker1.name : speaker2.name,
                text: t.text,
              })),
              bitrateKbps,
            };

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Voice generation failed.");
      }

      const waveformPeaks = await extractWaveformPeaks(data.wavBase64, 72);
      const id = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const title = deriveClipTitle();
      const voiceLabel =
        mode === "single"
          ? voiceName
          : `${speaker1.name || "Speaker 1"} & ${speaker2.name || "Speaker 2"}`;

      const newClip: GeneratedClip = {
        id,
        title,
        mode,
        voiceLabel,
        styleLabel:
          mode === "single"
            ? styleDirection || "Natural studio delivery"
            : "Dual-speaker dialogue",
        scriptPreview:
          mode === "single"
            ? singleText.slice(0, 120)
            : turns.map((t) => t.text).join(" ").slice(0, 120),
        mp3Base64: data.mp3Base64,
        wavBase64: data.wavBase64,
        durationSeconds: data.durationSeconds,
        mp3SizeBytes: data.mp3SizeBytes,
        wavSizeBytes: data.wavSizeBytes,
        bitrateKbps: data.bitrateKbps,
        sampleRate: data.sampleRate,
        modelUsed: data.modelUsed,
        createdAt: Date.now(),
        waveformPeaks,
      };

      setClips((prev) => [newClip, ...prev]);
      setActiveClipId(id);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Unable to synthesize voice audio. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySample = (sample: SampleScript) => {
    setErrorMessage(null);
    setMode(sample.mode);
    setClipTitle(sample.label);
    if (sample.mode === "single") {
      setSingleText(sample.text ?? "");
      setStyleDirection(sample.style);
    } else {
      if (sample.speaker1) setSpeaker1(sample.speaker1);
      if (sample.speaker2) setSpeaker2(sample.speaker2);
      if (sample.turns) {
        setTurns(
          sample.turns.map((t, idx) => ({
            id: `sample-turn-${Date.now()}-${idx}`,
            speaker: t.speaker,
            text: t.text,
          }))
        );
      }
    }
    setActiveSection("studio");
  };

  const handleNewScript = () => {
    setErrorMessage(null);
    setActiveSection("studio");
    setClipTitle("");
    if (mode === "single") {
      setSingleText("");
    } else {
      setTurns([
        {
          id: `turn-${Date.now()}`,
          speaker: "speaker1",
          text: "",
        },
      ]);
    }
  };

  const handleDeleteClip = (clipId: string) => {
    setClips((prev) => {
      const remaining = prev.filter((c) => c.id !== clipId);
      if (activeClipId === clipId) {
        setActiveClipId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <TopBar
        activeSection={activeSection}
        mode={mode}
        historyCount={clips.length}
        onSelectSingleVoice={() => {
          setMode("single");
          setActiveSection("studio");
        }}
        onSelectDualDialogue={() => {
          setMode("dialogue");
          setActiveSection("studio");
        }}
        onSelectDirectory={() => setActiveSection("directory")}
        onSelectHistory={() => setActiveSection("history")}
        onNewScript={handleNewScript}
      />

      <main className="flex-1">
        {activeSection === "directory" ? (
          <VoiceDirectoryPanel
            selectedVoice={voiceName}
            onSelectVoice={(v) => setVoiceName(v)}
            onUseInStudio={(v, defaultStyle) => {
              setVoiceName(v);
              setStyleDirection(defaultStyle);
              setMode("single");
              setActiveSection("studio");
            }}
          />
        ) : activeSection === "history" ? (
          <div className="max-w-[1160px] mx-auto px-6 lg:px-10 py-8 space-y-6">
            <div className="pb-4 border-b border-slate-200">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Export History
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Play back generated voice clips and download any clip as an MP3 or WAV file.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5">
                <WaveformPlayer
                  clip={activeClip}
                  isGenerating={isGenerating}
                  onLoadSample={() => handleApplySample(SAMPLE_SCRIPTS[0])}
                />
              </div>
              <div className="lg:col-span-7">
                <SessionHistory
                  clips={clips}
                  activeClipId={activeClip?.id ?? null}
                  onSelectClip={(clip) => setActiveClipId(clip.id)}
                  onDeleteClip={handleDeleteClip}
                  onClearAll={() => {
                    setClips([]);
                    setActiveClipId(null);
                  }}
                  expanded
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Text to Voice Studio
                </h1>
                <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                  Turn scripts and dual-speaker dialogue into natural studio speech,
                  preview the waveform, and download ready-to-share MP3 files.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 xl:col-span-7">
                <ScriptStudio
                  mode={mode}
                  onModeChange={setMode}
                  clipTitle={clipTitle}
                  onClipTitleChange={setClipTitle}
                  singleText={singleText}
                  onSingleTextChange={setSingleText}
                  voiceName={voiceName}
                  onVoiceNameChange={setVoiceName}
                  styleDirection={styleDirection}
                  onStyleDirectionChange={setStyleDirection}
                  modelTier={modelTier}
                  onModelTierChange={setModelTier}
                  bitrateKbps={bitrateKbps}
                  onBitrateChange={setBitrateKbps}
                  speaker1={speaker1}
                  onSpeaker1Change={setSpeaker1}
                  speaker2={speaker2}
                  onSpeaker2Change={setSpeaker2}
                  turns={turns}
                  onTurnsChange={setTurns}
                  isGenerating={isGenerating}
                  errorMessage={errorMessage}
                  onGenerate={handleGenerate}
                  onApplySample={handleApplySample}
                />
              </div>

              <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                <WaveformPlayer
                  clip={activeClip}
                  isGenerating={isGenerating}
                  onLoadSample={() => handleApplySample(SAMPLE_SCRIPTS[0])}
                />

                <SessionHistory
                  clips={clips}
                  activeClipId={activeClip?.id ?? null}
                  onSelectClip={(clip) => setActiveClipId(clip.id)}
                  onDeleteClip={handleDeleteClip}
                  onClearAll={() => {
                    setClips([]);
                    setActiveClipId(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Cadence Studio</span>
          <span>24 kHz Voice Synthesis · MP3 &amp; WAV Export</span>
        </div>
      </footer>
    </div>
  );
}
