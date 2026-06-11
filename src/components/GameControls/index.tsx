import React from 'react';
import { View, Button } from '@tarojs/components';
import classnames from 'classnames';
import PowerSlider from '../PowerSlider';
import styles from './index.module.scss';

interface GameControlsProps {
  power: number;
  onPowerChange: (value: number) => void;
  onShoot: () => void;
  onPlaceCue: () => void;
  onSurrender: () => void;
  onBack: () => void;
  canShoot: boolean;
  isPlacing: boolean;
  onConfirmPlace?: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  power,
  onPowerChange,
  onShoot,
  onPlaceCue,
  onSurrender,
  onBack,
  canShoot,
  isPlacing,
  onConfirmPlace,
}) => {
  return (
    <View className={styles.container}>
      {!isPlacing && (
        <View className={styles.powerSection}>
          <PowerSlider
            value={power}
            onChange={onPowerChange}
            disabled={!canShoot}
          />
        </View>
      )}

      <View className={styles.buttonRow}>
        {isPlacing ? (
          <>
            <Button
              className={classnames(styles.actionBtn, styles.secondaryBtn, 'btnGhost')}
              onClick={onBack}
            >
              返回
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.shootBtn, 'btnPrimary')}
              onClick={onConfirmPlace}
            >
              确认位置
            </Button>
          </>
        ) : (
          <>
            <Button
              className={classnames(styles.actionBtn, styles.secondaryBtn, 'btnGhost')}
              onClick={onBack}
            >
              退出
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.secondaryBtn, 'btnGhost')}
              onClick={onPlaceCue}
              disabled={!canShoot}
            >
              复位白球
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.shootBtn, 'btnPrimary')}
              onClick={onShoot}
              disabled={!canShoot}
            >
              击球
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.dangerBtn, 'btnGhost')}
              onClick={onSurrender}
              disabled={!canShoot}
            >
              认输
            </Button>
          </>
        )}
      </View>
    </View>
  );
};

export default GameControls;
