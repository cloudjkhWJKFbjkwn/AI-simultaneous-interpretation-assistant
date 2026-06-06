import { useState, useEffect, useRef } from 'react';

export interface DragPosition {
  x: number;
  y: number;
}

export interface UseDragOptions {
  /** localStorage key for persisting position */
  storageKey?: string;
  /** Minimum distance from viewport edges in pixels */
  boundaryPadding?: number;
  /** Initial position when no saved position exists */
  defaultPosition?: DragPosition;
}

export interface UseDragReturn {
  x: number;
  y: number;
  isDragging: boolean;
}

/**
 * Reusable drag hook — tracks mouse-driven element position
 * with viewport boundary clamping and localStorage persistence.
 *
 * Attach the returned { x, y } to the element's style via
 * `transform: translate(x, y)` or `left` / `top` on a
 * `position: fixed` / `position: absolute` element.
 */
export function useDrag(
  ref: React.RefObject<HTMLElement | null>,
  options: UseDragOptions = {}
): UseDragReturn {
  const {
    storageKey = 'floating-window-position',
    boundaryPadding = 0,
    defaultPosition = { x: 0, y: 0 },
  } = options;

  const [position, setPosition] = useState<DragPosition>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.x === 'number' && typeof saved.y === 'number') {
          return saved;
        }
      }
    } catch {
      /* corrupted data — fall through to default */
    }
    return defaultPosition;
  });

  const [isDragging, setIsDragging] = useState(false);

  // Refs avoid stale closures in the persistent event listeners
  const isDraggingRef = useRef(false);
  const offsetRef = useRef<DragPosition>({ x: 0, y: 0 });
  const startRef = useRef<DragPosition>({ x: 0, y: 0 });
  const positionRef = useRef(position);

  // Keep positionRef in sync with React state
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clamp = (x: number, y: number): DragPosition => {
      if (!el) return { x, y };
      const rect = el.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - boundaryPadding;
      const maxY = window.innerHeight - rect.height - boundaryPadding;
      return {
        x: Math.max(boundaryPadding, Math.min(x, maxX)),
        y: Math.max(boundaryPadding, Math.min(y, maxY)),
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      // Only respond to primary (left) button
      if (e.button !== 0) return;

      isDraggingRef.current = true;
      setIsDragging(true);
      startRef.current = { x: e.clientX, y: e.clientY };
      offsetRef.current = { ...positionRef.current };
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;

      const next = clamp(
        offsetRef.current.x + dx,
        offsetRef.current.y + dy
      );
      positionRef.current = next;
      setPosition(next);
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDragging(false);

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(positionRef.current)
        );
      } catch {
        /* storage full or unavailable — silently ignore */
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [ref, storageKey, boundaryPadding]);

  return { x: position.x, y: position.y, isDragging };
}
