import messaging from '@react-native-firebase/messaging';
import {Alert, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.token = null;
    this.addNotificationCallback = null; // Para conectar con NotificationContext
  }

  // Conectar con el sistema de notificaciones del header
  setNotificationCallback(callback) {
    this.addNotificationCallback = callback;
  }

  // Solicitar permisos
  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Permisos de notificación otorgados:', authStatus);
      return true;
    } else {
      console.log('❌ Permisos de notificación denegados');
      return false;
    }
  }

  // Obtener token FCM
  async getToken() {
    try {
      // iOS requiere registro para mensajes remotos antes del token
      if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
        console.log('📱 iOS device registered for remote messages');
      }
      
      const token = await messaging().getToken();
      this.token = token;
      console.log('🔑 FCM Token:', token);
      
      // Guardar token localmente
      await AsyncStorage.setItem('fcm_token', token);
      
      // TEMPORAL: Mostrar token en alerta para testing iOS
      if (Platform.OS === 'ios') {
        Alert.alert(
          '🔑 FCM Token (iOS)', 
          token,
          [
            {text: 'Copiar', onPress: () => console.log('Token:', token)},
            {text: 'OK'}
          ]
        );
      }
      
      return token;
    } catch (error) {
      console.error('❌ Error obteniendo token FCM:', error);
      
      // MOSTRAR ERROR EN PANTALLA para debug sin Mac
      if (Platform.OS === 'ios') {
        Alert.alert(
          '❌ Firebase Error',
          `Error getting FCM token: ${error.message}\n\nThis means Firebase is not properly initialized on iOS.`,
          [{text: 'OK'}]
        );
      }
      
      return null;
    }
  }

  // TEMPORAL: Método para mostrar status Firebase en pantalla
  async showFirebaseStatus() {
    try {
      Alert.alert(
        '🔥 Firebase Test',
        'Testing Firebase FCM token generation...',
        [{text: 'OK'}]
      );
      
      // Intentar obtener token directamente (sin inicialización manual)
      await this.getToken();
      
    } catch (error) {
      Alert.alert(
        '❌ Firebase Error',
        `Error: ${error.message}\n\nCheck Firebase configuration.`,
        [{text: 'OK'}]
      );
    }
  }

  // Enviar token al backend
  async sendTokenToBackend(userId) {
    if (!this.token) {
      await this.getToken();
    }

    try {
      // Reemplaza con tu endpoint real
      await fetch('https://food.siliconsoft.pk/api/save-fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          fcm_token: this.token,
          platform: Platform.OS,
        }),
      });
      
      console.log('✅ Token enviado al backend exitosamente');
    } catch (error) {
      console.error('❌ Error enviando token al backend:', error);
    }
  }

  // Configurar listeners de notificaciones
  setupNotificationListeners() {
    // Notificación cuando la app está en foreground
    messaging().onMessage(async remoteMessage => {
      console.log('📱 Notificación recibida en foreground:', remoteMessage);
      
      // ✅ NUEVO: Agregar a la campana del header
      if (this.addNotificationCallback) {
        this.addNotificationCallback(
          remoteMessage.notification?.title || 'Nueva notificación',
          remoteMessage.notification?.body || 'Tienes una nueva actualización'
        );
      }
      
      // Mostrar alerta personalizada (opcional - puedes comentar si prefieres solo la campana)
      Alert.alert(
        remoteMessage.notification?.title || 'Nueva notificación',
        remoteMessage.notification?.body || 'Tienes una nueva actualización',
        [
          {
            text: 'Ver',
            onPress: () => this.handleNotificationPress(remoteMessage),
          },
          {text: 'Cerrar', style: 'cancel'},
        ]
      );
    });

    // Notificación cuando la app está en background y se abre
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📱 Notificación abrió la app desde background:', remoteMessage);
      this.handleNotificationPress(remoteMessage);
    });

    // Notificación cuando la app está cerrada y se abre
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📱 Notificación abrió la app desde cerrada:', remoteMessage);
          this.handleNotificationPress(remoteMessage);
        }
      });
  }

  // Manejar cuando se presiona una notificación
  handleNotificationPress(remoteMessage) {
    const notificationType = remoteMessage.data?.type;
    const orderId = remoteMessage.data?.order_id;

    switch (notificationType) {
      case 'order_status_update':
        // Navegar a detalles de orden
        if (orderId) {
          // Aquí necesitarías acceso a la navegación
          console.log('📦 Navegar a orden:', orderId);
        }
        break;
      case 'new_promotion':
        // Navegar a promociones
        console.log('🎉 Mostrar promoción');
        break;
      default:
        console.log('📱 Notificación genérica');
    }
  }

  // Inicializar servicio completo
  async initialize(userId = null) {
    try {
      // 1. Solicitar permisos
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return false;
      }

      // 2. Obtener token
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      // 3. Enviar token al backend si hay usuario
      if (userId) {
        await this.sendTokenToBackend(userId);
      }

      // 4. Configurar listeners
      this.setupNotificationListeners();

      console.log('🚀 Servicio de notificaciones inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando notificaciones:', error);
      return false;
    }
  }
}

export default new NotificationService();