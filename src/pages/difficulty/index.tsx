import React, { useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useGameStore } from '../../store/useGameStore';
import { DifficultyLevel } from '../../types/game';
import styles from './index.module.scss';

const difficulties = [
  {
    key: 'easy' as DifficultyLevel,
    name: '简单',
    icon: '😊',
    desc: '适合新手练习，AI瞄准精度较低，经常打偏',
    features: ['瞄准精度低', '力度不稳定', '简单球优先', '经常犯规'],
  },
  {
    key: 'normal' as DifficultyLevel,
    name: '普通',
    icon: '😐',
    desc: '标准难度，AI瞄准精准，会简单走位',
    features: ['瞄准精准', '力度稳定', '低级犯规少', '简单走位'],
  },
  {
    key: 'hard' as DifficultyLevel,
    name: '高手',
    icon: '😎',
    desc: '专业级AI，精准走位、防守、薄球样样精通',
    features: ['精准走位', '防守策略', '薄球薄切', '极少失误'],
  },
];

const DifficultyPage: React.FC = () => {
  const [selected, setSelected] = useState<DifficultyLevel>('normal');
  const setDifficulty = useGameStore(state => state.setDifficulty);
  const resetGame = useGameStore(state => state.resetGame);

  const handleSelect = (key: DifficultyLevel) => {
    setSelected(key);
    setDifficulty(key);
  };

  const handleStart = () => {
    resetGame();
    Taro.navigateTo({ url: '/pages/game/index' });
  };

  const getDifficultyName = (key: DifficultyLevel) => {
    return difficulties.find(d => d.key === key)?.name || '';
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>选择对战难度</Text>
        <Text className={styles.subtitle}>不同难度对应不同的AI水平</Text>
      </View>

      <View className={styles.difficultyList}>
        {difficulties.map(d => (
          <View
            key={d.key}
            className={classnames(styles.difficultyCard, styles[d.key])}
            onClick={() => handleSelect(d.key)}
          >
            <View className={styles.cardContent}>
              <View className={styles.icon}>{d.icon}</View>
              <View className={styles.info}>
                <Text className={styles.name}>{d.name}</Text>
                <Text className={styles.desc}>{d.desc}</Text>
              </View>
            </View>

            <View className={styles.featureList}>
              {d.features.map((f, i) => (
                <Text key={i} className={styles.featureTag}>{f}</Text>
              ))}
            </View>

            <View className={classnames(styles.selectedBadge, selected === d.key && styles.show)}>
              已选择
            </View>
          </View>
        ))}
      </View>

      <View className={styles.selectedInfo}>
        <Text className={styles.selectedText}>
          已选择 <Text className={styles.highlight}>{getDifficultyName(selected)}</Text> 难度
        </Text>
      </View>

      <Button className={styles.startBtn} onClick={handleStart}>
        开始对战
      </Button>
    </View>
  );
};

export default DifficultyPage;
