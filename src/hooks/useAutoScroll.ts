import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseAutoScrollOptions {
  /**
   * Distance (px) from the container bottom that qualifies as
   * "at the bottom".  Default 50.
   */
  threshold?: number;
}

export interface UseAutoScrollReturn {
  /** True when the user has scrolled away from the bottom */
  isPaused: boolean;
  /** Force-scroll to bottom and unpause */
  scrollToBottom: () => void;
}

/**
 * Auto-scrolls a scrollable container to the bottom whenever
 * `trigger` changes, but pauses when the user manually scrolls
 * up more than `threshold` pixels from the bottom.  Resumes
 * automatically when the user scrolls back to the bottom.
 */
export function useAutoScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  trigger: unknown,
  options: UseAutoScrollOptions = {}
): UseAutoScrollReturn {
  const { threshold = 50 } = options;

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Keep ref in sync so scroll handler reads fresh value
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Check whether the container is currently scrolled to (near) the bottom
  const checkAtBottom = useCallback((): boolean => {
    const el = containerRef.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= threshold;
  }, [containerRef, threshold]);

  // Imperative scroll-to-bottom (also unpauses)
  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    setIsPaused(false);
  }, [containerRef]);

  // ----- Auto-scroll on trigger change -----
  useEffect(() => {
    if (!isPausedRef.current) {
      const el = containerRef.current;
      if (el) {
        // rAF ensures the DOM layout is settled before we measure
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    }
  }, [trigger, containerRef]);

  // ----- Detect user scroll: pause / resume -----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const atBottom = checkAtBottom();

      if (atBottom && isPausedRef.current) {
        // User scrolled back → resume
        setIsPaused(false);
      } else if (!atBottom && !isPausedRef.current) {
        // User scrolled away → pause
        setIsPaused(true);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, [containerRef, checkAtBottom]);

  return { isPaused, scrollToBottom };
}
