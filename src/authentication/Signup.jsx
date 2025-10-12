// src/authentication/SignUp.jsx
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Formik} from 'formik';
import * as Yup from 'yup';
import Config from 'react-native-config';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import axios from 'axios';
import {useNavigation} from '@react-navigation/native';
import {AuthContext} from '../context/AuthContext';
import {useAlert} from '../context/AlertContext';
import fonts from '../theme/fonts';
import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';
import NotificationService from '../services/NotificationService';

// Apple Authentication solo disponible en iOS
let appleAuth = null;
if (Platform.OS === 'ios') {
  try {
    appleAuth = require('@invertase/react-native-apple-authentication').appleAuth;
  } catch (error) {
  }
}

// Helper function para formatear teléfono mexicano visualmente
const formatMexicanPhone = (phone) => {
  if (!phone) return '';
  
  // Remover todo lo que no sean números
  const numbers = phone.replace(/\D/g, '');
  
  // Formatear según longitud
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)} ${numbers.slice(6)}`;
  } else {
    // Para números con lada (11+ dígitos)
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)} ${numbers.slice(6, 10)}`;
  }
};

// Helper function para obtener solo números (para backend)
const getPlainPhone = (phone) => {
  return phone ? phone.replace(/\D/g, '') : '';
};

export default function SignUp({ onForgotPassword, onLogin, onSuccess, onError }) {
  const navigation = useNavigation();
  const {user, login} = useContext(AuthContext);
  const {showAlert} = useAlert();
  const [showPicker, setShowPicker] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  
  // 🔧 Hook para manejo profesional del teclado
  const { 
    scrollViewRef, 
    registerInput, 
    createFocusHandler, 
    keyboardAvoidingViewProps, 
    scrollViewProps 
  } = useKeyboardBehavior();

  // Verificar si el guest ya tiene email (ya hizo pedidos)
  const isGuestWithEmail = user?.usertype === 'Guest' && user?.email && user?.email?.trim() !== '';
  const guestEmail = isGuestWithEmail ? user.email : '';
  
  // Estado para mostrar advertencia cuando se modifica el email
  const [emailModified, setEmailModified] = useState(false);

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

  // 2️⃣ Schema de validación
  const SignupSchema = Yup.object().shape({
    first_name: Yup.string().trim().required('Nombre es obligatorio'),
    last_name: Yup.string().trim().required('Apellido es obligatorio'),
    phone: Yup.string()
      .trim()
      .matches(/^[0-9+\s()-]+$/, 'Teléfono inválido (solo números, espacios, + y paréntesis)')
      .required('Teléfono es obligatorio'),
    birthDate: Yup.date()
      .nullable() // DOB ahora es opcional
      .test(
        'age',
        'Debes tener al menos 13 años para registrarte',
        function(value) {
          // Si no hay valor (opcional), es válido
          if (!value) return true;
          const today = new Date();
          const birthDate = new Date(value);
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          // Ajustar edad si el cumpleaños aún no ha ocurrido este año
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 13;
          }
          return age >= 13;
        }
      )
      .test(
        'reasonable-year',
        'Por favor verifica el año de nacimiento',
        function(value) {
          // Si no hay valor (opcional), es válido
          if (!value) return true;
          const currentYear = new Date().getFullYear();
          const birthYear = value.getFullYear();
          return birthYear >= 1900 && birthYear <= currentYear;
        }
      ),
    email: Yup.string()
      .email('Email inválido')
      .required('Email es obligatorio'),
    password: Yup.string()
      .required('Contraseña es obligatoria')
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .matches(/^[a-zA-Z0-9]+$/, 'La contraseña solo puede contener letras y números'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'No coincide')
      .required('Verificar contraseña'),
  });

  // 3️⃣ Registro con Google usando backend API
  const handleGoogleSignup = async () => {
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
      const { user } = userInfo.data; // Aquí estaba el error - es userInfo.data.user
      

      // Enviar el ID token CON los datos del usuario para el backend
      const {data} = await axios.post('https://awsoccr.pixelcrafters.digital/api/auth/google', {
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
          
          await axios.post('https://awsoccr.pixelcrafters.digital/api/updateuserprofile', updatePayload);
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

      // Después del registro exitoso con Google
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        showAlert({
          type: 'warning',
          title: 'Cancelado',
          message: 'Has cancelado el registro con Google.',
          confirmText: 'OK',
        });
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showAlert({
          type: 'warning',
          title: 'En progreso',
          message: 'El registro con Google ya está en progreso.',
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
          message: 'Error al registrarse con Google. Inténtalo de nuevo.',
          confirmText: 'OK',
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 4️⃣ Registro con Apple (limpio - sin debug alerts)
  const handleAppleSignup = async () => {
    if (!appleAuth || appleLoading) return;
    
    setAppleLoading(true);
    
    try {
      
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      
      // console.log('🍎 Respuesta Apple recibida:', {
        // user: appleAuthRequestResponse.user,
        // hasToken: !!appleAuthRequestResponse.identityToken,
        // hasEmail: !!appleAuthRequestResponse.email
      // });

      const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);
      

      if (credentialState === appleAuth.State.AUTHORIZED) {
        const {user: appleUserId, identityToken, fullName, email} = appleAuthRequestResponse;
        
        // ✅ PRIORIDAD 1: Usar datos reales de Apple cuando estén disponibles
        // Solo generar fallbacks cuando Apple NO proporcione datos
        
        // 📧 Email: Usar real si existe, sino marcar como ausente para backend
        const finalEmail = email || null; // null = Apple no proporcionó email
        
        // 👤 Nombre: Usar real si existe, sino marcar como ausente
        let processedName = null;
        if (fullName && (fullName.givenName || fullName.familyName)) {
          processedName = `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim();
        }
        
        const payload = {
          identity_token: identityToken,
          user_id: appleUserId,
          email: finalEmail, // Email real de Apple o null
          full_name: processedName, // Nombre real de Apple o null
          has_real_email: !!email, // Flag para backend: true = email real/proxy, false = sin email
          has_real_name: !!processedName, // Flag para backend: true = nombre real, false = sin nombre
        };
        
        
        const {data} = await axios.post('https://awsoccr.pixelcrafters.digital/api/auth/apple', payload);
        

        // Login directo sin alerts molestos
        await login(data.user);
        
        // 🎯 FASE 1: Solo hacer exactamente lo que funcionaba en testIOSNotifications
        // NO sendTokenToBackend, NO setupNotificationListeners
        setTimeout(async () => {
          try {
            
            // 1. Verificar permisos (seguro)
            const hasPermission = await NotificationService.requestPermission();
            if (!hasPermission) {
              return;
            }
            
            // 2. Obtener token (seguro)
            const token = await NotificationService.getToken();
            if (!token) {
              return;
            }
            
            // console.log('✅ FASE 1 Signup: Permisos + Token FCM exitosos (sin backend, sin listeners)');
            
            // 🚫 INTENCIONALMENTE NO llamamos:
            // - sendTokenToBackend() (lo probaremos en FASE 2)
            // - setupNotificationListeners() (lo probaremos en FASE 3)
            
          } catch (error) {
          }
        }, 2000);
        
        // ✅ Bienvenida inteligente para Apple
        setTimeout(() => {
          // Solo mostrar bienvenida personalizada si tenemos nombre REAL de Apple
          const realAppleName = fullName?.givenName || fullName?.familyName;
          
          if (realAppleName && processedName) {
            // Usuario Apple proporcionó nombre real
            showAlert({
              type: 'success',
              title: 'Bienvenido',
              message: `¡Hola ${realAppleName}!`,
              confirmText: 'Continuar',
            });
          } else {
            // Usuario Apple sin nombre real - solo mostrar bienvenida genérica
            showAlert({
              type: 'success',
              title: 'Bienvenido',
              message: 'Te has registrado exitosamente',
              confirmText: 'Continuar',
            });
          }
        }, 500);
        
        // Después del registro exitoso con Apple
        if (onSuccess) {
          onSuccess();
        }
        
      } else {
        showAlert({
          type: 'error',
          title: 'Error de autenticación',
          message: 'No se pudo verificar tu identidad con Apple. Intenta nuevamente.',
          confirmText: 'OK',
        });
      }
    } catch (error) {
      
      if (appleAuth && error.code === appleAuth.Error.CANCELED) {
        // Usuario canceló - No mostrar alert molesto
      } else {
        showAlert({
          type: 'error',
          title: 'Error de conexión',
          message: 'No se pudo completar el registro con Apple. Verifica tu conexión e intenta nuevamente.',
          confirmText: 'OK',
        });
      }
    } finally {
      setAppleLoading(false);
    }
  };

  // 5️⃣ Envío de formulario
  const onSubmit = async (values, {setSubmitting}) => {
    let dob = null;
    if (values.birthDate) {
      const opts = {month: 'long', year: 'numeric'};
      dob = values.birthDate.toLocaleDateString('es-ES', opts);
    }

    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      contact_number: getPlainPhone(values.phone), // Enviar solo números al backend
      email: values.email,
      password: values.password,
      password_confirmation: values.confirmPassword,
      skip_otp: true, // 🆕 Saltar verificación OTP por ahora
    };

    // Solo agregar dob si existe
    if (dob) {
      payload.dob = dob;
    }

    try {
      const {status, data} = await axios.post(
        'https://awsoccr.pixelcrafters.digital/api/register',
        payload,
      );
      if (status === 201) {
        await login(data.user);
        
        // Mostrar alert después de un breve delay para evitar conflictos
        setTimeout(() => {
          // Usar el nombre del usuario recién registrado
          const userName = values.first_name || data.user?.first_name || 'Usuario';
          showAlert({
            type: 'success',
            title: '¡Bienvenido!',
            message: `¡Hola ${userName}!`,
            confirmText: 'OK',
          });
        }, 500);
        
        // Después del registro exitoso, no es necesario navegar
        // El AuthContext automáticamente cambiará el flujo a la app principal
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      // console.log('🚨 ERROR DE REGISTRO:', {
        // status: error.response?.status,
        // message: error.response?.data?.message,
        // errors: error.response?.data?.errors,
        // fullError: error.response?.data
      // });

      // Manejar errores de validación específicos
      let errorMessage = 'Hubo un problema al crear tu cuenta. Revisa tus datos e inténtalo de nuevo.';
      
      if (error.response?.status === 422) {
        // Errores de validación
        const validationErrors = error.response?.data?.errors;
        if (validationErrors) {
          const firstError = Object.values(validationErrors)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showAlert({
        type: 'error',
        title: 'Error en el registro',
        message: errorMessage,
        confirmText: 'Cerrar',
      });
      
      // 🆕 NUEVO: Notificar al componente padre sobre el error
      if (onError) {
        onError(error);
      }
      
      // IMPORTANTE: No resetear el formulario, mantener los datos del usuario
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardContainer} 
      {...keyboardAvoidingViewProps}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          {...scrollViewProps}
          contentContainerStyle={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <Formik
        initialValues={{
          first_name: '',
          last_name: '',
          phone: '',
          birthDate: null, // Sin fecha inicial - mostrar placeholder
          email: guestEmail, // Pre-llenar con email del guest si existe
          password: '',
          confirmPassword: '',
        }}
        validationSchema={SignupSchema}
        onSubmit={onSubmit}
        enableReinitialize={false}
        validateOnChange={true}
        validateOnBlur={true}>
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          isSubmitting,
          isValid,
          dirty,
          setFieldValue,
          setFieldTouched,
        }) => (
          <>
            {/* Nombre */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={(ref) => registerInput('first_name', ref)}
                style={[
                  styles.input,
                  touched.first_name && errors.first_name && styles.inputError,
                ]}
                placeholder="Nombre"
                placeholderTextColor="#999"
                value={values.first_name}
                onChangeText={handleChange('first_name')}
                onBlur={handleBlur('first_name')}
                onFocus={createFocusHandler('first_name')}
                returnKeyType="next"
              />
              {touched.first_name && errors.first_name && (
                <Text style={styles.error}>{errors.first_name}</Text>
              )}
            </View>

            {/* Apellido */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={(ref) => registerInput('last_name', ref)}
                style={[
                  styles.input,
                  touched.last_name && errors.last_name && styles.inputError,
                ]}
                placeholder="Apellido"
                placeholderTextColor="#999"
                value={values.last_name}
                onChangeText={handleChange('last_name')}
                onBlur={handleBlur('last_name')}
                onFocus={createFocusHandler('last_name')}
                returnKeyType="next"
              />
              {touched.last_name && errors.last_name && (
                <Text style={styles.error}>{errors.last_name}</Text>
              )}
            </View>

            {/* Teléfono */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={(ref) => registerInput('phone', ref)}
                style={[
                  styles.input,
                  touched.phone && errors.phone && styles.inputError,
                ]}
                placeholder="Teléfono (ej: 55 1234 5678)"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={values.phone}
                onChangeText={(text) => {
                  const formatted = formatMexicanPhone(text);
                  handleChange('phone')(formatted);
                }}
                onBlur={handleBlur('phone')}
                onFocus={createFocusHandler('phone')}
                returnKeyType="next"
              />
              {touched.phone && errors.phone && (
                <Text style={styles.error}>{errors.phone}</Text>
              )}
            </View>

            {/* Fecha de nacimiento */}
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dateInput,
                  touched.birthDate && errors.birthDate && styles.inputError,
                ]}
                onPress={() => {
                  setShowMonthYearPicker(true);
                }}
                activeOpacity={0.7}>
                <Text
                  style={values.birthDate ? styles.text : styles.placeholder}>
                  {values.birthDate
                    ? values.birthDate.toLocaleDateString('es-ES', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Mes y año de nacimiento (opcional)'}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={values.birthDate ? '#2F2F2F' : '#999'}
                />
              </TouchableOpacity>
              {touched.birthDate && errors.birthDate && (
                <Text style={styles.error}>{errors.birthDate}</Text>
              )}
              {/* Selector personalizado de mes y año */}
              {showMonthYearPicker && (
                <Modal
                  transparent
                  animationType="fade"
                  visible={showMonthYearPicker}
                  onRequestClose={() => setShowMonthYearPicker(false)}>
                  <TouchableWithoutFeedback onPress={() => setShowMonthYearPicker(false)}>
                    <View style={styles.pickerModalOverlay}>
                      <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={styles.pickerModalContent}>
                          <Text style={styles.pickerModalTitle}>🎂 Mi fecha de cumpleaños</Text>
                          <Text style={styles.pickerModalSubtitle}>
                            Selecciona el mes y año para recibir promociones especiales
                          </Text>
                          
                          <View style={styles.pickerContainer}>
                            {/* Selector de Mes */}
                            <View style={styles.pickerColumn}>
                              <Text style={styles.pickerColumnTitle}>Mes</Text>
                              <ScrollView 
                                ref={(ref) => {
                                  // Auto-scroll para centrar el mes actual cuando se abre el modal
                                  if (ref && !values.birthDate) {
                                    setTimeout(() => {
                                      const monthIndex = 3; // Posición fija para que se vea paralelo al año (ambos índice 3)
                                      const itemHeight = 44; // paddingVertical(24px) + texto(~20px) = ~44px
                                      const containerHeight = 160; // Altura visible del ScrollView
                                      // Fórmula para centrar: posición del item - mitad del container + mitad del item
                                      const scrollToY = Math.max(0, (monthIndex * itemHeight) - (containerHeight / 2) + (itemHeight / 2));
                                      ref.scrollTo({ y: scrollToY, animated: true });
                                    }, 100);
                                  }
                                }}
                                style={styles.pickerScrollView} 
                                showsVerticalScrollIndicator={false}>
                                {[
                                  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                                ].map((month, index) => {
                                  // Si values.birthDate existe, usar su mes. Si no, usar índice 3 (abril) como referencia visual
                                  const monthToShow = values.birthDate ? values.birthDate.getMonth() : 3;
                                  const isSelected = monthToShow === index;
                                  
                                  return (
                                    <TouchableOpacity
                                      key={month}
                                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                      onPress={() => {
                                        const currentYear = values.birthDate ? values.birthDate.getFullYear() : new Date().getFullYear() - 25;
                                        const newDate = new Date(currentYear, index, 1);
                                        setFieldValue('birthDate', newDate);
                                      }}>
                                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionSelectedText]}>
                                        {month}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </View>

                            {/* Selector de Año */}
                            <View style={styles.pickerColumn}>
                              <Text style={styles.pickerColumnTitle}>Año</Text>
                              <ScrollView 
                                ref={(ref) => {
                                  // Auto-scroll para centrar el año sugerido cuando se abre el modal
                                  if (ref && !values.birthDate) {
                                    setTimeout(() => {
                                      const yearIndex = 3; // Posición fija para que se vea paralelo al mes (ambos índice 3)
                                      const itemHeight = 44; // paddingVertical(24px) + texto(~20px) = ~44px
                                      const containerHeight = 160; // Altura visible del ScrollView
                                      // Fórmula para centrar: posición del item - mitad del container + mitad del item
                                      const scrollToY = Math.max(0, (yearIndex * itemHeight) - (containerHeight / 2) + (itemHeight / 2));
                                      ref.scrollTo({ y: scrollToY, animated: true });
                                    }, 100);
                                  }
                                }}
                                style={styles.pickerScrollView} 
                                showsVerticalScrollIndicator={false}>
                                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => {
                                  // Si values.birthDate existe, usar su año. Si no, usar año en posición 3 como referencia visual
                                  const yearToShow = values.birthDate ? values.birthDate.getFullYear() : new Date().getFullYear() - 3;
                                  const isSelected = yearToShow === year;
                                  
                                  return (
                                    <TouchableOpacity
                                      key={year}
                                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                      onPress={() => {
                                        // Si values.birthDate existe, usar su mes. Si no, usar mes actual como referencia
                                        const currentMonth = values.birthDate ? values.birthDate.getMonth() : new Date().getMonth();
                                        const newDate = new Date(year, currentMonth, 1);
                                        setFieldValue('birthDate', newDate);
                                      }}>
                                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionSelectedText]}>
                                        {year}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          </View>

                          <View style={styles.pickerModalButtons}>
                            <TouchableOpacity
                              style={styles.pickerCancelButton}
                              onPress={() => setShowMonthYearPicker(false)}>
                              <Text style={styles.pickerCancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={[
                                styles.pickerConfirmButton,
                                !values.birthDate && styles.pickerConfirmButtonDisabled
                              ]}
                              disabled={!values.birthDate}
                              onPress={() => {
                                if (values.birthDate) {
                                  setShowMonthYearPicker(false);
                                  setFieldTouched('birthDate', true);
                                } else {
                                  showAlert({
                                    type: 'info',
                                    title: 'Selección incompleta',
                                    message: 'Por favor selecciona tanto el mes como el año de tu cumpleaños.',
                                    confirmText: 'OK',
                                  });
                                }
                              }}>
                              <Text style={[
                                styles.pickerConfirmButtonText,
                                !values.birthDate && styles.pickerConfirmButtonTextDisabled
                              ]}>
                                {values.birthDate ? '✓ Confirmar' : 'Selecciona fecha'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableWithoutFeedback>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
              )}
              
              {/* Leyenda motivacional para fecha de cumpleaños opcional */}
              <Text style={styles.birthdayMotivationalText}>
                🎉 Recibe sorpresas en tu cumpleaños (opcional)
              </Text>
            </View>

            {/* Correo electrónico */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={(ref) => registerInput('email', ref)}
                style={[
                  styles.input,
                  touched.email && errors.email && styles.inputError,
                ]}
                placeholder="Correo electrónico"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={values.email}
                onChangeText={(text) => {
                  // Detectar si el email fue modificado
                  if (isGuestWithEmail && text !== guestEmail) {
                    setEmailModified(true);
                  } else if (isGuestWithEmail && text === guestEmail) {
                    setEmailModified(false);
                  }
                  
                  // Comportamiento normal de Formik
                  handleChange('email')(text);
                }}
                onBlur={handleBlur('email')}
                onFocus={createFocusHandler('email')}
                returnKeyType="next"
              />
              {/* Mostrar advertencia solo cuando se modifica el email */}
              {isGuestWithEmail && emailModified && (
                <Text style={styles.warningText}>
                  ⚠️ Si cambias este email, perderás el registro de tus pedidos anteriores
                </Text>
              )}
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
                placeholder="Contraseña (letras y números, 6 caracteres mínimo)"
                placeholderTextColor="#999"
                secureTextEntry
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                onFocus={createFocusHandler('password', 30)}
                returnKeyType="next"
              />
              {/* Mostrar requisitos de contraseña */}
              {values.password && values.password.length > 0 && (
                <View style={styles.passwordRequirements}>
                  <Text style={[
                    styles.passwordRequirement,
                    values.password.length >= 6 ? styles.passwordRequirementMet : styles.passwordRequirementUnmet
                  ]}>
                    {values.password.length >= 6 ? '✓' : '×'} Mínimo 6 caracteres
                  </Text>
                  <Text style={[
                    styles.passwordRequirement,
                    /^[a-zA-Z0-9]+$/.test(values.password) ? styles.passwordRequirementMet : styles.passwordRequirementUnmet
                  ]}>
                    {/^[a-zA-Z0-9]+$/.test(values.password) ? '✓' : '×'} Solo letras y números
                  </Text>
                </View>
              )}
              {touched.password && errors.password && (
                <Text style={styles.error}>{errors.password}</Text>
              )}
            </View>

            {/* Verificar contraseña */}
            <View style={styles.inputGroup}>
              <TextInput
                ref={(ref) => registerInput('confirmPassword', ref)}
                style={[
                  styles.input,
                  touched.confirmPassword &&
                    errors.confirmPassword &&
                    styles.inputError,
                ]}
                placeholder="Verificar contraseña"
                placeholderTextColor="#999"
                secureTextEntry
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                onFocus={createFocusHandler('confirmPassword', 40)}
                returnKeyType="done"
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <Text style={styles.error}>{errors.confirmPassword}</Text>
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

            {/* Registrar */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!isValid || !dirty || isSubmitting) && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!isValid || !dirty || isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>Registrarse</Text>
              )}
            </TouchableOpacity>

            {/* COMENTADO PARA SOLO EMAIL/PASSWORD - Separador */}
            {/*
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>o regístrate con</Text>
              <View style={styles.separatorLine} />
            </View>
            */}

            {/* COMENTADO PARA SOLO EMAIL/PASSWORD - Botón Google Sign-Up */}
            {/*
            <TouchableOpacity
              style={[styles.googleButton, (isSubmitting || googleLoading) && styles.buttonDisabled]}
              onPress={handleGoogleSignup}
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
                  <Text style={styles.googleButtonText}>Registrarse con Google</Text>
                </>
              )}
            </TouchableOpacity>
            */}

            {/* COMENTADO PARA SOLO EMAIL/PASSWORD - Botón Apple Sign-Up */}
            {/*
            {Platform.OS === 'ios' && appleAuth && (
              <TouchableOpacity
                style={[styles.appleButton, (isSubmitting || appleLoading) && styles.buttonDisabled]}
                onPress={handleAppleSignup}
                disabled={isSubmitting || appleLoading}
                activeOpacity={0.8}>
                {appleLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Image
                      source={require('../assets/apple/apple-logo-white.png')}
                      style={styles.appleIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.appleButtonText}>Registrarse con Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            */}

            {/* COMENTADO PARA SOLO EMAIL/PASSWORD - Ya tienes cuenta */}
            {/*
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                if (onLogin) {
                  onLogin();
                } else {
                  navigation.navigate('Login');
                }
              }}
              activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>
                ✨ ¿Ya tienes cuenta? Inicia sesión
              </Text>
            </TouchableOpacity>
            */}
          </>
        )}
      </Formik>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F2EFE4',
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholder: {
    color: '#999',
    flex: 1,
  },
  text: {
    color: '#2F2F2F',
    flex: 1,
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
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
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
  appleButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#000',
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
  appleIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
    // tintColor: '#FFF',
  },
  appleButtonText: {
    color: '#FFF',
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
  },
  loginButton: {
    width: '100%',
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    borderWidth: 2,
    borderColor: '#33A744',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#33A744',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#33A744',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    textAlign: 'center',
  },
  iosDatePicker: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  
  // Estilos del selector personalizado de mes/año
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pickerModalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  pickerColumnTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#8B5E3C',
    textAlign: 'center',
    marginBottom: 12,
  },
  pickerScrollView: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(139, 94, 60, 0.15)',
  },
  pickerOptionText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  pickerOptionSelectedText: {
    fontFamily: fonts.bold,
    color: '#8B5E3C',
  },
  pickerModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickerCancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },
  pickerConfirmButton: {
    flex: 1,
    backgroundColor: '#D27F27',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerConfirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: 'rgba(47,47,47,0.6)',
    borderColor: '#CCC',
  },
  blockedEmailText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  passwordRequirements: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  passwordRequirement: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    marginBottom: 2,
  },
  passwordRequirementMet: {
    color: '#33A744',
  },
  passwordRequirementUnmet: {
    color: '#E63946',
  },
  
  // 🎂 Estilos para selector de fecha mejorado
  birthdateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  birthdateLabel: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    flex: 1,
  },
  infoIcon: {
    padding: 2,
  },
  birthdateHelper: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  dateIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickerModalSubtitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  pickerConfirmButtonDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#CCCCCC',
  },
  pickerConfirmButtonTextDisabled: {
    color: '#999999',
  },
  agePreview: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  agePreviewText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  agePreviewValid: {
    color: '#33A744',
  },
  agePreviewInvalid: {
    color: '#E63946',
  },
  
  // 🎉 Estilos para leyenda motivacional del cumpleaños
  birthdayMotivationalText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  
  // ⚠️ Estilo para advertencia simple
  warningText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
    backgroundColor: 'rgba(210, 127, 39, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
});
