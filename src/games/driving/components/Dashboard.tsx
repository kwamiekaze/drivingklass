// Instructor Dashboard - Game start screen with settings

import React from 'react';
import { GameSettings } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Play, Settings, CloudRain, Users, Gauge } from 'lucide-react';

interface DashboardProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onStartGame: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  settings,
  onSettingsChange,
  onStartGame,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <Car className="w-8 h-8 text-black" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gold-400">DrivingKlass</h1>
          <p className="text-white/60">Driving Simulation & Assessment Tool</p>
        </div>

        {/* Settings Card */}
        <Card className="bg-gray-900/80 border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gold-400">
              <Settings className="w-5 h-5" />
              Simulation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Traffic Density */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-white/60" />
                <Label className="text-white">Traffic Density</Label>
              </div>
              <Select
                value={settings.trafficDensity}
                onValueChange={(value: 'low' | 'medium' | 'high') =>
                  onSettingsChange({ ...settings, trafficDensity: value })
                }
              >
                <SelectTrigger className="w-32 bg-black/50 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weather */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CloudRain className="w-5 h-5 text-white/60" />
                <Label className="text-white">Rain Effect</Label>
              </div>
              <Switch
                checked={settings.weatherCondition === 'rain'}
                onCheckedChange={(checked) =>
                  onSettingsChange({
                    ...settings,
                    weatherCondition: checked ? 'rain' : 'clear',
                  })
                }
              />
            </div>

            {/* Difficulty */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gauge className="w-5 h-5 text-white/60" />
                <Label className="text-white">Difficulty</Label>
              </div>
              <Select
                value={settings.difficulty}
                onValueChange={(value: 'easy' | 'normal' | 'hard') =>
                  onSettingsChange({ ...settings, difficulty: value })
                }
              >
                <SelectTrigger className="w-32 bg-black/50 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Controls Reference */}
        <Card className="bg-gray-900/80 border-gold/20">
          <CardHeader>
            <CardTitle className="text-gold-400">Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">Accelerate</span>
                  <span className="text-white font-mono">W / ↑</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Brake / Reverse</span>
                  <span className="text-white font-mono">S / ↓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Steer</span>
                  <span className="text-white font-mono">A/D / ←/→</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">Left Blinker</span>
                  <span className="text-white font-mono">Q</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Right Blinker</span>
                  <span className="text-white font-mono">E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Check Mirrors</span>
                  <span className="text-white font-mono">C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Handbrake</span>
                  <span className="text-white font-mono">SPACE</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <Button
          onClick={onStartGame}
          size="lg"
          className="w-full h-16 text-xl bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold shadow-lg shadow-gold/25"
        >
          <Play className="w-6 h-6 mr-3" />
          Start Driving Session
        </Button>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm">
          Focus on precision, safety, and adherence to traffic laws.
        </p>
      </div>
    </div>
  );
};
