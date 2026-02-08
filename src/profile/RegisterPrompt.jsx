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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Login from '../authentication/Login';
import SignUp from '../authentication/Signup';
import ForgotPassword from '../authentication/ForgotPassword';
import {AuthContext} from '../context/AuthContext';
import fonts from '../theme/fonts';

// Clave para AsyncStorage - mismo que usa Signup.jsx
const SIGNUP_FORM_STORAGE_KEY = '@signup_form_data';
const REGISTER_PROMPT_MODE_KEY = '@register_prompt_mode';

function RegisterPrompt() {
  const {user} = useContext(AuthContext);
  const navigation = useNavigation();
  const [mode, setMode] = useState('prompt');
  const [previousUserType, setPreviousUserType] = useState(user?.usertype);
  const [hasError, setHasError] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true); // Para mostrar loading mientras restaura

  // 🔄 NUEVO: Restaurar modo si el usuario estaba en medio de registro
  useEffect(() => {
    const restoreMode = async () => {
      try {
        // Verificar si hay datos de formulario guardados
        const savedFormData = await AsyncStorage.getItem(SIGNUP_FORM_STORAGE_KEY);
        const savedMode = await AsyncStorage.getItem(REGISTER_PROMPT_MODE_KEY);
        
        if (savedFormData || savedMode === 'signup') {
          // Usuario estaba en medio del registro, restaurar
          setMode('signup');
        }
      } catch (error) {
        console.error('Error restaurando modo:', error);
      } finally {
        setIsRestoring(false);
      }
    };
    
    restoreMode();
  }, []);

  // 🔄 NUEVO: Guardar modo cuando cambia a signup
  useEffect(() => {
    if (mode === 'signup') {
      AsyncStorage.setItem(REGISTER_PROMPT_MODE_KEY, 'signup')
        .catch(err => console.error('Error guardando modo:', err));
    } else if (mode === 'prompt') {
      // Limpiar cuando vuelve al prompt
      AsyncStorage.multiRemove([REGISTER_PROMPT_MODE_KEY, SIGNUP_FORM_STORAGE_KEY])
        .catch(err => console.error('Error limpiando modo:', err));
    }
  }, [mode]);

  // Detectar cambio de Guest a usuario registrado
  useEffect(() => {
    if (previousUserType === 'Guest' && user?.usertype !== 'Guest' && user?.usertype) {
      // 🔄 Limpiar datos guardados al completar registro
      AsyncStorage.multiRemove([REGISTER_PROMPT_MODE_KEY, SIGNUP_FORM_STORAGE_KEY])
        .catch(err => console.error('Error limpiando datos:', err));
      
      // Usuario acaba de autenticarse - navegar a Home
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'MainTabs',
              state: {
                routes: [
                  {
                    name: 'Inicio',
                    state: {
                      routes: [{ name: 'CategoriesList' }]
                    }
                  }
                ]
              }
            }
          ]
        });
      }, 1000); // Dar tiempo para que se complete el login
      return;
    }
    setPreviousUserType(user?.usertype);
  }, [user?.usertype, previousUserType, navigation]);

  // Si el usuario ya no es Guest, no renderizar nada para evitar problemas de hooks
  if (user?.usertype !== 'Guest') {
    return null;
  }

  // Mostrar loading mientras restaura el estado
  if (isRestoring) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#D27F27" />
      </View>
    );
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
              onError={() => {
                // 🆕 NUEVO: Manejar errores sin cambiar de pantalla
                setHasError(true);
                // No llamar setMode('prompt') - mantener al usuario en signup
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
  // ========== BACK BUTTON - Estilo profesional ==========
  backButton: {
    marginTop: 24,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(210, 127, 39, 0.08)',
    borderRadius: 10,
  },
  // ========== TÍTULOS ==========
  title: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.xLarge,
    color: '#2F2F2F',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  // ========== PRIMARY BUTTON ==========
  primaryBtn: {
    width: '100%',
    backgroundColor: '#D27F27',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#D27F27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  // ========== SECONDARY BUTTON ==========
  secondaryBtn: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#D27F27',
    backgroundColor: 'rgba(210, 127, 39, 0.05)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#D27F27',
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
  },
  // ========== LINK ==========
  link: {
    textAlign: 'center',
    color: '#D27F27',
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
  },
  // ========== ICON ==========
  icon: {
    width: 100,
    height: 100,
    marginBottom: 24,
    opacity: 0.8,
  },
});

export default RegisterPrompt;
