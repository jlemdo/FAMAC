// src/authentication/Login.jsx
import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import fonts from '../theme/fonts';

export default function Login() {
  const { login, loginAsGuest } = useContext(AuthContext);
  const navigation = useNavigation();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post('https://food.siliconsoft.pk/api/login', { email, password });
      login(data.user);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Credenciales inválidas');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="rgba(47,47,47,0.5)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="rgba(47,47,47,0.5)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleLogin}
        activeOpacity={0.7}
        accessible accessibilityLabel="Botón Iniciar Sesión"
      >
        {loading
          ? <ActivityIndicator color="#2F2F2F" />
          : <Text style={styles.btnText}>Iniciar Sesión</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={loginAsGuest}
        activeOpacity={0.7}
        accessible accessibilityLabel="Continuar como invitado"
      >
        <Text style={styles.btnTextGuest}>Continuar como invitado</Text>
      </TouchableOpacity>

      <View style={styles.links}>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.linkText}>Regístrate para desbloquear todo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ForgetPass')}>
          <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      </View>
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
    width: 120, height: 120,
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
    marginBottom: 12,
    color: '#2F2F2F',
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
  secondaryBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#D27F27',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: {
    color: '#ffffff',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
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
  linkText: {
    color: '#2F2F2F',
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    marginTop: 6,
  },
});
