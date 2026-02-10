import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import fonts from '../theme/fonts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ALERT_CONFIG = {
  success: {
    color: '#33A744',
    bgLight: 'rgba(51, 167, 68, 0.1)',
    icon: 'checkmark-circle',
  },
  warning: {
    color: '#D27F27',
    bgLight: 'rgba(210, 127, 39, 0.1)',
    icon: 'warning',
  },
  error: {
    color: '#E74C3C',
    bgLight: 'rgba(231, 76, 60, 0.1)',
    icon: 'close-circle',
  },
  info: {
    color: '#D27F27',
    bgLight: 'rgba(210, 127, 39, 0.1)',
    icon: 'information-circle',
  }
};

export default function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  cancelText = null,
  confirmText = 'OK',
  onCancel,
  onConfirm
}) {
  const config = ALERT_CONFIG[type] || ALERT_CONFIG.info;
  const { color, bgLight, icon } = config;

  // Detectar si el mensaje es largo (tiene saltos de línea)
  const isLongMessage = message && message.split('\n').length > 3;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        Keyboard.dismiss();
        onConfirm && onConfirm();
      }}>
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          // Solo cerrar si no hay cancelText (es un alert simple)
          if (!cancelText) {
            onConfirm && onConfirm();
          }
        }}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
              {/* Icono circular */}
              <View style={[styles.iconContainer, { backgroundColor: bgLight }]}>
                <Ionicons name={icon} size={48} color={color} />
              </View>

              {/* Titulo */}
              {title ? (
                <Text style={[styles.title, { color }]}>{title}</Text>
              ) : null}

              {/* Mensaje - con scroll si es largo */}
              {isLongMessage ? (
                <ScrollView
                  style={styles.messageScroll}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.messageScrollContent}
                >
                  <Text style={styles.message}>{message}</Text>
                </ScrollView>
              ) : (
                <Text style={styles.message}>{message}</Text>
              )}

              {/* Botones */}
              <View style={styles.actions}>
                {cancelText && (
                  <TouchableOpacity
                    style={[styles.button, styles.outlineButton, { borderColor: color }]}
                    onPress={() => {
                      Keyboard.dismiss();
                      if (onCancel) {
                        onCancel();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.buttonText, { color }]}>{cancelText}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    { backgroundColor: color, shadowColor: color }
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    onConfirm && onConfirm();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageScroll: {
    maxHeight: SCREEN_HEIGHT * 0.35,
    width: '100%',
    marginBottom: 24,
  },
  messageScrollContent: {
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderWidth: 1.5,
  },
  primaryButton: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    textAlign: 'center',
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    textAlign: 'center',
    color: '#FFF',
  },
});
