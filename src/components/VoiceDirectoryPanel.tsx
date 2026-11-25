import React, { useState } from "react";
import { Check, Download, Loader2, Play, Square } from "lucide-react";
import { VOICE_PROFILES } from "../data/voices";
import type { VoiceId, VoiceProfile } from "../types/voice";
import {
  base64ToBlob,
  buildDownloadFilename,
  triggerAudioDownload,
} from "../utils/audio";

interface VoiceDirectoryPanelProps {
  selectedVoice: VoiceId;
  onSelectVoice: (voice: VoiceId) => void;
  onUseInStudio: (voice: VoiceId, defaultStyle: string) => void;
}

interface PreviewCacheEntry {
  mp3Base64: string;
}

export const VoiceDirectoryPanel: React.FC<VoiceDirectoryPanelProps> = ({
  selectedVoice,
  onSelectVoice,
  onUseInStudio,
}) => {
  const [loadingVoice, setLoadingVoice] = useState<VoiceId | null>(null);
  const [playingVoice, setPlayingVoice] = useState<VoiceId | null>(null);
  const [previewCache, setPreviewCache] = useState<
    Partial<Record<VoiceId, PreviewCacheEntry>>
  >({});
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const stopCurrentAudio = () => {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    setPlayingVoice(null);
  };

  const handleAudition = async (profile: VoiceProfile) => {
    setPreviewError(null);
    if (playingVoice === profile.id) {
      stopCurrentAudio();
      return;
    }
    stopCurrentAudio();

    try {
      let mp3Base64 = previewCache[profile.id]?.mp3Base64;
      if (!mp3Base64) {
        setLoadingVoice(profile.id);
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "single",
            text: profile.sampleLine,
            voiceName: profile.id,
            style: profile.defaultStyle,
            modelTier: "lite",
            bitrateKbps: 192,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to preview voice.");
        }
        mp3Base64 = data.mp3Base64 as string;
        setPreviewCache((prev) => ({
          ...prev,
          [profile.id]: { mp3Base64: mp3Base64! },
        }));
      }

      const blob = base64ToBlob(mp3Base64, "audio/mpeg");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(url);
      };
      setAudioEl(audio);
      setPlayingVoice(profile.id);
      await audio.play();
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Failed to preview voice."
      );
      setPlayingVoice(null);
    } finally {
      setLoadingVoice(null);
    }
  };

  const handleDownloadSampleMp3 = (profile: VoiceProfile) => {
    const cached = previewCache[profile.id];
    if (!cached) return;
    triggerAudioDownload(
      cached.mp3Base64,
      "audio/mpeg",
      buildDownloadFilename(`sample-${profile.name}`, "mp3")
    );
  };

  return (
    <section className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Voice Directory
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Audition each studio voice with a short sample line, download the preview
            in MP3, or load a voice directly into the script editor.
          </p>
        </div>
      </div>

      {previewError && (
        <div
          role="alert"
          className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
        >
          {previewError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {VOICE_PROFILES.map((profile) => {
          const isSelected = selectedVoice === profile.id;
          const isLoading = loadingVoice === profile.id;
          const isPlaying = playingVoice === profile.id;
          const hasPreview = Boolean(previewCache[profile.id]);

          return (
            <div
              key={profile.id}
              className={`bg-white rounded-xl p-6 border transition-colors flex flex-col justify-between ${
                isSelected
                  ? "border-[#1D4ED8] ring-1 ring-[#1D4ED8]/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-slate-900">
                      {profile.name}
                    </h2>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{profile.timbre}</span>
                      <span aria-hidden="true">·</span>
                      <span>{profile.register}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8]">
                      <Check className="w-3.5 h-3.5" />
                      Selected
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Best for {profile.bestFor.toLowerCase()}.
                </p>

                <p className="mt-3 text-xs text-slate-500 italic leading-relaxed">
                  &ldquo;{profile.sampleLine}&rdquo;
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAudition(profile)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading</span>
                    </>
                  ) : isPlaying ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </>
                  )}
                </button>

                {hasPreview && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleMp3(profile)}
                    title="Download voice sample as MP3"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1D4ED8] bg-[#EFF6FF] rounded-lg hover:bg-[#DBEAFE] transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>MP3</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onSelectVoice(profile.id);
                    onUseInStudio(profile.id, profile.defaultStyle);
                  }}
                  className="ml-auto px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Use Voice
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
