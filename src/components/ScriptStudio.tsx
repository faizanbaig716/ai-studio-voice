import React, { useRef } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  EXPRESSIVE_TAGS,
  SAMPLE_SCRIPTS,
  STYLE_PRESETS,
  VOICE_PROFILES,
} from "../data/voices";
import type {
  BitrateKbps,
  DialogueTurn,
  GenerationMode,
  ModelTier,
  SampleScript,
  SpeakerSettings,
  VoiceId,
} from "../types/voice";

interface ScriptStudioProps {
  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  clipTitle: string;
  onClipTitleChange: (title: string) => void;
  singleText: string;
  onSingleTextChange: (text: string) => void;
  voiceName: VoiceId;
  onVoiceNameChange: (voice: VoiceId) => void;
  styleDirection: string;
  onStyleDirectionChange: (style: string) => void;
  modelTier: ModelTier;
  onModelTierChange: (tier: ModelTier) => void;
  bitrateKbps: BitrateKbps;
  onBitrateChange: (bitrate: BitrateKbps) => void;
  speaker1: SpeakerSettings;
  onSpeaker1Change: (speaker: SpeakerSettings) => void;
  speaker2: SpeakerSettings;
  onSpeaker2Change: (speaker: SpeakerSettings) => void;
  turns: DialogueTurn[];
  onTurnsChange: (turns: DialogueTurn[]) => void;
  isGenerating: boolean;
  errorMessage: string | null;
  onGenerate: () => void;
  onApplySample: (sample: SampleScript) => void;
}

const BITRATES: BitrateKbps[] = [128, 192, 320];

