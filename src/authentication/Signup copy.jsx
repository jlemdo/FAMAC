// src/authentication/SignupBasic.jsx
import React, { useEffect } from 'react';
import {
  ScrollView,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Config from 'react-native-config';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import axios from 'axios';
import fonts from '../theme/fonts';

export default function SignupBasic({ navigation, route }) {
  // Configura Google Sign-In con People API para cumpleaños y teléfono
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '1058559455264-cjeasg5r6l4m41o28c6k2ff1s66jr4d7.apps.googleusercontent.com',
      offlineAccess: true,
      scopes: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/user.birthday.read',
      ],
    });
  }, []);

  const handleGoogleFill = async (setFieldValue) => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    const { user } = res.data;

    // Nombre/apellido
    if (user.givenName)  setFieldValue('first_name', user.givenName);
    if (user.familyName) setFieldValue('last_name',  user.familyName);

    // Cumpleaños
    const { accessToken } = await GoogleSignin.getTokens();
    const { data } = await axios.get(
      'https://people.googleapis.com/v1/people/me?personFields=birthdays',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const bd = data.birthdays?.[0]?.date;
    if (bd) {
      const meses = [
        'Enero','Febrero','Marzo','Abril','Mayo','Junio',
        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
      ];
      setFieldValue('birthDay',   String(bd.day  || ''));
      setFieldValue('birthMonth', meses[(bd.month || 1) - 1]);
      setFieldValue('birthYear',  String(bd.year || ''));
    }

  } catch (err) {
    if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
    console.warn('Google fill error', err);
  }
};


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Formik
        initialValues={{
          first_name: '',
          last_name: '',
          birthMonth: '',
          birthYear: '',
          phone: '',
        }}
        validationSchema={Yup.object().shape({
          first_name: Yup.string()
            .trim()
            .min(2, 'Mínimo 2 caracteres')
            .required('Obligatorio'),
          last_name: Yup.string()
            .trim()
            .min(2, 'Mínimo 2 caracteres')
            .required('Obligatorio'),
          birthMonth: Yup.string().required('Obligatorio'),
          birthYear: Yup.string()
            .trim()
            .matches(/^\d{4}$/, 'Año inválido')
            .required('Obligatorio'),
          phone: Yup.string()
            .trim()
            .matches(/^\+?[0-9\-\s]{7,15}$/, 'Teléfono inválido')
            .required('Obligatorio'),
        })}
        onSubmit={(values) => {
          // Pásalos al siguiente paso
          navigation.navigate('SignupAddress', {
            basic: values,
            ...(route.params || {}),
          });
        }}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          setFieldValue,
        }) => (
          <>
            {/* Google Fill */}
            <GoogleSigninButton
              style={{ width: '100%', height: 48, marginBottom: 16 }}
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              onPress={() => handleGoogleFill(setFieldValue)}
            />

            {/* First Name */}
            <TextInput
              style={[styles.input, errors.first_name && styles.inputError]}
              placeholder="Nombre"
              placeholderTextColor="rgba(47,47,47,0.5)"
              value={values.first_name}
              onChangeText={handleChange('first_name')}
              onBlur={handleBlur('first_name')}
              autoCapitalize="words"
            />
            {touched.first_name && errors.first_name && (
              <Text style={styles.error}>{errors.first_name}</Text>
            )}

            {/* Last Name */}
            <TextInput
              style={[styles.input, errors.last_name && styles.inputError]}
              placeholder="Apellido"
              placeholderTextColor="rgba(47,47,47,0.5)"
              value={values.last_name}
              onChangeText={handleChange('last_name')}
              onBlur={handleBlur('last_name')}
              autoCapitalize="words"
            />
            {touched.last_name && errors.last_name && (
              <Text style={styles.error}>{errors.last_name}</Text>
            )}

            {/* DOB */}
            <View style={styles.row}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={values.birthMonth}
                  onValueChange={(v) => setFieldValue('birthMonth', v)}
                  style={styles.picker}
                  dropdownIconColor="#2F2F2F"
                >
                  <Picker.Item label="Mes" value="" />
                  {[
                    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
                  ].map((m) => (
                    <Picker.Item key={m} label={m} value={m} />
                  ))}
                </Picker>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { width: 100 },
                  errors.birthYear && styles.inputError,
                ]}
                placeholder="Año"
                placeholderTextColor="rgba(47,47,47,0.5)"
                value={values.birthYear}
                onChangeText={handleChange('birthYear')}
                onBlur={handleBlur('birthYear')}
                keyboardType="number-pad"
              />
            </View>
            {touched.birthMonth && errors.birthMonth && (
              <Text style={styles.error}>{errors.birthMonth}</Text>
            )}
            {touched.birthYear && errors.birthYear && (
              <Text style={styles.error}>{errors.birthYear}</Text>
            )}

            {/* Phone */}
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="Teléfono"
              placeholderTextColor="rgba(47,47,47,0.5)"
              value={values.phone}
              onChangeText={handleChange('phone')}
              onBlur={handleBlur('phone')}
              keyboardType="phone-pad"
            />
            {touched.phone && errors.phone && (
              <Text style={styles.error}>{errors.phone}</Text>
            )}

            {/* Continuar */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSubmit}
              activeOpacity={0.7}
              accessible
              accessibilityLabel="Continuar"
            >
              <Text style={styles.btnText}>Continuar</Text>
            </TouchableOpacity>
          </>
        )}
      </Formik>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F2EFE4',
    padding: 20,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#FFF',
    borderColor: '#8B5E3C',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  inputError: { borderColor: '#E63946' },
  error: {
    width: '100%',
    color: '#E63946',
    fontSize: fonts.size.small,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', width: '100%', marginBottom: 12 },
  pickerContainer: {
    flex: 1,
    marginRight: 8,
    borderColor: '#8B5E3C',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  picker: {
    ...Platform.select({
      android: { height: 48, color: '#2F2F2F' },
      ios: {},
    }),
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    elevation: 2,
  },
  btnText: {
    color: '#ffffff',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
});
