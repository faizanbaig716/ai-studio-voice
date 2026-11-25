import React from "react";
import { Download, Play, Trash2 } from "lucide-react";
import type { GeneratedClip } from "../types/voice";
import {
  buildDownloadFilename,
  formatBytes,
  formatTimecode,
  triggerAudioDownload,
} from "../utils/audio";

interface SessionHistoryProps {
  clips: GeneratedClip[];
  activeClipId: string | null;
  onSelectClip: (clip: GeneratedClip) => void;
  onDeleteClip: (clipId: string) => void;
  onClearAll: () => void;
  expanded?: boolean;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  clips,
  activeClipId,
  onSelectClip,
  onDeleteClip,
  onClearAll,
  expanded = false,
}) => {
  const handleDownloadClipMp3 = (
    e: React.MouseEvent,
    clip: GeneratedClip
  ) => {
    e.stopPropagation();
    const filename = buildDownloadFilename(clip.title, "mp3");
    triggerAudioDownload(clip.mp3Base64, "audio/mpeg", filename);
  };

  return (
    <section
      aria-label="Generated voice clips history"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Generated Voice Clips
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {clips.length === 0
              ? "Clips generated in this session appear here"
              : `${clips.length} ${clips.length === 1 ? "clip" : "clips"} ready for MP3 export`}
          </p>
        </div>

        {clips.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Clear All
          </button>
        )}
      </div>

      {clips.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-500">
            No clips generated yet. Write or load a script and click Generate Voice.
          </p>
        </div>
      ) : (
        <div
          className={`divide-y divide-slate-100 ${
            expanded ? "" : "max-h-[380px] overflow-y-auto"
          }`}
        >
          {clips.map((clip) => {
            const isActive = clip.id === activeClipId;
            return (
              <div
                key={clip.id}
                onClick={() => onSelectClip(clip)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectClip(clip);
                  }
                }}
                className={`py-3.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isActive ? "bg-slate-50" : "hover:bg-slate-50/70"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {clip.title}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{clip.voiceLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatTimecode(clip.durationSeconds)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatBytes(clip.mp3SizeBytes)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip);
                    }}
                    aria-label={`Load ${clip.title} in player`}
                    title="Load in player"
                    className={`p-2 rounded-lg border transition-colors ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDownloadClipMp3(e, clip)}
                    aria-label={`Download ${clip.title} as MP3`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg hover:bg-[#DBEAFE] transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>MP3</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClip(clip.id);
                    }}
                    aria-label={`Delete ${clip.title}`}
                    title="Delete clip"
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
