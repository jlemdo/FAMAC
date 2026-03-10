/**
 * WebSocketService - Servicio de conexión en tiempo real con Pusher
 *
 * Maneja las conexiones WebSocket para:
 * - Ubicación del driver en tiempo real
 * - Mensajes de chat
 * - Cambios de estado de órdenes
 * - Actualización de lista de órdenes (badges)
 * - Notificación de cuenta eliminada
 */

import { PUSHER_CONFIG } from '../config/environment';

class WebSocketService {
  constructor() {
    this.pusher = null;
    this.channels = {};
    this.listeners = {};
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  /**
   * Inicializar conexión con Pusher
   */
  async connect() {
    if (this.pusher && this.isConnected) {
      return;
    }

    try {
      // Importar Pusher dinámicamente con manejo de errores
      let Pusher;
      try {
        Pusher = require('pusher-js/react-native');
      } catch (requireError) {
        console.warn('[WS] pusher-js no disponible, usando fallback polling:', requireError.message);
        return; // Fallback a polling
      }

      if (!Pusher) {
        console.warn('[WS] Pusher es null, usando fallback polling');
        return;
      }

      this.pusher = new Pusher(PUSHER_CONFIG.appKey, {
        cluster: PUSHER_CONFIG.cluster,
        encrypted: PUSHER_CONFIG.encrypted,
        // Configuración de reconexión automática
        enabledTransports: ['ws', 'wss'],
      });

      this.pusher.connection.bind('connected', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[WS] Conectado a Pusher');
      });

      this.pusher.connection.bind('disconnected', () => {
        this.isConnected = false;
        console.log('[WS] Desconectado de Pusher');
      });

      this.pusher.connection.bind('error', (error) => {
        console.error('[WS] Error de conexión:', error);
        this.handleReconnect();
      });

    } catch (error) {
      console.error('[WS] Error inicializando Pusher:', error);
      this.pusher = null; // Asegurar que quede null para fallback
      // Si Pusher no está instalado, el servicio funciona en modo fallback (polling)
    }
  }

