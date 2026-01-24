// Pause menu overlay

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Home, Pause } from 'lucide-react';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onRestart,
  onQuit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gold/30 rounded-2xl p-8 max-w-sm w-full mx-4 space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Pause className="w-8 h-8 text-gold-400" />
          <h2 className="text-2xl font-bold text-gold-400">Paused</h2>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onResume}
            className="w-full h-12 bg-gold-600 hover:bg-gold-500 text-black font-semibold"
          >
            <Play className="w-5 h-5 mr-2" />
            Resume
          </Button>

          <Button
            onClick={onRestart}
            variant="outline"
            className="w-full h-12 border-white/20 hover:bg-white/10 text-white"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Restart Session
          </Button>

          <Button
            onClick={onQuit}
            variant="outline"
            className="w-full h-12 border-red-500/50 hover:bg-red-500/20 text-red-400"
          >
            <Home className="w-5 h-5 mr-2" />
            Quit to Menu
          </Button>
        </div>

        <p className="text-center text-white/40 text-sm">
          Press ESC or P to resume
        </p>
      </div>
    </div>
  );
};
