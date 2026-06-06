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

  // Auto-scroll to bottom
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items, interimText]);

  if (items.length === 0 && !interimText) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-500 text-sm">
        等待字幕...
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {items.map(function (item) {
          return (
            <div key={item.id} className="text-sm">
              <p className="text-white/90 leading-relaxed">{item.sourceText}</p>
              {item.translatedText ? (
                <p className="text-blue-400 leading-relaxed mt-0.5">{item.translatedText}</p>
              ) : (
                <p className="text-white/30 text-xs animate-pulse">翻译中...</p>
              )}
            </div>
          );
        })}

        {interimText && (
          <div className="text-sm opacity-50 italic">
            <p>{interimText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
