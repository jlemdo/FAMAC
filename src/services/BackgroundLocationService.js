/**
 * BackgroundLocationService.js
 * Servicio para tracking de ubicación del driver en segundo plano
 * Funciona cuando el driver abre Waze, Google Maps o minimiza la app
 */

import BackgroundActions from 'react-native-background-actions';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import axios from 'axios';
import { API_BASE_URL } from '../config/environment';

// Configuración del servicio en segundo plano
const backgroundOptions = {
  taskName: 'SaboresDeOrigenTracking',
  taskTitle: 'Rastreando entrega',
  taskDesc: 'Actualizando tu ubicación para el cliente',
  taskIcon: {
    name: 'ic_notification', // Icono monocromático para notificaciones
    type: 'drawable',
  },
  color: '#D27F27', // Color naranja de la marca
  linkingURI: 'saboresdo://', // Deep link de la app
  parameters: {
    orderId: null,
  },
};

// Variable para almacenar el ID de la orden actual
let currentOrderId = null;
let locationWatchId = null;

/**
 * Función auxiliar para esperar un tiempo
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Función auxiliar para obtener ubicación actual como promesa
 */
const getCurrentPositionAsync = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  });
};

/**
 * Tarea que se ejecuta en segundo plano
 * Esta función corre indefinidamente mientras el servicio está activo
 *
 * iOS: Usa watchPosition porque iOS mantiene la app viva mientras hay un watcher activo
 * Android: Usa getCurrentPosition en loop porque HeadlessJS no soporta bien watchPosition
 */
const backgroundTask = async (taskDataArguments) => {
  const { orderId } = taskDataArguments;
  currentOrderId = orderId;

  console.log('🚀 Background location tracking iniciado para orden:', orderId);

  if (Platform.OS === 'ios') {
    // iOS: Usar watchPosition - iOS mantiene la app viva mientras hay un watcher
    await new Promise((resolve) => {
      locationWatchId = Geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log(`📍 iOS ubicación: ${latitude}, ${longitude} (precisión: ${accuracy}m)`);

          try {
            await axios.post(`${API_BASE_URL}/api/driverlocsubmit`, {
              orderid: currentOrderId,
              driver_lat: latitude,
              driver_long: longitude,
            });
            console.log('✅ Ubicación enviada al servidor');
          } catch (error) {
            console.log('⚠️ Error enviando ubicación:', error.message);
          }
        },
        (error) => {
          console.log('❌ Error obteniendo ubicación iOS:', error.message);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // Actualizar cada 10 metros
          interval: 8000,
          fastestInterval: 5000,
          showsBackgroundLocationIndicator: true, // Muestra el indicador azul en iOS
          pausesLocationUpdatesAutomatically: false, // No pausar automáticamente
          activityType: 'automotiveNavigation', // Optimizado para navegación en auto
        }
      );
      // Esta promesa nunca se resuelve - el servicio corre hasta que se detenga
    });
  } else {
    // Android: Usar loop con getCurrentPosition (HeadlessJS compatible)
    while (BackgroundActions.isRunning()) {
      try {
        const position = await getCurrentPositionAsync();
        const { latitude, longitude, accuracy } = position.coords;

        console.log(`📍 Ubicación actualizada: ${latitude}, ${longitude} (precisión: ${accuracy}m)`);

        try {
          await axios.post(`${API_BASE_URL}/api/driverlocsubmit`, {
            orderid: currentOrderId,
            driver_lat: latitude,
            driver_long: longitude,
          });
          console.log('✅ Ubicación enviada al servidor');
        } catch (error) {
          console.log('⚠️ Error enviando ubicación:', error.message);
        }
      } catch (error) {
        console.log('❌ Error obteniendo ubicación:', error.message);
      }

      await sleep(8000);
    }
  }

  console.log('🛑 Background tracking detenido');
};

/**
 * Verificar si ya tenemos permisos de ubicación (sin solicitarlos)
 * @returns {Promise<boolean>} true si ya se tienen los permisos
 */
export const checkLocationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      const fineLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return fineLocation;
    } else {
      // iOS
      const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return status === RESULTS.GRANTED;
    }
  } catch (error) {
    console.log('Error verificando permisos:', error.message);
    return false;
  }
};

