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
  const {login} = useContext(AuthContext);
  const {showAlert} = useAlert();
  const [showPicker, setShowPicker] = useState(false);

  // 1️⃣ Configurar Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        Config.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/user.birthday.read',
      ],
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

  // 3️⃣ Pre-llenado con Google
  const handleGoogleFill = async setFieldValue => {
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const res = await GoogleSignin.signIn();
      const userObj = res.data.user || {};

      if (userObj.email) setFieldValue('email', userObj.email);
      if (userObj.givenName) setFieldValue('first_name', userObj.givenName);
      if (userObj.familyName) setFieldValue('last_name', userObj.familyName);

      const {accessToken} = await GoogleSignin.getTokens();
      const {data} = await axios.get(
        'https://people.googleapis.com/v1/people/me?personFields=birthdays',
        {headers: {Authorization: `Bearer ${accessToken}`}},
      );
      const bd = data.birthdays?.[0]?.date;
      if (bd && bd.year && bd.month && bd.day) {
        setFieldValue('birthDate', new Date(bd.year, bd.month - 1, bd.day));
      }
    } catch (err) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) console.warn(err);
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
        
        // Usar callback si está disponible, sino navegar normalmente
        if (onSuccess) {
          onSuccess();
        } else {
          navigation.replace('Home');
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
          email: '',
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
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}>
                <Text
                  style={values.birthDate ? styles.text : styles.placeholder}>
                  {values.birthDate
                    ? values.birthDate.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Fecha de nacimiento'}
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
              {showPicker && (
                <DateTimePicker
                  value={values.birthDate || new Date(1990, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
                  onChange={(_, date) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (date) setFieldValue('birthDate', date);
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              )}
            </View>

            {/* Correo electrónico */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  touched.email && errors.email && styles.inputError,
                ]}
                placeholder="Correo electrónico"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
              />
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
              style={styles.link}>
              <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
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

            {/* Google Sign-In */}
            <GoogleSigninButton
              style={styles.googleBtn}
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              onPress={() => handleGoogleFill(setFieldValue)}
              disabled={isSubmitting}
            />

            {/* Ya tienes cuenta */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={() => {
                if (onLogin) {
                  onLogin();
                } else {
                  navigation.navigate('Login');
                }
              }}>
                <Text style={[styles.footerText, styles.footerLink]}>
                  Inicia sesión
                </Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 12,
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
    paddingRight: 12,
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
  link: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  linkText: {
    color: '#007AFF',
    fontSize: fonts.size.small,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  googleBtn: {
    width: '100%',
    height: 48,
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  footerText: {
    color: '#2F2F2F',
    fontSize: fonts.size.medium,
  },
  footerLink: {
    fontWeight: '600',
  },
});
