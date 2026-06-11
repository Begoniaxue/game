import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Canvas, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { GameRenderer } from '../../game/renderer';
import { Ball } from '../../types/game';
import { TABLE_WIDTH, TABLE_HEIGHT } from '../../game/constants';
import { GameRules } from '../../game/rules';
import styles from './index.module.scss';

interface GameCanvasProps {
  balls: Ball[];
  aimAngle: number;
  power: number;
  canShoot: boolean;
  showGuide: boolean;
  isPlacing: boolean;
  isAIThinking: boolean;
  onAimChange: (angle: number) => void;
  onPowerChange: (power: number) => void;
  onPlaceChange: (x: number, y: number, valid: boolean) => void;
  onShoot: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  balls,
  aimAngle,
  power,
  canShoot,
  showGuide,
  isPlacing,
  isAIThinking,
  onAimChange,
  onPowerChange,
  onPlaceChange,
  onShoot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 750, height: 400 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const placementPosRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const initedRef = useRef(false);
  const canvasSizeRef = useRef({ width: 750, height: 400 });

  const getCanvasSize = useCallback(() => {
    const info = Taro.getSystemInfoSync();
    const aspectRatio = TABLE_WIDTH / TABLE_HEIGHT;
    const width = info.windowWidth - 64;
    const height = width / aspectRatio;
    const size = { width, height: Math.min(height, info.windowHeight * 0.5) };
    canvasSizeRef.current = size;
    return size;
  }, []);

