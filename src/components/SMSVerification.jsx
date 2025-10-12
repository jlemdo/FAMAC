// src/components/SMSVerification.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { API_BASE_URL } from '../config/environment';
import fonts from '../theme/fonts';

/**
 * Componente reutilizable para verificación de teléfono por SMS
 *
 * @param {string} phone - Número de teléfono a verificar (formato: "55 1234 5678")
 * @param {string} type - Tipo de verificación: 'signup' | 'profile_update'
 * @param {function} onVerified - Callback cuando la verificación es exitosa
 * @param {function} onError - Callback cuando hay un error
 * @param {boolean} autoSend - Si true, envía el código automáticamente al montar
 */
export default function SMSVerification({
  phone,
  type = 'signup',
  onVerified,
  onError,
  autoSend = false
}) {
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const otpInputRef = useRef(null);

  // Verificar si SMS está habilitado en el servidor
  useEffect(() => {
    checkSMSStatus();
  }, []);

  // Auto-enviar código si está habilitado
  useEffect(() => {
    if (autoSend && smsEnabled && !codeSent && phone) {
      sendCode();
    }
  }, [autoSend, smsEnabled, phone]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkSMSStatus = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/sms/status`);
      setSmsEnabled(data.ready === true);
    } catch (error) {
      setSmsEnabled(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const formatPhoneForBackend = (phoneStr) => {
    // Remover espacios, guiones, paréntesis
    const cleaned = phoneStr.replace(/\D/g, '');

    // Si tiene 10 dígitos, agregar +52
    if (cleaned.length === 10) {
      return `+52${cleaned}`;
    }

    // Si tiene 12 y empieza con 52, agregar +
    if (cleaned.length === 12 && cleaned.startsWith('52')) {
      return `+${cleaned}`;
    }

    // Si ya tiene el formato correcto, retornar
    if (phoneStr.startsWith('+')) {
      return phoneStr.replace(/\D/g, '').replace(/^(\d)/, '+$1');
    }

    return cleaned;
  };

  const sendCode = async () => {
    if (!phone || phone.trim().length === 0) {
      if (onError) onError('Por favor ingresa tu número de teléfono');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneForBackend(phone);

      const { data } = await axios.post(`${API_BASE_URL}/api/sms/send`, {
        phone: formattedPhone,
        type: type
      });

      if (data.success) {
        setCodeSent(true);
        setCountdown(60); // 60 segundos para reenviar

        // Auto-focus en el input del código
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 300);

        // En desarrollo, pre-llenar el código si viene en debug
        if (__DEV__ && data.debug_otp) {
          console.log('🔐 DEBUG OTP:', data.debug_otp);
          // Opcional: auto-llenar en dev
          // setOtp(data.debug_otp);
        }
      } else {
        if (onError) onError(data.message || 'Error al enviar código');
      }
    } catch (error) {
      console.error('Error enviando SMS:', error);
      const errorMsg = error.response?.data?.message || 'Error al enviar código de verificación';
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== 6) {
      if (onError) onError('El código debe tener 6 dígitos');
      return;
    }

    setVerifying(true);
    try {
      const formattedPhone = formatPhoneForBackend(phone);

      const { data } = await axios.post(`${API_BASE_URL}/api/sms/verify`, {
        phone: formattedPhone,
        otp: otp,
        type: type
      });

      if (data.success) {
        if (onVerified) onVerified();
      } else {
        if (onError) onError(data.message || 'Código inválido');
        setOtp(''); // Limpiar código incorrecto
      }
    } catch (error) {
      console.error('Error verificando código:', error);
      const errorMsg = error.response?.data?.message || 'Código inválido o expirado';
      if (onError) onError(errorMsg);
      setOtp(''); // Limpiar código incorrecto
    } finally {
      setVerifying(false);
    }
  };

  // Si SMS no está habilitado, no mostrar nada
  if (checkingStatus) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#D27F27" />
        <Text style={styles.checkingText}>Verificando disponibilidad SMS...</Text>
      </View>
    );
  }

  if (!smsEnabled) {
    return null; // No mostrar componente si SMS está deshabilitado
  }

  return (
    <View style={styles.container}>
      {!codeSent ? (
        // Botón para enviar código
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.buttonDisabled]}
          onPress={sendCode}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="chatbubble-outline" size={18} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.sendButtonText}>Verificar por SMS</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        // Input para código + botón verificar
        <View style={styles.verificationContainer}>
          <Text style={styles.sentLabel}>
            📱 Código enviado a {phone}
          </Text>

          <View style={styles.codeInputContainer}>
            <TextInput
              ref={otpInputRef}
              style={styles.codeInput}
              placeholder="123456"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              editable={!verifying}
              returnKeyType="done"
              onSubmitEditing={verifyCode}
            />

            <TouchableOpacity
              style={[styles.verifyButton, (verifying || otp.length !== 6) && styles.buttonDisabled]}
              onPress={verifyCode}
              disabled={verifying || otp.length !== 6}
              activeOpacity={0.8}>
              {verifying ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Botón reenviar */}
          <TouchableOpacity
            style={[styles.resendButton, (loading || countdown > 0) && styles.resendButtonDisabled]}
            onPress={sendCode}
            disabled={loading || countdown > 0}
            activeOpacity={0.7}>
            <Ionicons
              name="refresh"
              size={14}
              color={countdown > 0 ? '#999' : '#D27F27'}
              style={styles.resendIcon}
            />
            <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
              {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar código'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            El código expira en 10 minutos
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 12,
  },
  checkingText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  sendButton: {
    width: '100%',
    backgroundColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verificationContainer: {
    width: '100%',
  },
  sentLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    letterSpacing: 4,
  },
  verifyButton: {
    width: 48,
    height: 48,
    backgroundColor: '#33A744',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.3)',
  },
  resendButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  resendIcon: {
    marginRight: 6,
  },
  resendText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.medium,
    color: '#D27F27',
  },
  resendTextDisabled: {
    color: '#999',
  },
  helpText: {
    fontSize: fonts.size.tiny,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
