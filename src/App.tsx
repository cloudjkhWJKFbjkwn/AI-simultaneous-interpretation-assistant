import { useState, useCallback, useEffect, useRef } from "react";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import type { ConnectionStatus } from "./hooks/useSpeechRecognition";
import { SubtitleProvider, useSubtitleContext } from "./context/SubtitleContext";
import { SubtitleList } from "./components/SubtitleList";
import { exportAsTxt, exportAsMarkdown, exportAsJson, type ExportFormat } from "./services/ExportService";
import { CorrectionService } from "./services/CorrectionService";
import { AsrPostProcessor } from "./services/AsrPostProcessor";
import { DeepSeekService } from "./services/DeepSeekService";

function getStatusText(status: ConnectionStatus, isListening: boolean): string {
  if (status === "connecting") return "连接中...";
  if (status === "connected") return isListening ? "监听中" : "已连接";
  if (status === "disconnected") return "已断开";
  return "待命";
}

function getStatusDotClass(status: ConnectionStatus, isListening: boolean): string {
  const base = "w-1.5 h-1.5 rounded-full ";
  if (status === "connecting") return base + "bg-amber-400 animate-pulse";
  if (status === "connected" && isListening) return base + "bg-emerald-400 animate-pulse";
  if (status === "connected") return base + "bg-emerald-400";
  if (status === "disconnected") return base + "bg-rose-400";
  return base + "bg-stone-300 dark:bg-stone-600";
}

function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("theme") === "dark"; }
    catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);
  return [dark, () => setDark(!dark)];
}

