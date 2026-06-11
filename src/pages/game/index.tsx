import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow, useDidHide } from '@tarojs/taro';
import { useGameStore } from '../../store/useGameStore';
import { PhysicsEngine } from '../../game/engine';
import { GameRules } from '../../game/rules';
import { AIPlayer } from '../../game/ai';
import { storage } from '../../utils/storage';
import { Ball, FoulType, PlayerType } from '../../types/game';
import { PLAYFIELD_LEFT, PLAYFIELD_TOP, PLAYFIELD_WIDTH, MAX_POWER, MIN_POWER } from '../../game/constants';
import GameHeader from '../../components/GameHeader';
import GameCanvas from '../../components/GameCanvas';
import GameControls from '../../components/GameControls';
import Modal from '../../components/Modal';
import styles from './index.module.scss';

const GamePage: React.FC = () => {
  const gameState = useGameStore();
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const aiPlayerRef = useRef<AIPlayer | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const placementPosRef = useRef<{ x: number; y: number; valid: boolean } | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [appSettings, setAppSettings] = useState({
    threeFoulRule: true,
    showAimGuide: true,
  });
  const pocketedThisShotRef = useRef<Ball[]>([]);

  const {
    balls,
    aimAngle,
    power,
    canShoot,
    currentPlayer,
    isBreakShot,
    playerBallType,
    aiBallType,
    ballInHand,
    phase,
  } = gameState;

  useEffect(() => {
    initGame();
    loadSettings();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (phase === 'ended' && gameState.winner !== null) {
      handleGameEnd();
    }
  }, [phase, gameState.winner]);

  useEffect(() => {
    if (currentPlayer === 'ai' && phase === 'aiming' && canShoot && !isPlacing) {
      handleAITurn();
    }
  }, [currentPlayer, phase, canShoot, isPlacing]);

  useDidShow(() => {
    if (physicsEngineRef.current && phase !== 'ended') {
      startGameLoop();
    }
  });

  useDidHide(() => {
    stopGameLoop();
  });

  const loadSettings = async () => {
    const settings = await storage.getSettings();
    setAppSettings({
      threeFoulRule: settings.threeFoulRule,
      showAimGuide: settings.showAimGuide,
    });
    gameState.setShowGuide(settings.showAimGuide);
  };

  const initGame = () => {
    gameState.initGame();
    
    setTimeout(() => {
      physicsEngineRef.current = new PhysicsEngine();
      physicsEngineRef.current.initBalls(gameState.balls);
      aiPlayerRef.current = new AIPlayer(gameState.difficulty);
      startGameLoop();
    }, 100);
  };

  const cleanup = () => {
    stopGameLoop();
    if (physicsEngineRef.current) {
      physicsEngineRef.current.clear();
      physicsEngineRef.current = null;
    }
  };

  const startGameLoop = useCallback(() => {
    if (gameLoopRef.current) return;

    const loop = () => {
      if (!physicsEngineRef.current) return;

      if (phase === 'moving') {
        physicsEngineRef.current.step();

        const { pocketed, offTable } = physicsEngineRef.current.updateBallPositions(gameState.balls);
        
        for (const id of pocketed) {
          const ball = gameState.markBallPocketed(id);
          if (ball) {
            pocketedThisShotRef.current.push(ball);
          }
        }

        for (const id of offTable) {
          const ball = gameState.balls.find(b => b.id === id);
          if (ball) {
            pocketedThisShotRef.current.push({ ...ball, pocketed: true });
          }
        }

        gameState.updateBalls([...gameState.balls]);

        if (physicsEngineRef.current.isAllBallsResting()) {
          handleShotComplete();
        }
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
  }, [phase, gameState.balls]);

  const stopGameLoop = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  };

  const handleShoot = () => {
    if (!canShoot || !physicsEngineRef.current || currentPlayer !== 'player') return;

    gameState.setCanShoot(false);
    gameState.setPhase('shooting');
    gameState.setLastFoul('none');

    const physicalPower = MIN_POWER + (power / 100) * (MAX_POWER - MIN_POWER);
    physicsEngineRef.current.shoot(aimAngle, physicalPower);
    pocketedThisShotRef.current = [];

    setTimeout(() => {
      gameState.setPhase('moving');
    }, 100);
  };

  const handleAIMove = useCallback(() => {
    if (!physicsEngineRef.current || !aiPlayerRef.current) return;

    gameState.setCanShoot(false);
    gameState.setPhase('shooting');
    gameState.setLastFoul('none');

    const aiType = gameState.aiBallType;
    const canHitBlack = GameRules.canHitBlackEight(gameState, 'ai');

    let shot = aiPlayerRef.current.calculateShot(
      gameState.balls.find(b => b.id === 0 && !b.pocketed)!,
      gameState.balls,
      aiType,
      canHitBlack
    );

    if (aiPlayerRef.current.willCommitFoul()) {
      const validTargets = gameState.balls.filter(b => {
        if (b.pocketed || b.type === 'cue') return false;
        if (b.type === 'black') return canHitBlack;
        if (aiType) return b.type === aiType;
        return true;
      });

      if (validTargets.length > 1) {
        const wrongTargets = gameState.balls.filter(b => {
          if (b.pocketed || b.type === 'cue') return false;
          if (b.type === 'black') return !canHitBlack;
          if (aiType) return b.type !== aiType;
          return false;
        });

        if (wrongTargets.length > 0) {
          const cueBall = gameState.balls.find(b => b.id === 0)!;
          const wrongTarget = wrongTargets[0];
          shot = {
            angle: Math.atan2(wrongTarget.y - cueBall.y, wrongTarget.x - cueBall.x),
            power: shot.power,
            targetBall: wrongTarget,
          };
        }
      }
    }

    gameState.setAimAngle(shot.angle);
    pocketedThisShotRef.current = [];

    setTimeout(() => {
      physicsEngineRef.current!.shoot(shot.angle, shot.power);
      gameState.setPhase('moving');
      setIsAIThinking(false);
    }, 800);
  }, [gameState]);

  const handleAITurn = useCallback(() => {
    if (isAIThinking) return;
    setIsAIThinking(true);

    const delay = 800 + Math.random() * 1000;
    setTimeout(() => {
      handleAIMove();
    }, delay);
  }, [isAIThinking, handleAIMove]);

  const handleShotComplete = () => {
    stopGameLoop();

    const engine = physicsEngineRef.current;
    if (!engine) return;

    const collisionState = engine.getCollisionState();
    const pocketedThisShot = pocketedThisShotRef.current;
    const cueBallPocketed = pocketedThisShot.some(b => b.id === 0);
    const cueBallOffTable = pocketedThisShot.some(b => b.id === 0 && b.x < 0);

    const { winner, winReason, loseReason } = GameRules.checkWinLoseConditions(
      gameState,
      currentPlayer,
      pocketedThisShot,
      cueBallPocketed,
      appSettings.threeFoulRule
    );

    if (winner) {
      gameState.endGame(winner, winReason, loseReason);
      return;
    }

    if (isBreakShot) {
      const blackPocketed = pocketedThisShot.some(b => b.type === 'black');
      if (blackPocketed && !cueBallPocketed) {
        gameState.endGame('ai', 'opponent_premature_black', 'premature_black');
        return;
      }

      const assignment = GameRules.determineBallTypeAssignment(pocketedThisShot, true);
      if (assignment.playerType) {
        gameState.setBallTypes(assignment.playerType, assignment.aiType);
      }
    }

    const currentType = currentPlayer === 'player' ? playerBallType : aiBallType;
    const canHitBlack = currentType ? GameRules.getRemainingBalls(gameState.balls, currentType) === 0 : false;

    let foul: FoulType = 'none';

    if (cueBallPocketed) {
      foul = 'cue_ball_pocketed';
    } else if (cueBallOffTable) {
      foul = 'cue_ball_off_table';
    } else {
      const firstHitCheck = GameRules.checkFirstHit(
        collisionState.firstHitBallId,
        gameState.balls,
        currentPlayer,
        playerBallType,
        aiBallType,
        isBreakShot,
        canHitBlack
      );

      if (!firstHitCheck.valid) {
        foul = firstHitCheck.foul;
      } else {
        const railCheck = GameRules.checkRailHit(
          collisionState.hasHitCushion,
          pocketedThisShot.filter(b => b.id !== 0).length,
          isBreakShot
        );

        if (!railCheck.valid) {
          foul = railCheck.foul;
        }
      }
    }

    const hasFoul = foul !== 'none';
    if (hasFoul) {
      gameState.setLastFoul(foul);
      gameState.incrementFoulCount(currentPlayer);
    } else if (currentPlayer === 'player') {
      gameState.resetConsecutiveFouls();
    }

    if (hasFoul && currentPlayer === 'player' && cueBallPocketed) {
      handleCueBallPocketed();
    } else if (hasFoul && currentPlayer === 'player' && cueBallOffTable) {
      handleCueBallPocketed();
    } else {
      const validPocketed = pocketedThisShot.filter(b => {
        if (b.id === 0) return false;
        const type = currentPlayer === 'player' ? playerBallType : aiBallType;
        return type ? b.type === type : (b.type === 'solid' || b.type === 'striped');
      });

      const ballTypeAssigned = playerBallType !== null || aiBallType !== null;
      const shouldSwitch = GameRules.shouldSwitchPlayer(
        validPocketed,
        hasFoul,
        isBreakShot,
        ballTypeAssigned
      );

      gameState.updateRemainingBalls();

      if (shouldSwitch) {
        const nextPlayer: PlayerType = currentPlayer === 'player' ? 'ai' : 'player';
        gameState.setCurrentPlayer(nextPlayer);

        if (hasFoul) {
          gameState.setBallInHand(true);
          if (nextPlayer === 'player') {
            handleCueBallPocketed();
          } else {
            setTimeout(() => {
              const cueBall = gameState.balls.find(b => b.id === 0);
              if (cueBall && physicsEngineRef.current) {
                const newX = PLAYFIELD_LEFT + PLAYFIELD_WIDTH * 0.25;
                const newY = PLAYFIELD_TOP + 200;
                physicsEngineRef.current.setCueBallPosition(newX, newY);
                cueBall.x = newX;
                cueBall.y = newY;
                cueBall.pocketed = false;
                gameState.updateBalls([...gameState.balls]);
                gameState.setBallInHand(false);
              }
            }, 500);
          }
        }
      }

      if (isBreakShot) {
        gameState.setIsBreakShot(false);
      }

      gameState.setPhase('aiming');
      gameState.setCanShoot(true);

      if (!hasFoul || currentPlayer === 'ai') {
        setTimeout(() => startGameLoop(), 100);
      }
    }
  };

  const handleCueBallPocketed = () => {
    const cueBall = gameState.balls.find(b => b.id === 0);
    if (!cueBall) return;

    cueBall.pocketed = false;
    const newX = PLAYFIELD_LEFT + PLAYFIELD_WIDTH * 0.25;
    const newY = PLAYFIELD_TOP + 200;
    cueBall.x = newX;
    cueBall.y = newY;

    if (physicsEngineRef.current) {
      physicsEngineRef.current.setCueBallPosition(newX, newY);
    }

    gameState.updateBalls([...gameState.balls]);
    gameState.setBallInHand(true);
    setIsPlacing(true);
    placementPosRef.current = { x: newX, y: newY, valid: true };
  };

  const handlePlaceChange = (x: number, y: number, valid: boolean) => {
    placementPosRef.current = { x, y, valid };
  };

  const handleConfirmPlace = () => {
    if (!placementPosRef.current?.valid || !physicsEngineRef.current) return;

    const { x, y } = placementPosRef.current;
    const cueBall = gameState.balls.find(b => b.id === 0);
    if (cueBall) {
      cueBall.x = x;
      cueBall.y = y;
      physicsEngineRef.current.setCueBallPosition(x, y);
      gameState.updateBalls([...gameState.balls]);
    }

    setIsPlacing(false);
    gameState.setBallInHand(false);
    gameState.setCanShoot(true);
    gameState.setPhase('aiming');
    startGameLoop();
  };

  const handlePlaceCue = () => {
    if (!canShoot || !ballInHand) return;
    handleCueBallPocketed();
  };

  const handleSurrender = () => {
    Taro.showModal({
      title: '确认认输',
      content: '确定要认输吗？本局将记为负。',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          gameState.endGame('ai', 'black_ball_pocketed', 'surrender');
        }
      },
    });
  };

  const handleBack = () => {
    if (phase !== 'ended') {
      setShowExitConfirm(true);
    } else {
      Taro.navigateBack();
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    gameState.endGame('ai', 'black_ball_pocketed', 'surrender');
  };

  const handleGameEnd = async () => {
    stopGameLoop();
    cleanup();

    const record = {
      id: storage.generateRecordId(),
      date: Date.now(),
      duration: Math.floor((gameState.gameEndTime - gameState.gameStartTime) / 1000),
      difficulty: gameState.difficulty,
      winner: gameState.winner!,
      playerFouls: gameState.playerFoulCount,
      aiFouls: gameState.aiFoulCount,
      winReason: gameState.winReason || undefined,
      loseReason: gameState.loseReason || undefined,
      playerBallType: gameState.playerBallType || undefined,
      aiBallType: gameState.aiBallType || undefined,
    };

    await storage.saveRecord(record);

    Taro.redirectTo({
      url: `/pages/result/index?winner=${gameState.winner}&duration=${record.duration}&playerFouls=${gameState.playerFoulCount}&aiFouls=${gameState.aiFoulCount}&winReason=${gameState.winReason || ''}&loseReason=${gameState.loseReason || ''}&difficulty=${gameState.difficulty}`,
    });
  };

  const handlePowerChange = (value: number) => {
    gameState.setPower(value);
  };

  const handleAimChange = (angle: number) => {
    gameState.setAimAngle(angle);
  };

  return (
    <View className={styles.container}>
      <GameHeader gameState={gameState} />

      <View className={styles.gameContent}>
        <GameCanvas
          balls={balls}
          aimAngle={aimAngle}
          power={power}
          canShoot={canShoot && currentPlayer === 'player'}
          showGuide={appSettings.showAimGuide}
          isPlacing={isPlacing}
          isAIThinking={isAIThinking}
          onAimChange={handleAimChange}
          onPowerChange={handlePowerChange}
          onPlaceChange={handlePlaceChange}
          onShoot={handleShoot}
        />
      </View>

      <GameControls
        power={power}
        onPowerChange={handlePowerChange}
        onShoot={handleShoot}
        onPlaceCue={handlePlaceCue}
        onSurrender={handleSurrender}
        onBack={handleBack}
        canShoot={canShoot && currentPlayer === 'player'}
        isPlacing={isPlacing}
        onConfirmPlace={handleConfirmPlace}
      />

      <Modal
        visible={showExitConfirm}
        title="确认退出"
        onClose={() => setShowExitConfirm(false)}
        onConfirm={handleConfirmExit}
        confirmText="确认退出"
        cancelText="继续游戏"
      >
        <View className={styles.exitConfirm}>
          <View className={styles.content}>
            <Text className={styles.icon}>⚠️</Text>
            <Text className={styles.text}>
              确定要退出本局吗？
            </Text>
            <Text className={styles.warning}>
              退出后本局将记为负
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GamePage;
