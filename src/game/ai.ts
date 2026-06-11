import { AIShot, Ball, BallType, DifficultyLevel } from '../types/game';
import { POCKETS, MAX_POWER, MIN_POWER, BALL_RADIUS, PLAYFIELD_LEFT, PLAYFIELD_RIGHT, PLAYFIELD_TOP, PLAYFIELD_BOTTOM } from './constants';

export class AIPlayer {
  private difficulty: DifficultyLevel;

  constructor(difficulty: DifficultyLevel) {
    this.difficulty = difficulty;
  }

  public calculateShot(
    cueBall: Ball,
    balls: Ball[],
    targetType: BallType | null,
    canHitBlack: boolean
  ): AIShot {
    const availableTargets = this.getAvailableTargets(balls, targetType, canHitBlack);
    
    if (availableTargets.length === 0) {
      return this.calculateSafetyShot(cueBall, balls);
    }

    const bestTarget = this.selectBestTarget(cueBall, availableTargets);
    const pocket = this.selectBestPocket(bestTarget, balls);
    
    const baseAngle = this.calculateAngle(cueBall, bestTarget, pocket);
    const basePower = this.calculatePower(cueBall, bestTarget, pocket);

    const angle = this.applyAccuracyVariance(baseAngle);
    const power = this.applyPowerVariance(basePower);

    return {
      angle,
      power,
      targetBall: bestTarget,
    };
  }

  private getAvailableTargets(balls: Ball[], targetType: BallType | null, canHitBlack: boolean): Ball[] {
    return balls.filter(ball => {
      if (ball.pocketed || ball.type === 'cue') return false;
      if (ball.type === 'black') return canHitBlack;
      if (targetType) return ball.type === targetType;
      return ball.type === 'solid' || ball.type === 'striped';
    });
  }

  private selectBestTarget(cueBall: Ball, targets: Ball[]): Ball {
    if (this.difficulty === 'easy') {
      return targets[Math.floor(Math.random() * targets.length)];
    }

    let bestScore = -Infinity;
    let bestTarget = targets[0];

    for (const target of targets) {
      const score = this.evaluateTarget(cueBall, target, targets);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    }

    return bestTarget;
  }

  private evaluateTarget(cueBall: Ball, target: Ball, allTargets: Ball[]): number {
    const distance = Math.sqrt(
      (target.x - cueBall.x) ** 2 + (target.y - cueBall.y) ** 2
    );
    
    let score = 1000 - distance;

    if (this.difficulty === 'hard') {
      const angleToCenter = Math.atan2(
        (PLAYFIELD_TOP + PLAYFIELD_BOTTOM) / 2 - target.y,
        (PLAYFIELD_LEFT + PLAYFIELD_RIGHT) / 2 - target.x
      );
      score += Math.abs(angleToCenter) * 10;

      for (const other of allTargets) {
        if (other.id === target.id) continue;
        const distToOther = Math.sqrt(
          (target.x - other.x) ** 2 + (target.y - other.y) ** 2
        );
        if (distToOther < BALL_RADIUS * 4) {
          score -= 50;
        }
      }
    }

    return score;
  }

  private selectBestPocket(target: Ball, balls: Ball[]): typeof POCKETS[0] {
    let bestScore = -Infinity;
    let bestPocket = POCKETS[0];

    for (const pocket of POCKETS) {
      const distance = Math.sqrt(
        (pocket.x - target.x) ** 2 + (pocket.y - target.y) ** 2
      );
      
      let score = 1000 - distance;
      
      if (this.difficulty === 'hard') {
        const angle = Math.atan2(pocket.y - target.y, pocket.x - target.x);
        const blocked = this.isPathBlocked(target, pocket, angle, balls);
        if (blocked) score -= 500;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPocket = pocket;
      }
    }

    return bestPocket;
  }

