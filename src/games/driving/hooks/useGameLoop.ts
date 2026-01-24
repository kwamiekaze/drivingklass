// Game loop hook using requestAnimationFrame

import { useRef, useCallback, useEffect } from 'react';

export function useGameLoop(
  callback: (deltaTime: number) => void,
  isRunning: boolean
) {
  const frameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const loop = useCallback((currentTime: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = currentTime;
    }

    const deltaTime = Math.min(currentTime - lastTimeRef.current, 50); // Cap at 50ms
    lastTimeRef.current = currentTime;

    callbackRef.current(deltaTime);

    frameRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = 0;
      frameRef.current = requestAnimationFrame(loop);
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isRunning, loop]);
}
