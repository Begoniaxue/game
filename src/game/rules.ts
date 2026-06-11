import { Ball, BallType, FoulType, GameState, PlayerType, WinReason, LoseReason } from '../types/game';
import { PLAYFIELD_LEFT, PLAYFIELD_RIGHT, PLAYFIELD_TOP, PLAYFIELD_BOTTOM, BALL_RADIUS } from './constants';

export class GameRules {
  static isPlayerBall(ball: Ball, playerType: BallType | null): boolean {
    if (!playerType) return false;
    return ball.type === playerType;
  }

  static getRemainingBalls(balls: Ball[], type: BallType): number {
    return balls.filter(b => b.type === type && !b.pocketed).length;
  }

  static canHitBlackEight(state: GameState, player: PlayerType): boolean {
    const playerType = player === 'player' ? state.playerBallType : state.aiBallType;
    if (!playerType) return false;
    return this.getRemainingBalls(state.balls, playerType) === 0;
  }

  static checkFirstHit(
    firstHitId: number | null,
    balls: Ball[],
    currentPlayer: PlayerType,
    playerBallType: BallType | null,
    aiBallType: BallType | null,
    isBreakShot: boolean,
    canHitBlack: boolean
  ): { valid: boolean; foul: FoulType } {
    if (firstHitId === null) {
      return { valid: false, foul: 'no_rail_hit' };
    }

    const firstHitBall = balls.find(b => b.id === firstHitId);
    if (!firstHitBall) {
      return { valid: false, foul: 'no_rail_hit' };
    }

    if (isBreakShot) {
      return { valid: true, foul: 'none' };
    }

    const currentType = currentPlayer === 'player' ? playerBallType : aiBallType;

    if (firstHitBall.type === 'black') {
      if (canHitBlack) {
        return { valid: true, foul: 'none' };
      } else {
        return { valid: false, foul: 'wrong_ball_first' };
      }
    }

    if (currentType && firstHitBall.type !== currentType) {
      return { valid: false, foul: 'wrong_ball_first' };
    }

    return { valid: true, foul: 'none' };
  }

  static checkRailHit(
    hasHitCushion: boolean,
    pocketedCount: number,
    isBreakShot: boolean
  ): { valid: boolean; foul: FoulType } {
    if (isBreakShot) {
      if (pocketedCount > 0 || hasHitCushion) {
        return { valid: true, foul: 'none' };
      }
      return { valid: false, foul: 'no_rail_hit' };
    }

    if (pocketedCount > 0 || hasHitCushion) {
      return { valid: true, foul: 'none' };
    }

    return { valid: false, foul: 'no_rail_hit' };
  }

  static determineBallTypeAssignment(
    pocketedBalls: Ball[],
    isBreakShot: boolean
  ): { playerType: BallType | null; aiType: BallType | null } {
    if (!isBreakShot) {
      return { playerType: null, aiType: null };
    }

    const solidPocketed = pocketedBalls.filter(b => b.type === 'solid').length;
    const stripedPocketed = pocketedBalls.filter(b => b.type === 'striped').length;

    if (solidPocketed > 0 && stripedPocketed === 0) {
      return { playerType: 'solid', aiType: 'striped' };
    }
    if (stripedPocketed > 0 && solidPocketed === 0) {
      return { playerType: 'striped', aiType: 'solid' };
    }

    return { playerType: null, aiType: null };
  }

  static checkWinLoseConditions(
    state: GameState,
    currentPlayer: PlayerType,
    pocketedThisShot: Ball[],
    cueBallPocketed: boolean,
    threeFoulRule: boolean
  ): { winner: PlayerType | null; winReason: WinReason | null; loseReason: LoseReason | null } {
    const blackPocketed = pocketedThisShot.some(b => b.type === 'black');
    const currentType = currentPlayer === 'player' ? state.playerBallType : state.aiBallType;
    const opponent = currentPlayer === 'player' ? 'ai' : 'player';
    const canHitBlack = currentType && this.getRemainingBalls(state.balls, currentType) === 0;

    if (blackPocketed) {
      if (cueBallPocketed) {
        const playerWins = opponent === 'player';
        return {
          winner: opponent,
          winReason: playerWins ? 'opponent_black_with_cue' : null,
          loseReason: playerWins ? null : 'black_with_cue',
        };
      }

      if (!canHitBlack) {
        const playerWins = opponent === 'player';
        return {
          winner: opponent,
          winReason: playerWins ? 'opponent_premature_black' : null,
          loseReason: playerWins ? null : 'premature_black',
        };
      }

      const playerWins = currentPlayer === 'player';
      return {
        winner: currentPlayer,
        winReason: playerWins ? 'black_ball_pocketed' : null,
        loseReason: playerWins ? null : 'opponent_black_pocketed',
      };
    }

    if (threeFoulRule) {
      const currentFouls = currentPlayer === 'player' ? state.consecutiveFouls : state.aiFoulCount;
      if (currentFouls >= 3) {
        const playerWins = opponent === 'player';
        return {
          winner: opponent,
          winReason: playerWins ? 'opponent_three_fouls' : null,
          loseReason: playerWins ? null : 'three_consecutive_fouls',
        };
      }
    }

    return { winner: null, winReason: null, loseReason: null };
  }

  static isValidCueBallPosition(x: number, y: number, balls: Ball[]): boolean {
    if (
      x < PLAYFIELD_LEFT + BALL_RADIUS ||
      x > PLAYFIELD_RIGHT - BALL_RADIUS ||
      y < PLAYFIELD_TOP + BALL_RADIUS ||
      y > PLAYFIELD_BOTTOM - BALL_RADIUS
    ) {
      return false;
    }

    for (const ball of balls) {
      if (ball.id === 0 || ball.pocketed) continue;
      const dist = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
      if (dist < BALL_RADIUS * 2 + 1) {
        return false;
      }
    }

    return true;
  }

  static checkBreakShotBlackPocketed(pocketedBalls: Ball[]): boolean {
    return pocketedBalls.some(b => b.type === 'black');
  }

  static shouldSwitchPlayer(
    pocketedValidBalls: Ball[],
    hasFoul: boolean,
    isBreakShot: boolean,
    ballTypeAssigned: boolean
  ): boolean {
    if (hasFoul) return true;
    if (isBreakShot && !ballTypeAssigned) return true;
    return pocketedValidBalls.length === 0;
  }
}
