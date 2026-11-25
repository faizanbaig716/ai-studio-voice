import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileAudio,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import type { GeneratedClip } from "../types/voice";
import {
  base64ToBlob,
  buildDownloadFilename,
  formatBytes,
  formatTimecode,
  triggerAudioDownload,
} from "../utils/audio";

interface WaveformPlayerProps {
  clip: GeneratedClip | null;
  isGenerating: boolean;
  onLoadSample?: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  clip,
  isGenerating,
  onLoadSample,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [downloadedFormat, setDownloadedFormat] = useState<"mp3" | "wav" | null>(
    null
  );

  const audioUrl = useMemo(() => {
    if (!clip?.mp3Base64) return null;
    const blob = base64ToBlob(clip.mp3Base64, "audio/mpeg");
    return URL.createObjectURL(blob);
  }, [clip?.id, clip?.mp3Base64]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(clip?.durationSeconds ?? 0);
    setDownloadedFormat(null);
  }, [clip?.id, clip?.durationSeconds]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleRestart = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleSeek = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const targetTime = Math.max(0, Math.min(duration, ratio * duration));
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleDownloadMp3 = () => {
    if (!clip) return;
    const filename = buildDownloadFilename(clip.title, "mp3");
    triggerAudioDownload(clip.mp3Base64, "audio/mpeg", filename);
    setDownloadedFormat("mp3");
    setTimeout(() => setDownloadedFormat(null), 2200);
  };

  const handleDownloadWav = () => {
    if (!clip) return;
    const filename = buildDownloadFilename(clip.title, "wav");
    triggerAudioDownload(clip.wavBase64, "audio/wav", filename);
    setDownloadedFormat("wav");
    setTimeout(() => setDownloadedFormat(null), 2200);
  };

  if (isGenerating) {
    return (
      <section
        aria-label="Voice synthesis output"
        className="bg-white border border-slate-200 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Synthesizing Audio
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            Encoding MP3
          </span>
        </div>
        <div className="h-24 bg-slate-50 border border-slate-200 rounded-lg px-4 flex items-center gap-1.5 overflow-hidden">
          {Array.from({ length: 48 }).map((_, idx) => (
            <div
              key={idx}
              className="flex-1 bg-slate-200 rounded-sm animate-pulse"
              style={{
                height: `${24 + ((idx * 17) % 52)}%`,
                animationDelay: `${(idx % 8) * 90}ms`,
              }}
            />
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Generating speech waveform and mastering your downloadable MP3 file.
        </p>
      </section>
    );
  }

  if (!clip) {
    return (
      <section
        aria-label="Voice synthesis output"
        className="bg-white border border-slate-200 rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Output &amp; MP3 Export
            </h2>
            <p className="text-xs text-slate-500">
              Ready for playback and download after generation
            </p>
          </div>
        </div>
        <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <p className="text-sm text-slate-600 leading-relaxed">
            Your generated voice waveform, transport controls, and one-click MP3
            and WAV download buttons will appear here.
          </p>
          {onLoadSample && (
            <button
              type="button"
              onClick={onLoadSample}
              className="mt-4 px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Load Sample Script
            </button>
          )}
        </div>
      </section>
    );
  }

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <section
      aria-label="Active voice player and download controls"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) {
              setDuration(d);
            }
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(duration);
          }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-900 truncate">
            {clip.title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{clip.voiceLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{clip.mode === "dialogue" ? "Dual Dialogue" : "Single Voice"}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {clip.bitrateKbps} kbps MP3
            </span>
          </div>
        </div>

        <span className="font-mono text-xs text-slate-600 tabular-nums shrink-0 pt-0.5">
          {formatTimecode(currentTime)} / {formatTimecode(duration)}
        </span>
      </div>

      {/* Interactive Waveform Scrubbing Deck */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Audio playback progress"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          handleSeek(ratio);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            handleSeek(Math.min(1, progressRatio + 0.05));
          } else if (e.key === "ArrowLeft") {
            handleSeek(Math.max(0, progressRatio - 0.05));
          } else if (e.key === " ") {
            e.preventDefault();
            togglePlay();
          }
        }}
        className="mt-4 h-24 bg-[#0F172A] rounded-lg px-3.5 py-3 flex items-center gap-[3px] cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
      >
        {clip.waveformPeaks.map((peak, index) => {
          const barProgress = (index + 0.5) / clip.waveformPeaks.length;
          const isPlayed = barProgress <= progressRatio;
          return (
            <div
              key={index}
              className="flex-1 h-full flex items-center justify-center"
            >
              <div
                className={`w-full rounded-full transition-colors duration-100 ${
                  isPlayed ? "bg-[#3B82F6]" : "bg-slate-600/80"
                }`}
                style={{
                  height: `${Math.max(14, Math.round(peak * 100))}%`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Transport Controls Row */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            aria-label="Restart playback"
            title="Restart from beginning"
            className="p-2.5 text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div
          role="group"
          aria-label="Playback speed"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          {PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setPlaybackRate(rate)}
              className={`px-2.5 py-1 font-mono text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                playbackRate === rate
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Primary Download Actions */}
      <div className="mt-5 pt-5 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadMp3}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] active:scale-[0.99] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            <Download className="w-4 h-4" />
            <span>
              {downloadedFormat === "mp3"
                ? "MP3 Downloaded"
                : `Download MP3 (${formatBytes(clip.mp3SizeBytes)})`}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWav}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            <FileAudio className="w-4 h-4 text-slate-500" />
            <span>
              {downloadedFormat === "wav"
                ? "WAV Downloaded"
                : `Download WAV (${formatBytes(clip.wavSizeBytes)})`}
            </span>
          </button>
        </div>

        <p className="mt-2.5 text-xs text-slate-500 font-mono tabular-nums">
          {(clip.sampleRate / 1000).toFixed(0)} kHz · {clip.bitrateKbps} kbps MP3 &amp; uncompressed 16-bit WAV
        </p>
      </div>
    </section>
  );
};
