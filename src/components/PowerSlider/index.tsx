import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const getValueFromPosition = useCallback((clientX: number): number => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, percent));
    return Math.round(min + clamped * (max - min));
  }, [min, max]);

  const handleMove = useCallback((clientX: number) => {
    if (disabled) return;
    const newValue = getValueFromPosition(clientX);
    setLocalValue(newValue);
    onChange(newValue);
  }, [disabled, onChange, getValueFromPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);

    const onMouseMove = (ev: MouseEvent) => {
      handleMove(ev.clientX);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const percent = ((localValue - min) / (max - min)) * 100;

  return (
    <View className={styles.container}>
      <View className={styles.label}>
        <Text className={styles.labelText}>击球力度</Text>
        <Text className={styles.powerValue}>{Math.round(localValue)}%</Text>
      </View>

      <div
        ref={trackRef}
        className={styles.customTrack}
        style={{
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.customTrackBg} />
        <div
          className={styles.customTrackFill}
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #D4AF37 0%, #FFD700 100%)',
          }}
        />
        <div
          className={styles.customThumb}
          style={{
            left: `calc(${percent}% - 12px)`,
          }}
        />
      </div>

      <View className={styles.powerMarks}>
        <Text className={styles.mark}>轻</Text>
        <Text className={styles.mark}>中</Text>
        <Text className={styles.mark}>重</Text>
      </View>
    </View>
  );
};

export default PowerSlider;
