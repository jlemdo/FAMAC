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
  warning: '#D98F30',
  error:   '#E74C3C',
  info:    '#007AFF'
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
                      onCancel && onCancel();
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    fontFamily: fonts.script,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    textAlign: 'center',
  },
});
