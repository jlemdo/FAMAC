import messaging from '@react-native-firebase/messaging';
import {Alert, Platform, Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.token = null;
    this.addNotificationCallback = null; // Para conectar con NotificationContext
    this.listenersSetup = false; // 🔧 PREVENIR múltiples listeners
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
      
      // 🔥 DEBUG iOS: Verificar estado específico (DISABLED for production)
      // if (Platform.OS === 'ios') {
      //   Alert.alert(
      //     '✅ Permisos iOS Otorgados', 
      //     `Estado: ${authStatus}\n\nSi no recibes notificaciones:\n1. Verifica APNs en Firebase Console\n2. Verifica certificados de producción\n3. Prueba desde Firebase Console`,
      //     [{text: 'Entendido'}]
      //   );
      // }
      
      return true;
    } else {
      
      if (Platform.OS === 'ios') {
        Alert.alert(
          '❌ Permisos Denegados', 
          'Las notificaciones están deshabilitadas. Ve a Configuración > Notificaciones > FAMAC para habilitarlas.',
          [{text: 'Ir a Configuración', onPress: () => Linking.openSettings()}]
        );
      }
      
      return false;
    }
  }

  // Obtener token FCM
  async getToken() {
    try {
      // iOS requiere registro para mensajes remotos antes del token
      if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
        
        // 🔥 NUEVA SOLUCIÓN: Obtener y setear APNS token ANTES de FCM token
        try {
          const apnsToken = await messaging().getAPNSToken();
          if (apnsToken) {
            await messaging().setAPNSToken(apnsToken);
          } else {
          }
        } catch (apnsError) {
        }
      }
      
      const token = await messaging().getToken();
      this.token = token;
      
      // Guardar token localmente
      await AsyncStorage.setItem('fcm_token', token);
      
      // TEMPORAL: Mostrar token en alerta para testing iOS (DISABLED for production)
      // if (Platform.OS === 'ios') {
      //   Alert.alert(
      //     '🔑 FCM Token (iOS)', 
      //     token,
      //     [
      //       {text: 'Copiar', onPress: () => console.log('Token:', token)},
      //       {text: 'OK'}
      //     ]
      //   );
      // }
      
      return token;
    } catch (error) {
      
      // MOSTRAR ERROR EN PANTALLA para debug sin Mac (DISABLED for production)
      // if (Platform.OS === 'ios') {
      //   Alert.alert(
      //     '❌ Firebase Error',
      //     `Error getting FCM token: ${error.message}\n\nThis means Firebase is not properly initialized on iOS.`,
      //     [{text: 'OK'}]
      //   );
      // }
      
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

  // 🆕 NUEVO: Test completo de notificaciones iOS
  async testIOSNotifications() {
    try {
      Alert.alert(
        '🧪 Test Notificaciones iOS',
        'Iniciando test completo...',
        [{text: 'Comenzar', onPress: async () => {
          
          // 1. Verificar permisos
          const hasPermission = await this.requestPermission();
          if (!hasPermission) {
            Alert.alert('❌ Test Fallido', 'Sin permisos de notificación');
            return;
          }
          
          // 2. Obtener token
          const token = await this.getToken();
          if (!token) {
            Alert.alert('❌ Test Fallido', 'No se pudo obtener FCM token');
            return;
          }
          
          // 3. Mostrar instrucciones para test manual
          Alert.alert(
            '✅ Token Obtenido',
            `🔑 Token: ${token.substring(0, 50)}...\n\n📋 PASOS PARA PROBAR:\n\n1. Ve a Firebase Console\n2. Cloud Messaging > Send test message\n3. Pega este token\n4. Envía mensaje\n\n⚠️ Si no aparece: revisa certificado APNs`,
            [
              {text: 'Copiar Token', onPress: () => {
                // En iOS no hay Clipboard nativo, solo mostrar
              }},
              {text: 'Entendido'}
            ]
          );
          
        }}]
      );
      
    } catch (error) {
      Alert.alert(
        '❌ Test Error',
        `Error durante test: ${error.message}`,
        [{text: 'OK'}]
      );
    }
  }

  // 🔧 CORREGIDO: Preservar datos existentes antes de actualizar FCM token
  async sendTokenToBackend(userId) {
    if (!this.token) {
      await this.getToken();
    }

    try {
      // 1. OBTENER datos actuales del usuario PRIMERO
      const currentDataResponse = await fetch(
        `https://occr.pixelcrafters.digital/api/userdetails/${userId}`
      );
      const currentData = await currentDataResponse.json();
      const userData = currentData?.data?.[0] || {};
      
      console.log('🔔 NotificationService: Preservando datos antes de actualizar token');
      
      // 2. ENVIAR payload COMPLETO preservando todos los campos
      await fetch('https://occr.pixelcrafters.digital/api/updateuserprofile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userid: userId,
          fcm_token: this.token,
          // 🔧 PRESERVAR TODOS LOS CAMPOS EXISTENTES
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          dob: userData.dob || userData.birthDate || userData.birth_date || undefined,
        }),
      });
      
      console.log('✅ NotificationService: FCM token actualizado preservando datos');
    } catch (error) {
      console.error('❌ NotificationService: Error actualizando token:', error);
    }
  }

  // Configurar listeners de notificaciones
  setupNotificationListeners() {
    // 🔧 PREVENIR múltiples configuraciones de listeners
    if (this.listenersSetup) {
      console.log('🔔 Listeners ya configurados, saltando setup');
      return;
    }
    
    console.log('🔔 Configurando listeners de notificaciones...');
    this.listenersSetup = true;
    
    // Notificación cuando la app está en foreground
    messaging().onMessage(async remoteMessage => {
      console.log('🔔 Notificación recibida en foreground:', remoteMessage.notification?.title);
      
      // ✅ Solo agregar a la campanita (UX limpia en foreground)
      if (this.addNotificationCallback) {
        this.addNotificationCallback(
          remoteMessage.notification?.title || 'Nueva notificación',
          remoteMessage.notification?.body || 'Tienes una nueva actualización'
        );
      }
      
      // 🚫 REMOVIDO: Alert molesto cuando app está abierta
      // Las notificaciones push normales funcionan cuando app está cerrada/background
    });

    // Notificación cuando la app está en background y se abre
    messaging().onNotificationOpenedApp(remoteMessage => {
      this.handleNotificationPress(remoteMessage);
    });

    // Notificación cuando la app está cerrada y se abre
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
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
        }
        break;
      case 'new_promotion':
        // Navegar a promociones
        break;
      default:
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

      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new NotificationService();