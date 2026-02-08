// src/authentication/ForgotPassword.jsx
import React, { useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import fonts from '../theme/fonts';
import { useAlert } from '../context/AlertContext';
import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';
import { API_BASE_URL } from '../config/environment';

export default function ForgotPassword({ onBackToLogin }) {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  
  // 🔧 Hook para manejo profesional del teclado
  const { 
    scrollViewRef, 
    registerInput, 
    createFocusHandler, 
    keyboardAvoidingViewProps, 
    scrollViewProps 
  } = useKeyboardBehavior();

  // 1️⃣ Schema de validación con Yup
  const ForgotSchema = Yup.object().shape({
    email: Yup.string()
      .trim()
      .lowercase()
      .email('Correo inválido')
      .required('Correo es obligatorio')
      .test('no-spaces', 'El email no puede contener espacios', value => {
        return !value || !/\s/.test(value);
      }),
  });

  // 2️⃣ Handler de envío
  const handleResetPassword = async (values, { setSubmitting, resetForm }) => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/forgetpasswordlink`,
        { email: values.email.trim().toLowerCase() }
      );
      
      if (response.status === 200) {
        showAlert({
          type: 'success',
          title: '🔑 Nueva contraseña enviada',
          message: response.data.message || 'Nueva contraseña enviada a tu correo. Revisa tu bandeja de entrada.',
          confirmText: 'Entendido',
        });
        resetForm();
        if (onBackToLogin) {
          onBackToLogin();
        } else {
          navigation.navigate('Login');
        }
      }
    } catch (e) {
      if (e.response?.status === 404) {
        showAlert({
          type: 'error',
          title: 'Usuario no encontrado',
          message: 'No existe una cuenta con ese correo electrónico.',
          confirmText: 'Cerrar',
        });
      } else if (e.response?.status === 500) {
        showAlert({
          type: 'error',
          title: 'Error de envío',
          message: 'No pudimos enviar el correo. Verifica tu conexión e intenta de nuevo.',
          confirmText: 'Cerrar',
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Algo salió mal. Intenta de nuevo más tarde.',
          confirmText: 'Cerrar',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      {...keyboardAvoidingViewProps}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          {...scrollViewProps}
          contentContainerStyle={styles.scrollContainer}>
          
          {/* Logo */}
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          
          <Text style={styles.title}>Restablecer contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu correo para recibir una contraseña temporal
          </Text>

          <Formik
            initialValues={{ email: '' }}
            validationSchema={ForgotSchema}
            onSubmit={handleResetPassword}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
              isSubmitting,
            }) => (
              <>
                {/* Email */}
                <TextInput
                  ref={(ref) => registerInput('email', ref)}
                  style={[
                    styles.input,
                    touched.email && errors.email && styles.inputError,
                  ]}
                  placeholder="Correo electrónico"
                  placeholderTextColor="rgba(47,47,47,0.5)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onFocus={createFocusHandler('email')}
                  onBlur={handleBlur('email')}
                  onSubmitEditing={handleSubmit}
                  accessible
                  accessibilityLabel="Campo de correo"
                />
                {touched.email && errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}

                {/* Botón Enviar enlace */}
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                  accessibilityLabel="Enviar enlace de restablecimiento"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#2F2F2F" />
                  ) : (
                    <Text style={styles.buttonText}>Enviar contraseña temporal</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Formik>

          {/* Volver al login */}
          <TouchableOpacity
            onPress={() => {
              if (onBackToLogin) {
                onBackToLogin();
              } else {
                navigation.navigate('Login');
              }
            }}
            style={styles.backLink}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Volver a iniciar sesión"
          >
            <Text style={styles.backText}>← Volver al login</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: fonts.size.extraLarge,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47, 47, 47, 0.7)',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  // ========== INPUT - Diseño profesional ==========
  input: {
    width: '100%',
    height: 54,
    backgroundColor: '#FFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputError: {
    borderColor: '#E63946',
    borderWidth: 1.5,
  },
  errorText: {
    width: '100%',
    color: '#E63946',
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    marginBottom: 12,
    marginTop: 6,
    marginLeft: 4,
    textAlign: 'left',
  },
  // ========== PRIMARY BUTTON ==========
  button: {
    width: '100%',
    backgroundColor: '#D27F27',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#D27F27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 54,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  // ========== BACK LINK ==========
  backLink: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(210, 127, 39, 0.08)',
    borderRadius: 10,
  },
  backText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#D27F27',
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginBottom: 40,
    alignSelf: 'center',
  },
});
