import messaging from '@react-native-firebase/messaging';
import {Alert, Platform, Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.token = null;
    this.addNotificationCallback = null; // Para conectar con NotificationContext
    this.navigationRef = null; // Para navegación desde notificaciones
  }

  // Conectar con el sistema de notificaciones del header
  setNotificationCallback(callback) {
    this.addNotificationCallback = callback;
  }

  // Conectar con navegación para manejar taps en notificaciones
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
  }

  // Solicitar permisos
  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Permisos de notificación otorgados:', authStatus);
      
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
      console.log('❌ Permisos de notificación denegados');
      
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
        console.log('📱 iOS device registered for remote messages');
        
        // 🔥 NUEVA SOLUCIÓN: Obtener y setear APNS token ANTES de FCM token
        try {
          const apnsToken = await messaging().getAPNSToken();
          if (apnsToken) {
            console.log('🍎 APNS Token obtenido:', apnsToken);
            await messaging().setAPNSToken(apnsToken);
            console.log('✅ APNS Token seteado correctamente');
          } else {
            console.log('⚠️ No se pudo obtener APNS token - pero intentaremos FCM token');
          }
        } catch (apnsError) {
          console.log('⚠️ Error con APNS token, pero continuamos:', apnsError.message);
        }
      }
      
      const token = await messaging().getToken();
      this.token = token;
      console.log('🔑 FCM Token:', token);
      
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
      console.error('❌ Error obteniendo token FCM:', error);
      
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
                console.log('🔑 Full Token:', token);
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

  // Enviar token al backend usando endpoint específico seguro
  async sendTokenToBackend(userId) {
    if (!this.token) {
      await this.getToken();
    }

    try {
      // ✅ USAR ENDPOINT ESPECÍFICO (no corrompe datos del perfil)
      await fetch('https://occr.pixelcrafters.digital/api/update-fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userid: userId,
          fcm_token: this.token,
        }),
      });
      
      console.log('✅ FCM Token actualizado exitosamente (endpoint seguro)');
    } catch (error) {
      console.error('❌ Error actualizando FCM token:', error);
      
      // Fallback temporal: si endpoint específico falla, no hacer nada
      // Esto evita corrupción de datos hasta que el backend esté actualizado
      console.log('⚠️ FCM token no actualizado para evitar corrupción de datos');
    }
  }

  // Configurar listeners de notificaciones
  setupNotificationListeners() {
    // Notificación cuando la app está en foreground
    messaging().onMessage(async remoteMessage => {
      console.log('📱 Notificación recibida en foreground:', remoteMessage);
      
      // ✅ MEJORADO: Usar contenido enhanced
      const enhancedContent = this.enhanceNotificationContent(remoteMessage);
      
      // Agregar a la campana del header con contenido mejorado
      if (this.addNotificationCallback) {
        this.addNotificationCallback(
          enhancedContent.title,
          enhancedContent.body
        );
      }
      
      // 🔪 CIRUGÍA: Solo campanita, sin alerts nativos
      // Alert removido según solicitud del usuario
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

  // Mejorar contenido de notificación basado en contexto
  enhanceNotificationContent(remoteMessage) {
    const notificationType = remoteMessage.data?.type;
    const orderId = remoteMessage.data?.order_id;
    const orderStatus = remoteMessage.data?.order_status;
    const deliveryTime = remoteMessage.data?.delivery_time;
    const driverName = remoteMessage.data?.driver_name;

    let enhancedTitle = remoteMessage.notification?.title || 'Nueva notificación';
    let enhancedBody = remoteMessage.notification?.body || 'Tienes una nueva actualización';

    switch (notificationType) {
      case 'order_confirmed':
        enhancedTitle = '🎉 ¡Pedido confirmado!';
        enhancedBody = `Tu pedido #${orderId} ha sido confirmado y será preparado pronto.`;
        break;
        
      case 'order_preparing':
        enhancedTitle = '👨‍🍳 Preparando tu pedido';
        enhancedBody = `Estamos preparando tu pedido #${orderId} con mucho cuidado.`;
        break;
        
      case 'order_ready':
        enhancedTitle = '✅ ¡Pedido listo!';
        enhancedBody = `Tu pedido #${orderId} está listo y será enviado pronto.`;
        break;
        
      case 'order_on_way':
        enhancedTitle = '🚚 ¡En camino!';
        if (driverName) {
          enhancedBody = `${driverName} está en camino con tu pedido #${orderId}.`;
        } else {
          enhancedBody = `Tu pedido #${orderId} está en camino. ¡Llegará pronto!`;
        }
        if (deliveryTime) {
          enhancedBody += ` Tiempo estimado: ${deliveryTime} min.`;
        }
        break;
        
      case 'order_delivered':
        enhancedTitle = '🎊 ¡Entregado!';
        enhancedBody = `Tu pedido #${orderId} ha sido entregado. ¡Esperamos que lo disfrutes!`;
        break;
        
      case 'order_cancelled':
        enhancedTitle = '❌ Pedido cancelado';
        enhancedBody = `Tu pedido #${orderId} ha sido cancelado. Tu reembolso será procesado pronto.`;
        break;
        
      case 'payment_confirmed':
        enhancedTitle = '💳 Pago confirmado';
        enhancedBody = `El pago de tu pedido #${orderId} ha sido procesado exitosamente.`;
        break;
        
      case 'new_promotion':
        enhancedTitle = '🎁 ¡Nueva oferta especial!';
        enhancedBody = remoteMessage.notification?.body || '¡No te pierdas nuestras promociones exclusivas!';
        break;
        
      case 'delivery_delay':
        enhancedTitle = '⏰ Retraso en entrega';
        enhancedBody = `Tu pedido #${orderId} se retrasará unos minutos. Disculpa las molestias.`;
        if (deliveryTime) {
          enhancedBody += ` Nuevo tiempo estimado: ${deliveryTime} min.`;
        }
        break;
        
      case 'driver_assigned':
        enhancedTitle = '🚗 Repartidor asignado';
        if (driverName) {
          enhancedBody = `${driverName} será quien entregue tu pedido #${orderId}.`;
        } else {
          enhancedBody = `Se ha asignado un repartidor para tu pedido #${orderId}.`;
        }
        break;
        
      default:
        // Intentar mejorar notificaciones genéricas
        if (orderId) {
          enhancedBody = `Actualización sobre tu pedido #${orderId}: ${enhancedBody}`;
        }
    }

    return { title: enhancedTitle, body: enhancedBody };
  }

  // Manejar cuando se presiona una notificación
  handleNotificationPress(remoteMessage) {
    const notificationType = remoteMessage.data?.type;
    const orderId = remoteMessage.data?.order_id;

    console.log('🔔 Manejando tap en notificación:', {
      type: notificationType,
      orderId,
      hasNavigation: !!this.navigationRef
    });

    try {
      switch (notificationType) {
        case 'order_confirmed':
        case 'order_preparing':
        case 'order_ready':
        case 'order_on_way':
        case 'order_delivered':
        case 'order_cancelled':
        case 'payment_confirmed':
        case 'delivery_delay':
        case 'driver_assigned':
          // Navegar a detalles de orden
          if (orderId && this.navigationRef) {
            console.log('📦 Navegando a detalles de orden:', orderId);
            this.navigationRef.navigate('MainTabs', {
              screen: 'Pedidos',
              params: {
                screen: 'OrderDetail',
                params: { orderId: orderId }
              }
            });
          } else if (this.navigationRef) {
            // Si no hay orderId específico, ir a la lista de pedidos
            this.navigationRef.navigate('MainTabs', { screen: 'Pedidos' });
          }
          break;
          
        case 'new_promotion':
          // Navegar a home para ver promociones
          if (this.navigationRef) {
            console.log('🎉 Navegando a promociones');
            this.navigationRef.navigate('MainTabs', { screen: 'Home' });
          }
          break;
          
        default:
          // Navegación genérica a home
          if (this.navigationRef) {
            console.log('📱 Navegación genérica a home');
            this.navigationRef.navigate('MainTabs', { screen: 'Home' });
          }
      }
    } catch (error) {
      console.error('❌ Error en navegación desde notificación:', error);
      // Fallback: intentar ir a home
      if (this.navigationRef) {
        try {
          this.navigationRef.navigate('MainTabs', { screen: 'Home' });
        } catch (fallbackError) {
          console.error('❌ Error en navegación fallback:', fallbackError);
        }
      }
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