/**
 * Solicitar permisos de ubicación en segundo plano
 * IMPORTANTE: Solo llamar cuando hay una Activity activa (app en primer plano)
 * @returns {Promise<boolean>} true si se otorgaron los permisos
 */
export const requestBackgroundLocationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      // Verificar primero si ya tenemos permiso de ubicación
      const hasFineLoc = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (!hasFineLoc) {
        // Solicitar permiso de ubicación normal
        const fineLocation = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Ubicación requerida',
            message: 'Necesitamos tu ubicación para rastrear la entrega.',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Permitir',
          }
        );

        if (fineLocation !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }

      // En Android 10+ verificar/solicitar permiso de ubicación en segundo plano
      if (Platform.Version >= 29) {
        const hasBackgroundLoc = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );

        if (hasBackgroundLoc) {
          return true;
        }

        const backgroundLocation = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Ubicación en segundo plano',
            message: 'Para rastrear tu ubicación mientras usas Waze o Maps, necesitamos permiso de ubicación "Siempre".',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Permitir',
          }
        );

        return backgroundLocation === PermissionsAndroid.RESULTS.GRANTED;
      }

      return true;
    } else {
      // iOS - Solicitar "Always" permission
      const status = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
      return status === RESULTS.GRANTED;
    }
  } catch (error) {
    // Si falla por "not attached to Activity", retornar true si ya tenemos permisos básicos
    console.log('Error solicitando permisos (puede ser normal):', error.message);

    // Verificar si ya tenemos al menos permisos básicos
    try {
      const hasBasicPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return hasBasicPermission;
    } catch {
      return false;
    }
  }
};

/**
 * Iniciar tracking de ubicación en segundo plano
 * IMPORTANTE: Los permisos deben solicitarse ANTES de llamar esta función
 * usando requestBackgroundLocationPermission() desde el componente
 * @param {number} orderId - ID de la orden a rastrear
 * @returns {Promise<boolean>} true si se inició correctamente
 */
export const startBackgroundTracking = async (orderId) => {
  try {
    // Verificar si ya está corriendo
    const isRunning = BackgroundActions.isRunning();
    if (isRunning) {
      console.log('⚠️ Background tracking ya está corriendo');
      // Actualizar el orderId
      currentOrderId = orderId;
      return true;
    }

    // NO solicitar permisos aquí - deben solicitarse desde el componente
    // mientras la app está en primer plano y hay una Activity activa

    // Iniciar servicio en segundo plano
    await BackgroundActions.start(backgroundTask, {
      ...backgroundOptions,
      parameters: { orderId },
    });

    console.log('✅ Background tracking iniciado para orden:', orderId);
    return true;
  } catch (error) {
    console.error('❌ Error iniciando background tracking:', error);
    return false;
  }
};

/**
 * Detener tracking de ubicación en segundo plano
 */
export const stopBackgroundTracking = async () => {
  try {
    // Detener watchPosition si existe
    if (locationWatchId !== null) {
      Geolocation.clearWatch(locationWatchId);
      locationWatchId = null;
    }

    // Detener servicio en segundo plano
    const isRunning = BackgroundActions.isRunning();
    if (isRunning) {
      await BackgroundActions.stop();
      console.log('✅ Background tracking detenido');
    }

    currentOrderId = null;
  } catch (error) {
    console.error('❌ Error deteniendo background tracking:', error);
  }
};

/**
 * Verificar si el tracking está activo
 * @returns {boolean}
 */
export const isTrackingActive = () => {
  return BackgroundActions.isRunning();
};

/**
 * Obtener el ID de la orden actual siendo rastreada
 * @returns {number|null}
 */
export const getCurrentTrackingOrderId = () => {
  return currentOrderId;
};

/**
 * Actualizar la notificación del servicio en segundo plano
 * @param {string} title - Nuevo título
 * @param {string} description - Nueva descripción
 */
export const updateTrackingNotification = async (title, description) => {
  try {
    const isRunning = BackgroundActions.isRunning();
    if (isRunning) {
      await BackgroundActions.updateNotification({
        taskTitle: title,
        taskDesc: description,
      });
    }
  } catch (error) {
    console.error('Error actualizando notificación:', error);
  }
};
