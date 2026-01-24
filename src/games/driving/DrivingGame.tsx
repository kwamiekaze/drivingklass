// Main DrivingKlass game component

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GameSettings, GameMap, SessionScore, Violation } from './types';
import { 
  createInitialCarState, 
  updateCarPhysics, 
  DEFAULT_PHYSICS,
  speedToMPH,
} from './physics';
import { 
  createInitialScore, 
  createScoringState, 
  evaluateDriving,
  handleDistraction,
} from './scoring';
import { generateCityMap, isOnLaneLine, getCurrentSpeedZone } from './map';
import { createAIVehicles, updateAIVehicles, updateTrafficLights } from './traffic';
import { renderGame, calculateCameraOffset } from './renderer';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { Dashboard } from './components/Dashboard';
import { GameHUD } from './components/GameHUD';
import { ReportCard } from './components/ReportCard';
import { DistractionModal } from './components/DistractionModal';
import { PauseMenu } from './components/PauseMenu';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
const GAME_DURATION = 180000; // 3 minutes

export const DrivingGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameScreen, setGameScreen] = useState<'dashboard' | 'playing' | 'report'>('dashboard');
  const [isPaused, setIsPaused] = useState(false);
  const [showDistraction, setShowDistraction] = useState(false);
  
  const [settings, setSettings] = useState<GameSettings>({
    trafficDensity: 'medium',
    weatherCondition: 'clear',
    difficulty: 'normal',
  });

  // Game state refs for performance
  const mapRef = useRef<GameMap | null>(null);
  const carRef = useRef(createInitialCarState({ x: 500, y: 400 }));
  const aiVehiclesRef = useRef<GameState['aiVehicles']>([]);
  const scoreRef = useRef<SessionScore>(createInitialScore());
  const violationsRef = useRef<Violation[]>([]);
  const scoringStateRef = useRef(createScoringState());
  const gameTimeRef = useRef(0);
  const lastDistractionRef = useRef(0);
  const cameraOffsetRef = useRef({ x: 0, y: 0 });

  const [displayScore, setDisplayScore] = useState<SessionScore>(createInitialScore());
  const [displayViolations, setDisplayViolations] = useState<Violation[]>([]);
  const [displayGameTime, setDisplayGameTime] = useState(0);
  const [displaySpeedLimit, setDisplaySpeedLimit] = useState(35);
  const [objective, setObjective] = useState('Drive safely through the city');

  const { input, resetBlinkers } = useKeyboardControls();

  // Initialize game
  const initializeGame = useCallback(() => {
    const map = generateCityMap();
    mapRef.current = map;
    
    // Start car at a safe location
    carRef.current = createInitialCarState({ x: 500, y: 400 });
    
    // Create AI traffic based on density
    const trafficCount = settings.trafficDensity === 'low' ? 5 : 
                         settings.trafficDensity === 'medium' ? 12 : 20;
    aiVehiclesRef.current = createAIVehicles(trafficCount, map.lanes);
    
    scoreRef.current = createInitialScore();
    violationsRef.current = [];
    scoringStateRef.current = createScoringState();
    gameTimeRef.current = 0;
    lastDistractionRef.current = 0;
    
    setDisplayScore(createInitialScore());
    setDisplayViolations([]);
    setDisplayGameTime(0);
    resetBlinkers();
  }, [settings.trafficDensity, resetBlinkers]);

  // Handle pause toggle from keyboard
  useEffect(() => {
    if (input.pause && gameScreen === 'playing') {
      setIsPaused(prev => !prev);
    }
  }, [input.pause, gameScreen]);

  // Game loop
  const gameLoop = useCallback((deltaTime: number) => {
    if (!mapRef.current || isPaused) return;

    const map = mapRef.current;
    const prevCar = { ...carRef.current };

    // Update car physics
    const carInput = {
      accelerate: input.accelerate,
      brake: input.brake,
      steerLeft: input.steerLeft,
      steerRight: input.steerRight,
      handbrake: input.handbrake,
      reverse: input.reverse,
    };

    carRef.current = updateCarPhysics(carRef.current, carInput, DEFAULT_PHYSICS, deltaTime);

    // Update blinker state on car
    carRef.current.leftBlinker = input.leftBlinker;
    carRef.current.rightBlinker = input.rightBlinker;
    if ((input.leftBlinker || input.rightBlinker) && !carRef.current.blinkerStartTime) {
      carRef.current.blinkerStartTime = gameTimeRef.current;
    } else if (!input.leftBlinker && !input.rightBlinker) {
      carRef.current.blinkerStartTime = null;
    }

    // Update blind spot check
    if (input.blindSpotCheck) {
      carRef.current.lastBlindSpotCheck = gameTimeRef.current;
    }

    // Update AI vehicles
    aiVehiclesRef.current = updateAIVehicles(
      aiVehiclesRef.current,
      map.lanes,
      map.trafficLights,
      carRef.current.position,
      deltaTime
    );

    // Update traffic lights
    map.trafficLights = updateTrafficLights(map.trafficLights, deltaTime);

    // Get current speed zone
    const speedZone = getCurrentSpeedZone(carRef.current.position, map.speedZones);
    const currentSpeedLimit = speedZone?.limit || 35;
    setDisplaySpeedLimit(currentSpeedLimit);

    // Check if on lane line
    const onLaneLine = isOnLaneLine(carRef.current.position, map.lanes);

    // Update highway status
    const isOnHighway = speedZone?.type === 'highway';

    // Evaluate driving
    const scoringResult = evaluateDriving(
      carRef.current,
      prevCar,
      scoreRef.current,
      violationsRef.current,
      scoringStateRef.current,
      aiVehiclesRef.current,
      currentSpeedLimit,
      onLaneLine,
      gameTimeRef.current,
      deltaTime
    );

    scoreRef.current = scoringResult.score;
    violationsRef.current = scoringResult.violations;
    scoringStateRef.current = scoringResult.scoringState;

    // Update game time
    gameTimeRef.current += deltaTime;

    // Random distraction events
    if (
      gameTimeRef.current - lastDistractionRef.current > 30000 && // Every 30 seconds
      Math.random() < 0.001 && // Low probability per frame
      !showDistraction
    ) {
      setShowDistraction(true);
      lastDistractionRef.current = gameTimeRef.current;
    }

    // Calculate camera offset
    cameraOffsetRef.current = calculateCameraOffset(
      carRef.current.position,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      map.width,
      map.height
    );

    // Render
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        renderGame(
          ctx,
          canvas,
          map,
          carRef.current,
          aiVehiclesRef.current,
          cameraOffsetRef.current,
          settings.weatherCondition === 'rain'
        );
      }
    }

    // Update display state periodically
    if (Math.floor(gameTimeRef.current / 100) !== Math.floor((gameTimeRef.current - deltaTime) / 100)) {
      setDisplayScore({ ...scoreRef.current });
      setDisplayViolations([...violationsRef.current]);
      setDisplayGameTime(gameTimeRef.current);
    }

    // Check game over
    if (gameTimeRef.current >= GAME_DURATION) {
      setGameScreen('report');
    }
  }, [input, isPaused, showDistraction, settings.weatherCondition]);

  useGameLoop(gameLoop, gameScreen === 'playing' && !isPaused);

  // Handle game start
  const handleStartGame = () => {
    initializeGame();
    setGameScreen('playing');
    setIsPaused(false);
  };

  // Handle distraction response
  const handleDistractionIgnore = () => {
    setShowDistraction(false);
    // Good choice - no penalty
  };

  const handleDistractionAnswer = () => {
    const result = handleDistraction(true, scoreRef.current, violationsRef.current);
    scoreRef.current = result.score;
    violationsRef.current = result.violations;
    setDisplayScore({ ...result.score });
    setDisplayViolations([...result.violations]);
    setShowDistraction(false);
  };

  // Handle game end
  const handleEndSession = () => {
    setGameScreen('report');
  };

  const handleRestart = () => {
    initializeGame();
    setGameScreen('playing');
    setIsPaused(false);
  };

  const handleQuitToMenu = () => {
    setGameScreen('dashboard');
    setIsPaused(false);
  };

  // Dashboard screen
  if (gameScreen === 'dashboard') {
    return (
      <Dashboard
        settings={settings}
        onSettingsChange={setSettings}
        onStartGame={handleStartGame}
      />
    );
  }

  // Report screen
  if (gameScreen === 'report') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <ReportCard
          isOpen={true}
          onClose={() => setGameScreen('dashboard')}
          onRestart={handleRestart}
          score={displayScore}
          violations={displayViolations}
          gameTime={displayGameTime}
        />
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      {/* Canvas Container */}
      <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-gold/30 rounded-lg"
        />

        {/* HUD Overlay */}
        <GameHUD
          car={carRef.current}
          speedLimit={displaySpeedLimit}
          objective={objective}
          score={displayScore}
          gameTime={displayGameTime}
          isReversing={carRef.current.isReversing}
        />

        {/* Pause Menu */}
        <PauseMenu
          isOpen={isPaused}
          onResume={() => setIsPaused(false)}
          onRestart={handleRestart}
          onQuit={handleQuitToMenu}
        />

        {/* Distraction Modal */}
        <DistractionModal
          isOpen={showDistraction}
          onIgnore={handleDistractionIgnore}
          onAnswer={handleDistractionAnswer}
        />
      </div>

      {/* End Session Button */}
      <div className="mt-4">
        <Button
          onClick={handleEndSession}
          variant="outline"
          className="border-red-500/50 hover:bg-red-500/20 text-red-400"
        >
          <Square className="w-4 h-4 mr-2" />
          End Session Early
        </Button>
      </div>
    </div>
  );
};

export default DrivingGame;
