import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { useDrag } from "../hooks/useDrag";
import { useSubtitleContext } from "../context/SubtitleContext";

interface FloatingWindowProps {
  children: ReactNode;
  interimText: string;
}

/**
 * Floating window with drag (via title bar) and collapse/expand.
 * - Draggable: title bar is the handle, position persisted to localStorage
 * - Collapsed: shrinks to 60x60px circular logo, flashes on new items
 * - Expanded: renders children (SubtitleList) inside
 */
export function FloatingWindow({ children, interimText }: FloatingWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);

  const { x, y, isDragging } = useDrag(titleBarRef, {
    storageKey: "floating-window-position",
    boundaryPadding: 8,
  });

  // Collapsed state persisted to localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("floating-window-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("floating-window-collapsed", String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Flash logo on new final sentences
  const { lastEvents } = useSubtitleContext();
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    const latest = lastEvents[0];
    if (latest?.type === "added" && collapsed) {
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [lastEvents, collapsed]);

  return (
    <>
      {/* Collapsed logo */}
      {collapsed && (
        <button
          onClick={toggleCollapse}
          className={
            "fixed z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 " +
            "shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center " +
            (flashing ? "animate-pulse ring-2 ring-blue-300 ring-offset-2" : "")
          }
          style={{ left: x + 296, top: y, transform: "translate(0, 0)" }}
          title="展开字幕窗口"
        >
          <span className="text-white text-xl">🎙️</span>
        </button>
      )}

      {/* Expanded window */}
      {!collapsed && (
        <div
          ref={windowRef}
          className={
            "fixed z-40 flex flex-col rounded-xl border border-white/20 overflow-hidden " +
            "bg-black/70 backdrop-blur-md shadow-2xl " +
            (isDragging ? "cursor-grabbing" : "")
          }
          style={{
            left: x,
            top: y,
            width: 360,
            maxHeight: "60vh",
            minHeight: 200,
          }}
        >
          {/* Title bar (drag handle) */}
          <div
            ref={titleBarRef}
            className="flex items-center justify-between px-4 py-2 cursor-grab select-none bg-white/5 border-b border-white/10 shrink-0"
          >
            <span className="text-white/80 text-sm font-medium">🎙️ AI 同传</span>
            <div className="flex items-center gap-1">
              {/* Collapse button */}
              <button
                onClick={toggleCollapse}
                className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white/90 transition-colors cursor-pointer text-xs"
                title="折叠"
              >
                −
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden min-h-0">
            {children}
          </div>
        </div>
      )}
    </>
  );
}
