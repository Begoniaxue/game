import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface ModalProps {
  visible: boolean;
  title?: string;
  onClose?: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  showFooter?: boolean;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  onClose,
  onConfirm,
  confirmText = '确定',
  cancelText = '取消',
  showFooter = true,
  children,
}) => {
  if (!visible) return null;

  return (
    <View className={styles.overlay} onClick={onClose}>
      <View className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {title && (
          <View className={styles.header}>
            <Text className={styles.title}>{title}</Text>
          </View>
        )}
        <View className={styles.content}>{children}</View>
        {showFooter && (
          <View className={styles.footer}>
            <Button
              className={classnames(styles.btn, 'btnGhost')}
              onClick={onClose}
            >
              {cancelText}
            </Button>
            <Button
              className={classnames(styles.btn, 'btnPrimary')}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
};

export default Modal;
