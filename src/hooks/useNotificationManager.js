import { useEffect, useRef } from 'react';
import NotificationService from '../services/NotificationService';

/**
 * Hook para manejar notificaciones FCM y prevenir contaminación cruzada entre usuarios
 */
export const useNotificationManager = (user) => {
  const previousUserRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const handleUserChange = async () => {
      try {
        const currentUser = user;
        const previousUser = previousUserRef.current;
        
        // Solo proceder si hay cambio real de usuario
        if (currentUser === previousUser) return;
        
        // console.log('👤 CAMBIO DE USUARIO DETECTADO:', {
          // from: previousUser ? {
            // id: previousUser.id,
            // email: previousUser.email,
            // usertype: previousUser.usertype
          // } : null,
          // to: currentUser ? {
            // id: currentUser.id,
            // email: currentUser.email,
            // usertype: currentUser.usertype
          // } : null
        // });

        // Caso 1: Usuario se desloguea (logout)
        if (previousUser && !currentUser) {
          await NotificationService.removeTokenFromPreviousUser();
          isInitialized.current = false;
          previousUserRef.current = currentUser;
          return;
        }

        // Caso 2: Cambio entre usuarios diferentes o login inicial
        if (currentUser && (!previousUser || 
            previousUser.id !== currentUser.id || 
            previousUser.email !== currentUser.email ||
            previousUser.usertype !== currentUser.usertype)) {
          
          
          const userId = currentUser.id || currentUser.email;
          const userType = currentUser.usertype;
          
          // Inicializar notificaciones para el nuevo usuario
          // Esto automáticamente limpia el token anterior y lo asocia al nuevo usuario
          const success = await NotificationService.initialize(userId, userType);
          
          if (success) {
            isInitialized.current = true;
          } else {
          }
        }

        // Actualizar referencia para próximo cambio
        previousUserRef.current = currentUser;
        
      } catch (error) {
      }
    };

    // Solo ejecutar si user está definido (AuthContext cargado)
    if (user !== undefined) {
      handleUserChange();
    }

  }, [user?.id, user?.email, user?.usertype]);

  // Función para forzar reinicialización (útil para testing)
  const reinitializeNotifications = async () => {
    if (user) {
      const userId = user.id || user.email;
      const userType = user.usertype;
      
      const success = await NotificationService.initialize(userId, userType);
      
      return success;
    }
    return false;
  };

  return {
    isInitialized: isInitialized.current,
    reinitializeNotifications
  };
};