/**
 * Hook personalizado para gestionar actualizaciones automáticas
 * Permite integrar fácilmente el sistema de updates en cualquier componente
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
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
      const update = await AutoUpdateService.checkForUpdates();
      setUpdateInfo(update);
      setLastChecked(new Date());

      // Mostrar modal automáticamente si hay actualización disponible
      if (update?.available && showModalAutomatically) {
        AutoUpdateService.showUpdateModal(update);
      }

      return update;
    } catch (error) {
      console.error('Error en useAutoUpdate:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [showModalAutomatically]);

  /**
   * Verificación manual (para botones)
   */
  const manualCheck = useCallback(async () => {
    return await AutoUpdateService.manualCheck();
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