export const ScriptStudio: React.FC<ScriptStudioProps> = ({
  mode,
  onModeChange,
  clipTitle,
  onClipTitleChange,
  singleText,
  onSingleTextChange,
  voiceName,
  onVoiceNameChange,
  styleDirection,
  onStyleDirectionChange,
  modelTier,
  onModelTierChange,
  bitrateKbps,
  onBitrateChange,
  speaker1,
  onSpeaker1Change,
  speaker2,
  onSpeaker2Change,
  turns,
  onTurnsChange,
  isGenerating,
  errorMessage,
  onGenerate,
  onApplySample,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeTurnRef = useRef<{ id: string; el: HTMLInputElement | null }>({
    id: "",
    el: null,
  });

  const characterCount =
    mode === "single"
      ? singleText.length
      : turns.reduce((acc, t) => acc + t.text.length, 0);

  const wordCount =
    mode === "single"
      ? singleText.trim().split(/\s+/).filter(Boolean).length
      : turns
          .map((t) => t.text.trim())
          .join(" ")
          .split(/\s+/)
          .filter(Boolean).length;

  const estimatedSeconds = Math.max(0, Math.round((wordCount / 150) * 60));

  const insertSingleTag = (tag: string) => {
    if (modelTier !== "studio") {
      onModelTierChange("studio");
    }
    const el = textareaRef.current;
    if (!el) {
      onSingleTextChange(`${singleText}${singleText ? " " : ""}${tag} `);
      return;
    }
    const start = el.selectionStart ?? singleText.length;
    const end = el.selectionEnd ?? singleText.length;
    const before = singleText.slice(0, start);
    const after = singleText.slice(end);
    const spacerBefore = before.length > 0 && !before.endsWith(" ") ? " " : "";
    const spacerAfter = after.length > 0 && !after.startsWith(" ") ? " " : "";
    const nextValue = `${before}${spacerBefore}${tag}${spacerAfter}${after}`;
    onSingleTextChange(nextValue);

    requestAnimationFrame(() => {
      const nextCursor =
        start + spacerBefore.length + tag.length + spacerAfter.length;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const insertTurnTag = (tag: string) => {
    if (turns.length === 0) return;
    const targetId = activeTurnRef.current.id || turns[turns.length - 1].id;
    onTurnsChange(
      turns.map((turn) => {
        if (turn.id !== targetId) return turn;
        const spacer = turn.text.length > 0 && !turn.text.endsWith(" ") ? " " : "";
        return { ...turn, text: `${turn.text}${spacer}${tag}` };
      })
    );
  };

  const handleAddTurn = () => {
    const lastTurn = turns[turns.length - 1];
    const nextSpeaker =
      lastTurn?.speaker === "speaker1" ? "speaker2" : "speaker1";
    onTurnsChange([
      ...turns,
      {
        id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        speaker: nextSpeaker,
        text: "",
      },
    ]);
  };

  const handleRemoveTurn = (id: string) => {
    if (turns.length <= 1) return;
    onTurnsChange(turns.filter((t) => t.id !== id));
  };

  const handleUpdateTurn = (
    id: string,
    patch: Partial<Pick<DialogueTurn, "speaker" | "text">>
  ) => {
    onTurnsChange(
      turns.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn))
    );
  };

  const canGenerate =
    !isGenerating &&
    characterCount > 0 &&
    characterCount <= 5000 &&
    (mode === "single" || turns.some((t) => t.text.trim().length > 0));

  return (
    <section
      aria-label="Text-to-speech script studio"
      className="bg-white border border-slate-200 rounded-xl p-6 lg:p-7"
    >
      {/* Mode & Sample Presets Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div
          role="tablist"
          aria-label="Synthesis mode"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "single"}
            onClick={() => onModeChange("single")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === "single"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Single Voice
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "dialogue"}
            onClick={() => onModeChange("dialogue")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === "dialogue"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Dual Dialogue
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1">Samples:</span>
          {SAMPLE_SCRIPTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onApplySample(sample)}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clip Title */}
      <div className="mt-5">
        <label
          htmlFor="clip-title-input"
          className="block text-xs font-medium text-slate-700 mb-1.5"
        >
          Clip Filename / Title
        </label>
        <input
          id="clip-title-input"
          type="text"
          value={clipTitle}
          onChange={(e) => onClipTitleChange(e.target.value)}
          placeholder="e.g. Product launch intro"
          maxLength={80}
          className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-shadow"
        />
      </div>

      {mode === "single" ? (
        <>
          {/* Single Voice Script Input */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="tts-script-textarea"
                className="text-xs font-medium text-slate-700"
              >
                Voice Script
              </label>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                <span>{wordCount} words</span>
                <span aria-hidden="true">·</span>
                <span>~{estimatedSeconds}s</span>
                <span aria-hidden="true">·</span>
                <span className={characterCount > 5000 ? "text-red-600 font-semibold" : ""}>
                  {characterCount}/5000
                </span>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              id="tts-script-textarea"
              rows={6}
              value={singleText}
              onChange={(e) => onSingleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canGenerate) {
                  e.preventDefault();
                  onGenerate();
                }
              }}
              placeholder="Write or paste the script you want to convert into downloadable voice audio..."
              className="w-full px-4 py-3 text-[15px] leading-relaxed text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 resize-y min-h-[160px] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15 transition-shadow"
            />

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">
                  Insert vocal cue:
                </span>
                {EXPRESSIVE_TAGS.filter((t) =>
                  (t.modes as readonly string[]).includes("single")
                ).map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertSingleTag(item.tag)}
                    className="px-2 py-1 font-mono text-xs text-slate-700 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                  >
                    {item.tag}
                  </button>
                ))}
              </div>

              {singleText.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSingleTextChange("")}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Clear text
                </button>
              )}
            </div>
          </div>

          {/* Voice Selection */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-slate-700">
                Select Voice
              </span>
              <span className="text-xs text-slate-500">
                5 studio voices available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {VOICE_PROFILES.map((voice) => {
                const active = voiceName === voice.id;
                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => onVoiceNameChange(voice.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      active
                        ? "bg-[#EFF6FF] border-[#1D4ED8] text-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {voice.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                      {voice.timbre}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery Style & Engine Controls */}
          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="delivery-style-input"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Delivery Style &amp; Voice Direction
              </label>
              <input
                id="delivery-style-input"
                type="text"
                value={styleDirection}
                onChange={(e) => onStyleDirectionChange(e.target.value)}
                placeholder="e.g. Warm, articulate documentary narrator"
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STYLE_PRESETS.slice(0, 4).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onStyleDirectionChange(preset)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      styleDirection === preset
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Synthesis Engine
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onModelTierChange("lite")}
                    className={`px-3 py-2 text-left rounded-lg border transition-colors ${
                      modelTier === "lite"
                        ? "bg-[#EFF6FF] border-[#1D4ED8] text-slate-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">
                      Fast Standard
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Low-latency narration
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onModelTierChange("studio")}
                    className={`px-3 py-2 text-left rounded-lg border transition-colors ${
                      modelTier === "studio"
                        ? "bg-[#EFF6FF] border-[#1D4ED8] text-slate-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">
                      Expressive Studio
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Voice design &amp; cues
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  MP3 Export Quality
                </span>
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {BITRATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onBitrateChange(rate)}
                      className={`px-3 py-1 font-mono text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        bitrateKbps === rate
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {rate} kbps
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Dual Speaker Setup */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="text-xs font-semibold text-slate-900">
                Speaker 1
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={speaker1.name}
                    onChange={(e) =>
                      onSpeaker1Change({ ...speaker1, name: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Voice
                  </label>
                  <select
                    value={speaker1.voiceName}
                    onChange={(e) =>
                      onSpeaker1Change({
                        ...speaker1,
                        voiceName: e.target.value as VoiceId,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#1D4ED8]"
                  >
                    {VOICE_PROFILES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.timbre})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Delivery Style
                </label>
                <input
                  type="text"
                  value={speaker1.style}
                  onChange={(e) =>
                    onSpeaker1Change({ ...speaker1, style: e.target.value })
                  }
                  placeholder="Enthusiastic podcast host"
                  className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="text-xs font-semibold text-slate-900">
                Speaker 2
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={speaker2.name}
                    onChange={(e) =>
                      onSpeaker2Change({ ...speaker2, name: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Voice
                  </label>
                  <select
                    value={speaker2.voiceName}
                    onChange={(e) =>
                      onSpeaker2Change({
                        ...speaker2,
                        voiceName: e.target.value as VoiceId,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#1D4ED8]"
                  >
                    {VOICE_PROFILES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.timbre})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Delivery Style
                </label>
                <input
                  type="text"
                  value={speaker2.style}
                  onChange={(e) =>
                    onSpeaker2Change({ ...speaker2, style: e.target.value })
                  }
                  placeholder="Curious, articulate co-host"
                  className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            </div>
          </div>

          {/* Dialogue Turns List */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">
                Dialogue Lines
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                <span>{turns.length} lines</span>
                <span aria-hidden="true">·</span>
                <span>~{estimatedSeconds}s</span>
                <span aria-hidden="true">·</span>
                <span>{characterCount}/5000</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {turns.map((turn, idx) => (
                <div
                  key={turn.id}
                  className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2"
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateTurn(turn.id, {
                        speaker:
                          turn.speaker === "speaker1" ? "speaker2" : "speaker1",
                      })
                    }
                    title="Click to switch speaker"
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md min-w-[88px] truncate transition-colors shrink-0 ${
                      turn.speaker === "speaker1"
                        ? "bg-[#EFF6FF] text-[#1D4ED8]"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {turn.speaker === "speaker1"
                      ? speaker1.name || "Speaker 1"
                      : speaker2.name || "Speaker 2"}
                  </button>

                  <input
                    type="text"
                    value={turn.text}
                    onFocus={(e) => {
                      activeTurnRef.current = { id: turn.id, el: e.currentTarget };
                    }}
                    onChange={(e) =>
                      handleUpdateTurn(turn.id, { text: e.target.value })
                    }
                    placeholder={`Line ${idx + 1} dialogue...`}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-sm text-slate-900 bg-transparent focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveTurn(turn.id)}
                    disabled={turns.length <= 1}
                    aria-label="Remove line"
                    className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAddTurn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 mr-1">Insert cue:</span>
                {EXPRESSIVE_TAGS.map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertTurnTag(item.tag)}
                    className="px-2 py-1 font-mono text-xs text-slate-700 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                  >
                    {item.tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              MP3 Export Quality
            </span>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {BITRATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onBitrateChange(rate)}
                  className={`px-3 py-1 font-mono text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    bitrateKbps === rate
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {rate} kbps
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Primary Action Footer */}
      <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          {mode === "single"
            ? "Press Ctrl/Cmd + Enter to generate · Exports MP3 & WAV"
            : "Dual-speaker screenplay synthesis · Exports MP3 & WAV"}
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Voice...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Voice</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
};
