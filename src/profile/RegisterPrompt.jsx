// src/profile/RegisterPrompt.jsx
import React, {useState, useContext, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import Login from '../authentication/Login';
import SignUp from '../authentication/Signup';
import ForgotPassword from '../authentication/ForgotPassword';
import {AuthContext} from '../context/AuthContext';
import fonts from '../theme/fonts';

function RegisterPrompt() {
  const {user} = useContext(AuthContext);
  const [mode, setMode] = useState('prompt');
  const [previousUserType, setPreviousUserType] = useState(user?.usertype);

  // Detectar cambio de Guest a usuario registrado
  useEffect(() => {
    if (previousUserType === 'Guest' && user?.usertype !== 'Guest' && user?.usertype) {
      // Usuario acaba de autenticarse, no hacer nada más para evitar hooks
      return;
    }
    setPreviousUserType(user?.usertype);
  }, [user?.usertype, previousUserType]);

  // Si el usuario ya no es Guest, no renderizar nada para evitar problemas de hooks
  if (user?.usertype !== 'Guest') {
    return null;
  }


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
          onPress={() => setMode('signup')}>
          <Text style={styles.btnText}>Regístrate Ahora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setMode('login')}>
          <Text style={styles.secondaryText}>
            ¿Ya tienes cuenta? Inicia sesión
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2️⃣ Pantallas de autenticación integradas - sin ScrollView anidado
  return (
    <View style={styles.authContainer}>
      {mode === 'login' && (
        <View key="login-view" style={{ flex: 1 }}>
          <View style={{ flex: 1, minHeight: 400 }}>
            <Login 
              showGuest={false}
              onForgotPassword={() => setMode('forgot')}
              onSignUp={() => setMode('signup')}
            />
          </View>
          <TouchableOpacity onPress={() => setMode('prompt')} style={styles.backButton}>
            <Text style={styles.link}>← Volver</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'signup' && (
        <View key="signup-view" style={{ flex: 1 }}>
          <View style={{ flex: 1, minHeight: 400 }}>
            <SignUp 
              onForgotPassword={() => setMode('forgot')}
              onLogin={() => setMode('login')}
              onSuccess={() => {
                // El AuthContext cambiará automáticamente y el componente se desmontará
                // No necesitamos hacer nada aquí
              }}
            />
          </View>
          <TouchableOpacity onPress={() => setMode('prompt')} style={styles.backButton}>
            <Text style={styles.link}>← Volver</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'forgot' && (
        <View key="forgot-view" style={{ flex: 1 }}>
          <View style={{ flex: 1, minHeight: 400 }}>
            <ForgotPassword onBackToLogin={() => setMode('login')} />
          </View>
          <TouchableOpacity onPress={() => setMode('prompt')} style={styles.backButton}>
            <Text style={styles.link}>← Volver</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    flex: 1,
    padding: 16,
    backgroundColor: '#F2EFE4',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
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

export default RegisterPrompt;
