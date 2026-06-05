import { useState, useCallback } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import type { ConnectionStatus } from './hooks/useSpeechRecognition';
import type { SubtitleItem } from './types';
import { SubtitleProvider, useSubtitleContext } from './context/SubtitleContext';

function getStatusText(status: ConnectionStatus, isListening: boolean): string {
  if (status === 'connecting') return '连接中...';
  if (status === 'connected') return isListening ? '监听中' : '已连接';
  if (status === 'disconnected') return '已断开';
  return '待命';
}

function getStatusDotClass(status: ConnectionStatus, isListening: boolean): string {
  const base = 'w-2 h-2 rounded-full ';
  if (status === 'connecting') return base + 'bg-yellow-500 animate-pulse';
  if (status === 'connected' && isListening) return base + 'bg-green-500 animate-pulse';
  if (status === 'connected') return base + 'bg-green-500';
  if (status === 'disconnected') return base + 'bg-red-400';
  return base + 'bg-slate-300';
}

function SubtitleCard({ item, onToggleMark }: { item: SubtitleItem; onToggleMark: (id: string) => void }) {
  return (
    <div
      className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm cursor-pointer hover:border-yellow-300 transition-colors"
      onClick={() => onToggleMark(item.id)}
    >
      <div className="flex items-start gap-2">
        {item.marked && <span className="text-yellow-400 text-sm mt-0.5 shrink-0">★</span>}
        <div className="min-w-0 flex-1">
          <p className="text-slate-800 text-sm leading-relaxed break-words">{item.sourceText}</p>
          {item.translatedText ? (
            <p className="text-blue-600 text-sm leading-relaxed mt-1 pt-1 border-t border-slate-100 break-words">
              {item.translatedText}
              {item.version > 0 && (
                <span className="text-xs text-slate-300 ml-1">v{item.version + 1}</span>
              )}
            </p>
          ) : (
            <p className="text-slate-300 text-xs mt-1 animate-pulse">翻译中...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const { items, addSubtitle, correctSubtitle, toggleMark, clearSubtitles } = useSubtitleContext();

  const handleFinalSentence = useCallback(
    (sourceText: string, timestamp: number): string => {
      return addSubtitle(sourceText, '', 'final');
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

  const [statusMsg, setStatusMsg] = useState('');

  const handleToggle = async () => {
    if (isListening) {
      stop();
      setStatusMsg('');
    } else {
      setStatusMsg('正在启动语音识别...');
      try {
        await start();
        setStatusMsg('语音识别已启动，请说话');
      } catch (e) {
        setStatusMsg('启动失败: ' + (e as Error).message);
      }
    }
  };

  const handleClear = () => {
    if (items.length > 0 && window.confirm('确定要清空全部字幕吗？')) {
      clearSubtitles();
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
          <span className={dotClass} />
          <span className="text-sm text-slate-400">{statusText}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-slate-50">
        {statusMsg && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 text-sm">
            🔧 {statusMsg}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
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

        {items.map(function (item) {
          return <SubtitleCard key={item.id} item={item} onToggleMark={toggleMark} />;
        })}

        {interimText && (
          <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-sm opacity-70">
            <p className="text-slate-500 text-sm italic">{interimText}</p>
          </div>
        )}
      </main>

      <footer className="px-6 py-4 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleToggle}
            className={
              'px-8 py-3 rounded-full font-medium transition-all cursor-pointer active:scale-95 ' +
              (isListening
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-500 text-white hover:bg-blue-600')
            }
          >
            {isListening ? '停止监听' : '开始监听'}
          </button>
        </div>
      </footer>
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