  /**
   * Manejar reconexión automática
   */
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WS] Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  /**
   * Suscribirse a un canal
   * @param {string} channelName - Nombre del canal
   * @returns {object|null} - Canal suscrito o null
   */
  subscribe(channelName) {
    if (!this.pusher) {
      console.warn('[WS] Pusher no inicializado, usando fallback polling');
      return null;
    }

    if (this.channels[channelName]) {
      return this.channels[channelName];
    }

    const channel = this.pusher.subscribe(channelName);
    this.channels[channelName] = channel;
    console.log(`[WS] Suscrito a canal: ${channelName}`);
    return channel;
  }

  /**
   * Desuscribirse de un canal
   * @param {string} channelName - Nombre del canal
   */
  unsubscribe(channelName) {
    if (this.pusher && this.channels[channelName]) {
      this.pusher.unsubscribe(channelName);
      delete this.channels[channelName];
      console.log(`[WS] Desuscrito de canal: ${channelName}`);
    }
  }

  /**
   * Escuchar evento en un canal
   * @param {string} channelName - Nombre del canal
   * @param {string} eventName - Nombre del evento
   * @param {function} callback - Función callback
   */
  on(channelName, eventName, callback) {
    const channel = this.subscribe(channelName);
    if (channel) {
      channel.bind(eventName, callback);

      // Guardar referencia para limpieza
      const key = `${channelName}:${eventName}`;
      if (!this.listeners[key]) {
        this.listeners[key] = [];
      }
      this.listeners[key].push(callback);
    }
  }

  /**
   * Dejar de escuchar evento
   * @param {string} channelName - Nombre del canal
   * @param {string} eventName - Nombre del evento
   * @param {function} callback - Función callback específica (opcional)
   */
  off(channelName, eventName, callback = null) {
    const channel = this.channels[channelName];
    if (channel) {
      if (callback) {
        channel.unbind(eventName, callback);
      } else {
        channel.unbind(eventName);
      }
    }
  }

  // ============================================
  // MÉTODOS ESPECÍFICOS POR FUNCIONALIDAD
  // ============================================

  /**
   * Escuchar ubicación del driver para una orden
   * @param {number} orderId - ID de la orden
   * @param {function} callback - Callback con datos de ubicación
   */
  subscribeToDriverLocation(orderId, callback) {
    const channelName = `order.${orderId}`;
    this.on(channelName, 'driver.location', (data) => {
      callback({
        driverLat: parseFloat(data.driver_lat),
        driverLong: parseFloat(data.driver_long),
        distanceMeters: data.distance_meters,
        status: data.status,
        statusSpanish: data.status_spanish,
        timestamp: data.timestamp,
      });
    });
  }

  /**
   * Dejar de escuchar ubicación del driver
   * @param {number} orderId - ID de la orden
   */
  unsubscribeFromDriverLocation(orderId) {
    this.unsubscribe(`order.${orderId}`);
  }

  /**
   * Escuchar mensajes de chat para una orden
   * @param {number} orderId - ID de la orden
   * @param {function} callback - Callback con nuevo mensaje
   */
  subscribeToChatMessages(orderId, callback) {
    const channelName = `chat.${orderId}`;
    this.on(channelName, 'message.sent', (data) => {
      callback({
        id: data.id,
        orderId: data.order_id,
        sender: data.sender,
        message: data.message,
        timestamp: data.timestamp,
      });
    });
  }

  /**
   * Dejar de escuchar mensajes de chat
   * @param {number} orderId - ID de la orden
   */
  unsubscribeFromChatMessages(orderId) {
    this.unsubscribe(`chat.${orderId}`);
  }

  /**
   * Escuchar cambios de estado de una orden
   * @param {number} orderId - ID de la orden
   * @param {function} callback - Callback con nuevo estado
   */
  subscribeToOrderStatus(orderId, callback) {
    const channelName = `order.${orderId}`;
    this.on(channelName, 'order.status', (data) => {
      callback({
        orderId: data.order_id,
        orderNumber: data.order_number,
        status: data.status,
        statusSpanish: data.status_spanish,
        timestamp: data.timestamp,
      });
    });
  }

  /**
   * Escuchar actualizaciones de lista de órdenes (para badges)
   * @param {string} userType - 'user', 'guest', o 'driver'
   * @param {string|number} identifier - userId, emailHash, o driverId
   * @param {function} callback - Callback cuando hay actualización
   */
  subscribeToOrdersList(userType, identifier, callback) {
    let channelName;

    if (userType === 'driver') {
      channelName = `driver.${identifier}.orders`;
    } else if (userType === 'guest') {
      // Hash MD5 del email (se calcula en el backend)
      channelName = `guest.${identifier}.orders`;
    } else {
      channelName = `user.${identifier}.orders`;
    }

    this.on(channelName, 'orders.updated', (data) => {
      callback({
        action: data.action, // 'new_order', 'status_changed', 'order_assigned'
        userType: data.user_type,
        timestamp: data.timestamp,
      });
    });

    return channelName;
  }

  /**
   * Dejar de escuchar lista de órdenes
   * @param {string} channelName - Nombre del canal retornado por subscribeToOrdersList
   */
  unsubscribeFromOrdersList(channelName) {
    this.unsubscribe(channelName);
  }

  /**
   * Escuchar eliminación de cuenta (para forzar logout)
   * @param {number} userId - ID del usuario
   * @param {function} callback - Callback cuando la cuenta es eliminada
   */
  subscribeToAccountDeleted(userId, callback) {
    const channelName = `user.${userId}`;
    this.on(channelName, 'account.deleted', (data) => {
      callback({
        userId: data.user_id,
        message: data.message,
        forceLogout: data.force_logout,
        timestamp: data.timestamp,
      });
    });
  }

  /**
   * Dejar de escuchar eliminación de cuenta
   * @param {number} userId - ID del usuario
   */
  unsubscribeFromAccountDeleted(userId) {
    this.unsubscribe(`user.${userId}`);
  }

  /**
   * Desconectar y limpiar todo
   */
  disconnect() {
    if (this.pusher) {
      // Desuscribir de todos los canales
      Object.keys(this.channels).forEach(channelName => {
        this.pusher.unsubscribe(channelName);
      });

      this.pusher.disconnect();
      this.pusher = null;
      this.channels = {};
      this.listeners = {};
      this.isConnected = false;
      console.log('[WS] Desconectado completamente');
    }
  }

  /**
   * Verificar si está conectado
   * @returns {boolean}
   */
  isActive() {
    return this.isConnected;
  }
}

// Singleton
const webSocketService = new WebSocketService();
export default webSocketService;
