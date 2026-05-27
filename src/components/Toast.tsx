import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

let showToastFn: (msg: string, type: ToastType) => void;
let showAlertFn: (title: string, msg: string, buttons: AlertButton[]) => void;

/**
 * 全局调用工具类
 */
export class AppToast {
  /**
   * 显示轻提示 (自动消失)
   */
  static show(msg: string, type: ToastType = 'info') {
    if (showToastFn) showToastFn(msg, type);
  }

  /**
   * 显示模态弹窗 (类似 Alert.alert)
   */
  static alert(
    title: string,
    msg: string,
    buttons: AlertButton[] = [{ text: '确定' }],
  ) {
    if (showAlertFn) showAlertFn(title, msg, buttons);
  }
}

/**
 * Toast 根组件，需挂载在用来 App.tsx
 */
export const ToastComponent = () => {
  // --- Toast State ---
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [_toastType, setToastType] = useState<ToastType>('info');
  const [fadeAnim] = useState(new Animated.Value(0));

  // --- Alert State ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    msg: string;
    buttons: AlertButton[];
  }>({
    title: '',
    msg: '',
    buttons: [],
  });

  useEffect(() => {
    showToastFn = (msg, type) => {
      setToastMsg(msg);
      setToastType(type);
      setToastVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setToastVisible(false);
        });
      }, 2000);
      return () => clearTimeout(timer);
    };

    showAlertFn = (title, msg, buttons) => {
      setAlertConfig({ title, msg, buttons: buttons || [{ text: '确定' }] });
      setAlertVisible(true);
    };
  }, [fadeAnim]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Toast 提示 */}
      {toastVisible && (
        <Animated.View style={[styles.toastBox, { opacity: fadeAnim }]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}

      {/* 模态弹窗 */}
      <Modal transparent visible={alertVisible} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMsg}>{alertConfig.msg}</Text>
            <View style={styles.btnRow}>
              {alertConfig.buttons.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.alertBtn,
                    idx > 0 && { borderLeftWidth: 1, borderLeftColor: '#eee' },
                  ]}
                  onPress={() => {
                    setAlertVisible(false);
                    if (btn.onPress) btn.onPress();
                  }}
                >
                  <Text
                    style={[
                      styles.alertBtnText,
                      btn.style === 'cancel' || btn.style === 'destructive'
                        ? { color: 'red' }
                        : { color: '#2196F3' },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastBox: {
    paddingHorizontal: 20, // 稍微减小内边距
    paddingVertical: 10, // 稍微减小内边距
    borderRadius: 50, // 完全圆角
    position: 'absolute',
    top: '20%', // 再往上提一点 (原30%)
    backgroundColor: 'rgba(0,0,0,0.8)', // 淡黑色背景
    elevation: 5,
    maxWidth: '80%',
  },
  toastText: {
    color: 'white',
    fontSize: 14, // 字体稍微改小 (原15)
    textAlign: 'center',
  },
  // Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: width * 0.75,
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  alertMsg: {
    fontSize: 15,
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  btnRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  alertBtn: { flex: 1, padding: 15, alignItems: 'center' },
  alertBtnText: { fontSize: 16, fontWeight: 'bold' },
});
