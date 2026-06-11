import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { storage } from '../../utils/storage';
import { AppSettings } from '../../types/game';
import Modal from '../../components/Modal';
import styles from './index.module.scss';

const RULES_TEXT = `中式黑八官方规则

一、球组说明
- 1颗白球（母球）
- 7颗实色小球（1-7号）
- 7颗花色大球（9-15号）
- 1颗黑八（8号）

二、开球规则
- 开球无进球：双方无球组归属，轮流击球
- 开球打进实色/花色：自动分配对应球组
- 开球直接进黑八：开球方直接本局输掉
- 开球白球落袋：对方获得手中球

三、击球顺序
- 必须先打完自身全部7颗目标球，才能击打黑八
- 未打完己方球提前碰/打进黑八=直接判负

四、犯规判定
- 击打非己方目标球
- 母球落袋、跳出台面
- 击球后无任何球碰台边库
- 击打黑八时黑八落袋+母球同步落袋=直接输局

五、胜利条件
- 清完己方全部7球 → 合法打进黑八 → 本局胜利`;

const MinePage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    threeFoulRule: true,
    showAimGuide: true,
  });
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalFouls: 0,
    avgDuration: 0,
  });
  const [showRules, setShowRules] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await storage.getSettings();
    setSettings(s);
    
    const records = await storage.getRecords();
    setStats(storage.getStats(records));
  };

  const handleSettingChange = async (key: keyof AppSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await storage.saveSettings({ [key]: value });
  };

  const handleClearData = async () => {
    Taro.showModal({
      title: '确认清除',
      content: '确定要清除所有对战记录吗？',
      confirmColor: '#F53F3F',
      success: async (res) => {
        if (res.confirm) {
          await storage.clearRecords();
          loadData();
          Taro.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  };

  const menuItems = [
    {
      icon: '📖',
      label: '游戏规则',
      onClick: () => setShowRules(true),
    },
    {
      icon: '🔊',
      label: '音效',
      toggle: true,
      toggleKey: 'soundEnabled' as keyof AppSettings,
    },
    {
      icon: '📏',
      label: '三次犯规规则',
      toggle: true,
      toggleKey: 'threeFoulRule' as keyof AppSettings,
    },
    {
      icon: '🎯',
      label: '瞄准辅助线',
      toggle: true,
      toggleKey: 'showAimGuide' as keyof AppSettings,
    },
    {
      icon: '📊',
      label: '清除对战记录',
      onClick: handleClearData,
      danger: true,
    },
    {
      icon: 'ℹ️',
      label: '关于',
      onClick: () => setShowAbout(true),
    },
  ];

  return (
    <View className={styles.container}>
      <View className={styles.profileCard}>
        <View className={styles.avatar}>🎱</View>
        <Text className={styles.name}>台球大师</Text>
        <Text className={styles.level}>
          胜率 {stats.winRate}% · 累计 {stats.totalGames} 场
        </Text>
      </View>

      <View className={styles.statsOverview}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.totalGames}</Text>
          <Text className={styles.statLabel}>总场次</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.wins}</Text>
          <Text className={styles.statLabel}>胜场</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.losses}</Text>
          <Text className={styles.statLabel}>负场</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.totalFouls}</Text>
          <Text className={styles.statLabel}>总犯规</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>设置</Text>
        <View className={styles.menuList}>
          {menuItems.map((item, index) => (
            <View
              key={index}
              className={styles.menuItem}
              onClick={() => !item.toggle && item.onClick?.()}
            >
              <View className={styles.left}>
                <View className={styles.icon}>{item.icon}</View>
                <Text
                  className={styles.label}
                  style={{ color: item.danger ? '#F53F3F' : undefined }}
                >
                  {item.label}
                </Text>
              </View>
              <View className={styles.right}>
                {item.toggle && item.toggleKey ? (
                  <View
                    className={classnames(
                      styles.toggleWrapper,
                      settings[item.toggleKey] && styles.active
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSettingChange(item.toggleKey!, !settings[item.toggleKey!]);
                    }}
                  >
                    <View className={styles.toggleKnob} />
                  </View>
                ) : (
                  <Text className={styles.arrow}>›</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.versionInfo}>
        <Text className={styles.version}>中式黑八台球 v1.0.0</Text>
        <Text className={styles.copyright}>© 2024 Billiards Game</Text>
      </View>

      <Modal
        visible={showRules}
        title="游戏规则"
        onClose={() => setShowRules(false)}
        showFooter={false}
      >
        <Text
          style={{
            whiteSpace: 'pre-line',
            color: '#B0B0B0',
            fontSize: '26rpx',
            lineHeight: '1.8',
          }}
        >
          {RULES_TEXT}
        </Text>
      </Modal>

      <Modal
        visible={showAbout}
        title="关于"
        onClose={() => setShowAbout(false)}
        showFooter={false}
      >
        <View style={{ textAlign: 'center' }}>
          <Text style={{ fontSize: '80rpx', marginBottom: '16rpx', display: 'block' }}>🎱</Text>
          <Text style={{ color: '#fff', fontSize: '32rpx', fontWeight: '600', marginBottom: '16rpx', display: 'block' }}>
            中式黑八台球
          </Text>
          <Text style={{ color: '#808080', fontSize: '26rpx', lineHeight: '1.8' }}>
            版本：1.0.0{'\n'}
            基于 Canvas 2D + Matter.js 物理引擎{'\n'}
            支持微信小游戏、H5 多端运行
          </Text>
        </View>
      </Modal>
    </View>
  );
};

export default MinePage;
