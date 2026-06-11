import React from 'react';
import { View, Text, Slider } from '@tarojs/components';
import styles from './index.module.scss';

interface PowerSliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const PowerSlider: React.FC<PowerSliderProps> = ({
  value,
  min = 0,
  max = 100,
  onChange,
  disabled = false,
}) => {

  return (
    <View className={styles.container}>
      <View className={styles.label}>
        <Text className={styles.labelText}>击球力度</Text>
        <Text className={styles.powerValue}>{Math.round(value)}%</Text>
      </View>
      
      <Slider
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const detail = e.detail as { value: number };
          onChange(detail.value);
        }}
        onChanging={(e) => {
          const detail = e.detail as { value: number };
          onChange(detail.value);
        }}
        disabled={disabled}
        activeColor="#D4AF37"
        backgroundColor="#2A2A2A"
        blockSize={24}
        blockColor="#FFFFFF"
      />
      
      <View className={styles.powerMarks}>
        <Text className={styles.mark}>轻</Text>
        <Text className={styles.mark}>中</Text>
        <Text className={styles.mark}>重</Text>
      </View>
    </View>
  );
};

export default PowerSlider;
