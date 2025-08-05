// src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import { migrateGuestOrders } from '../utils/orderMigration';

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
  login: () => {},
  logout: () => {},
  loginAsGuest: () => {},
});

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser]         = useState(undefined); // undefined = loading

  // 3️⃣ Verifica login en AsyncStorage (si está disponible)
  useEffect(() => {
    if (!AsyncStorage) {
      // Fallback inmediato: mostrar login
      setUser(null);
      setIsLoggedIn(false);
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        const shouldPersist = await AsyncStorage.getItem('persistSession');
        
        if (raw && shouldPersist === 'true') {
          const stored = JSON.parse(raw);
          setUser(stored);
          setIsLoggedIn(true);
        } else {
          // No hay datos guardados o no se debe persistir
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (err) {
        // En caso de error, mostrar login
        setUser(null);
        setIsLoggedIn(false);
      }
    })();
  }, []);

  // Función para limpiar datos de guest después de migración exitosa
  const clearGuestData = async (guestEmail) => {
    try {
      
      // Aquí podrías agregar llamadas API para limpiar datos del guest del servidor si es necesario
      // Por ejemplo: await axios.delete(`/api/guest-cleanup/${guestEmail}`);
      
    } catch (error) {
    }
  };

  // 4️⃣ Funciones de login/logout con guardas
  const login = async (userData) => {
    // Verificar si el usuario anterior era Guest para migrar órdenes
    const previousUser = user;
    const wasGuest = previousUser?.usertype === 'Guest' && previousUser?.email;
    
    if (AsyncStorage) {
      try {
        // Crear objeto limpio para evitar referencias circulares
        const cleanUserData = {
          id: userData.id,
          user: userData.user,
          usertype: userData.usertype,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          address: userData.address
        };
        await AsyncStorage.setItem('userData', JSON.stringify(cleanUserData));
        await AsyncStorage.setItem('persistSession', 'true'); // Activar persistencia permanente
      } catch (err) {
      }
    }
    
    setUser(userData);
    setIsLoggedIn(true);
    
    // Migrar órdenes de Guest si es necesario (EN BACKGROUND para no bloquear UI)
    if (wasGuest && userData.usertype !== 'Guest') {
      
      // Solo migrar si el Guest tenía email (significa que hizo pedidos)
      if (previousUser.email && previousUser.email.trim()) {
        
        // Ejecutar migración en background sin bloquear UI
        setTimeout(async () => {
          try {
            const migrationSuccess = await migrateGuestOrders(previousUser.email);
            if (migrationSuccess) {
              // Limpiar rastros del guest anterior para futuras sesiones
              await clearGuestData(previousUser.email);
            } else {
            }
          } catch (error) {
          }
        }, 1000); // 1 segundo de delay para permitir que la UI se actualice primero
      } else {
      }
    }
  };

  const loginAsGuest = async (guestEmail = null) => {
    // Asegurar que guestEmail es string o null
    const safeEmail = typeof guestEmail === 'string' ? guestEmail : null;
    
    
    // Crear objeto limpio directamente con tipos primitivos
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
        // Crear objeto aún más simple para JSON
        const jsonData = {
          id: null,
          user: 'Guest',
          usertype: 'Guest',
          email: safeEmail,
          first_name: 'Invitado',
          last_name: ''
        };
        await AsyncStorage.setItem('userData', JSON.stringify(jsonData));
        await AsyncStorage.setItem('persistSession', 'true');
      } catch (err) {
      }
    }
    
    setUser(cleanGuestUser);
    setIsLoggedIn(true);
  };

  // Función para actualizar datos del usuario actual (especialmente email de Guest)
  const updateUser = async (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    
    if (AsyncStorage) {
      try {
        // Crear objeto limpio para evitar referencias circulares
        const cleanUpdatedUser = {
          id: updatedUser.id,
          user: updatedUser.user,
          usertype: updatedUser.usertype,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          address: updatedUser.address
        };
        await AsyncStorage.setItem('userData', JSON.stringify(cleanUpdatedUser));
      } catch (err) {
      }
    }
    
    setUser(updatedUser);
  };

  const logout = async () => {
    if (AsyncStorage) {
      try {
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('persistSession'); // Eliminar también bandera de persistencia
      } catch (err) {
      }
    }
    
    setUser(null);
    setIsLoggedIn(false);
    
    // El CartContext automáticamente limpiará el carrito cuando user cambie a null
    // gracias al useEffect que detecta cambios de usuario
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      user,
      login,
      loginAsGuest,
      updateUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
