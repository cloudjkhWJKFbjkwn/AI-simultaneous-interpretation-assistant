import { useReducer, useCallback } from "react";
import type { SubtitleItem, SubtitleAction, SubtitleStatus } from "../types";

function generateId(): string {
  return "sub_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();
}

const MAX_SUBTITLES = 500;

export interface SubtitleChangeEvent {
  type: "added" | "corrected" | "marked" | "cleared" | "statusUpdated";
  id?: string;
  version?: number;
}

interface SubtitleState {
  items: SubtitleItem[];
  lastEvents: SubtitleChangeEvent[];
}

function subtitleReducer(state: SubtitleState, action: SubtitleAction): SubtitleState {
  switch (action.type) {
    case "add": {
      let items = [...state.items, action.item];
      if (items.length > MAX_SUBTITLES) {
        items = items.slice(items.length - MAX_SUBTITLES);
      }
      return {
        items,
        lastEvents: [{ type: "added", id: action.item.id }],
      };
    }

    case "correct": {
      const items = state.items.map(s =>
        s.id === action.id
          ? { ...s, translatedText: action.newTranslatedText, version: s.version + 1 }
          : s
      );
      const target = items.find(s => s.id === action.id);
      return {
        items,
        lastEvents: [{ type: "corrected", id: action.id, version: target?.version }],
      };
    }

    case "toggleMark": {
      const items = state.items.map(s =>
        s.id === action.id ? { ...s, marked: !s.marked } : s
      );
      return {
        items,
        lastEvents: [{ type: "marked", id: action.id }],
      };
    }

    case "updateStatus": {
      const items = state.items.map(s =>
        s.id === action.id ? { ...s, status: action.status } : s
      );
      return {
        items,
        lastEvents: [{ type: "statusUpdated", id: action.id }],
      };
    }

    case "edit": {
      const editItems = state.items.map(s =>
        s.id === action.id
          ? {
              ...s,
              ...(action.sourceText !== undefined ? { sourceText: action.sourceText } : {}),
              ...(action.translatedText !== undefined ? { translatedText: action.translatedText } : {}),
              version: s.version + 1,
            }
          : s
      );
      return {
        items: editItems,
        lastEvents: [{ type: "corrected", id: action.id }],
      };
    }

    case "clear":
      return { items: [], lastEvents: [{ type: "cleared" }] };

    default:
      return state;
  }
}

export interface SubtitleManager {
  items: SubtitleItem[];
  lastEvents: SubtitleChangeEvent[];
  addSubtitle: (
    sourceText: string,
    translatedText: string,
    status?: SubtitleStatus
  ) => string;
  correctSubtitle: (id: string, newTranslatedText: string) => void;
  toggleMark: (id: string) => void;
  updateStatus: (id: string, status: SubtitleStatus) => void;
  clearSubtitles: () => void;
  editSubtitle: (id: string, sourceText?: string, translatedText?: string) => void;
}

export function useSubtitleManager(): SubtitleManager {
  const [state, dispatch] = useReducer(subtitleReducer, {
    items: [],
    lastEvents: [],
  });

  const addSubtitle = useCallback(
    (
      sourceText: string,
      translatedText: string,
      status: SubtitleStatus = "final"
    ): string => {
      const id = generateId();
      const item: SubtitleItem = {
        id,
        sourceText,
        translatedText,
        timestamp: Date.now(),
        marked: false,
        version: 0,
        status,
      };
      dispatch({ type: "add", item });
      return id;
    },
    []
  );

  const correctSubtitle = useCallback((id: string, newTranslatedText: string) => {
    dispatch({ type: "correct", id, newTranslatedText });
  }, []);

  const toggleMark = useCallback((id: string) => {
    dispatch({ type: "toggleMark", id });
  }, []);

  const updateStatus = useCallback((id: string, status: SubtitleStatus) => {
    dispatch({ type: "updateStatus", id, status });
  }, []);

  const clearSubtitles = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const editSubtitle = useCallback(
    (id: string, sourceText?: string, translatedText?: string) => {
      dispatch({ type: "edit", id, sourceText, translatedText });
    },
    []
  );

  return {
    items: state.items,
    lastEvents: state.lastEvents,
    addSubtitle,
    correctSubtitle,
    toggleMark,
    updateStatus,
    clearSubtitles,
    editSubtitle,
  };
}
