import { useState, useCallback, useEffect, useRef } from "react";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import type { ConnectionStatus } from "./hooks/useSpeechRecognition";
import { SubtitleProvider, useSubtitleContext } from "./context/SubtitleContext";
import { SubtitleList } from "./components/SubtitleList";
import { FloatingWindow } from "./components/FloatingWindow";

function getStatusText(status: ConnectionStatus, isListening: boolean): string {
  if (status === "connecting") return "连接中...";
  if (status === "connected") return isListening ? "监听中" : "已连接";
  if (status === "disconnected") return "已断开";
  return "待命";
}

function getStatusDotClass(status: ConnectionStatus, isListening: boolean): string {
  const base = "w-2 h-2 rounded-full ";
  if (status === "connecting") return base + "bg-yellow-500 animate-pulse";
  if (status === "connected" && isListening) return base + "bg-green-500 animate-pulse";
  if (status === "connected") return base + "bg-green-500";
  if (status === "disconnected") return base + "bg-red-400";
  return base + "bg-slate-300";
}

function AppInner() {
  const { items, addSubtitle, correctSubtitle, clearSubtitles } = useSubtitleContext();
  const popupRef = useRef<Window | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const handleFinalSentence = useCallback(
    (sourceText: string, timestamp: number): string => {
      return addSubtitle(sourceText, "", "final");
    },
    [addSubtitle]
  );

  const handleTranslationReady = useCallback(
    (id: string, translatedText: string) => {
      correctSubtitle(id, translatedText);
    },
    [correctSubtitle]
  );

  const { interimText, isListening, error, connectionStatus, start, stop } = useSpeechRecognition({
    onFinalSentence: handleFinalSentence,
    onTranslationReady: handleTranslationReady,
  });

  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (!broadcastRef.current) return;
    broadcastRef.current.postMessage({ type: "interim", text: interimText });
  }, [interimText]);

  const handleToggle = async () => {
    if (isListening) {
      stop();
      setStatusMsg("");
    } else {
      setStatusMsg("正在启动语音识别...");
      try {
        await start();
        setStatusMsg("语音识别已启动，请说话");
      } catch (e) {
        setStatusMsg("启动失败: " + (e as Error).message);
      }
    }
  };

  const handleClear = () => {
    if (items.length > 0 && window.confirm("确定要清空全部字幕吗？")) {
      clearSubtitles();
    }
  };

  const openPopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const w = 400;
    const h = 480;
    const left = window.screen.availWidth - w - 20;
    const top = window.screen.availHeight - h - 80;

    const popup = window.open(
      "/popup.html",
      "subtitle-popup",
      "width=" + w + ",height=" + h + ",left=" + left + ",top=" + top + ",resizable=yes,scrollbars=no"
    );

    if (popup) {
      popupRef.current = popup;
      broadcastRef.current = new BroadcastChannel("subtitle-interim");
    }
  };

  const statusText = getStatusText(connectionStatus, isListening);
  const dotClass = getStatusDotClass(connectionStatus, isListening);

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎙️</span>
          <h1 className="text-lg font-semibold text-slate-800">AI 同声传译助手</h1>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="清空字幕"
            >
              清空 ({items.length})
            </button>
          )}
          <button
            onClick={openPopup}
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors cursor-pointer border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-50"
            title="打开独立字幕窗口"
          >
            字幕窗
          </button>
          <span className={dotClass} />
          <span className="text-sm text-slate-400">{statusText}</span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden bg-slate-50">
        {statusMsg && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 text-sm">
            🔔 {statusMsg}
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        {!isListening && items.length === 0 && !error && !statusMsg && (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
            <span className="text-5xl mb-4">🎤</span>
            <p className="text-lg">点击下方按钮开始实时翻译</p>
            <p className="text-sm mt-1">说出英文，实时显示翻译结果</p>
          </div>
        )}
      </main>

      <footer className="px-6 py-4 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleToggle}
            className={
              "px-8 py-3 rounded-full font-medium transition-all cursor-pointer active:scale-95 " +
              (isListening
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-blue-500 text-white hover:bg-blue-600")
            }
          >
            {isListening ? "停止监听" : "开始监听"}
          </button>
        </div>
      </footer>

      {/* Floating window with subtitles */}
      <FloatingWindow interimText={interimText}>
        <SubtitleList interimText={interimText} transparent />
      </FloatingWindow>
    </div>
  );
}

function App() {
  return (
    <SubtitleProvider>
      <AppInner />
    </SubtitleProvider>
  );
}

export default App;
