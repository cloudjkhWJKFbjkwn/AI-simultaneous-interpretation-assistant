import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface WordPopoverProps {
  word: string;
  definition: string;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
}

/** Position relative to viewport, with boundary clamping */
function getPosition(
  anchorRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number
): { left: number; top: number } {
  const gap = 8;
  let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
  let top = anchorRect.top - popoverHeight - gap;

  if (top < 8) {
    top = anchorRect.bottom + gap;
  }

  if (left < 8) left = 8;
  if (left + popoverWidth > window.innerWidth - 8) {
    left = window.innerWidth - popoverWidth - 8;
  }

  return { left, top };
}

export function WordPopover({ word, definition, anchorRect, isOpen, loading, onClose }: WordPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 200, height: 60 });

  // Measure popover size for positioning
  useEffect(() => {
    if (!isOpen) return;
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setSize({ width: rect.width, height: rect.height });
    }
  }, [isOpen, word, definition, loading]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  const { left, top } = getPosition(anchorRect, size.width, size.height);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl px-3 py-2 max-w-[280px] min-w-[120px]"
      style={{ left, top }}
    >
      <p className="text-xs text-slate-400 font-mono mb-1">{word}</p>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">查询中...</p>
        </div>
      ) : (
        <p className="text-sm text-slate-700 font-medium whitespace-pre-line">{definition}</p>
      )}
    </div>,
    document.body
  );
}
