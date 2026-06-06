import { useState, useEffect, useCallback } from "react";
import type { SubtitleItem as SubtitleItemType } from "../types";

interface SubtitleItemProps {
  item: SubtitleItemType;
  onToggleMark: (id: string) => void;
  onWordClick: (word: string, rect: DOMRect) => void;
}

function splitWords(text: string): { word: string; index: number }[] {
  const segments: { word: string; index: number }[] = [];
  const regex = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    segments.push({ word: match[0], index: match.index });
  }
  return segments;
}

function SubtitleItemInner({ item, onToggleMark, onWordClick }: SubtitleItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const handleWordClick = useCallback(
    (word: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      onWordClick(word, rect);
    },
    [onWordClick]
  );

  const renderSourceText = () => {
    const words = splitWords(item.sourceText);
    if (words.length === 0) {
      return <span>{item.sourceText}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const seg of words) {
      if (seg.index > lastIndex) {
        elements.push(
          <span key={"pre-" + lastIndex}>
            {item.sourceText.slice(lastIndex, seg.index)}
          </span>
        );
      }
      elements.push(
        <span
          key={"w-" + seg.index}
          className="cursor-pointer text-blue-500 hover:text-blue-700 hover:underline decoration-dotted underline-offset-2 transition-colors"
          onClick={e => handleWordClick(seg.word, e)}
          title={"查看 '" + seg.word + "' 的释义"}
        >
          {seg.word}
        </span>
      );
      lastIndex = seg.index + seg.word.length;
    }

    if (lastIndex < item.sourceText.length) {
      elements.push(
        <span key={"post-" + lastIndex}>
          {item.sourceText.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div
      className={
        "p-3 bg-white rounded-lg border shadow-sm cursor-pointer " +
        "hover:border-yellow-300 transition-colors duration-200 " +
        "opacity-0 translate-y-2.5 " +
        (visible ? "opacity-100 translate-y-0 duration-[200ms] ease-out" : "") +
        (item.marked ? " border-yellow-300" : " border-slate-100")
      }
      onClick={() => onToggleMark(item.id)}
    >
      <div className="flex items-start gap-2">
        {item.marked && <span className="text-yellow-400 text-sm mt-0.5 shrink-0">&#9733;</span>}
        <div className="min-w-0 flex-1">
          <p className="text-slate-800 text-sm leading-relaxed break-words">
            {renderSourceText()}
          </p>
          {item.translatedText ? (
            <p className="text-blue-600 text-sm leading-relaxed mt-1 pt-1 border-t border-slate-100 break-words">
              {item.translatedText}
              {item.version > 0 && (
                <span className="text-xs text-slate-300 ml-1">v{item.version + 1}</span>
              )}
            </p>
          ) : (
            <p className="text-slate-300 text-xs mt-1 animate-pulse">翻译中...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const SubtitleItem = SubtitleItemInner;


