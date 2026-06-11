import { create } from 'zustand';
import { GameState, DifficultyLevel, Ball, BallType, FoulType, WinReason, LoseReason, PlayerType } from '../types/game';
import { createInitialBalls } from '../game/constants';

interface GameStore extends GameState {
  setDifficulty: (difficulty: DifficultyLevel) => void;
  initGame: () => void;
  setPhase: (phase: GameState['phase']) => void;
  setAimAngle: (angle: number) => void;
  setPower: (power: number) => void;
  setCurrentPlayer: (player: PlayerType) => void;
  setBallInHand: (value: boolean) => void;
  setBallTypes: (playerType: BallType | null, aiType: BallType | null) => void;
  updateBalls: (balls: Ball[]) => void;
  markBallPocketed: (ballId: number) => Ball | null;
  setLastFoul: (foul: FoulType) => void;
  incrementFoulCount: (player: PlayerType) => void;
  resetConsecutiveFouls: () => void;
  updateRemainingBalls: () => void;
  endGame: (winner: PlayerType, winReason: WinReason | null, loseReason: LoseReason | null) => void;
  setCanShoot: (value: boolean) => void;
  setShowGuide: (value: boolean) => void;
  setIsBreakShot: (value: boolean) => void;
  resetGame: () => void;
}

const initialState: GameState = {
  phase: 'waiting',
  currentPlayer: 'player',
  playerBallType: null,
  aiBallType: null,
  difficulty: 'normal',
  playerBallsRemaining: 7,
  aiBallsRemaining: 7,
  playerFoulCount: 0,
  aiFoulCount: 0,
  consecutiveFouls: 0,
  lastFoul: 'none',
  isBreakShot: true,
  ballInHand: false,
  balls: [],
  pocketedBalls: [],
  aimAngle: 0,
  power: 10,
  gameStartTime: 0,
  gameEndTime: 0,
  winReason: null,
  loseReason: null,
  winner: null,
  canShoot: false,
  showGuide: true,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setDifficulty: (difficulty) => set({ difficulty }),

  initGame: () => set({
    ...initialState,
    balls: createInitialBalls(),
    gameStartTime: Date.now(),
    phase: 'aiming',
    canShoot: true,
    difficulty: get().difficulty,
  }),

  setPhase: (phase) => set({ phase }),

  setAimAngle: (angle) => set({ aimAngle: angle }),

  setPower: (power) => set({ power: Math.max(2, Math.min(20, power)) }),

  setCurrentPlayer: (player) => set({ currentPlayer: player }),

  setBallInHand: (value) => set({ ballInHand: value }),

  setBallTypes: (playerType, aiType) => set({
    playerBallType: playerType,
    aiBallType: aiType,
  }),

  updateBalls: (balls) => set({ balls }),

  markBallPocketed: (ballId) => {
    const { balls, pocketedBalls } = get();
    const ballIndex = balls.findIndex(b => b.id === ballId);
    if (ballIndex === -1) return null;

    const ball = { ...balls[ballIndex], pocketed: true };
    const newBalls = [...balls];
    newBalls[ballIndex] = ball;

    set({
      balls: newBalls,
      pocketedBalls: [...pocketedBalls, ball],
    });

    return ball;
  },

  setLastFoul: (foul) => set({ lastFoul: foul }),

  incrementFoulCount: (player) => {
    const { playerFoulCount, aiFoulCount, consecutiveFouls } = get();
    if (player === 'player') {
      set({
        playerFoulCount: playerFoulCount + 1,
        consecutiveFouls: consecutiveFouls + 1,
      });
    } else {
      set({
        aiFoulCount: aiFoulCount + 1,
        consecutiveFouls: 0,
      });
    }
  },

  resetConsecutiveFouls: () => set({ consecutiveFouls: 0 }),

  updateRemainingBalls: () => {
    const { balls, playerBallType, aiBallType } = get();
    const playerRemaining = balls.filter(
      b => !b.pocketed && b.type === playerBallType
    ).length;
    const aiRemaining = balls.filter(
      b => !b.pocketed && b.type === aiBallType
    ).length;
    set({
      playerBallsRemaining: playerBallType ? playerRemaining : 7,
      aiBallsRemaining: aiBallType ? aiRemaining : 7,
    });
  },

  endGame: (winner, winReason, loseReason) => set({
    phase: 'ended',
    winner,
    winReason,
    loseReason,
    gameEndTime: Date.now(),
    canShoot: false,
  }),

  setCanShoot: (value) => set({ canShoot: value }),

  setShowGuide: (value) => set({ showGuide: value }),

  setIsBreakShot: (value) => set({ isBreakShot: value }),

  resetGame: () => set({
    ...initialState,
    balls: createInitialBalls(),
    gameStartTime: Date.now(),
    phase: 'aiming',
    canShoot: true,
    difficulty: get().difficulty,
  }),
}));
