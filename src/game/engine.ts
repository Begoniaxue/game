import Matter from 'matter-js';
import { Ball } from '../types/game';
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  BALL_RADIUS,
  CUSHION_WIDTH,
  BALL_RESTITUTION,
  ANGULAR_DAMPING,
  PLAYFIELD_LEFT,
  PLAYFIELD_RIGHT,
  PLAYFIELD_TOP,
  PLAYFIELD_BOTTOM,
  POCKETS,
  POCKET_RADIUS,
} from './constants';

export class PhysicsEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private bodies: Map<number, Matter.Body> = new Map();
  private cushionBodies: Matter.Body[] = [];
  private onBallPocketedCallback: ((ballId: number) => void) | null = null;
  private onBallCushionHitCallback: (() => void) | null = null;
  private hasHitCushion = false;
  private hasHitBall = false;
  private firstHitBallId: number | null = null;
  private runner: Matter.Runner | null = null;

  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
    });
    this.world = this.engine.world;
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 10;
    this.createCushions();
    this.setupCollisionDetection();
  }

  private createCushions() {
    const cushionOptions = {
      isStatic: true,
      restitution: 0.8,
      friction: 0.01,
      render: { fillStyle: '#8B4513' },
    };

    const topCushion = Matter.Bodies.rectangle(
      TABLE_WIDTH / 2,
      PLAYFIELD_TOP - CUSHION_WIDTH / 2 + POCKET_RADIUS / 2,
      TABLE_WIDTH - POCKET_RADIUS * 2,
      CUSHION_WIDTH,
      cushionOptions
    );

    const bottomCushion = Matter.Bodies.rectangle(
      TABLE_WIDTH / 2,
      PLAYFIELD_BOTTOM + CUSHION_WIDTH / 2 - POCKET_RADIUS / 2,
      TABLE_WIDTH - POCKET_RADIUS * 2,
      CUSHION_WIDTH,
      cushionOptions
    );

    const leftCushion = Matter.Bodies.rectangle(
      PLAYFIELD_LEFT - CUSHION_WIDTH / 2 + POCKET_RADIUS / 2,
      TABLE_HEIGHT / 2,
      CUSHION_WIDTH,
      TABLE_HEIGHT - POCKET_RADIUS * 2,
      cushionOptions
    );

    const rightCushion = Matter.Bodies.rectangle(
      PLAYFIELD_RIGHT + CUSHION_WIDTH / 2 - POCKET_RADIUS / 2,
      TABLE_HEIGHT / 2,
      CUSHION_WIDTH,
      TABLE_HEIGHT - POCKET_RADIUS * 2,
      cushionOptions
    );

    this.cushionBodies = [topCushion, bottomCushion, leftCushion, rightCushion];
    Matter.Composite.add(this.world, this.cushionBodies);
  }

  private setupCollisionDetection() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const isCushionA = this.cushionBodies.includes(bodyA);
        const isCushionB = this.cushionBodies.includes(bodyB);

        if (isCushionA || isCushionB) {
          this.hasHitCushion = true;
          this.onBallCushionHitCallback?.();
        }

        if (!isCushionA && !isCushionB) {
          this.hasHitBall = true;
          const cueBall = this.bodies.get(0);
          if (cueBall && (bodyA === cueBall || bodyB === cueBall)) {
            const otherBody = bodyA === cueBall ? bodyB : bodyA;
            if (this.firstHitBallId === null) {
              const otherBallId = Number(otherBody.label);
              if (!isNaN(otherBallId)) {
                this.firstHitBallId = otherBallId;
              }
            }
          }
        }
      }
    });
  }

  public initBalls(balls: Ball[]) {
    for (const ball of balls) {
      if (ball.pocketed) continue;

      const body = Matter.Bodies.circle(ball.x, ball.y, BALL_RADIUS, {
        restitution: BALL_RESTITUTION,
        friction: 0.005,
        frictionAir: 0.015,
        label: String(ball.id),
      } as Matter.IBodyDefinition);
      (body as any).angularDamping = ANGULAR_DAMPING;

      this.bodies.set(ball.id, body);
      Matter.Composite.add(this.world, body);
    }
  }

  public removeBall(ballId: number) {
    const body = this.bodies.get(ballId);
    if (body) {
      Matter.Composite.remove(this.world, body);
      this.bodies.delete(ballId);
    }
  }

  public resetCollisionState() {
    this.hasHitCushion = false;
    this.hasHitBall = false;
    this.firstHitBallId = null;
  }

  public getCollisionState() {
    return {
      hasHitCushion: this.hasHitCushion,
      hasHitBall: this.hasHitBall,
      firstHitBallId: this.firstHitBallId,
    };
  }

  public shoot(angle: number, power: number) {
    const cueBody = this.bodies.get(0);
    if (!cueBody) return;

    const velocity = {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power,
    };

    Matter.Body.setVelocity(cueBody, velocity);
    this.resetCollisionState();
  }

  public updateBallPositions(balls: Ball[]): { pocketed: number[]; offTable: number[] } {
    const pocketed: number[] = [];
    const offTable: number[] = [];

    for (const ball of balls) {
      if (ball.pocketed) continue;

      const body = this.bodies.get(ball.id);
      if (!body) continue;

      ball.x = body.position.x;
      ball.y = body.position.y;

      if (ball.id !== 0) {
        for (const pocket of POCKETS) {
          const dist = Math.sqrt(
            Math.pow(ball.x - pocket.x, 2) + Math.pow(ball.y - pocket.y, 2)
          );
          if (dist < pocket.radius - BALL_RADIUS / 2) {
            pocketed.push(ball.id);
            break;
          }
        }
      } else {
        for (const pocket of POCKETS) {
          const dist = Math.sqrt(
            Math.pow(ball.x - pocket.x, 2) + Math.pow(ball.y - pocket.y, 2)
          );
          if (dist < pocket.radius - BALL_RADIUS / 2) {
            pocketed.push(ball.id);
            break;
          }
        }

        if (
          ball.x < PLAYFIELD_LEFT - BALL_RADIUS * 2 ||
          ball.x > PLAYFIELD_RIGHT + BALL_RADIUS * 2 ||
          ball.y < PLAYFIELD_TOP - BALL_RADIUS * 2 ||
          ball.y > PLAYFIELD_BOTTOM + BALL_RADIUS * 2
        ) {
          offTable.push(ball.id);
        }
      }
    }

    for (const id of pocketed) {
      this.removeBall(id);
      this.onBallPocketedCallback?.(id);
    }

    for (const id of offTable) {
      this.removeBall(id);
    }

    return { pocketed, offTable };
  }

  public setCueBallPosition(x: number, y: number) {
    const cueBody = this.bodies.get(0);
    if (cueBody) {
      Matter.Body.setPosition(cueBody, { x, y });
      Matter.Body.setVelocity(cueBody, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(cueBody, 0);
    }
  }

  public isAllBallsResting(): boolean {
    for (const [, body] of this.bodies) {
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      const angularSpeed = Math.abs(body.angularVelocity);
      if (speed > 0.05 || angularSpeed > 0.02) {
        return false;
      }
    }
    return true;
  }

  public stopAllBalls() {
    for (const [, body] of this.bodies) {
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
    }
  }

  public step(delta: number = 1000 / 60) {
    Matter.Engine.update(this.engine, delta);
  }

  public start() {
    if (!this.runner) {
      this.runner = Matter.Runner.create();
      Matter.Runner.run(this.runner, this.engine);
    }
  }

  public stop() {
    if (this.runner) {
      Matter.Runner.stop(this.runner);
      this.runner = null;
    }
  }

  public clear() {
    this.stop();
    for (const [id] of this.bodies) {
      this.removeBall(id);
    }
    this.bodies.clear();
  }

  public setOnBallPocketed(callback: (ballId: number) => void) {
    this.onBallPocketedCallback = callback;
  }

  public setOnBallCushionHit(callback: () => void) {
    this.onBallCushionHitCallback = callback;
  }

  public getEngine() {
    return this.engine;
  }

  public getWorld() {
    return this.world;
  }

  public getBody(ballId: number): Matter.Body | undefined {
    return this.bodies.get(ballId);
  }
}
