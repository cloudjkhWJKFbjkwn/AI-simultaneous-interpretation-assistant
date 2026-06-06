import { useRef, useCallback } from "react";
import { useSubtitleContext } from "../context/SubtitleContext";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useWordPopover } from "../hooks/useWordPopover";
import { lookupWord } from "../services/MockTranslationService";
import { fetchWordDefinition } from "../services/DictionaryService";
import { SubtitleItem } from "./SubtitleItem";
import { WordPopover } from "./WordPopover";
import type { TranslationService } from "../types";

interface SubtitleListProps {
  interimText: string;
  transparent?: boolean;
}

export function SubtitleList({ interimText, transparent }: SubtitleListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { items, toggleMark, editSubtitle } = useSubtitleContext();
  const { state, openWord, updateDefinition, closePopover } = useWordPopover();
  const translateRef = useRef<TranslationService | null>(null);

  const { isPaused, scrollToBottom } = useAutoScroll(containerRef, items.length);

  const getTranslator = useCallback(async (): Promise<TranslationService> => {
    if (!translateRef.current) {
      const { createTranslationService, getDefaultStrategy } = await import(
        "../services/TranslationService"
      );
      const strategy = getDefaultStrategy();
      translateRef.current = await createTranslationService({
        strategy,
      });
    }
    return translateRef.current;
  }, []);

  const handleWordClick = useCallback(
    (word: string, rect: DOMRect) => {
      openWord(word, rect);

      const localDef = lookupWord(word);
      if (localDef) {
        updateDefinition(localDef);
        return;
      }

      fetchWordDefinition(word).then(def => {
        updateDefinition(def || "暂无释义");
      }).catch(() => {
        updateDefinition("暂无释义");
      });
    },
    [openWord, updateDefinition]
  );

  const handleEdit = useCallback(
    (id: string, sourceText?: string, translatedText?: string) => {
      editSubtitle(id, sourceText, translatedText);
    },
    [editSubtitle]
  );

  const handleRetranslate = useCallback(
    async (id: string, sourceText: string) => {
      try {
        const translator = await getTranslator();
        const translatedText = await translator.translate(sourceText);
        editSubtitle(id, undefined, translatedText);
      } catch {
        editSubtitle(id, undefined, "翻译失败");
      }
    },
    [editSubtitle, getTranslator]
  );

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className={
          "h-full overflow-y-auto scroll-smooth px-6 py-4 space-y-3 " +
          (transparent ? "" : "bg-slate-50")
        }
      >
        {items.map(item => (
          <SubtitleItem
            key={item.id}
            item={item}
            onToggleMark={toggleMark}
            onEdit={handleEdit}
            onRetranslate={handleRetranslate}
            onWordClick={handleWordClick}
          />
        ))}

        {interimText && (
          <div className="p-3 bg-white/10 rounded-lg border border-blue-200/30 shadow-sm opacity-70">
            <p className={transparent ? "text-white/60 text-sm italic" : "text-slate-500 text-sm italic"}>
              {interimText}
            </p>
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
        loading={state.loading}
        onClose={closePopover}
      />
    </div>
  );
}
