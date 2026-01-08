// src/components/WhatsAppVerificationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { API_BASE_URL } from '../config/environment';
import fonts from '../theme/fonts';

/**
 * Modal de verificación por WhatsApp
 *
 * @param {boolean} visible - Si el modal está visible
 * @param {string} phone - Número de teléfono a verificar (formato: "55 1234 5678")
 * @param {string} type - Tipo de verificación: 'signup' | 'profile_update'
 * @param {function} onVerified - Callback cuando la verificación es exitosa
 * @param {function} onCancel - Callback cuando el usuario cancela
 * @param {function} onError - Callback cuando hay un error
 */
export default function WhatsAppVerificationModal({
  visible,
  phone,
  type = 'signup',
  onVerified,
  onCancel,
  onError,
}) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);

  const otpInputRef = useRef(null);
  const hasAttemptedSend = useRef(false); // 🔒 Prevenir envío duplicado

  // Auto-enviar código cuando se abre el modal (solo una vez por sesión)
  useEffect(() => {
    if (visible && !codeSent && !hasAttemptedSend.current) {
      hasAttemptedSend.current = true;
      sendCode();
    }
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Reset estado cuando se cierra el modal
  useEffect(() => {
    if (!visible) {
      // Solo resetear después de un delay para evitar re-envíos
      const timer = setTimeout(() => {
        setOtp('');
        setCodeSent(false);
        setCountdown(0);
        hasAttemptedSend.current = false; // Reset del flag
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [visible]);

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
      hasAttemptedSend.current = false; // Reset si falla validación
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
        }
      } else {
        hasAttemptedSend.current = false; // Reset si falla el envío
        if (onError) onError(data.message || 'Error al enviar código');
      }
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      hasAttemptedSend.current = false; // Reset si hay error
      const errorMsg = error.response?.data?.message || 'Error al enviar código de verificación por WhatsApp';
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
        // Verificación exitosa
        if (onVerified) onVerified();
      } else {
        if (onError) onError(data.message || 'Código incorrecto');
      }
    } catch (error) {
      console.error('Error verificando código:', error);
      const errorMsg = error.response?.data?.message || 'Código incorrecto o expirado';
      if (onError) onError(errorMsg);
    } finally {
      setVerifying(false);
    }
  };

  const formatPhoneDisplay = (phoneStr) => {
    const cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+52 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    }
    return phoneStr;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <ScrollView
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  {/* Header con logo de WhatsApp */}
                  <View style={styles.header}>
                    <View style={styles.whatsappIconContainer}>
                      <Ionicons name="logo-whatsapp" size={48} color="#25D366" />
                    </View>
                    <Text style={styles.title}>Verificación por WhatsApp</Text>
                    <Text style={styles.subtitle}>
                      Enviamos un código de 6 dígitos por WhatsApp al número:
                    </Text>
                    <Text style={styles.phoneNumber}>{formatPhoneDisplay(phone)}</Text>
                  </View>

                  {/* Loading de envío */}
                  {loading && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#25D366" />
                      <Text style={styles.loadingText}>Enviando código...</Text>
                    </View>
                  )}

                  {/* Input de código */}
                  {!loading && codeSent && (
                    <>
                      <View style={styles.otpContainer}>
                        <Text style={styles.label}>Ingresa el código:</Text>
                        <TextInput
                          ref={otpInputRef}
                          style={styles.otpInput}
                          placeholder="000000"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otp}
                          onChangeText={setOtp}
                          autoFocus
                          selectTextOnFocus
                          textContentType="oneTimeCode"
                          autoComplete="sms-otp"
                        />
                      </View>

                      {/* Botón verificar */}
                      <TouchableOpacity
                        style={[
                          styles.verifyButton,
                          (otp.length !== 6 || verifying) && styles.buttonDisabled
                        ]}
                        onPress={verifyCode}
                        disabled={otp.length !== 6 || verifying}>
                        {verifying ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={styles.verifyButtonText}>Verificar</Text>
                        )}
                      </TouchableOpacity>

                      {/* Reenviar código */}
                      <View style={styles.resendContainer}>
                        {countdown > 0 ? (
                          <Text style={styles.countdownText}>
                            Reenviar código en {countdown}s
                          </Text>
                        ) : (
                          <TouchableOpacity
                            onPress={() => {
                              hasAttemptedSend.current = false; // Reset para permitir reenvío
                              sendCode();
                            }}
                            disabled={loading}
                            style={styles.resendButton}>
                            <Ionicons name="refresh" size={16} color="#25D366" />
                            <Text style={styles.resendButtonText}>Reenviar código</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}

                  {/* Botón cancelar */}
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancel}
                    disabled={loading || verifying}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  {/* Info adicional */}
                  <Text style={styles.infoText}>
                    💡 Revisa tu WhatsApp. El código expira en 10 minutos.
                  </Text>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%', // 🆕 Altura máxima para permitir scroll
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  whatsappIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#25D366',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#666',
    marginTop: 12,
  },
  otpContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  otpInput: {
    width: '100%',
    height: 56,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#25D366',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    letterSpacing: 8,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  verifyButtonText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 40,
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#999',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: '#25D366',
    marginLeft: 6,
  },
  cancelButton: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  infoText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
