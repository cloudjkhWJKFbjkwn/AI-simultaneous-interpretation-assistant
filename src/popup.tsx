import { useState, useEffect, useRef } from "react";

interface SubWindowItem {
  id: string;
  sourceText: string;
  translatedText: string;
}

const TEXT_COLORS = [
  "#ffffff", "#ffeb3b", "#00e5ff", "#76ff03", "#ff6e40", "#ea80fc", "#ff4081",
];
const STROKE_COLORS = [
  "rgba(0,0,0,0.9)", "rgba(30,80,200,0.85)", "rgba(200,30,30,0.85)",
  "rgba(0,150,50,0.85)", "rgba(150,20,150,0.85)",
];

function loadColor(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(key);
    if (v) return v;
  } catch { /* ignore */ }
  return fallback;
}

export function PopupApp() {
  const [items, setItems] = useState<SubWindowItem[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [prevItem, setPrevItem] = useState<SubWindowItem | null>(null);
  const [textColor, setTextColor] = useState(() => loadColor("popup-text-color", "#ffffff"));
  const [strokeColor, setStrokeColor] = useState(() => loadColor("popup-stroke-color", "rgba(0,0,0,0.9)"));
  const [pickerType, setPickerType] = useState<"text" | "stroke" | null>(null);
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

  useEffect(() => {
    try { localStorage.setItem("popup-text-color", textColor); } catch { /* ignore */ }
  }, [textColor]);
  useEffect(() => {
    try { localStorage.setItem("popup-stroke-color", strokeColor); } catch { /* ignore */ }
  }, [strokeColor]);

  const handleToggle = () => {
    if (controlChannelRef.current) {
      controlChannelRef.current.postMessage({ type: "toggle" });
    }
  };

  const current = items[items.length - 1];

  return (
    <div className="h-screen text-white flex flex-col select-none">
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-2">
        {prevItem && (
          <div className="text-center opacity-30 max-w-full">
            <p className="text-sm leading-relaxed break-words line-clamp-2"
              style={{ color: textColor, WebkitTextStroke: "1.5px " + strokeColor }}>
              {prevItem.sourceText}
            </p>
            {prevItem.translatedText && (
              <p className="text-xs mt-0.5"
                style={{ color: textColor, WebkitTextStroke: "1px " + strokeColor }}>
                {prevItem.translatedText}
              </p>
            )}
          </div>
        )}

        {current ? (
          <div className="text-center max-w-full">
            <p className="text-xl font-bold leading-relaxed break-words"
              style={{ color: textColor, WebkitTextStroke: "2px " + strokeColor }}>
              {current.sourceText}
            </p>
            {current.translatedText && (
              <p className="text-base mt-1.5"
                style={{ color: textColor, WebkitTextStroke: "1.5px " + strokeColor, opacity: 0.85 }}>
                {current.translatedText}
              </p>
            )}
          </div>
        ) : interimText ? (
          <div className="text-center max-w-full">
            <p className="text-xl italic opacity-60"
              style={{ color: textColor, WebkitTextStroke: "2px " + strokeColor }}>
              {interimText}
            </p>
          </div>
        ) : (
          <p className="text-white/20 text-sm text-center">等待字幕...</p>
        )}
      </div>

      <div className={"flex items-center justify-between px-3 py-1.5 shrink-0 transition-opacity duration-300 " +
        (showUI ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <div className="flex items-center gap-2 relative">
          {/* Text color picker */}
          <button
            onClick={() => setPickerType(pickerType === "text" ? null : "text")}
            className="text-white/40 hover:text-white/70 text-xs cursor-pointer transition-colors flex items-center gap-1"
            title="字体颜色"
          >
            <span className="inline-block w-3 h-3 rounded-full border border-white/30"
              style={{ background: textColor }} />
            A
          </button>
          {/* Stroke color picker */}
          <button
            onClick={() => setPickerType(pickerType === "stroke" ? null : "stroke")}
            className="text-white/40 hover:text-white/70 text-xs cursor-pointer transition-colors flex items-center gap-1"
            title="描边颜色"
          >
            <span className="inline-block w-3 h-3 rounded-full border border-white/30"
              style={{ background: strokeColor }} />
            ◼
          </button>

          {pickerType && (
            <div className="absolute bottom-full left-0 mb-1 flex gap-1.5 bg-black/70 backdrop-blur rounded-lg p-2 border border-white/10">
              {(pickerType === "text" ? TEXT_COLORS : STROKE_COLORS).map((c, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (pickerType === "text") setTextColor(c);
                    else setStrokeColor(c);
                    setPickerType(null);
                  }}
                  className={"w-6 h-6 rounded-full border-2 transition-all cursor-pointer " +
                    (c === (pickerType === "text" ? textColor : strokeColor)
                      ? "border-white scale-110"
                      : "border-white/20 hover:border-white/50")}
                  style={{ background: c }}
                />
              ))}
            </div>
          )}
        </div>

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
