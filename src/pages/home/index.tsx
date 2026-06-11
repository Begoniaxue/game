import React, { useState, useEffect } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { storage } from '../../utils/storage';
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

四、犯规判定（触发后对手手中球）
- 击打非己方目标球
- 母球落袋、跳出台面
- 击球后无任何球碰台边库
- 击打黑八时黑八落袋+母球同步落袋=直接输局

五、胜利条件
- 清完己方全部7球 → 合法打进黑八 → 本局胜利

六、失败条件
- 己方球未清完打进黑八
- 打黑八时母球随黑八一起进袋
- 三次连续犯规（开关控制）`;

const HomePage: React.FC = () => {
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalFouls: 0,
    avgDuration: 0,
  });
  const [settings, setSettings] = useState({
    soundEnabled: true,
    threeFoulRule: true,
    showAimGuide: true,
  });

  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  const loadStats = async () => {
    const records = await storage.getRecords();
    setStats(storage.getStats(records));
  };

  const loadSettings = async () => {
    const s = await storage.getSettings();
    setSettings(s);
  };

  const handleStartGame = () => {
    Taro.navigateTo({ url: '/pages/difficulty/index' });
  };

  const handleViewRecords = () => {
    Taro.switchTab({ url: '/pages/records/index' });
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleOpenRules = () => {
    setShowRules(true);
  };

  const handleSettingChange = async (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await storage.saveSettings({ [key]: value });
  };

  const handleClearData = async () => {
    Taro.showModal({
      title: '确认清除',
      content: '确定要清除所有本地数据吗？此操作不可恢复。',
      confirmColor: '#F53F3F',
      success: async (res) => {
        if (res.confirm) {
          await storage.clearAll();
          loadStats();
          loadSettings();
          Taro.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>
          中式<Text className={styles.highlight}>黑八</Text>
        </Text>
        <Text className={styles.subtitle}>专业台球竞技 · 人机对战</Text>
      </View>

      <View className={styles.tablePreview}>
        <View className={styles.woodenFrame} />
      </View>

      <View className={styles.actionSection}>
        <Button className={styles.mainBtn} onClick={handleStartGame}>
          <Text className={styles.btnIcon}>🎱</Text>
          <Text className={styles.btnText}>开始对局</Text>
        </Button>

        <View className={styles.menuGrid}>
          <View className={styles.menuCard} onClick={handleViewRecords}>
            <View className={styles.icon}>📊</View>
            <Text className={styles.label}>历史战绩</Text>
            <Text className={styles.desc}>查看对战记录</Text>
          </View>
          <View className={styles.menuCard} onClick={handleOpenSettings}>
            <View className={styles.icon}>⚙️</View>
            <Text className={styles.label}>设置</Text>
            <Text className={styles.desc}>游戏参数配置</Text>
          </View>
          <View className={styles.menuCard} onClick={handleOpenRules}>
            <View className={styles.icon}>📖</View>
            <Text className={styles.label}>规则帮助</Text>
            <Text className={styles.desc}>中式黑八规则</Text>
          </View>
          <View className={styles.menuCard} onClick={() => Taro.switchTab({ url: '/pages/mine/index' })}>
            <View className={styles.icon}>👤</View>
            <Text className={styles.label}>我的</Text>
            <Text className={styles.desc}>个人中心</Text>
          </View>
        </View>
      </View>

      <View className={styles.statsSection}>
        <Text className={styles.sectionTitle}>战绩统计</Text>
        <View className={styles.statsCard}>
          <View className={styles.statsGrid}>
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
          </View>
          <View className={styles.winRateBar}>
            <View
              className={styles.winRateFill}
              style={{ width: `${stats.winRate}%` }}
            />
          </View>
          <Text className={styles.winRateText}>
            胜率 {stats.winRate}% · 场均犯规 {stats.totalFouls / Math.max(1, stats.totalGames) || 0} 次
          </Text>
        </View>
      </View>

      <Modal
        visible={showRules}
        title="中式黑八规则"
        onClose={() => setShowRules(false)}
        showFooter={false}
      >
        <View>
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
        </View>
      </Modal>

      <Modal
        visible={showSettings}
        title="游戏设置"
        onClose={() => setShowSettings(false)}
        showFooter={false}
      >
        <View>
          <SettingItem
            label="音效开关"
            value={settings.soundEnabled}
            onChange={(v) => handleSettingChange('soundEnabled', v)}
          />
          <SettingItem
            label="三次犯规规则"
            value={settings.threeFoulRule}
            onChange={(v) => handleSettingChange('threeFoulRule', v)}
            desc="连续三次犯规直接判负"
          />
          <SettingItem
            label="瞄准辅助线"
            value={settings.showAimGuide}
            onChange={(v) => handleSettingChange('showAimGuide', v)}
            desc="显示击球瞄准线"
          />

          <View
            style={{
              marginTop: '32rpx',
              paddingTop: '24rpx',
              borderTop: '1rpx solid #2A2A2A',
            }}
          >
            <Button
              className="btnGhost"
              style={{
                color: '#F53F3F',
                borderColor: 'rgba(245, 63, 63, 0.3)',
              }}
              onClick={handleClearData}
            >
              清除所有本地数据
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const SettingItem: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  desc?: string;
}> = ({ label, value, onChange, desc }) => {
  return (
    <View
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '20rpx',
        paddingBottom: '20rpx',
        borderBottom: '1rpx solid #2A2A2A',
      }}
    >
      <View>
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx' }}>{label}</Text>
        {desc && (
          <Text style={{ color: '#808080', fontSize: '22rpx', marginTop: '4rpx', display: 'block' }}>
            {desc}
          </Text>
        )}
      </View>
      <View
        onClick={() => onChange(!value)}
        style={{
          width: '88rpx',
          height: '48rpx',
          borderRadius: '24rpx',
          background: value ? 'linear-gradient(135deg, #D4AF37 0%, #B8941F 100%)' : '#333333',
          padding: '4rpx',
          transition: 'all 0.2s',
        }}
      >
        <View
          style={{
            width: '40rpx',
            height: '40rpx',
            borderRadius: '50%',
            background: '#FFFFFF',
            marginLeft: value ? '40rpx' : '0',
            transition: 'margin-left 0.2s',
          }}
        />
      </View>
    </View>
  );
};

export default HomePage;
