// src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { migrateGuestOrders } from '../utils/orderMigration';
import { useNotification } from './NotificationContext';
import axios from 'axios';
import { API_BASE_URL } from '../config/environment';

// 1️⃣ Import dinámico de AsyncStorage con fallback
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

// 2️⃣ Contexto y Provider
export const AuthContext = createContext({
  isLoggedIn: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loginAsGuest: () => {},
  updateUser: () => {},
  getAuthToken: () => null,
});

// 🔐 Configurar interceptor global de axios para agregar token
let authInterceptorId = null;

const setupAxiosInterceptor = (token) => {
  // Remover interceptor anterior si existe
  if (authInterceptorId !== null) {
    axios.interceptors.request.eject(authInterceptorId);
  }

  // Agregar nuevo interceptor con el token actual
  if (token) {
    authInterceptorId = axios.interceptors.request.use(
      (config) => {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
};

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(undefined); // undefined = loading
  const [token, setToken] = useState(null);
  const { clearNotifications } = useNotification();
  const logoutRef = useRef(null);

  // Guardar referencia a logout para usar en interceptor
  logoutRef.current = async () => {
    if (AsyncStorage) {
      try {
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('persistSession');
      } catch (err) {}
    }

    clearNotifications();
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setupAxiosInterceptor(null);
  };

  // 3️⃣ Verifica login en AsyncStorage (si está disponible)
  useEffect(() => {
    if (!AsyncStorage) {
      setUser(null);
      setIsLoggedIn(false);
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        const savedToken = await AsyncStorage.getItem('authToken');
        const shouldPersist = await AsyncStorage.getItem('persistSession');

        if (raw && shouldPersist === 'true') {
          const stored = JSON.parse(raw);
          setUser(stored);
          setIsLoggedIn(true);

          // Restaurar token y configurar interceptor
          if (savedToken) {
            setToken(savedToken);
            setupAxiosInterceptor(savedToken);
          }
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (err) {
        setUser(null);
        setIsLoggedIn(false);
      }
    })();
  }, []);

  // Función para limpiar datos de guest después de migración exitosa
  const clearGuestData = async (guestEmail) => {
    try {
      // Aquí podrías agregar llamadas API para limpiar datos del guest del servidor
    } catch (error) {}
  };

  // 4️⃣ Login con soporte para token
  const login = async (userData, authToken = null) => {
    const previousUser = user;
    const wasGuest = previousUser?.usertype === 'Guest' && previousUser?.email;

    if (AsyncStorage) {
      try {
        const cleanUserData = {
          id: userData.id,
          user: userData.user,
          usertype: userData.usertype,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          address: userData.address,
          phone: userData.phone,
          dob: userData.dob,
          is_active: userData.is_active,
          email_verified_at: userData.email_verified_at,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
          provider: userData.provider,
          promotion_id: userData.promotion_id,
          promotional_discount: userData.promotional_discount,
        };
        await AsyncStorage.setItem('userData', JSON.stringify(cleanUserData));
        await AsyncStorage.setItem('persistSession', 'true');

        // Guardar token si viene
        if (authToken) {
          await AsyncStorage.setItem('authToken', authToken);
          setToken(authToken);
          setupAxiosInterceptor(authToken);
        }
      } catch (err) {}
    }

    clearNotifications();
    setUser(userData);
    setIsLoggedIn(true);

    // Migrar órdenes de Guest si es necesario
    // Se hace DESPUÉS de setUser para que el usuario ya esté establecido
    if (wasGuest && userData.usertype !== 'Guest') {
      if (previousUser.email && previousUser.email.trim()) {
        // Pequeño delay para asegurar que el estado se actualizó
        setTimeout(async () => {
          try {
            await migrateGuestOrders(previousUser.email);
            await clearGuestData(previousUser.email);
          } catch (error) {}
        }, 500);
      }
    }
  };

  const loginAsGuest = async (guestEmail = null) => {
    const safeEmail = typeof guestEmail === 'string' ? guestEmail : null;

    const cleanGuestUser = {
      id: null,
      user: 'Guest',
      usertype: 'Guest',
      email: safeEmail,
      first_name: 'Invitado',
      last_name: ''
    };

    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem('userData', JSON.stringify(cleanGuestUser));
        await AsyncStorage.setItem('persistSession', 'true');
        // Guests no tienen token
        await AsyncStorage.removeItem('authToken');
      } catch (err) {}
    }

    clearNotifications();
    setToken(null);
    setupAxiosInterceptor(null);
    setUser(cleanGuestUser);
    setIsLoggedIn(true);
  };

  const updateUser = async (updatedData) => {
    const updatedUser = { ...user, ...updatedData };

    if (AsyncStorage) {
      try {
        const cleanUpdatedUser = {
          id: updatedUser.id,
          user: updatedUser.user,
          usertype: updatedUser.usertype,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          address: updatedUser.address,
          phone: updatedUser.phone,
          dob: updatedUser.dob,
          is_active: updatedUser.is_active,
          email_verified_at: updatedUser.email_verified_at,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          provider: updatedUser.provider,
          promotion_id: updatedUser.promotion_id,
          promotional_discount: updatedUser.promotional_discount,
        };
        await AsyncStorage.setItem('userData', JSON.stringify(cleanUpdatedUser));
      } catch (err) {}
    }

    setUser(updatedUser);
  };

  const logout = async () => {
    if (logoutRef.current) {
      await logoutRef.current();
    }
  };

  // Función para obtener el token actual
  const getAuthToken = () => token;

  // 🛡️ INTERCEPTOR GLOBAL: Detectar errores de autenticación
  useEffect(() => {
    if (!user || user.usertype === 'Guest') return;

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const { config, response } = error;

        // Detectar token expirado o usuario eliminado
        if (response?.status === 401) {
          const isAuthEndpoint = config?.url?.includes('/login') || config?.url?.includes('/register');

          // Si no es endpoint de auth, el token expiró o es inválido
          if (!isAuthEndpoint) {
            setTimeout(() => {
              if (logoutRef.current) {
                logoutRef.current();
              }
            }, 100);
          }
        }

        // Detectar usuario eliminado
        if (response?.status === 404 && config?.url?.includes('/userdetails/')) {
          setTimeout(() => {
            if (typeof alert !== 'undefined') {
              alert('Tu cuenta ya no existe en nuestro sistema. Se cerrará la sesión automáticamente.');
            }
            if (logoutRef.current) {
              logoutRef.current();
            }
          }, 100);
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [user?.id, user?.usertype]);

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      user,
      token,
      login,
      loginAsGuest,
      updateUser,
      logout,
      getAuthToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
