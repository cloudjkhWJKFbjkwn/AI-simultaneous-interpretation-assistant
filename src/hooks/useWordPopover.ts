import { useState, useCallback, useEffect } from "react";

export interface WordPopoverState {
  word: string;
  definition: string;
  anchorRect: DOMRect | null;
  isOpen: boolean;
}

export interface UseWordPopoverReturn {
  state: WordPopoverState;
  openWord: (word: string, definition: string, rect: DOMRect) => void;
  closePopover: () => void;
}

export function useWordPopover(): UseWordPopoverReturn {
  const [state, setState] = useState<WordPopoverState>({
    word: "",
    definition: "",
    anchorRect: null,
    isOpen: false,
  });

  const openWord = useCallback(
    (word: string, definition: string, rect: DOMRect) => {
      setState({ word, definition, anchorRect: rect, isOpen: true });
    },
    []
  );

  const closePopover = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!state.isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.isOpen, closePopover]);

  return { state, openWord, closePopover };
}
