function App() {
  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎙️</span>
          <h1 className="text-lg font-semibold text-slate-800">AI 同声传译助手</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="text-sm text-slate-400">待命</span>
        </div>
      </header>

      {/* Subtitle Area */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        <div className="flex flex-col items-center justify-center h-full text-slate-300">
          <span className="text-5xl mb-4">🎤</span>
          <p className="text-lg">点击下方按钮开始实时翻译</p>
          <p className="text-sm mt-1">使用 Chrome 或 Edge 浏览器获得最佳体验</p>
        </div>
      </main>

      {/* Control Bar */}
      <footer className="px-6 py-4 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-4">
          <button className="px-8 py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 active:scale-95 transition-all cursor-pointer">
            开始监听
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;