  const initRenderer = useCallback((canvas: HTMLCanvasElement, size: { width: number; height: number }) => {
    if (initedRef.current) return;
    if (!canvas || typeof canvas.getContext !== 'function') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    initedRef.current = true;

    const dpr = Taro.getSystemInfoSync().pixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);
    rendererRef.current = new GameRenderer(ctx, size.width, size.height);
  }, []);

  useEffect(() => {
    const size = getCanvasSize();
    setCanvasSize(size);

    setTimeout(() => {
      let realCanvas: HTMLCanvasElement | null = null;

      try {
        if (typeof document !== 'undefined') {
          const wrapperEl = document.getElementById('gameCanvas');
          if (wrapperEl) {
            const innerCanvas = wrapperEl.querySelector('canvas');
            if (innerCanvas) {
              realCanvas = innerCanvas;
            }
          }

          if (!realCanvas && canvasRef.current) {
            const refEl = canvasRef.current as any;
            if (refEl instanceof HTMLCanvasElement) {
              realCanvas = refEl;
            } else if (refEl && refEl.querySelector) {
              const inner = refEl.querySelector('canvas');
              if (inner) realCanvas = inner;
            }
          }
        }
      } catch (e) {}

      if (realCanvas) {
        initRenderer(realCanvas, size);
        return;
      }

      const query = Taro.createSelectorQuery();
      query.select('#gameCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res && res[0]) {
            const canvasNode = res[0].node;
            if (canvasNode && typeof canvasNode.getContext === 'function') {
              initRenderer(canvasNode as HTMLCanvasElement, size);
            }
          }
        });
    }, 200);
  }, [getCanvasSize, initRenderer]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.resize(canvasSize.width, canvasSize.height);
    }
  }, [canvasSize]);

  const render = useCallback(() => {
    if (!rendererRef.current) {
      try {
        if (typeof document !== 'undefined') {
          const wrapperEl = document.getElementById('gameCanvas');
          if (wrapperEl) {
            const innerCanvas = wrapperEl.querySelector('canvas') as HTMLCanvasElement | null;
            if (innerCanvas && typeof innerCanvas.getContext === 'function') {
              initRenderer(innerCanvas, canvasSizeRef.current);
            }
          }
        }
      } catch (e) {}
      animFrameRef.current = requestAnimationFrame(render);
      return;
    }

    const renderer = rendererRef.current;
    renderer.clear();
    renderer.drawTable();
    renderer.drawPockets();
    renderer.drawBalls(balls);

    const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
    if (cueBall && !isAIThinking) {
      if (isPlacing && placementPosRef.current) {
        const valid = GameRules.isValidCueBallPosition(
          placementPosRef.current.x,
          placementPosRef.current.y,
          balls
        );
        renderer.drawPlacementIndicator(
          placementPosRef.current.x,
          placementPosRef.current.y,
          valid
        );
      } else if (!isPlacing) {
        renderer.drawCue(
          cueBall.x,
          cueBall.y,
          aimAngle,
          power,
          canShoot,
          showGuide
        );
      }
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [balls, aimAngle, power, canShoot, showGuide, isPlacing, isAIThinking]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [render]);

  const getEventPos = (e: any) => {
    const touches = e.touches || [e];
    const touch = touches[0];

    if (touch && (touch.clientX !== undefined)) {
      let offsetLeft = 0;
      let offsetTop = 0;

      try {
        if (typeof document !== 'undefined') {
          const wrapperEl = document.getElementById('gameCanvas');
          if (wrapperEl) {
            const rect = wrapperEl.getBoundingClientRect();
            offsetLeft = rect.left;
            offsetTop = rect.top;
          }
        }
      } catch (ex) {}

      return {
        x: touch.clientX - offsetLeft,
        y: touch.clientY - offsetTop,
      };
    }

    if (e.detail && e.detail.x !== undefined) {
      return { x: e.detail.x, y: e.detail.y };
    }

    return { x: 0, y: 0 };
  };

  const handleTouchStart = (e: any) => {
    if (!canShoot && !isPlacing) return;
    const pos = getEventPos(e);
    touchStartRef.current = pos;

    if (isPlacing && rendererRef.current) {
      const worldPos = rendererRef.current.screenToWorld(pos.x, pos.y);
      placementPosRef.current = worldPos;
      const valid = GameRules.isValidCueBallPosition(worldPos.x, worldPos.y, balls);
      onPlaceChange(worldPos.x, worldPos.y, valid);
    }
  };

  const handleTouchMove = (e: any) => {
    if (!rendererRef.current) return;

    const pos = getEventPos(e);

    if (isPlacing) {
      const worldPos = rendererRef.current.screenToWorld(pos.x, pos.y);
      placementPosRef.current = worldPos;
      const valid = GameRules.isValidCueBallPosition(worldPos.x, worldPos.y, balls);
      onPlaceChange(worldPos.x, worldPos.y, valid);
      return;
    }

    if (!canShoot || !touchStartRef.current) return;

    const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
    if (!cueBall) return;

    const cueScreenPos = rendererRef.current.worldToScreen(cueBall.x, cueBall.y);
    const dx = pos.x - cueScreenPos.x;
    const dy = pos.y - cueScreenPos.y;
    const angle = Math.atan2(dy, dx);
    onAimChange(angle);

    const distance = Math.sqrt(dx * dx + dy * dy);
    const newPower = Math.min(100, Math.max(0, (distance / 150) * 100));
    onPowerChange(newPower);
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const handleDoubleClick = () => {
    if (canShoot && !isPlacing) {
      onShoot();
    }
  };

  return (
    <View
      className={styles.container}
      style={{ height: canvasSize.height }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleDoubleClick}
    >
      <Canvas
        id="gameCanvas"
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: canvasSize.width, height: canvasSize.height }}
        type="2d"
      />

      {isPlacing && (
        <View className={styles.hintOverlay}>
          <Text className={styles.hintText}>拖动放置白球位置</Text>
        </View>
      )}

      {isAIThinking && (
        <View className={styles.aiThinking}>
          <View className={styles.thinkingDot} />
          <View className={styles.thinkingDot} />
          <View className={styles.thinkingDot} />
          <Text className={styles.thinkingText}>AI思考中</Text>
        </View>
      )}
    </View>
  );
};

export default GameCanvas;
