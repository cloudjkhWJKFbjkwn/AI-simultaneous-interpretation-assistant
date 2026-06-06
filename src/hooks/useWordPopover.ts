import { useState, useCallback, useEffect } from "react";

export interface WordPopoverState {
  word: string;
  definition: string;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  loading: boolean;
}

export interface UseWordPopoverReturn {
  state: WordPopoverState;
  openWord: (word: string, rect: DOMRect) => void;
  updateDefinition: (definition: string) => void;
  closePopover: () => void;
}

export function useWordPopover(): UseWordPopoverReturn {
  const [state, setState] = useState<WordPopoverState>({
    word: "",
    definition: "",
    anchorRect: null,
    isOpen: false,
    loading: false,
  });

  const openWord = useCallback(
    (word: string, rect: DOMRect) => {
      setState({ word, definition: "", anchorRect: rect, isOpen: true, loading: true });
    },
    []
  );

  const updateDefinition = useCallback((definition: string) => {
    setState(prev => ({ ...prev, definition, loading: false }));
  }, []);

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

  return { state, openWord, updateDefinition, closePopover };
}
