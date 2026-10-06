import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * Type presets for custom alert dialogs
 */
const ALERT_THEMES = {
  cart: {
    icon: 'cart',
    iconColor: '#E64A78',
    bgColor: '#FDEFF3',
    borderColor: '#FCE1E9',
    badgeText: 'SHOPPING CART',
  },
  success: {
    icon: 'checkmark-circle',
    iconColor: '#27A462',
    bgColor: '#EDFBF4',
    borderColor: '#DCF5E8',
    badgeText: 'SUCCESS',
  },
  error: {
    icon: 'alert-circle',
    iconColor: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    badgeText: 'ERROR',
  },
  warning: {
    icon: 'warning',
    iconColor: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    badgeText: 'NOTICE',
  },
  info: {
    icon: 'information-circle',
    iconColor: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    badgeText: 'INFO',
  },
  confirm: {
    icon: 'help-circle',
    iconColor: '#E64A78',
    bgColor: '#FDEFF3',
    borderColor: '#FCE1E9',
    badgeText: 'CONFIRM',
  },
};

/**
 * Auto-detect alert type based on title/message if not explicitly specified
 */
export function inferAlertType(title = '', message = '') {
  const combined = `${title} ${message}`.toLowerCase();

  if (
    combined.includes('cart') ||
    combined.includes('added to cart') ||
    combined.includes('shopping')
  ) {
    return 'cart';
  }
  if (
    combined.includes('success') ||
    combined.includes('verified') ||
    combined.includes('placed') ||
    combined.includes('saved') ||
    combined.includes('copied') ||
    combined.includes('updated')
  ) {
    return 'success';
  }
  if (
    combined.includes('error') ||
    combined.includes('failed') ||
    combined.includes('fail') ||
    combined.includes('denied') ||
    combined.includes('cannot') ||
    combined.includes('unable') ||
    combined.includes('invalid')
  ) {
    return 'error';
  }
  if (
    combined.includes('warning') ||
    combined.includes('stock') ||
    combined.includes('limit') ||
    combined.includes('notice') ||
    combined.includes('empty') ||
    combined.includes('required') ||
    combined.includes('incomplete')
  ) {
    return 'warning';
  }
  if (
    combined.includes('logout') ||
    combined.includes('delete') ||
    combined.includes('cancel') ||
    combined.includes('are you sure') ||
    combined.includes('confirm')
  ) {
    return 'confirm';
  }

  return 'info';
}

export default function CustomAlertModal({
  visible,
  title,
  message,
  buttons = [],
  type,
  icon,
  onClose,
  cancelable = true,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  if (!visible) return null;

  const resolvedType = type || inferAlertType(title, message);
  const theme = ALERT_THEMES[resolvedType] || ALERT_THEMES.info;
  const iconName = icon || theme.icon;

  // Format buttons
  const alertButtons =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: 'OK', style: 'default', onPress: onClose }];

  // Decide button layout: if 2 buttons and both texts are short, side-by-side; otherwise stacked
  const isTwoButtons = alertButtons.length === 2;
  const bothButtonsShort =
    isTwoButtons &&
    (alertButtons[0]?.text?.length || 0) <= 12 &&
    (alertButtons[1]?.text?.length || 0) <= 12;

  const handleButtonPress = (btn) => {
    if (btn.onPress) {
      btn.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={cancelable ? onClose : undefined}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={cancelable ? onClose : undefined}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Top Accent Icon with glow ring */}
              <View
                style={[
                  styles.iconOuterRing,
                  { backgroundColor: theme.borderColor },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.bgColor },
                  ]}
                >
                  <Ionicons name={iconName} size={32} color={theme.iconColor} />
                </View>
              </View>

              {/* Title */}
              {title ? <Text style={styles.title}>{title}</Text> : null}

              {/* Message */}
              {message ? (
                <Text style={styles.message}>{message}</Text>
              ) : null}

              {/* Buttons Container */}
              <View
                style={[
                  styles.buttonsContainer,
                  bothButtonsShort
                    ? styles.buttonsRow
                    : styles.buttonsColumn,
                ]}
              >
                {alertButtons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const isPrimary = !isCancel && !isDestructive;

                  let btnStyle = styles.btnPrimary;
                  let btnTextStyle = styles.btnTextPrimary;

                  if (isCancel) {
                    btnStyle = styles.btnCancel;
                    btnTextStyle = styles.btnTextCancel;
                  } else if (isDestructive) {
                    btnStyle = styles.btnDestructive;
                    btnTextStyle = styles.btnTextDestructive;
                  }

                  return (
                    <TouchableOpacity
                      key={`${btn.text}-${index}`}
                      style={[
                        styles.baseBtn,
                        btnStyle,
                        bothButtonsShort && { flex: 1 },
                      ]}
                      activeOpacity={0.82}
                      onPress={() => handleButtonPress(btn)}
                    >
                      <Text style={[styles.baseBtnText, btnTextStyle]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 10, 15, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#2A1E24',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 25,
  },
  message: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#6B5F63',
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  baseBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  baseBtnText: {
    fontSize: 13.5,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  btnPrimary: {
    backgroundColor: '#E64A78',
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  btnTextPrimary: {
    color: '#FFFFFF',
  },
  btnDestructive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnTextDestructive: {
    color: '#FFFFFF',
  },
  btnCancel: {
    backgroundColor: '#F5F0F2',
    borderWidth: 1,
    borderColor: '#E8DFE3',
  },
  btnTextCancel: {
    color: '#6B5F63',
  },
});
