import { useState, useEffect, useRef } from "react";

interface SubWindowItem {
  id: string;
  sourceText: string;
  translatedText: string;
}

export function PopupApp() {
  const [items, setItems] = useState<SubWindowItem[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const syncChannel = new BroadcastChannel("subtitle-sync");
    const interimChannel = new BroadcastChannel("subtitle-interim");

    controlChannelRef.current = new BroadcastChannel("subtitle-control");
    const ctrlChannel = controlChannelRef.current;
    ctrlChannel.onmessage = (e) => {
      if (e.data?.type === "status") {
        setIsListening(e.data.isListening || false);
      }
    };

    syncChannel.onmessage = (e) => {
      if (e.data?.type === "sync") {
        setItems(e.data.items);
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
      ctrlChannel.close();
      controlChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items, interimText]);

  // Auto-hide UI when listening
  useEffect(() => {
    if (!isListening) {
      setShowUI(true);
      return;
    }

    const scheduleHide = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowUI(false), 3000);
    };

    const onMouseMove = () => {
      setShowUI(true);
      scheduleHide();
    };

    scheduleHide();
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isListening]);

  const handleToggle = () => {
    if (controlChannelRef.current) {
      controlChannelRef.current.postMessage({ type: "toggle" });
    }
  };

  const visibleItems = items.slice(-2);

  return (
    <div className="h-screen text-white flex flex-col select-none transition-all duration-500"
      style={{ background: showUI ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.15)" }}
    >
      <div className="flex-1 flex flex-col justify-end px-4 pb-2">
        <div ref={containerRef} className="space-y-1">
          {visibleItems.length === 0 && !interimText ? (
            <p className="text-white/30 text-sm text-center">等待字幕...</p>
          ) : (
            visibleItems.map(function (item) {
              return (
                <div key={item.id} className="text-sm">
                  <p className="text-white/90 leading-relaxed">{item.sourceText}</p>
                  {item.translatedText && (
                    <p className="text-blue-400 leading-relaxed">{item.translatedText}</p>
                  )}
                </div>
              );
            })
          )}

          {interimText && (
            <div className="text-sm opacity-50 italic">
              <p className="text-white/60">{interimText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar: hidden in focus mode */}
      <div className={"flex items-center justify-between px-4 py-2 shrink-0 transition-opacity duration-300 border-t " +
        (showUI ? "opacity-100 bg-white/5 border-white/10" : "opacity-0 border-transparent pointer-events-none")}>
        <span className="text-white/50 text-xs">🎙️ AI 同传</span>
        <button
          onClick={handleToggle}
          className={
            "px-4 py-1 rounded-full text-xs font-medium transition-all cursor-pointer " +
            (isListening
              ? "bg-red-500/80 text-white hover:bg-red-500"
              : "bg-blue-500/80 text-white hover:bg-blue-500")
          }
        >
          {isListening ? "停止" : "开始"}
        </button>
      </div>
    </div>
  );
}
