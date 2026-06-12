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
  const liveBallsRef = useRef<Ball[]>([]);
  const shootProgressRef = useRef(0);
  const shootAnimStartRef = useRef(0);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [appSettings, setAppSettings] = useState({
    threeFoulRule: true,
    showAimGuide: true,
  });
  const pocketedThisShotRef = useRef<Ball[]>([]);
  const aiTurnTimeoutRef = useRef<number | null>(null);
  const aiMoveTimeoutRef = useRef<number | null>(null);

  const clearAITimeouts = () => {
    if (aiTurnTimeoutRef.current !== null) {
      clearTimeout(aiTurnTimeoutRef.current);
      aiTurnTimeoutRef.current = null;
    }
    if (aiMoveTimeoutRef.current !== null) {
      clearTimeout(aiMoveTimeoutRef.current);
      aiMoveTimeoutRef.current = null;
    }
  };

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
      const storeBalls = useGameStore.getState().balls;
      liveBallsRef.current = storeBalls.map(b => ({ ...b }));
      physicsEngineRef.current = new PhysicsEngine();
      physicsEngineRef.current.initBalls(storeBalls);
      aiPlayerRef.current = new AIPlayer(useGameStore.getState().difficulty);
      startGameLoop();
    }, 100);
  };

  const cleanup = () => {
    stopGameLoop();
    clearAITimeouts();
    setIsAIThinking(false);
    if (physicsEngineRef.current) {
      physicsEngineRef.current.clear();
      physicsEngineRef.current = null;
    }
  };

  const startGameLoop = useCallback(() => {
    if (gameLoopRef.current) return;

    const SHOOT_ANIM_DURATION = 120;

    const loop = () => {
      if (!physicsEngineRef.current) {
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      const latestState = useGameStore.getState();
      const currentPhase = latestState.phase;

      if (currentPhase === 'shooting') {
        const pending = (window as any).__pendingShoot;
        if (!pending) {
          shootProgressRef.current = 1;
          gameLoopRef.current = requestAnimationFrame(loop);
          return;
        }
        const now = performance.now();
        const elapsed = now - shootAnimStartRef.current;
        const progress = Math.min(1, elapsed / SHOOT_ANIM_DURATION);
        shootProgressRef.current = progress;

        if (progress >= 1) {
          if (physicsEngineRef.current) {
            physicsEngineRef.current.shoot(pending.angle, pending.power);
          }
          (window as any).__pendingShoot = null;
          useGameStore.getState().setPhase('moving');
        }
      } else if (currentPhase === 'moving') {
        shootProgressRef.current = 1;
        physicsEngineRef.current.step();

        const liveBalls = liveBallsRef.current;
        const { pocketed, offTable } = physicsEngineRef.current.updateBallPositions(liveBalls);

        for (const id of pocketed) {
          const idx = liveBalls.findIndex(b => b.id === id);
          if (idx !== -1) {
            liveBalls[idx].pocketed = true;
            pocketedThisShotRef.current.push({ ...liveBalls[idx] });
          }
        }

        for (const id of offTable) {
          const idx = liveBalls.findIndex(b => b.id === id);
          if (idx !== -1) {
            liveBalls[idx].pocketed = true;
            pocketedThisShotRef.current.push({ ...liveBalls[idx] });
          }
        }

        if (physicsEngineRef.current.isAllBallsResting()) {
          handleShotComplete();
        }
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
  }, []);

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
    (window as any).__pendingShoot = { angle: aimAngle, power: physicalPower };

    shootAnimStartRef.current = performance.now();
    shootProgressRef.current = 0;
    pocketedThisShotRef.current = [];
  };

  const handleAIMove = useCallback(() => {
    if (!physicsEngineRef.current || !aiPlayerRef.current) return;

    const s = useGameStore.getState();
    s.setCanShoot(false);
    s.setLastFoul('none');

    const aiType = s.aiBallType;
    const canHitBlack = GameRules.canHitBlackEight(s, 'ai');

    let shot = aiPlayerRef.current.calculateShot(
      s.balls.find(b => b.id === 0 && !b.pocketed)!,
      s.balls,
      aiType,
      canHitBlack
    );

    if (aiPlayerRef.current.willCommitFoul()) {
      const validTargets = s.balls.filter(b => {
        if (b.pocketed || b.type === 'cue') return false;
        if (b.type === 'black') return canHitBlack;
        if (aiType) return b.type === aiType;
        return true;
      });

      if (validTargets.length > 1) {
        const wrongTargets = s.balls.filter(b => {
          if (b.pocketed || b.type === 'cue') return false;
          if (b.type === 'black') return !canHitBlack;
          if (aiType) return b.type !== aiType;
          return false;
        });

        if (wrongTargets.length > 0) {
          const cueBall = s.balls.find(b => b.id === 0)!;
          const wrongTarget = wrongTargets[0];
          shot = {
            angle: Math.atan2(wrongTarget.y - cueBall.y, wrongTarget.x - cueBall.x),
            power: shot.power,
            targetBall: wrongTarget,
          };
        }
      }
    }

    s.setAimAngle(shot.angle);
    pocketedThisShotRef.current = [];

    const aiDelay = 300 + Math.random() * 400;
    aiMoveTimeoutRef.current = setTimeout(() => {
      aiMoveTimeoutRef.current = null;
      const latest = useGameStore.getState();
      if (latest.currentPlayer !== 'ai') {
        setIsAIThinking(false);
        return;
      }
      shootAnimStartRef.current = performance.now();
      shootProgressRef.current = 0;
      (window as any).__pendingShoot = { angle: shot.angle, power: shot.power };
      latest.setPhase('shooting');
      setIsAIThinking(false);
    }, aiDelay) as unknown as number;
  }, []);

  const handleAITurn = useCallback(() => {
    if (isAIThinking) return;
    clearAITimeouts();
    setIsAIThinking(true);

    const delay = 800 + Math.random() * 1000;
    aiTurnTimeoutRef.current = setTimeout(() => {
      aiTurnTimeoutRef.current = null;
      if (useGameStore.getState().currentPlayer !== 'ai') {
        setIsAIThinking(false);
        return;
      }
      handleAIMove();
    }, delay) as unknown as number;
  }, [isAIThinking, handleAIMove]);

  const handleShotComplete = () => {
    const engine = physicsEngineRef.current;
    if (!engine) return;

    const s = useGameStore.getState();
    const liveBalls = liveBallsRef.current;
    for (const b of liveBalls) {
      const storeBall = s.balls.find(sb => sb.id === b.id);
      if (storeBall) {
        storeBall.x = b.x;
        storeBall.y = b.y;
        storeBall.pocketed = b.pocketed;
      }
    }
    s.updateBalls([...s.balls]);

    const collisionState = engine.getCollisionState();
    const pocketedThisShot = pocketedThisShotRef.current;
    const cueBallPocketed = pocketedThisShot.some(b => b.id === 0);
    const cueBallOffTable = pocketedThisShot.some(b => b.id === 0 && b.x < 0);

    const curPlayer = s.currentPlayer;
    const curIsBreakShot = s.isBreakShot;
    const curPlayerBallType = s.playerBallType;
    const curAiBallType = s.aiBallType;

    const { winner, winReason, loseReason } = GameRules.checkWinLoseConditions(
      s,
      curPlayer,
      pocketedThisShot,
      cueBallPocketed,
      appSettings.threeFoulRule
    );

    if (winner) {
      s.endGame(winner, winReason, loseReason);
      return;
    }

    if (curIsBreakShot) {
      const blackPocketed = pocketedThisShot.some(b => b.type === 'black');
      if (blackPocketed && !cueBallPocketed) {
        s.endGame('ai', 'opponent_premature_black', 'premature_black');
        return;
      }

      const assignment = GameRules.determineBallTypeAssignment(pocketedThisShot, true);
      if (assignment.playerType) {
        s.setBallTypes(assignment.playerType, assignment.aiType);
      }
    }

    const currentType = curPlayer === 'player' ? curPlayerBallType : curAiBallType;
    const canHitBlack = currentType ? GameRules.getRemainingBalls(s.balls, currentType) === 0 : false;

    let foul: FoulType = 'none';

    if (cueBallPocketed) {
      foul = 'cue_ball_pocketed';
    } else if (cueBallOffTable) {
      foul = 'cue_ball_off_table';
    } else {
      const firstHitCheck = GameRules.checkFirstHit(
        collisionState.firstHitBallId,
        s.balls,
        curPlayer,
        curPlayerBallType,
        curAiBallType,
        curIsBreakShot,
        canHitBlack
      );

      if (!firstHitCheck.valid) {
        foul = firstHitCheck.foul;
      } else {
        const railCheck = GameRules.checkRailHit(
          collisionState.hasHitCushion,
          pocketedThisShot.filter(b => b.id !== 0).length,
          curIsBreakShot
        );

        if (!railCheck.valid) {
          foul = railCheck.foul;
        }
      }
    }

    const hasFoul = foul !== 'none';
    if (hasFoul) {
      s.setLastFoul(foul);
      s.incrementFoulCount(curPlayer);
    } else if (curPlayer === 'player') {
      s.resetConsecutiveFouls();
    }

    if (hasFoul && curPlayer === 'player' && cueBallPocketed) {
      handleCueBallPocketed();
    } else if (hasFoul && curPlayer === 'player' && cueBallOffTable) {
      handleCueBallPocketed();
    } else {
      const validPocketed = pocketedThisShot.filter(b => {
        if (b.id === 0) return false;
        const type = curPlayer === 'player' ? curPlayerBallType : curAiBallType;
        return type ? b.type === type : (b.type === 'solid' || b.type === 'striped');
      });

      const ballTypeAssigned = curPlayerBallType !== null || curAiBallType !== null;
      const shouldSwitch = GameRules.shouldSwitchPlayer(
        validPocketed,
        hasFoul,
        curIsBreakShot,
        ballTypeAssigned
      );

      s.updateRemainingBalls();

      if (shouldSwitch) {
        const nextPlayer: PlayerType = curPlayer === 'player' ? 'ai' : 'player';
        s.setCurrentPlayer(nextPlayer);
        clearAITimeouts();
        if (nextPlayer === 'player') {
          setIsAIThinking(false);
        }

        if (hasFoul) {
          s.setBallInHand(true);
          if (nextPlayer === 'player') {
            handleCueBallPocketed();
          } else {
            setTimeout(() => {
              const latest = useGameStore.getState();
              const cueBall = latest.balls.find(b => b.id === 0);
              if (cueBall && physicsEngineRef.current) {
                const newX = PLAYFIELD_LEFT + PLAYFIELD_WIDTH * 0.25;
                const newY = PLAYFIELD_TOP + 200;
                physicsEngineRef.current.setCueBallPosition(newX, newY);
                cueBall.x = newX;
                cueBall.y = newY;
                cueBall.pocketed = false;
                const liveCue = liveBallsRef.current.find(b => b.id === 0);
                if (liveCue) {
                  liveCue.x = newX;
                  liveCue.y = newY;
                  liveCue.pocketed = false;
                }
                latest.updateBalls([...latest.balls]);
                latest.setBallInHand(false);
              }
            }, 500);
          }
        }
      }

      if (curIsBreakShot) {
        s.setIsBreakShot(false);
      }

      s.setPhase('aiming');
      s.setCanShoot(true);
    }
  };

  const handleCueBallPocketed = () => {
    const s = useGameStore.getState();
    const cueBall = s.balls.find(b => b.id === 0);
    if (!cueBall) return;

    cueBall.pocketed = false;
    const newX = PLAYFIELD_LEFT + PLAYFIELD_WIDTH * 0.25;
    const newY = PLAYFIELD_TOP + 200;
    cueBall.x = newX;
    cueBall.y = newY;

    const liveCue = liveBallsRef.current.find(b => b.id === 0);
    if (liveCue) {
      liveCue.x = newX;
      liveCue.y = newY;
      liveCue.pocketed = false;
    }

    if (physicsEngineRef.current) {
      physicsEngineRef.current.setCueBallPosition(newX, newY);
    }

    s.updateBalls([...s.balls]);
    s.setBallInHand(true);
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
      const liveCue = liveBallsRef.current.find(b => b.id === 0);
      if (liveCue) {
        liveCue.x = x;
        liveCue.y = y;
        liveCue.pocketed = false;
      }
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
          liveBallsRef={liveBallsRef}
          aimAngle={aimAngle}
          power={power}
          canShoot={canShoot && currentPlayer === 'player'}
          showGuide={appSettings.showAimGuide}
          isPlacing={isPlacing}
          isAIThinking={isAIThinking}
          phase={phase}
          shootProgressRef={shootProgressRef}
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
