import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { storage } from '../../utils/storage';
import { GameRecord } from '../../types/game';
import { getWinMessage, getLoseMessage } from '../../game/constants';
import styles from './index.module.scss';

type FilterType = 'all' | 'win' | 'lose' | 'easy' | 'normal' | 'hard';

const RecordsPage: React.FC = () => {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const data = await storage.getRecords();
    setRecords(data);
  };

  const onPullDownRefresh = async () => {
    setIsRefreshing(true);
    await loadRecords();
    setIsRefreshing(false);
    Taro.stopPullDownRefresh();
  };

  const filteredRecords = records.filter(record => {
    switch (filter) {
      case 'win':
        return record.winner === 'player';
      case 'lose':
        return record.winner === 'ai';
      case 'easy':
      case 'normal':
      case 'hard':
        return record.difficulty === filter;
      default:
        return true;
    }
  });

  const stats = storage.getStats(records);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'win', label: '胜利' },
    { key: 'lose', label: '失败' },
    { key: 'easy', label: '简单' },
    { key: 'normal', label: '普通' },
    { key: 'hard', label: '高手' },
  ];

  const goToGame = () => {
    Taro.switchTab({ url: '/pages/home/index' });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>历史战绩</Text>
        
        <View className={styles.statsRow}>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{stats.totalGames}</Text>
            <Text className={styles.statLabel}>总场次</Text>
          </View>
          <View className={classnames(styles.statCard, styles.win)}>
            <Text className={styles.statValue}>{stats.wins}</Text>
            <Text className={styles.statLabel}>胜场</Text>
          </View>
          <View className={classnames(styles.statCard, styles.lose)}>
            <Text className={styles.statValue}>{stats.losses}</Text>
            <Text className={styles.statLabel}>负场</Text>
          </View>
        </View>
      </View>

      <ScrollView className={styles.filterBar} scrollX>
        {filters.map(f => (
          <Button
            key={f.key}
            className={classnames(styles.filterBtn, filter === f.key && styles.active)}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </ScrollView>

      <ScrollView
        className={styles.recordsList}
        onRefresherRefresh={onPullDownRefresh}
        refresherEnabled
        refresherTriggered={isRefreshing}
      >
        {filteredRecords.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📊</Text>
            <Text className={styles.emptyText}>
              {records.length === 0 ? '暂无对战记录' : '没有符合条件的记录'}
            </Text>
            <Button className="btnPrimary" onClick={goToGame}>
              去对战
            </Button>
          </View>
        ) : (
          filteredRecords.map(record => (
            <RecordCard key={record.id} record={record} />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const RecordCard: React.FC<{ record: GameRecord }> = ({ record }) => {
  const isWin = record.winner === 'player';
  const duration = storage.formatDuration(record.duration);
  const date = storage.formatDate(record.date);
  const difficultyName = storage.getDifficultyName(record.difficulty);

  let reason = '';
  if (isWin && record.winReason) {
    reason = getWinMessage(record.winReason);
  } else if (!isWin && record.loseReason) {
    reason = getLoseMessage(record.loseReason);
  }

  return (
    <View className={styles.recordCard}>
      <View className={styles.cardHeader}>
        <View className={classnames(styles.resultBadge, isWin ? styles.win : styles.lose)}>
          {isWin ? '胜利' : '失败'}
        </View>
        <Text className={styles.dateText}>{date}</Text>
      </View>

      <View className={styles.cardBody}>
        <View className={styles.infoItem}>
          <Text className={styles.infoValue}>{duration}</Text>
          <Text className={styles.infoLabel}>用时</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoValue}>{record.playerFouls}</Text>
          <Text className={styles.infoLabel}>我方犯规</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoValue}>{record.aiFouls}</Text>
          <Text className={styles.infoLabel}>对手犯规</Text>
        </View>
      </View>

      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text className={styles.difficultyTag}>{difficultyName}难度</Text>
        {record.playerBallType && (
          <Text style={{ fontSize: '22rpx', color: '#808080' }}>
            我方: {record.playerBallType === 'solid' ? '实色球' : '花色球'}
          </Text>
        )}
      </View>

      {reason && (
        <Text className={styles.reasonText}>{reason}</Text>
      )}
    </View>
  );
};

export default RecordsPage;
