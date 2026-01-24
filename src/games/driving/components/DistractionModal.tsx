// Distraction modal that tests driver focus

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';

interface DistractionModalProps {
  isOpen: boolean;
  onIgnore: () => void;
  onAnswer: () => void;
}

export const DistractionModal: React.FC<DistractionModalProps> = ({
  isOpen,
  onIgnore,
  onAnswer,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm bg-gradient-to-b from-gray-900 to-black border border-gold/30 text-white">
        <div className="flex flex-col items-center py-4">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4 animate-pulse">
            <Phone className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">Incoming Call</h2>
          <p className="text-white/60 text-center mb-6">
            Your phone is ringing while driving...
          </p>

          <div className="flex gap-4 w-full">
            <Button
              onClick={onIgnore}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Ignore
            </Button>
            <Button
              onClick={onAnswer}
              variant="destructive"
              className="flex-1"
            >
              <Phone className="w-4 h-4 mr-2" />
              Answer
            </Button>
          </div>

          <p className="text-xs text-white/40 mt-4 text-center">
            Safe drivers ignore distractions!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
