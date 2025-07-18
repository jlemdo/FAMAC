// src/authentication/Login.jsx
import React, {useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Formik} from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import {AuthContext} from '../context/AuthContext';
import {useAlert} from '../context/AlertContext';
import fonts from '../theme/fonts';

export default function Login({ showGuest = true }) {
  const {login, loginAsGuest} = useContext(AuthContext);
  const navigation = useNavigation();
  const {showAlert} = useAlert();

  // 1️⃣ Definimos el esquema de validación
  const LoginSchema = Yup.object().shape({
    email: Yup.string()
      .email('Email inválido')
      .required('El correo es obligatorio'),
    password: Yup.string().required('La contraseña es obligatoria'),
  });

  // 2️⃣ Función que llama al endpoint
  const handleLogin = async (values, {setSubmitting}) => {
    try {
      const {data} = await axios.post('https://food.siliconsoft.pk/api/login', {
        email: values.email,
        password: values.password,
      });
      login(data.user);
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

  return (
    <View style={styles.container}>
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
                style={[
                  styles.input,
                  touched.email && errors.email && styles.inputError,
                ]}
                placeholder="Email"
                placeholderTextColor="rgba(47,47,47,0.5)"
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
                placeholderTextColor="rgba(47,47,47,0.5)"
                secureTextEntry
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
              />
              {touched.password && errors.password && (
                <Text style={styles.error}>{errors.password}</Text>
              )}
            </View>

            {/* Olvidaste tu contraseña */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgetPass')}
              style={styles.link}>
              <Text style={styles.linkTextPass}>¿Olvidaste tu contraseña?</Text>
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

            {/* Continuar como invitado */}
            {showGuest && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={loginAsGuest}
                disabled={isSubmitting}
                activeOpacity={0.7}
                accessibilityLabel="Continuar como invitado">
                <Text style={styles.btnTextGuest}>Continuar como invitado</Text>
              </TouchableOpacity>
            )}

            {/* Link a registro */}
            <View style={styles.links}>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.linkTextRegister}>
                  Regístrate para desbloquear todo
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Formik>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 12,
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
  link: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  linkTextPass: {
    color: '#007AFF',
    fontSize: fonts.size.small,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
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
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  btnTextGuest: {
    color: '#2F2F2F',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  links: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkTextRegister: {
    color: '#2F2F2F',
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    marginTop: 6,
  },
});
