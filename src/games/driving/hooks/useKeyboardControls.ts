// Keyboard controls hook for driving game

import { useState, useEffect, useCallback } from 'react';
import { InputState } from '../physics';

export interface ExtendedInputState extends InputState {
  leftBlinker: boolean;
  rightBlinker: boolean;
  blindSpotCheck: boolean;
  pause: boolean;
}

export function useKeyboardControls() {
  const [input, setInput] = useState<ExtendedInputState>({
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    handbrake: false,
    reverse: false,
    leftBlinker: false,
    rightBlinker: false,
    blindSpotCheck: false,
    pause: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'w', 'a', 's', 'd', 'q', 'e', 'c'].includes(e.key)) {
      e.preventDefault();
    }

    setInput(prev => {
      const next = { ...prev };

      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          next.accelerate = true;
          break;
        case 'arrowdown':
        case 's':
          next.brake = true;
          next.reverse = true;
          break;
        case 'arrowleft':
        case 'a':
          next.steerLeft = true;
          break;
        case 'arrowright':
        case 'd':
          next.steerRight = true;
          break;
        case ' ':
          next.handbrake = true;
          break;
        case 'q':
          next.leftBlinker = !prev.leftBlinker;
          next.rightBlinker = false; // Turn off other blinker
          break;
        case 'e':
          next.rightBlinker = !prev.rightBlinker;
          next.leftBlinker = false; // Turn off other blinker
          break;
        case 'c':
          next.blindSpotCheck = true;
          break;
        case 'escape':
        case 'p':
          next.pause = true;
          break;
      }

      return next;
    });
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setInput(prev => {
      const next = { ...prev };

      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          next.accelerate = false;
          break;
        case 'arrowdown':
        case 's':
          next.brake = false;
          next.reverse = false;
          break;
        case 'arrowleft':
        case 'a':
          next.steerLeft = false;
          break;
        case 'arrowright':
        case 'd':
          next.steerRight = false;
          break;
        case ' ':
          next.handbrake = false;
          break;
        case 'c':
          next.blindSpotCheck = false;
          break;
        case 'escape':
        case 'p':
          next.pause = false;
          break;
      }

      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const resetBlinkers = useCallback(() => {
    setInput(prev => ({ ...prev, leftBlinker: false, rightBlinker: false }));
  }, []);

  return { input, resetBlinkers };
}
