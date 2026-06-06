import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface WordPopoverProps {
  word: string;
  definition: string;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Position relative to viewport, with boundary clamping */
function getPosition(
  anchorRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number
): { left: number; top: number } {
  const gap = 8;
  // Default: above the word, centered horizontally
  let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
  let top = anchorRect.top - popoverHeight - gap;

  // If it would go above the viewport, show below instead
  if (top < 8) {
    top = anchorRect.bottom + gap;
  }

  // Clamp horizontally to viewport
  if (left < 8) left = 8;
  if (left + popoverWidth > window.innerWidth - 8) {
    left = window.innerWidth - popoverWidth - 8;
  }

  return { left, top };
}

export function WordPopover({ word, definition, anchorRect, isOpen, onClose }: WordPopoverProps) {
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
  }, [isOpen, word]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the same click that opened it
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
      className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl px-3 py-2 max-w-[260px]"
      style={{ left, top }}
    >
      <p className="text-xs text-slate-400 font-mono mb-1">{word}</p>
      <p className="text-sm text-slate-700 font-medium">{definition}</p>
    </div>,
    document.body
  );
}
