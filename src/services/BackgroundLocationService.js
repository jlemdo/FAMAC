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
    name: 'ic_launcher',
    type: 'mipmap',
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
 * Tarea que se ejecuta en segundo plano
 * Esta función corre indefinidamente mientras el servicio está activo
 */
const backgroundTask = async (taskDataArguments) => {
  const { orderId } = taskDataArguments;
  currentOrderId = orderId;

  console.log('🚀 Background location tracking iniciado para orden:', orderId);

  // Loop infinito que mantiene el servicio vivo
  await new Promise(async (resolve) => {
    // Configurar watchPosition para tracking continuo
    locationWatchId = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        console.log(`📍 Ubicación actualizada: ${latitude}, ${longitude} (precisión: ${accuracy}m)`);

        // Enviar ubicación al servidor
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
        console.log('❌ Error obteniendo ubicación:', error.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Actualizar cada 10 metros
        interval: 8000, // Cada 8 segundos (Android)
        fastestInterval: 5000, // Mínimo 5 segundos entre actualizaciones
        showLocationDialog: true,
        forceRequestLocation: true,
      }
    );

    // Mantener el servicio vivo - nunca resolver la promesa
    // El servicio se detiene manualmente con stopBackgroundTracking()
  });
};

/**
 * Solicitar permisos de ubicación en segundo plano
 * @returns {Promise<boolean>} true si se otorgaron los permisos
 */
export const requestBackgroundLocationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      // Primero solicitar permiso de ubicación normal
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

      // En Android 10+ solicitar permiso de ubicación en segundo plano
      if (Platform.Version >= 29) {
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
    console.error('Error solicitando permisos:', error);
    return false;
  }
};

/**
 * Iniciar tracking de ubicación en segundo plano
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

    // Solicitar permisos
    const hasPermission = await requestBackgroundLocationPermission();
    if (!hasPermission) {
      console.log('❌ No se otorgaron permisos de ubicación en segundo plano');
      return false;
    }

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
