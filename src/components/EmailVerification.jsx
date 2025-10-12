import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import axios from 'axios';
import fonts from '../theme/fonts';

const EmailVerification = ({ 
  isVisible,
  onCancel, 
  email, 
  type, 
  onVerified,
  onResend,
  title = "Verificar Email",
  subtitle = "Te enviamos un código de 6 dígitos"
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const inputs = useRef([]);

  

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const sendOTP = async () => {
    setSending(true);
    try {
      const response = await axios.post('https://awsoccr.pixelcrafters.digital/api/otp/send', {
        email: email,
        type: type
      });

      if (response.data.success) {
        if (!response.data.otp_enabled) {
          // OTP desactivado - proceder directamente
          Alert.alert('Info', 'Verificación de email desactivada', [
            { text: 'OK', onPress: () => onVerified() }
          ]);
          return;
        }
        
        setOtpSent(true);
        setTimeLeft(300); // 5 minutos
        Alert.alert('Código Enviado', 'Revisa tu email para obtener el código de verificación');
        
        // Debug en desarrollo
        if (__DEV__ && response.data.debug_otp) {
        }
      } else {
        Alert.alert('Error', response.data.message || 'Error enviando código');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el código de verificación');
    }
    setSending(false);
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Ingresa el código completo de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://awsoccr.pixelcrafters.digital/api/otp/verify', {
        email: email,
        otp: otpCode,
        type: type
      });

      if (response.data.success) {
        onVerified(otpCode);
      } else {
        Alert.alert('Error', response.data.message || 'Código inválido');
        setOtp(['', '', '', '', '', '']); // Limpiar código
        inputs.current[0]?.focus();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo verificar el código';
      Alert.alert('Error', errorMessage);
    }
    setLoading(false);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Solo un dígito

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus al siguiente input
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const resendOTP = () => {
    setOtp(['', '', '', '', '', '']);
    setOtpSent(false);
    sendOTP();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Ingresa el código de 6 dígitos que enviamos a:
          </Text>
          <Text style={styles.email}>{email}</Text>

          {sending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D27F27" />
              <Text style={styles.loadingText}>Enviando código...</Text>
            </View>
          ) : (
            <>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => inputs.current[index] = ref}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                      fonts.numericStyles.tabular // ✅ Aplicar estilo para números
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(index, value)}
                    onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
                    keyboardType="numeric"
                    maxLength={1}
                    textAlign="center"
                  />
                ))}
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.verifyButton]}
                  onPress={verifyOTP}
                  disabled={loading || otp.join('').length !== 6}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verificar</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                >
                  <Text style={[styles.buttonText, styles.cancelText]}>Cancelar</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.resendContainer}>
                {timeLeft > 0 ? (
                  <Text style={styles.timerText}>
                    Reenviar código en {formatTime(timeLeft)}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={resendOTP}>
                    <Text style={styles.resendText}>Reenviar código</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: 8,
    color: '#2F2F2F',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontFamily: fonts.medium,
    textAlign: 'center',
    color: '#D27F27',
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontFamily: fonts.regular,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 18,
    fontFamily: fonts.medium,
    color: '#2F2F2F',
  },
  otpInputFilled: {
    borderColor: '#D27F27',
    backgroundColor: '#FFF8F0',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#D27F27',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: '#fff',
  },
  cancelText: {
    color: '#666',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  timerText: {
    fontSize: 14,
    color: '#666',
    fontFamily: fonts.regular,
  },
  resendText: {
    fontSize: 14,
    color: '#D27F27',
    fontFamily: fonts.medium,
    textDecorationLine: 'underline',
  },
});

export default EmailVerification;