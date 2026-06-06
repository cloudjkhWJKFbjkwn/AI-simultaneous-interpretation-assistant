import { useRef, useCallback } from "react";
import { useSubtitleContext } from "../context/SubtitleContext";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useWordPopover } from "../hooks/useWordPopover";
import { lookupWord } from "../services/MockTranslationService";
import { SubtitleItem } from "./SubtitleItem";
import { WordPopover } from "./WordPopover";

interface SubtitleListProps {
  interimText: string;
}

export function SubtitleList({ interimText }: SubtitleListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { items, toggleMark } = useSubtitleContext();
  const { state, openWord, closePopover } = useWordPopover();

  const { isPaused, scrollToBottom } = useAutoScroll(containerRef, items.length);

  const handleWordClick = useCallback(
    (word: string, rect: DOMRect) => {
      const def = lookupWord(word);
      openWord(word, def || "暂无释义", rect);
    },
    [openWord]
  );

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scroll-smooth px-6 py-4 space-y-3 bg-slate-50"
      >
        {items.map(item => (
          <SubtitleItem
            key={item.id}
            item={item}
            onToggleMark={toggleMark}
            onWordClick={handleWordClick}
          />
        ))}

        {interimText && (
          <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-sm opacity-70">
            <p className="text-slate-500 text-sm italic">{interimText}</p>
          </div>
        )}
      </div>

      {isPaused && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer animate-bounce"
          title="回到底部"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v8M4 7l4 4 4-4" />
          </svg>
        </button>
      )}

      <WordPopover
        word={state.word}
        definition={state.definition}
        anchorRect={state.anchorRect}
        isOpen={state.isOpen}
        onClose={closePopover}
      />
    </div>
  );
}
