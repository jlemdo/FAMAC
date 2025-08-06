/**
 * Sistema unificado de manejo de permisos de ubicación
 * Optimizado para diferentes casos de uso: usuario, driver, guest
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import GetLocation from 'react-native-get-location';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Configuraciones por tipo de usuario
const LOCATION_CONFIGS = {
  // Para usuarios normales - ubicación de baja precisión para envíos
  user: {
    enableHighAccuracy: false,
    timeout: 30000,
    maximumAge: 300000, // 5 minutos cache
    title: 'Ubicación para entrega',
    message: 'Necesitamos tu ubicación aproximada para calcular envíos y tiempos de entrega.',
    required: false // Opcional para usuarios
  },
  
  // Para drivers - ubicación de alta precisión para tracking
  driver: {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000, // 30 segundos cache
    title: 'Ubicación para seguimiento',
    message: 'Como repartidor, necesitamos tu ubicación precisa para el seguimiento de entregas.',
    required: true // Obligatorio para drivers
  },
  
  // Para guests - ubicación muy básica, completamente opcional
  guest: {
    enableHighAccuracy: false,
    timeout: 45000,
    maximumAge: 600000, // 10 minutos cache
    title: 'Ubicación opcional',
    message: 'Opcionalmente puedes compartir tu ubicación para mejorar la experiencia de entrega.',
    required: false // Completamente opcional
  }
};

/**
 * Solicita permisos de ubicación de manera optimizada
 * @param {string} userType - 'user', 'driver', 'guest'
 * @param {boolean} showAlert - Mostrar alertas al usuario
 * @returns {Promise<boolean>} true si se otorgó el permiso
 */
export const requestLocationPermission = async (userType = 'user', showAlert = true) => {
  const config = LOCATION_CONFIGS[userType] || LOCATION_CONFIGS.user;
  
  try {
    let granted = false;

    if (Platform.OS === 'android') {
      // Verificar si ya tiene permiso
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      if (hasPermission) {
        return true;
      }

      // Solicitar permiso con mensaje personalizado
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: config.title,
          message: config.message,
          buttonNeutral: 'Preguntar después',
          buttonNegative: 'Cancelar',
          buttonPositive: 'Permitir',
        }
      );
      
      granted = result === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // iOS
      const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      granted = status === RESULTS.GRANTED;
    }

    // Manejar caso cuando el permiso es requerido pero no otorgado
    if (!granted && config.required && showAlert) {
      Alert.alert(
        'Permiso requerido',
        userType === 'driver' 
          ? 'Como repartidor, es necesario activar la ubicación para realizar entregas.'
          : 'La ubicación es necesaria para esta funcionalidad.',
        [
          { text: 'Entendido', style: 'default' }
        ]
      );
    }

    return granted;
  } catch (error) {
    console.warn('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Obtiene la ubicación actual con configuración optimizada
 * @param {string} userType - 'user', 'driver', 'guest'
 * @param {function} onSuccess - Callback cuando se obtiene la ubicación
 * @param {function} onError - Callback de error (opcional)
 * @returns {Promise<object|null>} Coordenadas o null
 */
export const getCurrentLocation = async (userType = 'user', onSuccess = null, onError = null) => {
  const config = LOCATION_CONFIGS[userType] || LOCATION_CONFIGS.user;
  
  try {
    // Verificar permisos primero
    const hasPermission = await requestLocationPermission(userType, false);
    if (!hasPermission) {
      if (onError) onError(new Error('Permission not granted'));
      return null;
    }

    // Usar GetLocation para mejor compatibilidad
    const location = await GetLocation.getCurrentPosition({
      enableHighAccuracy: config.enableHighAccuracy,
      timeout: config.timeout,
      maximumAge: config.maximumAge,
    });

    const coordinates = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: Date.now()
    };

    if (onSuccess) onSuccess(coordinates);
    return coordinates;
    
  } catch (error) {
    console.warn('Error getting current location:', error);
    if (onError) onError(error);
    return null;
  }
};

/**
 * Inicia seguimiento de ubicación (solo para drivers)
 * @param {function} onLocationUpdate - Callback con cada actualización
 * @param {function} onError - Callback de error
 * @returns {number} watchId para detener el seguimiento
 */
export const startLocationTracking = async (onLocationUpdate, onError = null) => {
  const hasPermission = await requestLocationPermission('driver', true);
  if (!hasPermission) {
    if (onError) onError(new Error('Location permission required for tracking'));
    return null;
  }

  const config = LOCATION_CONFIGS.driver;
  
  const watchId = Geolocation.watchPosition(
    position => {
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
      onLocationUpdate(coordinates);
    },
    error => {
      console.warn('Location tracking error:', error);
      if (onError) onError(error);
    },
    {
      enableHighAccuracy: config.enableHighAccuracy,
      timeout: config.timeout,
      maximumAge: config.maximumAge,
      interval: 10000, // Actualizar cada 10 segundos
      fastestInterval: 5000, // Mínimo 5 segundos entre actualizaciones
    }
  );

  return watchId;
};

/**
 * Detiene el seguimiento de ubicación
 * @param {number} watchId - ID del watch a detener
 */
export const stopLocationTracking = (watchId) => {
  if (watchId !== null && watchId !== undefined) {
    Geolocation.clearWatch(watchId);
  }
};

/**
 * Verifica si los servicios de ubicación están disponibles
 * @returns {Promise<boolean>}
 */
export const isLocationServiceEnabled = async () => {
  try {
    if (Platform.OS === 'android') {
      // En Android, verificamos con una solicitud rápida
      const location = await GetLocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
      });
      return !!location;
    } else {
      // En iOS, asumimos que si tenemos permisos, está disponible
      const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return status === RESULTS.GRANTED;
    }
  } catch (error) {
    return false;
  }
};

// Coordenadas por defecto para CDMX
export const CDMX_CENTER = {
  latitude: 19.4326,
  longitude: -99.1332,
};

/**
 * Obtiene ubicación con fallback a centro de CDMX
 * @param {string} userType - 'user', 'driver', 'guest'
 * @returns {Promise<object>} Coordenadas (reales o fallback)
 */
export const getLocationWithFallback = async (userType = 'user') => {
  try {
    const location = await getCurrentLocation(userType);
    return location || CDMX_CENTER;
  } catch (error) {
    return CDMX_CENTER;
  }
};