  private isPathBlocked(from: { x: number; y: number }, to: { x: number; y: number }, angle: number, balls: Ball[]): boolean {
    const step = BALL_RADIUS;
    const distance = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    const steps = Math.floor(distance / step);

    for (let i = 1; i < steps; i++) {
      const px = from.x + Math.cos(angle) * step * i;
      const py = from.y + Math.sin(angle) * step * i;

      for (const ball of balls) {
        if (ball.pocketed || ball.type === 'cue') continue;
        const dist = Math.sqrt((px - ball.x) ** 2 + (py - ball.y) ** 2);
        if (dist < BALL_RADIUS * 1.5) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateAngle(cueBall: Ball, target: Ball, pocket: typeof POCKETS[0]): number {
    const dx = pocket.x - target.x;
    const dy = pocket.y - target.y;
    const pocketAngle = Math.atan2(dy, dx);

    const offset = BALL_RADIUS * 2;
    const aimX = target.x - Math.cos(pocketAngle) * offset;
    const aimY = target.y - Math.sin(pocketAngle) * offset;

    const finalAngle = Math.atan2(aimY - cueBall.y, aimX - cueBall.x);
    return finalAngle;
  }

  private calculatePower(cueBall: Ball, target: Ball, pocket: typeof POCKETS[0]): number {
    const cueToTarget = Math.sqrt(
      (target.x - cueBall.x) ** 2 + (target.y - cueBall.y) ** 2
    );
    const targetToPocket = Math.sqrt(
      (pocket.x - target.x) ** 2 + (pocket.y - target.y) ** 2
    );

    const totalDistance = cueToTarget + targetToPocket;
    let power = MIN_POWER + (totalDistance / 800) * (MAX_POWER - MIN_POWER);

    if (this.difficulty === 'hard') {
      const isLongShot = totalDistance > 500;
      if (isLongShot) power *= 1.1;
      
      const isNearPocket = targetToPocket < 100;
      if (isNearPocket) power *= 0.85;
    }

    return Math.min(MAX_POWER, Math.max(MIN_POWER, power));
  }

  private calculateSafetyShot(cueBall: Ball, balls: Ball[]): AIShot {
    let bestScore = -Infinity;
    let bestAngle = 0;
    let bestPower = MIN_POWER;

    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const power = MIN_POWER + Math.random() * 5;

      let score = 0;
      const targetX = cueBall.x + Math.cos(angle) * 200;
      const targetY = cueBall.y + Math.sin(angle) * 200;

      if (targetX > PLAYFIELD_LEFT + 50 && targetX < PLAYFIELD_RIGHT - 50 &&
          targetY > PLAYFIELD_TOP + 50 && targetY < PLAYFIELD_BOTTOM - 50) {
        score += 100;
      }

      let minDistToOtherBall = Infinity;
      for (const ball of balls) {
        if (ball.id === 0 || ball.pocketed) continue;
        const dist = Math.sqrt((targetX - ball.x) ** 2 + (targetY - ball.y) ** 2);
        minDistToOtherBall = Math.min(minDistToOtherBall, dist);
      }
      score += minDistToOtherBall / 10;

      if (score > bestScore) {
        bestScore = score;
        bestAngle = angle;
        bestPower = power;
      }
    }

    return {
      angle: bestAngle,
      power: bestPower,
      targetBall: null,
    };
  }

  private applyAccuracyVariance(baseAngle: number): number {
    let variance = 0;
    
    switch (this.difficulty) {
      case 'easy':
        variance = (Math.random() - 0.5) * 0.5;
        break;
      case 'normal':
        variance = (Math.random() - 0.5) * 0.15;
        break;
      case 'hard':
        variance = (Math.random() - 0.5) * 0.03;
        break;
    }

    return baseAngle + variance;
  }

  private applyPowerVariance(basePower: number): number {
    let variance = 0;
    
    switch (this.difficulty) {
      case 'easy':
        variance = (Math.random() - 0.5) * basePower * 0.4;
        break;
      case 'normal':
        variance = (Math.random() - 0.5) * basePower * 0.15;
        break;
      case 'hard':
        variance = (Math.random() - 0.5) * basePower * 0.05;
        break;
    }

    return Math.min(MAX_POWER, Math.max(MIN_POWER, basePower + variance));
  }

  public willCommitFoul(): boolean {
    switch (this.difficulty) {
      case 'easy':
        return Math.random() < 0.25;
      case 'normal':
        return Math.random() < 0.05;
      case 'hard':
        return Math.random() < 0.01;
      default:
        return false;
    }
  }
}
