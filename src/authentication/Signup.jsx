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

export default function SignUp({ onForgotPassword, onLogin, onSuccess }) {
  const navigation = useNavigation();
  const {user, login} = useContext(AuthContext);
  const {showAlert} = useAlert();
  const [showPicker, setShowPicker] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Verificar si el guest ya tiene email (ya hizo pedidos)
  const isGuestWithEmail = user?.usertype === 'Guest' && user?.email && user?.email?.trim() !== '';
  const guestEmail = isGuestWithEmail ? user.email : '';

  // 1️⃣ Configurar Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: ['profile', 'email'],
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
      .matches(/^[0-9+]+$/, 'Teléfono inválido')
      .required('Teléfono es obligatorio'),
    birthDate: Yup.date().nullable().required('Nacimiento es obligatorio'),
    email: Yup.string()
      .email('Email inválido')
      .required('Email es obligatorio'),
    password: Yup.string()
      .min(6, 'Mínimo 6 caracteres')
      .required('Contraseña es obligatoria'),
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

      // Enviar el ID token al backend para registro
      const {data} = await axios.post('https://food.siliconsoft.pk/api/auth/google', {
        id_token: idToken,
      });

      // Login exitoso con datos del backend
      login(data.user);
      
      showAlert({
        type: 'success',
        title: 'Bienvenido',
        message: `¡Hola ${data.user.first_name || 'Usuario'}!`,
        confirmText: 'Continuar',
      });

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

  // 4️⃣ Envío de formulario
  const onSubmit = async (values, {setSubmitting}) => {
    const opts = {month: 'long', year: 'numeric'};
    const dob = values.birthDate.toLocaleDateString('es-ES', opts);

    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      contact_number: values.phone,
      dob,
      email: values.email,
      password: values.password,
      password_confirmation: values.confirmPassword,
    };

    try {
      const {status, data} = await axios.post(
        'https://food.siliconsoft.pk/api/register',
        payload,
      );
      if (status === 201) {
        login(data.user);
        showAlert({
          type: 'success',
          title: '¡Bienvenido!',
          message: 'Registro exitoso',
          confirmText: 'OK',
        });
        
        // Después del registro exitoso, no es necesario navegar
        // El AuthContext automáticamente cambiará el flujo a la app principal
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || error.message,
        confirmText: 'Cerrar',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <Formik
        initialValues={{
          first_name: '',
          last_name: '',
          phone: '',
          birthDate: null,
          email: guestEmail, // Pre-llenar con email del guest si existe
          password: '',
          confirmPassword: '',
        }}
        validationSchema={SignupSchema}
        onSubmit={onSubmit}>
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          isSubmitting,
          setFieldValue,
        }) => (
          <>
            {/* Nombre */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  touched.first_name && errors.first_name && styles.inputError,
                ]}
                placeholder="Nombre"
                placeholderTextColor="#999"
                value={values.first_name}
                onChangeText={handleChange('first_name')}
                onBlur={handleBlur('first_name')}
              />
              {touched.first_name && errors.first_name && (
                <Text style={styles.error}>{errors.first_name}</Text>
              )}
            </View>

            {/* Apellido */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  touched.last_name && errors.last_name && styles.inputError,
                ]}
                placeholder="Apellido"
                placeholderTextColor="#999"
                value={values.last_name}
                onChangeText={handleChange('last_name')}
                onBlur={handleBlur('last_name')}
              />
              {touched.last_name && errors.last_name && (
                <Text style={styles.error}>{errors.last_name}</Text>
              )}
            </View>

            {/* Teléfono */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  touched.phone && errors.phone && styles.inputError,
                ]}
                placeholder="Teléfono"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={values.phone}
                onChangeText={handleChange('phone')}
                onBlur={handleBlur('phone')}
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
                    : 'Mes y año de nacimiento'}
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
                          <Text style={styles.pickerModalTitle}>Seleccionar mes y año de nacimiento</Text>
                          
                          <View style={styles.pickerContainer}>
                            {/* Selector de Mes */}
                            <View style={styles.pickerColumn}>
                              <Text style={styles.pickerColumnTitle}>Mes</Text>
                              <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
                                {[
                                  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                                ].map((month, index) => {
                                  const currentMonth = values.birthDate ? values.birthDate.getMonth() : -1;
                                  const isSelected = currentMonth === index;
                                  
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
                              <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
                                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => {
                                  const currentYear = values.birthDate ? values.birthDate.getFullYear() : -1;
                                  const isSelected = currentYear === year;
                                  
                                  return (
                                    <TouchableOpacity
                                      key={year}
                                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                      onPress={() => {
                                        const currentMonth = values.birthDate ? values.birthDate.getMonth() : 0;
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
                              style={styles.pickerConfirmButton}
                              onPress={() => {
                                setShowMonthYearPicker(false);
                              }}>
                              <Text style={styles.pickerConfirmButtonText}>Confirmar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableWithoutFeedback>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
              )}
            </View>

            {/* Correo electrónico */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  touched.email && errors.email && styles.inputError,
                  isGuestWithEmail && styles.disabledInput, // Estilo para input bloqueado
                ]}
                placeholder="Correo electrónico"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={values.email}
                onChangeText={isGuestWithEmail ? undefined : handleChange('email')} // Bloquear edición
                onBlur={handleBlur('email')}
                editable={!isGuestWithEmail} // Desactivar input si es guest con email
              />
              {isGuestWithEmail && (
                <Text style={styles.blockedEmailText}>
                  🔒 Usaremos el email de tus pedidos anteriores
                </Text>
              )}
              {touched.email && errors.email && (
                <Text style={styles.error}>{errors.email}</Text>
              )}
            </View>

            {/* Contraseña */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  touched.password && errors.password && styles.inputError,
                ]}
                placeholder="Contraseña"
                placeholderTextColor="#999"
                secureTextEntry
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
              />
              {touched.password && errors.password && (
                <Text style={styles.error}>{errors.password}</Text>
              )}
            </View>

            {/* Verificar contraseña */}
            <View style={styles.inputGroup}>
              <TextInput
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
              style={styles.primaryBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>Registrarse</Text>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>o regístrate con</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Botón Google Sign-Up */}
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

            {/* Ya tienes cuenta */}
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
});
