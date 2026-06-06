import { useState, useEffect, useRef } from "react";

interface SubWindowItem {
  id: string;
  sourceText: string;
  translatedText: string;
}

export function PopupApp() {
  const [items, setItems] = useState<SubWindowItem[]>([]);
  const [interimText, setInterimText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncChannel = new BroadcastChannel("subtitle-sync");
    const interimChannel = new BroadcastChannel("subtitle-interim");

    syncChannel.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "sync") {
        setItems(msg.items);
      } else if (msg.type === "clear") {
        setItems([]);
        setInterimText("");
      }
    };

    interimChannel.onmessage = (e) => {
      if (e.data?.type === "interim") {
        setInterimText(e.data.text || "");
      }
    };

    return () => {
      syncChannel.close();
      interimChannel.close();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items, interimText]);

  return (
    <div className="h-screen bg-black/80 backdrop-blur-md text-white flex flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 shrink-0 select-none">
        <span className="text-white/80 text-sm font-medium">🎙️ AI 同声传译</span>
      </div>

      {/* Subtitle content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {items.length === 0 && !interimText ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            等待字幕...
          </div>
        ) : (
          items.map(function (item) {
            return (
              <div key={item.id} className="p-2 bg-white/5 rounded-lg border border-white/10 text-sm">
                <p className="text-white/90 leading-relaxed">{item.sourceText}</p>
                {item.translatedText ? (
                  <p className="text-blue-400 leading-relaxed mt-0.5 pt-0.5 border-t border-white/5">{item.translatedText}</p>
                ) : (
                  <p className="text-white/30 text-xs mt-0.5 animate-pulse">翻译中...</p>
                )}
              </div>
            );
          })
        )}

        {interimText && (
          <div className="p-2 bg-white/5 rounded-lg border border-blue-400/20 text-sm opacity-60 italic">
            <p className="text-white/60">{interimText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
