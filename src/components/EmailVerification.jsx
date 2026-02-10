// src/components/EmailVerification.jsx
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { API_BASE_URL } from '../config/environment';
import fonts from '../theme/fonts';

/**
 * Componente para verificación de email de Guest
 * SIEMPRE ACTIVO - No depende de settings OTP global
 * Incluye validación de email ya registrado
 *
 * @param {string} email - Email a verificar
 * @param {function} onVerified - Callback cuando la verificación es exitosa (recibe email verificado)
 * @param {function} onError - Callback cuando hay un error
 * @param {function} onGoToLogin - Callback para navegar a Login
 * @param {boolean} disabled - Si true, el componente está deshabilitado
 * @param {boolean} alreadyVerified - Si true, muestra estado verificado
 */
export default function EmailVerification({
  email,
  onVerified,
  onError,
  onGoToLogin,
  disabled = false,
  alreadyVerified = false
}) {
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(alreadyVerified);

  // Modal para email ya registrado
  const [showExistsModal, setShowExistsModal] = useState(false);
  const [existingUserName, setExistingUserName] = useState('');

  const otpInputRef = useRef(null);

  // Reset cuando cambia el email
  useEffect(() => {
    if (!alreadyVerified) {
      setCodeSent(false);
      setOtp('');
      setVerified(false);
      setCountdown(0);
    }
  }, [email, alreadyVerified]);

  // Sincronizar verified con alreadyVerified
  useEffect(() => {
    setVerified(alreadyVerified);
  }, [alreadyVerified]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isValidEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr?.trim() || '');
  };

  // Verificar si el email ya está registrado
  const checkEmailExists = async () => {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/check-email-exists`, {
        email: email.trim()
      });

      if (data.exists) {
        setExistingUserName(data.user_name || 'Usuario');
        setShowExistsModal(true);
        return true; // Email existe
      }
      return false; // Email disponible
    } catch (error) {
      // Si falla la verificación, permitir continuar
      console.error('Error verificando email:', error);
      return false;
    }
  };

  const sendCode = async () => {
    if (!email || !isValidEmail(email)) {
      if (onError) onError('Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      // Primero verificar si el email ya está registrado
      const emailExists = await checkEmailExists();
      if (emailExists) {
        setLoading(false);
        return; // No continuar, mostrar modal
      }

      // Email disponible, enviar OTP
      const { data } = await axios.post(`${API_BASE_URL}/api/guest/email/send-otp`, {
        email: email.trim()
      });

      if (data.success) {
        setCodeSent(true);
        setCountdown(60); // 60 segundos para reenviar

        // Auto-focus en el input del código
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 300);

        // En desarrollo, mostrar el código en consola
        if (__DEV__ && data.debug_otp) {
          console.log('DEBUG OTP:', data.debug_otp);
        }
      } else {
        if (onError) onError(data.message || 'Error al enviar código');
      }
    } catch (error) {
      console.error('Error enviando código email:', error);
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
      const { data } = await axios.post(`${API_BASE_URL}/api/guest/email/verify-otp`, {
        email: email.trim(),
        otp: otp
      });

      if (data.success) {
        setVerified(true);
        setCodeSent(false);
        if (onVerified) onVerified(data.verified_email || email.trim());
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

  const handleGoToLogin = () => {
    setShowExistsModal(false);
    if (onGoToLogin) {
      onGoToLogin();
    }
  };

  // Si ya está verificado, mostrar badge de verificación
  if (verified) {
    return (
      <View style={styles.verifiedContainer}>
        <Ionicons name="checkmark-circle" size={18} color="#33A744" />
        <Text style={styles.verifiedText}>Email verificado</Text>
      </View>
    );
  }

  // Si no hay email válido, no mostrar nada
  if (!email || !isValidEmail(email)) {
    return null;
  }

  // Si está deshabilitado, no mostrar
  if (disabled) {
    return null;
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
              <Ionicons name="mail-outline" size={18} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.sendButtonText}>Verificar correo</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        // Input para código + botón verificar
        <View style={styles.verificationContainer}>
          <Text style={styles.sentLabel}>
            Código enviado a {email}
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

      {/* Modal: Email ya registrado */}
      <Modal
        visible={showExistsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExistsModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowExistsModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="person-circle-outline" size={50} color="#D27F27" />
                </View>

                <Text style={styles.modalTitle}>Correo ya registrado</Text>

                <Text style={styles.modalMessage}>
                  El correo <Text style={styles.modalEmail}>{email}</Text> ya tiene una cuenta registrada.
                </Text>

                <Text style={styles.modalSubMessage}>
                  Puedes iniciar sesión o usar otro correo para continuar como invitado.
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setShowExistsModal(false)}
                    activeOpacity={0.8}>
                    <Ionicons name="close-outline" size={18} color="#FFF" style={styles.modalButtonIcon} />
                    <Text style={styles.modalButtonSecondaryText}>Cambiar correo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={handleGoToLogin}
                    activeOpacity={0.8}>
                    <Ionicons name="log-in-outline" size={18} color="#FFF" style={styles.modalButtonIcon} />
                    <Text style={styles.modalButtonPrimaryText}>Iniciar sesión</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
  },
  sendButton: {
    width: '100%',
    backgroundColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 12,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
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
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    borderRadius: 8,
    marginTop: 8,
  },
  verifiedText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.medium,
    color: '#33A744',
    marginLeft: 6,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalEmail: {
    fontFamily: fonts.bold,
    color: '#D27F27',
  },
  modalSubMessage: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#D27F27',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#8B5E3C',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonIcon: {
    marginRight: 6,
  },
  modalButtonPrimaryText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  modalButtonSecondaryText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
});
