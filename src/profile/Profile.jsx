// src/authentication/Profile.jsx
import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import fonts from '../theme/fonts';
import RegisterPrompt from './RegisterPrompt';

export default function Profile({ navigation }) {
  const { user } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  });

  if (user?.usertype === 'Guest') {
    return <RegisterPrompt navigation={navigation} />;
  }

  const fetchUserDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/userdetails/${user.id}`
      );
      const data = res.data?.data?.[0] || {};
      setProfile({
        first_name: data.first_name || '',
        last_name:  data.last_name  || '',
        email:      data.email      || '',
        phone:      data.phone      || '',
        address:    data.address    || '',
      });
    } catch {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar tu perfil.',
        confirmText: 'Cerrar',
      });
    } finally {
      setLoading(false);
    }
  }, [user.id, showAlert]);

  useEffect(() => {
    if (user?.id) fetchUserDetails();
  }, [user?.id, fetchUserDetails]);

  const ProfileSchema = Yup.object().shape({
    first_name: Yup.string().required('Nombre es obligatorio'),
    last_name:  Yup.string().required('Apellido es obligatorio'),
    phone:      Yup.string()
      .matches(/^[0-9+]+$/, 'Teléfono inválido')
      .required('Teléfono es obligatorio'),
    address:    Yup.string(), // opcional
  });

  const PasswordSchema = Yup.object().shape({
    current_password:      Yup.string().required('Requerido'),
    password:              Yup.string().min(6, 'Mínimo 6 caracteres').required('Obligatorio'),
    password_confirmation: Yup.string()
      .oneOf([Yup.ref('password')], 'No coincide')
      .required('Obligatorio'),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Image
          source={{
            uri: profile.avatar || 'https://www.w3schools.com/howto/img_avatar.png'
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>
          {profile.first_name} {profile.last_name}
        </Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      {loading && <ActivityIndicator size="large" color="#33A744" style={styles.loading} />}

      {/* Perfil */}
      <Formik
        initialValues={{
          first_name: profile.first_name,
          last_name:  profile.last_name,
          phone:      profile.phone,
          address:    profile.address,
        }}
        enableReinitialize
        validationSchema={ProfileSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setLoading(true);
          try {
            const res = await axios.post(
              'https://food.siliconsoft.pk/api/updateuserprofile',
              {
                userid:      user.id,
                first_name:  values.first_name,
                last_name:   values.last_name,
                phone:       values.phone,
                address:     values.address,
              }
            );
            if (res.status === 200) {
              showAlert({
                type: 'success',
                title: '¡Listo!',
                message: 'Perfil actualizado.',
                confirmText: 'OK',
              });
              setProfile(prev => ({ ...prev, ...values }));
            }
          } catch {
            showAlert({
              type: 'error',
              title: 'Error',
              message: 'No se pudo actualizar tu perfil.',
              confirmText: 'Cerrar',
            });
          } finally {
            setLoading(false);
            setSubmitting(false);
          }
        }}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          isSubmitting,
          submitCount,
        }) => (
          <View style={styles.section}>
            <TextInput
              style={[
                styles.input,
                submitCount > 0 && errors.first_name && styles.inputError
              ]}
              placeholder="Nombre"
              placeholderTextColor="rgba(47,47,47,0.6)"
              value={values.first_name}
              onChangeText={handleChange('first_name')}
            />
            {submitCount > 0 && errors.first_name && (
              <Text style={styles.errorText}>{errors.first_name}</Text>
            )}

            <TextInput
              style={[
                styles.input,
                submitCount > 0 && errors.last_name && styles.inputError
              ]}
              placeholder="Apellido"
              placeholderTextColor="rgba(47,47,47,0.6)"
              value={values.last_name}
              onChangeText={handleChange('last_name')}
            />
            {submitCount > 0 && errors.last_name && (
              <Text style={styles.errorText}>{errors.last_name}</Text>
            )}

            <TextInput
              style={[styles.input, styles.disabledInput]}
              editable={false}
              placeholder="Correo electrónico"
              value={profile.email}
            />

            <TextInput
              style={[
                styles.input,
                submitCount > 0 && errors.phone && styles.inputError
              ]}
              placeholder="Teléfono"
              placeholderTextColor="rgba(47,47,47,0.6)"
              keyboardType="phone-pad"
              value={values.phone}
              onChangeText={handleChange('phone')}
            />
            {submitCount > 0 && errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Dirección"
              placeholderTextColor="rgba(47,47,47,0.6)"
              value={values.address}
              onChangeText={handleChange('address')}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Actualizar perfil</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Formik>

      {/* Contraseña */}
      <Formik
        initialValues={{
          current_password: '',
          password: '',
          password_confirmation: '',
        }}
        validationSchema={PasswordSchema}
        onSubmit={async (values, { resetForm, setSubmitting }) => {
          setLoading(true);
          try {
            const res = await axios.post(
              'https://food.siliconsoft.pk/api/updateusepassword',
              {
                userid:                user.id,
                current_password:      values.current_password,
                password:              values.password,
                password_confirmation: values.password_confirmation,
              }
            );
            if (res.status === 200) {
              showAlert({
                type: 'success',
                title: '¡Listo!',
                message: 'Contraseña actualizada.',
                confirmText: 'OK',
              });
              resetForm();
            }
          } catch {
            showAlert({
              type: 'error',
              title: 'Error',
              message: 'No se pudo cambiar contraseña.',
              confirmText: 'Cerrar',
            });
          } finally {
            setLoading(false);
            setSubmitting(false);
          }
        }}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          isSubmitting,
          submitCount,
        }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cambiar contraseña</Text>

            <TextInput
              style={[
                styles.input,
                submitCount > 0 && errors.current_password && styles.inputError
              ]}
              placeholder="Contraseña actual"
              placeholderTextColor="rgba(47,47,47,0.6)"
              secureTextEntry
              value={values.current_password}
              onChangeText={handleChange('current_password')}
            />
            {submitCount > 0 && errors.current_password && (
              <Text style={styles.errorText}>{errors.current_password}</Text>
            )}

            <TextInput
              style={[
                styles.input,
                submitCount > 0 && errors.password && styles.inputError
              ]}
              placeholder="Nueva contraseña"
              placeholderTextColor="rgba(47,47,47,0.6)"
              secureTextEntry
              value={values.password}
              onChangeText={handleChange('password')}
            />
            {submitCount > 0 && errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            <TextInput
              style={[
                styles.input,
                submitCount > 0 && errors.password_confirmation && styles.inputError
              ]}
              placeholder="Confirmar contraseña"
              placeholderTextColor="rgba(47,47,47,0.6)"
              secureTextEntry
              value={values.password_confirmation}
              onChangeText={handleChange('password_confirmation')}
            />
            {submitCount > 0 && errors.password_confirmation && (
              <Text style={styles.errorText}>{errors.password_confirmation}</Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Cambiar contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Formik>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: 'rgba(47,47,47,0.6)',
  },
  loading: {
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#E63946',
  },
  disabledInput: {
    backgroundColor: '#EEE',
  },
  errorText: {
    color: '#E63946',
    fontSize: fonts.size.small,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#33A744',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#D27F27',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
});
