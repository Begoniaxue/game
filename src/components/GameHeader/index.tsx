import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import { GameState } from '../../types/game';
import { getBallTypeName, getFoulMessage } from '../../game/constants';
import styles from './index.module.scss';

interface GameHeaderProps {
  gameState: GameState;
}

const GameHeader: React.FC<GameHeaderProps> = ({ gameState }) => {
  const {
    currentPlayer,
    playerBallType,
    aiBallType,
    playerBallsRemaining,
    aiBallsRemaining,
    lastFoul,
    isBreakShot,
    ballInHand,
  } = gameState;

  const renderRemainingBalls = (count: number, max: number = 7) => {
    return (
      <View className={styles.remainingBalls}>
        {Array.from({ length: max }).map((_, i) => (
          <View
            key={i}
            className={classnames(styles.miniBall, i >= count && styles.pocketed)}
          />
        ))}
      </View>
    );
  };

  return (
    <View className={styles.container}>
      <View className={styles.statusRow}>
        <View className={styles.playerInfo}>
          <Text className={styles.playerLabel}>我方</Text>
          <Text className={classnames(styles.playerName, currentPlayer === 'player' && styles.active)}>
            你
          </Text>
          <View className={styles.ballType}>
            <View className={classnames(styles.ballIndicator, playerBallType)} />
            <Text className={styles.ballTypeText}>
              {isBreakShot && !playerBallType ? '待定' : getBallTypeName(playerBallType)}
            </Text>
          </View>
        </View>

        <View className={currentPlayer === 'player' ? styles.currentTurn : styles.foulIndicator}>
          {lastFoul !== 'none' ? (
            <Text className={styles.foulText}>
              犯规: {getFoulMessage(lastFoul)}
            </Text>
          ) : ballInHand ? (
            <Text className={styles.turnText}>手中球</Text>
          ) : (
            <Text className={styles.turnText}>
              {currentPlayer === 'player' ? '你的回合' : 'AI回合'}
            </Text>
          )}
        </View>

        <View className={styles.playerInfo}>
          <Text className={styles.playerLabel}>对手</Text>
          <Text className={classnames(styles.playerName, currentPlayer === 'ai' && styles.active)}>
            AI
          </Text>
          <View className={styles.ballType}>
            <View className={classnames(styles.ballIndicator, aiBallType)} />
            <Text className={styles.ballTypeText}>
              {isBreakShot && !aiBallType ? '待定' : getBallTypeName(aiBallType)}
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.remainingRow}>
        <View className={styles.remainingInfo}>
          {renderRemainingBalls(playerBallsRemaining)}
          <Text className={styles.remainingText}>
            剩余 {playerBallsRemaining} 球
          </Text>
        </View>
        <View className={styles.remainingInfo}>
          <Text className={styles.remainingText}>
            剩余 {aiBallsRemaining} 球
          </Text>
          {renderRemainingBalls(aiBallsRemaining)}
        </View>
      </View>
    </View>
  );
};

export default GameHeader;
