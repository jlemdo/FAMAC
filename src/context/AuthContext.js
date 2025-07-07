// src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';

// 1️⃣ Import dinámico de AsyncStorage con fallback
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.warn('⚠️ AsyncStorage no disponible:', e);
  AsyncStorage = null;
}

// 2️⃣ Contexto y Provider
export const AuthContext = createContext({
  isLoggedIn: false,
  user: null,
  login: () => {},
  logout: () => {},
  loginAsGuest: () => {},
});

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser]         = useState(null);

  // 3️⃣ Verifica login en AsyncStorage (si está disponible)
  useEffect(() => {
    if (!AsyncStorage) {
      // Fallback inmediato: guest
      setUser({ user: 'Guest', usertype: 'Guest' });
      setIsLoggedIn(true);
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        if (raw) {
          const stored = JSON.parse(raw);
          setUser(stored);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.warn('⚠️ AuthContext: fallo al leer AsyncStorage', err);
        // Fallback de guest para que no crashee
        setUser({ user: 'Guest', usertype: 'Guest' });
        setIsLoggedIn(true);
      }
    })();
  }, []);

  // 4️⃣ Funciones de login/logout con guardas
  const login = async (userData) => {
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
      } catch (err) {
        console.warn('⚠️ AuthContext: fallo al guardar AsyncStorage', err);
      }
    }
    setUser(userData);
    setIsLoggedIn(true);
  };

  const loginAsGuest = () => {
    setUser({ user: 'Guest', usertype: 'Guest' });
    setIsLoggedIn(true);
  };

  const logout = async () => {
    if (AsyncStorage) {
      try {
        await AsyncStorage.removeItem('userData');
      } catch (err) {
        console.warn('⚠️ AuthContext: fallo al eliminar AsyncStorage', err);
      }
    }
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      user,
      login,
      loginAsGuest,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
