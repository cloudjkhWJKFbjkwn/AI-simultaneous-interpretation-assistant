import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useSubtitleManager, type SubtitleManager } from "../hooks/useSubtitleManager";

const SubtitleContext = createContext<SubtitleManager | null>(null);

export function SubtitleProvider({ children }: { children: ReactNode }) {
  const manager = useSubtitleManager();
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Broadcast subtitle state to popup windows
  useEffect(() => {
    channelRef.current = new BroadcastChannel("subtitle-sync");

    // Listen for clear commands from popup
    channelRef.current.onmessage = (e) => {
      if (e.data?.type === "clear-subtitles") {
        manager.clearSubtitles();
      }
    };

    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [manager]);

  // Broadcast whenever items change
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "sync",
        items: manager.items.map(function (item) {
          return {
            id: item.id,
            sourceText: item.sourceText,
            translatedText: item.translatedText,
            corrected: item.corrected,
          };
        }),
        interimText: "",
      });
    }
  }, [manager.items]);

  return (
    <SubtitleContext.Provider value={manager}>
      {children}
    </SubtitleContext.Provider>
  );
}

export function useSubtitleContext(): SubtitleManager {
  const ctx = useContext(SubtitleContext);
  if (!ctx) {
    throw new Error("useSubtitleContext must be used within a SubtitleProvider");
  }
  return ctx;
}

export { SubtitleContext };