function AppInner() {
  const { items, addSubtitle, correctSubtitle, autoCorrectSubtitle, clearSubtitles, lastEvents } = useSubtitleContext();
  const popupRef = useRef<Window | null>(null);
  const interimChannelRef = useRef<BroadcastChannel | null>(null);
  const controlChannelRef = useRef<BroadcastChannel | null>(null);
  const isListeningRef = useRef(false);
  const startRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const stopRef = useRef<() => void>(() => {});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const itemsRef = useRef(items);
  const correctionRef = useRef(new CorrectionService());
  const asrPostRef = useRef(new AsrPostProcessor(new DeepSeekService()));
  const [dark, toggleDark] = useDarkMode();

  const [toast, setToast] = useState<{ type: "error" | "warn" | "info"; msg: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (type: "error" | "warn" | "info", msg: string) => {
    setToast({ type, msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (type !== "error") toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => {
    if (lastEvents.find(e => e.type === "overflow")) showToast("warn", "字幕已达上限，旧条目已自动清理");
  }, [lastEvents]);

  const handleIdle = useCallback(() => { showToast("info", "已监听 3 分钟无语音输入，请继续说话"); }, []);
  const handleErrorLimit = useCallback(() => {}, []);

  const handleFinalSentence = useCallback(
    (sourceText: string, timestamp: number): string => addSubtitle(sourceText, "", "final"), [addSubtitle]);

  const handleTranslationReady = useCallback(
    (id: string, translatedText: string) => {
      correctSubtitle(id, translatedText);
      const allItems = itemsRef.current;
      const currentItem = allItems.find((s) => s.id === id);
      if (!currentItem) return;
      const correction = correctionRef.current;
      if (!correction.shouldCorrect(currentItem.sourceText)) return;
      const finalItems = allItems.filter((s) => s.status === "final" && s.id !== id);
      const lookback = finalItems.slice(-correction.lookbackCount);
      for (const prev of lookback) {
        if (!correction.markProcessing(prev.id)) continue;
        const context = correction.buildCorrectionContext(prev.sourceText, currentItem.sourceText);
        import("./services/TranslationService").then(({ createTranslationService, getDefaultStrategy }) => {
          const strategy = getDefaultStrategy();
          return createTranslationService({
            strategy, baiduAppId: strategy === "baidu" ? "20260605002626604" : undefined,
          });
        }).then((ts) => ts.translate(context)).then((nt) => {
          autoCorrectSubtitle(prev.id, nt);
        }).catch(() => {}).finally(() => correction.clearProcessing(prev.id));
      }
    }, [correctSubtitle, autoCorrectSubtitle]);

  const { interimText, isListening, error, connectionStatus, start, stop } = useSpeechRecognition({
    onFinalSentence: handleFinalSentence, onTranslationReady: handleTranslationReady,
    asrPostProcessor: asrPostRef.current, onIdle: handleIdle, onErrorLimit: handleErrorLimit,
  });

  const [statusMsg, setStatusMsg] = useState("");
  const connecting = connectionStatus === "connecting";

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { startRef.current = start; }, [start]);
  useEffect(() => { stopRef.current = stop; }, [stop]);
  useEffect(() => { if (error) showToast("error", error); else if (!isListening && !error) setToast(null); }, [error, isListening]);
  useEffect(() => { if (!isListening) { correctionRef.current.reset(); asrPostRef.current.reset(); } }, [isListening]);
  useEffect(() => { if (!interimChannelRef.current) return; interimChannelRef.current.postMessage({ type: "interim", text: interimText }); }, [interimText]);
  useEffect(() => { if (!controlChannelRef.current) return; controlChannelRef.current.postMessage({ type: "status", isListening }); }, [isListening]);

  useEffect(() => {
    controlChannelRef.current = new BroadcastChannel("subtitle-control");
    controlChannelRef.current.onmessage = (e) => {
      if (e.data?.type === "toggle") isListeningRef.current ? stopRef.current() : startRef.current().catch(() => {});
    };
    return () => { controlChannelRef.current?.close(); controlChannelRef.current = null; };
  }, []);
  useEffect(() => { return () => interimChannelRef.current?.close(); }, []);

  const handleClear = () => {
    if (items.length > 0 && window.confirm("确定要清空全部字幕吗？")) {
      clearSubtitles(); correctionRef.current.reset(); asrPostRef.current.reset();
    }
  };

  const handleExport = (format: ExportFormat) => {
    const finalItems = items.filter((item) => item.status === "final");
    if (finalItems.length === 0) return;
    switch (format) { case "txt": exportAsTxt(finalItems); break; case "md": exportAsMarkdown(finalItems); break; case "json": exportAsJson(finalItems); break; }
    setShowExportMenu(false);
  };

  const handleRetry = async () => { setToast(null); try { await start(); } catch {} };

  const openPopup = () => {
    if (popupRef.current && !popupRef.current.closed) { popupRef.current.focus(); return; }
    const w = 500, h = 200;
    const left = Math.round((window.screen.availWidth - w) / 2), top = window.screen.availHeight - h - 40;
    const popup = window.open("/popup.html", "subtitle-popup", "width=" + w + ",height=" + h + ",left=" + left + ",top=" + top + ",resizable=yes,scrollbars=no");
    if (popup) {
      popupRef.current = popup;
      interimChannelRef.current = new BroadcastChannel("subtitle-interim");
      if (controlChannelRef.current) controlChannelRef.current.postMessage({ type: "status", isListening: isListeningRef.current });
      popup.addEventListener("beforeunload", () => { interimChannelRef.current?.close(); interimChannelRef.current = null; popupRef.current = null; });
    }
  };

  const handleToggle = async () => {
    if (isListening) { stop(); setStatusMsg(""); }
    else { setStatusMsg("正在启动语音识别..."); try { await start(); setStatusMsg("语音识别已启动，请说话"); } catch (e) { setStatusMsg("启动失败: " + (e as Error).message); } }
  };

  const statusText = getStatusText(connectionStatus, isListening);
  const dotClass = getStatusDotClass(connectionStatus, isListening);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-xl sm:text-2xl">🎙️</span>
          <h1 className="text-sm sm:text-base font-semibold text-stone-800 dark:text-stone-200 tracking-tight">AI 同声传译助手</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2.5">
          <button onClick={toggleDark}
            className="text-sm cursor-pointer p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={dark ? "切换亮色" : "切换暗色"}>
            {dark ? "☀️" : "🌙"}
          </button>

          {items.length > 0 && (
            <>
              <button onClick={handleClear}
                className="text-xs text-stone-400 hover:text-rose-500 dark:text-stone-500 dark:hover:text-rose-400 transition-colors cursor-pointer hidden sm:inline px-1.5 py-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800">
                清空 ({items.length})
              </button>
              <div className="relative">
                <button onClick={() => setShowExportMenu(!showExportMenu)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800 rounded-md px-2 py-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                  导出
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden">
                    <button onClick={() => handleExport("txt")} className="w-full text-left px-3.5 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer">TXT 纯文本</button>
                    <button onClick={() => handleExport("md")} className="w-full text-left px-3.5 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer">Markdown 表格</button>
                    <button onClick={() => handleExport("json")} className="w-full text-left px-3.5 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer">JSON 原始数据</button>
                  </div>
                )}
              </div>
            </>
          )}
          <button onClick={openPopup}
            className="text-xs font-medium text-white dark:text-white transition-all cursor-pointer bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 rounded-md px-2.5 py-1.5 shadow-sm">
            字幕窗
          </button>
          <span className={dotClass + " hidden sm:inline-block"} />
          <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">{statusText}</span>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={"mx-4 sm:mx-8 mt-3 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm flex items-center justify-between animate-[fadeIn_0.2s_ease-out] " +
          (toast.type === "error" ? "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300" :
           toast.type === "warn" ? "bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" :
           "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300")}>
          <span>{toast.type === "error" ? "⚠️" : toast.type === "warn" ? "💡" : "🔔"} {toast.msg}</span>
          <div className="flex items-center gap-2">
            {toast.type === "error" && (
              <button onClick={handleRetry} className="text-xs underline cursor-pointer hover:opacity-80 font-medium">重试</button>
            )}
            <button onClick={() => setToast(null)} className="text-base leading-none cursor-pointer opacity-40 hover:opacity-100">×</button>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {statusMsg && (
          <div className="mx-4 sm:mx-8 mt-3 p-2.5 sm:p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">
            🔔 {statusMsg}
          </div>
        )}

        {!isListening && items.length === 0 && !statusMsg && (
          <div className="flex flex-col items-center justify-center h-full text-stone-300 dark:text-stone-700">
            <span className="text-4xl sm:text-5xl mb-3 sm:mb-4 opacity-50">🎤</span>
            <p className="text-base sm:text-lg text-stone-400 dark:text-stone-500">点击下方按钮开始实时翻译</p>
            <p className="text-xs sm:text-sm mt-1 text-stone-300 dark:text-stone-600">说出英文，实时显示翻译结果</p>
          </div>
        )}

        <SubtitleList interimText={interimText} />
      </main>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-3 sm:py-4 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 transition-colors">
        <div className="flex items-center justify-center">
          <button onClick={handleToggle} disabled={connecting}
            className={
              "px-8 sm:px-10 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer active:scale-[0.97] " +
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 tracking-wide " +
              (isListening
                ? "bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 shadow-sm shadow-rose-200 dark:shadow-none"
                : "bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none")
            }>
            {connecting ? "连接中..." : isListening ? "■ 停止监听" : "● 开始监听"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function App() { return (<SubtitleProvider><AppInner /></SubtitleProvider>); }
export default App;
