export type BallType = 'cue' | 'solid' | 'striped' | 'black';

export type PlayerType = 'player' | 'ai';

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export type GamePhase = 'waiting' | 'aiming' | 'shooting' | 'moving' | 'placing' | 'ended';

export type FoulType = 
  | 'none'
  | 'cue_ball_pocketed'
  | 'wrong_ball_first'
  | 'no_rail_hit'
  | 'black_ball_premature'
  | 'cue_ball_off_table'
  | 'black_with_cue'
  | 'three_consecutive';

export type WinReason = 
  | 'black_ball_pocketed'
  | 'opponent_three_fouls'
  | 'opponent_premature_black'
  | 'opponent_black_with_cue';

export type LoseReason = 
  | 'premature_black'
  | 'black_with_cue'
  | 'three_consecutive_fouls'
  | 'opponent_black_pocketed'
  | 'surrender'
  | 'cue_ball_pocketed'
  | 'cue_ball_off_table'
  | 'wrong_ball_first'
  | 'no_rail_hit'
  | 'opponent_premature_black'
  | 'opponent_black_with_cue'
  | 'opponent_three_fouls';

export interface Ball {
  id: number;
  type: BallType;
  number: number;
  x: number;
  y: number;
  radius: number;
  pocketed: boolean;
  body?: Matter.Body;
}

export interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export interface GameState {
  phase: GamePhase;
  currentPlayer: PlayerType;
  playerBallType: BallType | null;
  aiBallType: BallType | null;
  difficulty: DifficultyLevel;
  playerBallsRemaining: number;
  aiBallsRemaining: number;
  playerFoulCount: number;
  aiFoulCount: number;
  consecutiveFouls: number;
  lastFoul: FoulType;
  isBreakShot: boolean;
  ballInHand: boolean;
  balls: Ball[];
  pocketedBalls: Ball[];
  aimAngle: number;
  power: number;
  gameStartTime: number;
  gameEndTime: number;
  winReason: WinReason | null;
  loseReason: LoseReason | null;
  winner: PlayerType | null;
  canShoot: boolean;
  showGuide: boolean;
}

export interface GameRecord {
  id: string;
  date: number;
  duration: number;
  difficulty: DifficultyLevel;
  winner: PlayerType;
  playerFouls: number;
  aiFouls: number;
  winReason?: WinReason;
  loseReason?: LoseReason;
  playerBallType?: BallType;
  aiBallType?: BallType;
}

export interface AppSettings {
  soundEnabled: boolean;
  threeFoulRule: boolean;
  showAimGuide: boolean;
}

export interface AIShot {
  angle: number;
  power: number;
  targetBall: Ball | null;
}
