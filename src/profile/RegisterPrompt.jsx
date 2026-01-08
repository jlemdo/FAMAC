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
  backButton: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(139, 94, 60, 0.03)',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(139, 94, 60, 0.15)',
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
    textAlign: 'center',
    color: '#8B5E3C',
    fontSize: fonts.size.xSmall,
    fontFamily: fonts.regular,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
});

export default RegisterPrompt;
