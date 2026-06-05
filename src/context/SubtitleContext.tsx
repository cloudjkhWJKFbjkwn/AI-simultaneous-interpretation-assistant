import { createContext, useContext, type ReactNode } from 'react';
import { useSubtitleManager, type SubtitleManager } from '../hooks/useSubtitleManager';

const SubtitleContext = createContext<SubtitleManager | null>(null);

export function SubtitleProvider({ children }: { children: ReactNode }) {
  const manager = useSubtitleManager();
  return (
    <SubtitleContext.Provider value={manager}>
      {children}
    </SubtitleContext.Provider>
  );
}

export function useSubtitleContext(): SubtitleManager {
  const ctx = useContext(SubtitleContext);
  if (!ctx) {
    throw new Error('useSubtitleContext must be used within a SubtitleProvider');
  }
  return ctx;
}

export { SubtitleContext };