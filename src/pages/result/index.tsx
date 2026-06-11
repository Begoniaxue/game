import React, { useState, useEffect } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { PlayerType, WinReason, LoseReason, DifficultyLevel } from '../../types/game';
import styles from './index.module.scss';
import classnames from 'classnames';

const loseReasonMap: Record<string, string> = {
  cue_ball_with_black: '打黑八时母球随黑八一起进袋',
  premature_black: '己方球未清完提前打进黑八',
  three_consecutive_fouls: '三次连续犯规',
  cue_ball_pocketed: '母球落袋',
  wrong_ball_first: '首先击中非己方目标球',
  no_rail_hit: '击球后无球碰台边库',
  surrender: '主动认输',
};

const difficultyNames: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '高手',
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}分${secs}秒`;
  }
  return `${secs}秒`;
};

const ResultPage: React.FC = () => {
  const router = useRouter();
  const [result, setResult] = useState({
    winner: 'player' as PlayerType,
    duration: 0,
    playerFouls: 0,
    aiFouls: 0,
    winReason: '' as WinReason | '',
    loseReason: '' as LoseReason | '',
    difficulty: 'normal' as DifficultyLevel,
  });

  useEffect(() => {
    const params = router.params;
    setResult({
      winner: (params.winner || 'player') as PlayerType,
      duration: parseInt(params.duration || '0', 10),
      playerFouls: parseInt(params.playerFouls || '0', 10),
      aiFouls: parseInt(params.aiFouls || '0', 10),
      winReason: (params.winReason || '') as WinReason | '',
      loseReason: (params.loseReason || '') as LoseReason | '',
      difficulty: (params.difficulty || 'normal') as DifficultyLevel,
    });
  }, [router.params]);

  const isWin = result.winner === 'player';

  const handlePlayAgain = () => {
    Taro.redirectTo({ url: '/pages/difficulty/index' });
  };

  const handleBackHome = () => {
    Taro.navigateBack({ delta: 99 }).catch(() => {
      Taro.switchTab({ url: '/pages/home/index' });
    });
  };

  const handleShare = () => {
    Taro.showToast({
      title: '分享功能开发中',
      icon: 'none',
    });
  };

  const handleWatchAd = () => {
    Taro.showToast({
      title: '广告功能开发中',
      icon: 'none',
    });
  };

  const getWinText = () => {
    switch (result.winReason) {
      case 'black_ball_pocketed':
        return '清台完成！合法打进黑八';
      case 'opponent_premature_black':
        return '对手未清球打进黑八';
      case 'opponent_three_fouls':
        return '对手三次连续犯规';
      case 'opponent_black_with_cue':
        return '对手打黑八时母球落袋';
      default:
        return '恭喜赢得本局胜利！';
    }
  };

  return (
    <View className={styles.container}>
      <View className={styles.resultCard}>
        <View className={classnames(styles.resultIcon, isWin ? styles.win : styles.lose)}>
          {isWin ? '🏆' : '😔'}
        </View>

        <Text className={classnames(styles.resultTitle, isWin ? styles.win : styles.lose)}>
          {isWin ? '胜利！' : '失败'}
        </Text>

        <Text className={styles.resultSubtitle}>
          {isWin ? getWinText() : '本局遗憾落败'}
        </Text>

        {!isWin && result.loseReason && (
          <View className={styles.loseReason}>
            <Text className={styles.label}>失败原因</Text>
            <Text className={styles.text}>{loseReasonMap[result.loseReason] || '未知原因'}</Text>
          </View>
        )}

        <View className={styles.statsGrid}>
          <View className={classnames(styles.statItem, styles.highlight)}>
            <Text className={styles.label}>对战时长</Text>
            <Text className={styles.value}>{formatDuration(result.duration)}</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.label}>对战难度</Text>
            <Text className={styles.value}>{difficultyNames[result.difficulty]}</Text>
          </View>
        </View>

        <View className={styles.detailStats}>
          <View className={styles.detailRow}>
            <Text className={styles.label}>我方犯规次数</Text>
            <Text className={classnames(styles.value, styles.player)}>{result.playerFouls}次</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.label}>AI犯规次数</Text>
            <Text className={classnames(styles.value, styles.ai)}>{result.aiFouls}次</Text>
          </View>
        </View>

        <View className={styles.actionButtons}>
          <Button className={styles.primaryBtn} onClick={handlePlayAgain}>
            再来一局
          </Button>
          <Button className={styles.secondaryBtn} onClick={handleBackHome}>
            返回首页
          </Button>
          <Button className={styles.secondaryBtn} onClick={handleShare}>
            分享战绩
          </Button>
        </View>

        <View className={styles.adSection}>
          <Text className={styles.adTitle}>🎁 解锁更多内容</Text>
          <Text className={styles.adDesc}>
            观看激励视频广告，解锁高清桌布皮肤、AI超强难度等更多功能
          </Text>
          <View className={styles.adBtn} onClick={handleWatchAd}>
            <Text>📺 观看广告解锁</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ResultPage;
