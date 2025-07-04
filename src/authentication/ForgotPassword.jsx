// src/authentication/ForgotPassword.jsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import fonts from '../theme/fonts';

export default function ForgotPassword() {
  const navigation = useNavigation();
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleResetPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Introduce un email válido');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { status } = await axios.post(
        'https://food.siliconsoft.pk/api/forgetpasswordlink',
        { email: trimmed }
      );
      if (status === 200) {
        Alert.alert('Éxito', 'Enviamos el enlace de restablecimiento.');
        setEmail('');
        navigation.navigate('Login');
      }
    } catch (e) {
      if (e.response?.status === 404) {
        setError('Email no encontrado');
      } else {
        Alert.alert('Error', 'Intenta de nuevo más tarde.');
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restablecer contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresa tu correo para recibir el enlace
      </Text>

      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder="Correo electrónico"
        placeholderTextColor="rgba(47,47,47,0.5)"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onBlur={() => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError('Correo inválido');
          }
        }}
        accessible
        accessibilityLabel="Campo de correo"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={handleResetPassword}
        activeOpacity={0.7}
        accessible
        accessibilityLabel="Enviar enlace de restablecimiento"
      >
        {loading
          ? <ActivityIndicator color="#2F2F2F" />
          : <Text style={styles.buttonText}>Enviar enlace</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.backLink}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Volver a iniciar sesión"
      >
        <Text style={styles.backText}>← Volver al login</Text>
      </TouchableOpacity>
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
    borderColor: '#E63946', // color error si aplica
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
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
    minHeight: 48,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#ffffff',
  },
  backLink: {
    marginTop: 16,
  },
  backText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
  },
});
