import { useState, useEffect, useRef } from "react";
import type { SubtitleItem as SubtitleItemType } from "../types";

interface SubtitleItemProps {
  item: SubtitleItemType;
  onToggleMark: (id: string) => void;
  onEdit: (id: string, sourceText?: string, translatedText?: string) => void;
  onRetranslate: (id: string, sourceText: string) => void;
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

function SubtitleItemInner({ item, onToggleMark, onEdit, onRetranslate, onWordClick }: SubtitleItemProps) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<"none" | "source" | "translated">("none");
  const [edited, setEdited] = useState(false);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const translatedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    if (editing === "source") sourceRef.current?.focus();
    if (editing === "translated") translatedRef.current?.focus();
  }, [editing]);

  const handleStartEdit = (field: "source" | "translated", e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(field);
  };

  const handleBlurSource = () => {
    if (sourceRef.current) {
      const newText = sourceRef.current.value.trim();
      if (newText && newText !== item.sourceText) {
        onEdit(item.id, newText, undefined);
        setEdited(true);
        // Auto retranslate after editing English source text
        onRetranslate(item.id, newText);
      }
    }
    setEditing("none");
  };

  const handleBlurTranslated = () => {
    if (translatedRef.current) {
      const newText = translatedRef.current.value.trim();
      if (newText && newText !== item.translatedText) {
        onEdit(item.id, undefined, newText);
        setEdited(true);
      }
    }
    setEditing("none");
  };

  const handleKeyDown = (field: "source" | "translated", e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditing("none");
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (field === "source") handleBlurSource();
      else handleBlurTranslated();
    }
  };

  const renderSourceText = () => {
    if (editing === "source") {
      return (
        <textarea
          ref={sourceRef}
          defaultValue={item.sourceText}
          className="w-full p-1 text-sm border border-blue-400 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
          rows={2}
          onBlur={handleBlurSource}
          onKeyDown={(e) => handleKeyDown("source", e)}
        />
      );
    }

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
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            onWordClick(seg.word, rect);
          }}
          title={"释义: " + seg.word}
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

  const renderTranslatedText = () => {
    if (editing === "translated") {
      return (
        <textarea
          ref={translatedRef}
          defaultValue={item.translatedText || ""}
          className="w-full p-1 text-sm border border-blue-400 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
          rows={2}
          onBlur={handleBlurTranslated}
          onKeyDown={(e) => handleKeyDown("translated", e)}
        />
      );
    }

    if (item.translatedText) {
      return (
        <>
          {item.translatedText}
          {item.version > 0 && (
            <span className="text-xs text-slate-300 ml-1">v{item.version + 1}</span>
          )}
        </>
      );
    }

    return <span className="text-slate-300 text-xs animate-pulse">翻译中...</span>;
  };

  return (
    <div
      className={
        "group p-3 bg-white rounded-lg border shadow-sm cursor-pointer " +
        "hover:border-yellow-300 transition-colors duration-200 " +
        "opacity-0 translate-y-2.5 " +
        (visible ? "opacity-100 translate-y-0 duration-[200ms] ease-out" : "") +
        (edited ? " border-blue-400 border-dashed" : "") +
        (!edited && item.marked ? " border-yellow-300" : "") +
        (!edited && !item.marked ? " border-slate-100" : "")
      }
      onClick={() => onToggleMark(item.id)}
    >
      <div className="flex items-start gap-2">
        {item.marked && <span className="text-yellow-400 text-sm mt-0.5 shrink-0">&#9733;</span>}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-slate-800 text-sm leading-relaxed break-words flex-1">
              {renderSourceText()}
            </p>
            {editing !== "source" && (
              <button
                onClick={(e) => handleStartEdit("source", e)}
                className="text-xs text-slate-300 hover:text-slate-500 transition-colors cursor-pointer shrink-0 mt-0.5 opacity-0 group-hover:opacity-100"
                title="编辑原文"
              >
                ✎
              </button>
            )}
          </div>
          <div className="flex items-start justify-between gap-2 mt-1 pt-1 border-t border-slate-100">
            <p className="text-blue-600 text-sm leading-relaxed break-words flex-1">
              {renderTranslatedText()}
            </p>
            {editing !== "translated" && (
              <button
                onClick={(e) => handleStartEdit("translated", e)}
                className="text-xs text-slate-300 hover:text-slate-500 transition-colors cursor-pointer shrink-0 mt-0.5 opacity-0 group-hover:opacity-100"
                title="编辑译文"
              >
                ✎
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SubtitleItem = SubtitleItemInner;
