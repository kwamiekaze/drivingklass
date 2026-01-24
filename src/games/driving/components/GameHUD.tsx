// Heads-Up Display for driving simulation

import React from 'react';
import { CarState, SessionScore } from '../types';
import { speedToMPH } from '../physics';
import { ArrowLeft, ArrowRight, Gauge, AlertTriangle, Eye } from 'lucide-react';

interface GameHUDProps {
  car: CarState;
  speedLimit: number;
  objective: string;
  score: SessionScore;
  gameTime: number;
  isReversing: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  car,
  speedLimit,
  objective,
  score,
  gameTime,
  isReversing,
}) => {
  const currentSpeed = Math.round(speedToMPH(car.speed));
  const isOverSpeed = currentSpeed > speedLimit;
  const blinkerFlash = Math.floor(Date.now() / 500) % 2 === 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top Bar - Objective & Time */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="bg-black/80 backdrop-blur-sm border border-gold/30 rounded-lg px-6 py-2">
          <p className="text-gold-400 font-medium text-center">{objective}</p>
        </div>
        <div className="bg-black/60 rounded-full px-4 py-1">
          <span className="text-white/80 font-mono">{formatTime(gameTime)}</span>
        </div>
      </div>

      {/* Left Side - Blinkers */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
        <div
          className={`w-16 h-16 rounded-lg flex items-center justify-center transition-all ${
            car.leftBlinker && blinkerFlash
              ? 'bg-orange-500 shadow-lg shadow-orange-500/50'
              : 'bg-black/60 border border-white/20'
          }`}
        >
          <ArrowLeft className={`w-8 h-8 ${car.leftBlinker && blinkerFlash ? 'text-black' : 'text-white/40'}`} />
        </div>
        <div className="bg-black/60 border border-white/20 rounded-lg px-3 py-1 text-center">
          <span className="text-white/60 text-xs">Q</span>
        </div>
      </div>

      {/* Right Side - Blinkers */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
        <div
          className={`w-16 h-16 rounded-lg flex items-center justify-center transition-all ${
            car.rightBlinker && blinkerFlash
              ? 'bg-orange-500 shadow-lg shadow-orange-500/50'
              : 'bg-black/60 border border-white/20'
          }`}
        >
          <ArrowRight className={`w-8 h-8 ${car.rightBlinker && blinkerFlash ? 'text-black' : 'text-white/40'}`} />
        </div>
        <div className="bg-black/60 border border-white/20 rounded-lg px-3 py-1 text-center">
          <span className="text-white/60 text-xs">E</span>
        </div>
      </div>

      {/* Bottom Center - Speedometer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6">
        {/* Speed Display */}
        <div className="bg-black/80 backdrop-blur-sm border border-gold/30 rounded-2xl px-8 py-4 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-5 h-5 text-gold-400" />
            <span className="text-white/60 text-sm">SPEED</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-5xl font-bold font-mono ${
                isOverSpeed ? 'text-red-500' : 'text-white'
              }`}
            >
              {currentSpeed}
            </span>
            <span className="text-white/60 text-lg">MPH</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-white/40 text-sm">Limit:</span>
            <span className={`font-medium ${isOverSpeed ? 'text-red-400' : 'text-green-400'}`}>
              {speedLimit} MPH
            </span>
          </div>
          
          {/* Reverse indicator */}
          {isReversing && (
            <div className="mt-2 bg-red-600 rounded px-3 py-1">
              <span className="text-white font-bold text-sm">REVERSE</span>
            </div>
          )}
        </div>

        {/* Overall Score */}
        <div className="bg-black/80 backdrop-blur-sm border border-gold/30 rounded-2xl px-6 py-4 flex flex-col items-center">
          <span className="text-white/60 text-sm mb-1">SCORE</span>
          <span className={`text-4xl font-bold ${score.overall >= 8 ? 'text-gold-400' : score.overall >= 5 ? 'text-white' : 'text-red-500'}`}>
            {score.overall.toFixed(1)}
          </span>
          <span className="text-white/40 text-sm">/10</span>
        </div>
      </div>

      {/* Bottom Left - Controls Hint */}
      <div className="absolute bottom-4 left-4 bg-black/60 rounded-lg p-3 text-xs text-white/50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span>W/↑ - Accelerate</span>
          <span>S/↓ - Brake/Reverse</span>
          <span>A/D - Steer</span>
          <span>SPACE - Handbrake</span>
          <span>Q/E - Blinkers</span>
          <span>C - Check Mirrors</span>
        </div>
      </div>

      {/* Bottom Right - Blind Spot Check Indicator */}
      <div className="absolute bottom-4 right-4 bg-black/60 border border-white/20 rounded-lg p-3 flex items-center gap-2">
        <Eye className="w-5 h-5 text-white/60" />
        <div className="text-xs">
          <p className="text-white/60">Press C to check</p>
          <p className="text-white/40">blind spots</p>
        </div>
      </div>

      {/* Speed Warning */}
      {isOverSpeed && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 animate-pulse">
          <div className="bg-red-600/90 rounded-lg px-6 py-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white" />
            <span className="text-white font-bold">SLOW DOWN!</span>
          </div>
        </div>
      )}
    </div>
  );
};
