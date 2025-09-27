/**
 * Hook personalizado para gestionar actualizaciones automáticas
 * Permite integrar fácilmente el sistema de updates en cualquier componente
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import AutoUpdateService from '../services/AutoUpdateService';

export const useAutoUpdate = (options = {}) => {
  const {
    checkOnMount = true,           // Verificar al montar el componente
    checkOnAppResume = true,       // Verificar cuando la app vuelve del background
    showModalAutomatically = true, // Mostrar modal automáticamente
  } = options;

  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  /**
   * Verifica actualizaciones y actualiza el estado
   */
  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);

    try {
      // 🧪 MODO DESARROLLO: Simular actualización para preview
      const DEV_MODE = false; // Cambiar a true para ver el botón

      if (DEV_MODE && Platform.OS === 'android') {
        const mockUpdate = {
          available: true,
          currentVersion: '1.0.0',
          latestVersion: '1.0.1',
          isCritical: false, // Cambiar a true para ver versión crítica
          releaseNotes: 'Mejoras y correcciones'
        };
        setUpdateInfo(mockUpdate);
        setLastChecked(new Date());
        return mockUpdate;
      }

      const update = await AutoUpdateService.checkForUpdates();
      setUpdateInfo(update);
      setLastChecked(new Date());

      // Mostrar modal automáticamente si hay actualización disponible (solo Android)
      if (update?.available && showModalAutomatically && Platform.OS === 'android') {
        AutoUpdateService.showUpdateModal(update);
      }

      return update;
    } catch (error) {
      // console.error('Error en useAutoUpdate:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [showModalAutomatically]);

  /**
   * Verificación manual (para botones) - solo Android
   */
  const manualCheck = useCallback(async () => {
    if (Platform.OS === 'android') {
      return await AutoUpdateService.manualCheck();
    }
    return null;
  }, []);

  /**
   * Inicia descarga de actualización
   */
  const downloadUpdate = useCallback((downloadUrl) => {
    if (updateInfo?.downloadUrl || downloadUrl) {
      AutoUpdateService.downloadUpdate(downloadUrl || updateInfo.downloadUrl);
    }
  }, [updateInfo]);

  /**
   * Efectos para verificaciones automáticas
   */
  useEffect(() => {
    // Verificar al montar si está habilitado
    if (checkOnMount) {
      checkForUpdates();
    }
  }, [checkOnMount, checkForUpdates]);

  useEffect(() => {
    if (!checkOnAppResume) return;

    // Verificar cuando la app vuelve del background
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        checkForUpdates();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [checkOnAppResume, checkForUpdates]);

  return {
    // Estados
    updateInfo,
    isChecking,
    lastChecked,
    hasUpdate: updateInfo?.available || false,
    isCriticalUpdate: updateInfo?.isCritical || false,

    // Acciones
    checkForUpdates,
    manualCheck,
    downloadUpdate,

    // Información útil
    currentVersion: updateInfo?.currentVersion,
    latestVersion: updateInfo?.latestVersion,
    releaseNotes: updateInfo?.releaseNotes,
  };
};