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
  const [prevItem, setPrevItem] = useState<SubWindowItem | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        const all = e.data.items;
        setItems(all);
        if (all.length >= 2) {
          setPrevItem(all[all.length - 2]);
        }
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

  const current = items[items.length - 1];

  return (
    <div className="h-screen text-white flex flex-col select-none">
      {/* Lyric area - no background */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-2">
        {prevItem && (
          <div className="text-center opacity-25 max-w-full">
            <p className="text-sm leading-relaxed break-words line-clamp-2"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)" }}>
              {prevItem.sourceText}
            </p>
            {prevItem.translatedText && (
              <p className="text-xs text-blue-300/60 mt-0.5"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
                {prevItem.translatedText}
              </p>
            )}
          </div>
        )}

        {current ? (
          <div className="text-center max-w-full">
            <p className="text-xl font-bold leading-relaxed break-words"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,1)" }}>
              {current.sourceText}
            </p>
            {current.translatedText && (
              <p className="text-base text-blue-300 mt-1.5"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.9)" }}>
                {current.translatedText}
              </p>
            )}
          </div>
        ) : interimText ? (
          <div className="text-center max-w-full">
            <p className="text-xl italic opacity-60"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,1)" }}>
              {interimText}
            </p>
          </div>
        ) : (
          <p className="text-white/20 text-sm text-center">等待字幕...</p>
        )}
      </div>

      {/* Minimal control: only visible on hover */}
      <div className={"flex items-center justify-end px-3 py-1.5 shrink-0 transition-opacity duration-300 " +
        (showUI ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button
          onClick={handleToggle}
          className={
            "px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer " +
            (isListening
              ? "bg-red-500/50 text-white hover:bg-red-500/80"
              : "bg-blue-500/50 text-white hover:bg-blue-500/80")
          }
        >
          {isListening ? "停止" : "开始"}
        </button>
      </div>
    </div>
  );
}
