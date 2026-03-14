import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Detects whether the user is actively scrolling.
 * Returns isScrolling boolean that becomes true during scroll
 * and false ~200ms after scrolling stops.
 */
export function useScrollActive(delay = 200) {
  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsScrolling(false), delay);
  }, [delay]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleScroll]);

  return isScrolling;
}
