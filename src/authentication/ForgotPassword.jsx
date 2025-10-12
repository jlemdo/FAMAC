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
      .email('Correo inválido')
      .required('Correo es obligatorio'),
  });

  // 2️⃣ Handler de envío
  const handleResetPassword = async (values, { setSubmitting, resetForm }) => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        'https://awsoccr.pixelcrafters.digital/api/forgetpasswordlink',
        { email: values.email.trim() }
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#FFF',
    borderColor: '#8B5E3C',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  inputError: {
    borderColor: '#E63946',
  },
  errorText: {
    width: '100%',
    color: '#E63946',
    fontSize: fonts.size.small,
    marginBottom: 12,
    textAlign: 'left',
  },
  button: {
    width: '100%',
    backgroundColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    minHeight: 48,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  backLink: {
    marginTop: 16,
  },
  backText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  logo: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 30,
    alignSelf: 'center',
  },
});
