import Taro from '@tarojs/taro';
import { GameRecord, AppSettings, DifficultyLevel } from '../types/game';

const STORAGE_KEYS = {
  RECORDS: 'billiards_records',
  SETTINGS: 'billiards_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  threeFoulRule: true,
  showAimGuide: true,
};

export const storage = {
  async getRecords(): Promise<GameRecord[]> {
    try {
      const result = await Taro.getStorage({ key: STORAGE_KEYS.RECORDS });
      return result.data || [];
    } catch {
      return [];
    }
  },

  async saveRecord(record: GameRecord): Promise<void> {
    const records = await this.getRecords();
    records.unshift(record);
    if (records.length > 100) {
      records.pop();
    }
    await Taro.setStorage({ key: STORAGE_KEYS.RECORDS, data: records });
  },

  async clearRecords(): Promise<void> {
    await Taro.removeStorage({ key: STORAGE_KEYS.RECORDS });
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const result = await Taro.getStorage({ key: STORAGE_KEYS.SETTINGS });
      return { ...DEFAULT_SETTINGS, ...result.data };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await Taro.setStorage({ key: STORAGE_KEYS.SETTINGS, data: updated });
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      Taro.removeStorage({ key: STORAGE_KEYS.RECORDS }),
      Taro.removeStorage({ key: STORAGE_KEYS.SETTINGS }),
    ]);
  },

  generateRecordId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  getDifficultyName(level: DifficultyLevel): string {
    const names: Record<DifficultyLevel, string> = {
      easy: '简单',
      normal: '普通',
      hard: '高手',
    };
    return names[level];
  },

  getStats(records: GameRecord[]): {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    totalFouls: number;
    avgDuration: number;
  } {
    if (records.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalFouls: 0,
        avgDuration: 0,
      };
    }

    const wins = records.filter(r => r.winner === 'player').length;
    const losses = records.length - wins;
    const totalFouls = records.reduce((sum, r) => sum + r.playerFouls, 0);
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalGames: records.length,
      wins,
      losses,
      winRate: Math.round((wins / records.length) * 100),
      totalFouls,
      avgDuration: Math.round(totalDuration / records.length),
    };
  },
};
