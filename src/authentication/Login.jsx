// src/authentication/Login.jsx
import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Formik} from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import {AuthContext} from '../context/AuthContext';
import {useAlert} from '../context/AlertContext';
import fonts from '../theme/fonts';
import Config from 'react-native-config';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';

export default function Login({ showGuest = true, onForgotPassword, onSignUp }) {
  const {login, loginAsGuest} = useContext(AuthContext);
  const navigation = useNavigation();
  const {showAlert} = useAlert();
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // 🔧 Hook para manejo profesional del teclado
  const { 
    scrollViewRef, 
    registerInput, 
    createFocusHandler, 
    keyboardAvoidingViewProps, 
    scrollViewProps 
  } = useKeyboardBehavior();

  // 1️⃣ Configurar Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      iosClientId: Config.GOOGLE_IOS_CLIENT_ID, // Client ID específico para iOS
      offlineAccess: false,
      scopes: ['profile', 'email'], // birthday scope temporalmente deshabilitado - usuario lo agrega manualmente
      forceCodeForRefreshToken: true,
      accountName: '', // Esto fuerza el selector de cuenta
    });
  }, []);

  // 2️⃣ Definimos el esquema de validación
  const LoginSchema = Yup.object().shape({
    email: Yup.string()
      .email('Email inválido')
      .required('El correo es obligatorio'),
    password: Yup.string().required('La contraseña es obligatoria'),
  });

  // 3️⃣ Función que llama al endpoint
  const handleLogin = async (values, {setSubmitting}) => {
    try {
      const {data} = await axios.post('https://food.siliconsoft.pk/api/login', {
        email: values.email,
        password: values.password,
      });
      await login(data.user);
    } catch (err) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Credenciales inválidas',
        // message: err.response?.data?.message || 'Credenciales inválidas',
        confirmText: 'Cerrar',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 4️⃣ Función para login con Google
  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    
    setGoogleLoading(true);
    try {
      // Cerrar sesión silenciosamente para mostrar selector de cuenta
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        // Ignorar errores si no hay sesión activa
      }
      
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const userInfo = await GoogleSignin.signIn();
      
      // Obtener el ID token
      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens.idToken;
      const { user } = userInfo.data; // Acceso correcto - es userInfo.data.user
      

      // Enviar el ID token CON los datos del usuario para el backend
      const {data} = await axios.post('https://food.siliconsoft.pk/api/auth/google', {
        id_token: idToken,
        first_name: user.givenName,
        last_name: user.familyName,
        name: user.name,
        email: user.email,
        photo: user.photo
      });

      // Login exitoso con datos del backend
      await login(data.user);
      
      // Si el usuario no tiene nombre/apellido, actualizarlos con datos de Google
      if (data.user && (!data.user.first_name || !data.user.last_name)) {
        try {
          // ENVIAR TODOS LOS CAMPOS para evitar borrado por el backend
          const updatePayload = {
            userid: data.user.id,
            first_name: user.givenName || data.user.first_name || '',
            last_name: user.familyName || data.user.last_name || '',
            email: data.user.email || user.email || '',
            phone: data.user.phone || '',
            address: data.user.address || '',
          };
          
          await axios.post('https://food.siliconsoft.pk/api/updateuserprofile', updatePayload);
        } catch (updateError) {
          // Error actualizando datos de Google
        }
      }
      
      // Mostrar alert después de un breve delay para evitar conflictos
      setTimeout(() => {
        // Usar nombre de Google si el usuario no tiene nombre en la BD
        const userName = data.user.first_name || user.givenName || 'Usuario';
        showAlert({
          type: 'success',
          title: 'Bienvenido',
          message: `¡Hola ${userName}!`,
          confirmText: 'Continuar',
        });
      }, 500);

    } catch (error) {
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        showAlert({
          type: 'warning',
          title: 'Cancelado',
          message: 'Has cancelado el login con Google.',
          confirmText: 'OK',
        });
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showAlert({
          type: 'warning',
          title: 'En progreso',
          message: 'El login con Google ya está en progreso.',
          confirmText: 'OK',
        });
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Google Play Services no está disponible.',
          confirmText: 'OK',
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Error al iniciar sesión con Google. Inténtalo de nuevo.',
          confirmText: 'OK',
        });
      }
    } finally {
      setGoogleLoading(false);
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
          
          <Image source={require('../assets/logo.png')} style={styles.logo} />

          <Formik
            initialValues={{email: '', password: ''}}
            validationSchema={LoginSchema}
            onSubmit={handleLogin}>
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
                <View style={styles.inputGroup}>
                  <TextInput
                    ref={(ref) => registerInput('email', ref)}
                    style={[
                      styles.input,
                      touched.email && errors.email && styles.inputError,
                    ]}
                    placeholder="Email"
                    placeholderTextColor="rgba(47,47,47,0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    onFocus={createFocusHandler('email')}
                  />
                  {touched.email && errors.email && (
                    <Text style={styles.error}>{errors.email}</Text>
                  )}
                </View>

                {/* Contraseña */}
                <View style={styles.inputGroup}>
                  <TextInput
                    ref={(ref) => registerInput('password', ref)}
                    style={[
                      styles.input,
                      touched.password && errors.password && styles.inputError,
                    ]}
                    placeholder="Contraseña"
                    placeholderTextColor="rgba(47,47,47,0.5)"
                    secureTextEntry
                    returnKeyType="done"
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    onFocus={createFocusHandler('password', 20)}
                    onSubmitEditing={handleSubmit}
                  />
                  {touched.password && errors.password && (
                    <Text style={styles.error}>{errors.password}</Text>
                  )}
                </View>

                {/* Olvidaste tu contraseña */}
                <TouchableOpacity
                  onPress={() => {
                    if (onForgotPassword) {
                      onForgotPassword();
                    } else {
                      navigation.navigate('ForgetPass');
                    }
                  }}
                  style={styles.linkButton}>
                  <Text style={styles.linkButtonText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                {/* Botón Iniciar Sesión */}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                  accessibilityLabel="Botón Iniciar Sesión">
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnText}>Iniciar Sesión</Text>
                  )}
                </TouchableOpacity>

                {/* Separador */}
                <View style={styles.separator}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>o continúa con</Text>
                  <View style={styles.separatorLine} />
                </View>

                {/* Botón Google Sign-In */}
                <TouchableOpacity
                  style={[styles.googleButton, (isSubmitting || googleLoading) && styles.buttonDisabled]}
                  onPress={handleGoogleLogin}
                  disabled={isSubmitting || googleLoading}
                  activeOpacity={0.8}>
                  {googleLoading ? (
                    <ActivityIndicator color="#2F2F2F" size="small" />
                  ) : (
                    <>
                      <Image 
                        source={{uri: 'https://developers.google.com/identity/images/g-logo.png'}}
                        style={styles.googleIcon}
                      />
                      <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Continuar como invitado */}
                {showGuest && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={async () => {
                      await loginAsGuest();
                      // 🆕 Alerta de bienvenida Guest removida por solicitud del usuario
                    }}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                    accessibilityLabel="Continuar como invitado">
                    <Text style={styles.btnTextGuest}>Continuar como invitado</Text>
                  </TouchableOpacity>
                )}

                {/* Link a registro */}
                {!onSignUp && (
                  <TouchableOpacity 
                    style={styles.registerButton}
                    onPress={() => navigation.navigate('SignUp')}
                    activeOpacity={0.8}>
                    <Text style={styles.registerButtonText}>
                      🚀 Regístrate para desbloquear todo
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Formik>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 32,
    resizeMode: 'contain',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#FFF',
    borderColor: '#8B5E3C',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#2F2F2F',
  },
  inputError: {
    borderColor: '#E63946',
  },
  error: {
    color: '#E63946',
    fontSize: fonts.size.small,
    marginTop: 4,
  },
  linkButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  linkButtonText: {
    color: '#007AFF',
    fontSize: fonts.size.small,
    fontFamily: fonts.medium,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  btnText: {
    color: '#ffffff',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  secondaryBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#D27F27',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnTextGuest: {
    color: '#2F2F2F',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  registerButton: {
    width: '100%',
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderWidth: 2,
    borderColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#D27F27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  registerButtonText: {
    color: '#D27F27',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    textAlign: 'center',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139, 94, 60, 0.3)',
  },
  separatorText: {
    marginHorizontal: 16,
    color: 'rgba(47, 47, 47, 0.6)',
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
  },
  googleButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#2F2F2F',
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
