import { useState, useEffect, memo } from "react";
import type { SubtitleItem as SubtitleItemType } from "../types";

interface SubtitleItemProps {
  item: SubtitleItemType;
  onToggleMark: (id: string) => void;
}

function SubtitleItemInner({ item, onToggleMark }: SubtitleItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

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
        {item.marked && <span className="text-yellow-400 text-sm mt-0.5 shrink-0">★</span>}
        <div className="min-w-0 flex-1">
          <p className="text-slate-800 text-sm leading-relaxed break-words">{item.sourceText}</p>
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

export const SubtitleItem = memo(SubtitleItemInner);
