import { useSpeechRecognition } from './hooks/useSpeechRecognition';

function App() {
  const {
    interimText,
    completedSentences,
    isListening,
    error,
    isSupported,
    start,
    stop,
  } = useSpeechRecognition();

  const handleToggle = async () => {
    if (isListening) {
      stop();
    } else {
      await start();
    }
  };

  const statusDotClass = isListening
    ? 'w-2 h-2 rounded-full bg-green-500 animate-pulse'
    : 'w-2 h-2 rounded-full bg-slate-300';

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎙️</span>
          <h1 className="text-lg font-semibold text-slate-800">AI 同声传译助手</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={statusDotClass} />
          <span className="text-sm text-slate-400">
            {isListening ? '监听中' : '待命'}
          </span>
        </div>
      </header>

      {/* Subtitle Area */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-slate-50">
        {!isListening && completedSentences.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
            <span className="text-5xl mb-4">🎤</span>
            <p className="text-lg">
              {isSupported
                ? '点击下方按钮开始实时翻译'
                : '您的浏览器不支持语音识别'}
            </p>
            <p className="text-sm mt-1">
              {isSupported
                ? '使用 Chrome 或 Edge 浏览器获得最佳体验'
                : '请使用 Chrome 或 Edge 浏览器打开'}
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Recognized sentences */}
        {completedSentences.map((sentence, idx) => (
          <div
            key={idx}
            className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm"
          >
            <p className="text-slate-800 text-sm leading-relaxed">{sentence}</p>
          </div>
        ))}

        {/* Interim text */}
        {interimText && (
          <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-sm opacity-70">
            <p className="text-slate-500 text-sm italic">{interimText}</p>
          </div>
        )}
      </main>

      {/* Control Bar */}
      <footer className="px-6 py-4 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleToggle}
            disabled={!isSupported}
            className={`px-8 py-3 rounded-full font-medium transition-all cursor-pointer active:scale-95 ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isListening ? '停止监听' : '开始监听'}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;