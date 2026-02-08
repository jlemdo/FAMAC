import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import fonts from '../theme/fonts';

const ALERT_COLORS = {
  success: '#33A744',
  warning: '#D27F27',
  error:   '#E74C3C',
  info:    '#D27F27'
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
  // console.log('🚨 CustomAlert renderizado:', { visible, type, title, message });
  const color = ALERT_COLORS[type] || ALERT_COLORS.info;
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
          onConfirm && onConfirm();
        }}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, { borderColor: color }]}>
              {title ? <Text style={[styles.title, { color }]}>{title}</Text> : null}
              <Text style={styles.message}>{message}</Text>
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
                  >
                    <Text style={[styles.buttonText, { color }]}>{cancelText}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: color }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    onConfirm && onConfirm();
                  }}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>{confirmText}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 0,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 100,
    flex: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  outlineButton: {
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    textAlign: 'center',
  },
});
