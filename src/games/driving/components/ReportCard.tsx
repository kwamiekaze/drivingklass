// Report Card modal showing final scores

import React from 'react';
import { SessionScore, Violation, SKILL_LABELS } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ReportCardProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  score: SessionScore;
  violations: Violation[];
  gameTime: number;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  isOpen,
  onClose,
  onRestart,
  score,
  violations,
  gameTime,
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (value: number) => {
    if (value >= 8) return 'text-gold-400';
    if (value >= 5) return 'text-white';
    return 'text-red-500';
  };

  const getBarColor = (value: number) => {
    if (value >= 8) return 'bg-gradient-to-r from-gold-600 to-gold-400';
    if (value >= 5) return 'bg-gradient-to-r from-blue-600 to-blue-400';
    return 'bg-gradient-to-r from-red-700 to-red-500';
  };

  const getGrade = (score: number): string => {
    if (score >= 9.5) return 'A+';
    if (score >= 9) return 'A';
    if (score >= 8.5) return 'A-';
    if (score >= 8) return 'B+';
    if (score >= 7.5) return 'B';
    if (score >= 7) return 'B-';
    if (score >= 6.5) return 'C+';
    if (score >= 6) return 'C';
    if (score >= 5.5) return 'C-';
    if (score >= 5) return 'D';
    return 'F';
  };

  const overallGrade = getGrade(score.overall);
  const passed = score.overall >= 7;

  const skillEntries = Object.entries(SKILL_LABELS) as [keyof Omit<SessionScore, 'overall'>, string][];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-b from-gray-900 to-black border border-gold/30 text-white max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-3 text-2xl">
            <Trophy className={`w-8 h-8 ${passed ? 'text-gold-400' : 'text-red-500'}`} />
            <span className="text-gold-400">DrivingKlass Report Card</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center mb-4">
          {/* Overall Score */}
          <div className="flex items-center gap-4 mb-2">
            {passed ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500" />
            )}
            <div className="text-center">
              <div className="text-6xl font-bold text-gold-400">{overallGrade}</div>
              <div className="text-white/60">
                {score.overall.toFixed(1)} / 10
              </div>
            </div>
          </div>
          <div className={`text-lg font-medium ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
          </div>
          <div className="text-white/40 text-sm">
            Session Time: {formatTime(gameTime)}
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {/* Skill Scores */}
          <div className="space-y-3">
            {skillEntries.map(([key, label]) => {
              const value = score[key];
              const violations_for_skill = violations.filter(v => v.skill === key);
              
              return (
                <div key={key} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/80">{label}</span>
                    <span className={`font-mono font-bold ${getScoreColor(value)}`}>
                      {value.toFixed(1)}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getBarColor(value)} transition-all duration-500`}
                      style={{ width: `${(value / 10) * 100}%` }}
                    />
                  </div>
                  
                  {/* Violations for this skill */}
                  {violations_for_skill.length > 0 && (
                    <div className="mt-1 pl-2 border-l-2 border-red-500/50">
                      {violations_for_skill.slice(0, 3).map((v, i) => (
                        <div key={i} className="text-xs text-red-400/80 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {v.message} (-{v.deduction})
                        </div>
                      ))}
                      {violations_for_skill.length > 3 && (
                        <div className="text-xs text-red-400/60">
                          +{violations_for_skill.length - 3} more violations
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-lg font-semibold text-gold-400 mb-2">Session Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Total Violations:</span>
                <span className="ml-2 text-white">{violations.length}</span>
              </div>
              <div>
                <span className="text-white/60">Points Deducted:</span>
                <span className="ml-2 text-red-400">
                  -{violations.reduce((acc, v) => acc + v.deduction, 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-3 mt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-white/20 hover:bg-white/10"
          >
            View Details
          </Button>
          <Button
            onClick={onRestart}
            className="flex-1 bg-gold-600 hover:bg-gold-500 text-black font-semibold"
          >
            Try Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
