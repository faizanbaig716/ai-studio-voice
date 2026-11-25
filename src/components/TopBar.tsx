import React from "react";
import type { GenerationMode } from "../types/voice";

export type ActiveSection = "studio" | "directory" | "history";

interface TopBarProps {
  activeSection: ActiveSection;
  mode: GenerationMode;
  historyCount: number;
  onSelectSingleVoice: () => void;
  onSelectDualDialogue: () => void;
  onSelectDirectory: () => void;
  onSelectHistory: () => void;
  onNewScript: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  mode,
  historyCount,
  onSelectSingleVoice,
  onSelectDualDialogue,
  onSelectDirectory,
  onSelectHistory,
  onNewScript,
}) => {
  const isSingleActive = activeSection === "studio" && mode === "single";
  const isDialogueActive = activeSection === "studio" && mode === "dialogue";
  const isDirectoryActive = activeSection === "directory";
  const isHistoryActive = activeSection === "history";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={onSelectSingleVoice}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] rounded"
        >
          Cadence Studio
        </button>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          <button
            type="button"
            onClick={onSelectSingleVoice}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              isSingleActive
                ? "text-slate-900 border-[#1D4ED8]"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            Single Voice
          </button>
          <button
            type="button"
            onClick={onSelectDualDialogue}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              isDialogueActive
                ? "text-slate-900 border-[#1D4ED8]"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            Dual Dialogue
          </button>
          <button
            type="button"
            onClick={onSelectDirectory}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              isDirectoryActive
                ? "text-slate-900 border-[#1D4ED8]"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            Voice Directory
          </button>
          <button
            type="button"
            onClick={onSelectHistory}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              isHistoryActive
                ? "text-slate-900 border-[#1D4ED8]"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            Export History{historyCount > 0 ? ` (${historyCount})` : ""}
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewScript}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            New Script
          </button>
        </div>
      </div>
    </header>
  );
};
