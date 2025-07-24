// src/profile/RegisterPrompt.jsx
import React, {useState, useContext, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import Login from '../authentication/Login';
import SignUp from '../authentication/Signup';
import ForgotPassword from '../authentication/ForgotPassword';
import {AuthContext} from '../context/AuthContext';
import fonts from '../theme/fonts';

export default function RegisterPrompt() {
  const {user} = useContext(AuthContext);
  const [mode, setMode] = useState('prompt');

  // Callbacks estables para evitar re-renders innecesarios
  const handleForgotPassword = useCallback(() => {
    setMode('forgot');
  }, []);

  const handleLogin = useCallback(() => {
    setMode('login');
  }, []);

  const handleSignUp = useCallback(() => {
    setMode('signup');
  }, []);

  const handleBack = useCallback(() => {
    setMode('prompt');
  }, []);

  const handleSuccess = useCallback(() => {
    // El usuario se registró exitosamente
    // El AuthContext se actualizará automáticamente y Profile se re-renderizará
    // No hacemos nada para evitar problemas de estado durante render
  }, []);

  // 1️⃣ Pantalla de Invitado
  if (mode === 'prompt') {
    return (
      <View style={styles.container}>
        <Image
          source={{
            uri: 'https://static.thenounproject.com/png/4020631-200.png',
          }}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.title}>¡Hola Invitado!</Text>
        <Text style={styles.subtitle}>
          Para acceder a esta sección, por favor regístrate o inicia sesión.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleSignUp}>
          <Text style={styles.btnText}>Regístrate Ahora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleLogin}>
          <Text style={styles.secondaryText}>
            ¿Ya tienes cuenta? Inicia sesión
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2️⃣ Pantallas de autenticación integradas
  return (
    <ScrollView
      contentContainerStyle={styles.authContainer}
      keyboardShouldPersistTaps="handled">
      
      {mode === 'login' && (
        <>
          <Login 
            showGuest={false} 
            onForgotPassword={handleForgotPassword}
            onSignUp={handleSignUp}
          />
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.link}>← Volver</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'signup' && (
        <>
          <SignUp 
            onForgotPassword={handleForgotPassword}
            onLogin={handleLogin}
            onSuccess={handleSuccess}
          />
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.link}>← Volver</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'forgot' && (
        <>
          <ForgotPassword onBackToLogin={handleLogin} />
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.link}>← Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F2EFE4',
  },
  authContainer: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#F2EFE4',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.xLarge,
    color: '#2F2F2F',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: 'rgba(47,47,47,0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#D27F27',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  secondaryBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D27F27',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#D27F27',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#007AFF',
    fontSize: fonts.size.small,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
});
