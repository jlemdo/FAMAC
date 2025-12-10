import axios from 'axios';
import { API_BASE_URL } from '../config/environment';

const BASE_URL = `${API_BASE_URL}/api`;

// 🆕 NUEVO SERVICIO DE DIRECCIONES - SISTEMA COMPLETO Y PROFESIONAL
export const newAddressService = {
  
  // ===============================================
  // 👥 SERVICIOS PARA USUARIOS REGISTRADOS (3 DIRECCIONES MAX)
  // ===============================================
  
  /**
   * Obtener todas las direcciones de un usuario registrado
   * @param {string|number} userId - ID del usuario
   * @returns {Promise} - Lista de direcciones con coordenadas
   */
  getUserAddresses: async (userId) => {
    try {
      
      const response = await axios.get(`${BASE_URL}/user/${userId}/addresses`);
      
      
      if (response.data?.status === 'success') {
        return response.data.addresses || [];
      } else {
        return [];
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return []; // Sin direcciones no es error
      }
      throw new Error('No se pudieron cargar las direcciones');
    }
  },

  /**
   * Agregar nueva dirección para usuario registrado
   * @param {Object} addressData - Datos de la dirección
   * @param {string} addressData.userId - ID del usuario
   * @param {string} addressData.address - Dirección completa
   * @param {number} addressData.latitude - Latitud
   * @param {number} addressData.longitude - Longitud
   * @param {string} addressData.phone - Teléfono (opcional)
   * @param {string} addressData.label - Etiqueta (opcional)
   * @param {boolean} addressData.isDefault - Si es primaria
   * @returns {Promise} - Respuesta del servidor
   */
  addUserAddress: async (addressData) => {
    try {
      
      const payload = {
        user_id: addressData.userId,
        address: addressData.address,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        phone: addressData.phone || '',
        label: addressData.label || 'Dirección',
        is_primary: addressData.isDefault || false
      };
      
      const response = await axios.post(`${BASE_URL}/user/addresses`, payload);
      
      
      if (response.data?.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Error agregando dirección');
      }
    } catch (error) {
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Datos inválidos');
      }
      throw new Error('No se pudo agregar la dirección');
    }
  },

  /**
   * Actualizar dirección existente de usuario registrado
   * @param {Object} addressData - Datos de la dirección
   * @param {string} addressData.addressId - ID de la dirección a actualizar
   * @param {string} addressData.address - Dirección completa
   * @param {number} addressData.latitude - Latitud
   * @param {number} addressData.longitude - Longitud
   * @param {string} addressData.phone - Teléfono (opcional)
   * @param {string} addressData.label - Etiqueta (opcional)
   * @param {boolean} addressData.isDefault - Si es primaria
   * @returns {Promise} - Respuesta del servidor
   */
  updateUserAddress: async (addressData) => {
    try {
      
      const payload = {
        address: addressData.address,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        phone: addressData.phone || '',
        label: addressData.label || 'Dirección',
        is_primary: addressData.isDefault || false
      };
      
      const response = await axios.put(`${BASE_URL}/user/addresses/${addressData.addressId}`, payload);
      
      
      if (response.data?.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Error actualizando dirección');
      }
    } catch (error) {
      throw new Error('No se pudo actualizar la dirección');
    }
  },

  /**
   * Eliminar dirección de usuario registrado
   * @param {string|number} addressId - ID de la dirección a eliminar
   * @returns {Promise} - Respuesta del servidor
   */
  deleteUserAddress: async (addressId) => {
    try {
      
      const response = await axios.delete(`${BASE_URL}/user/addresses/${addressId}`);
      
      
      if (response.data?.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Error eliminando dirección');
      }
    } catch (error) {
      throw new Error('No se pudo eliminar la dirección');
    }
  },

  /**
   * Establecer dirección como primaria para usuario registrado
   * @param {string|number} addressId - ID de la dirección
   * @returns {Promise} - Respuesta del servidor
   */
  setPrimaryUserAddress: async (addressId) => {
    try {
      
      const response = await axios.post(`${BASE_URL}/user/addresses/${addressId}/primary`);
      
      
      if (response.data?.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Error estableciendo como primaria');
      }
    } catch (error) {
      throw new Error('No se pudo establecer como primaria');
    }
  },

  // ===============================================
  // 👻 SERVICIOS PARA GUESTS (1 DIRECCIÓN PERSISTENTE)
  // ===============================================

  /**
   * Guardar dirección de guest (persistente)
   * @param {Object} addressData - Datos de la dirección
   * @param {string} addressData.guestEmail - Email del guest
   * @param {string} addressData.address - Dirección completa
   * @param {number} addressData.latitude - Latitud
   * @param {number} addressData.longitude - Longitud
   * @param {string} addressData.phone - Teléfono (opcional)
   * @returns {Promise} - Respuesta del servidor
   */
  saveGuestAddress: async (addressData) => {
    try {
      // 🔑 Obtener FCM token para notificaciones push
      let fcmToken = null;
      try {
        const NotificationService = require('../services/NotificationService').default;
        fcmToken = NotificationService.token || await NotificationService.getToken();
      } catch (error) {
      }
      
      const payload = {
        guest_email: addressData.guestEmail,
        address: addressData.address,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        phone: addressData.phone || '',
        fcm_token: fcmToken // 🔑 CRÍTICO: Incluir FCM token para push notifications
      };
      
      const response = await axios.post(`${BASE_URL}/guest/address`, payload);
      
      
      if (response.data?.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Error guardando dirección guest');
      }
    } catch (error) {
      throw new Error('No se pudo guardar la dirección');
    }
  },

  /**
   * Obtener dirección de guest por email
   * @param {string} guestEmail - Email del guest
   * @returns {Promise} - Dirección del guest o null
   */
  getGuestAddress: async (guestEmail) => {
    try {
      
      const encodedEmail = encodeURIComponent(guestEmail);
      const response = await axios.get(`${BASE_URL}/guest/address/${encodedEmail}`);
      
      
      if (response.data?.status === 'success') {
        return response.data.address;
      } else if (response.data?.status === 'not_found') {
        return null;
      } else {
        return null;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Sin dirección no es error
      }
      throw new Error('No se pudo obtener la dirección del guest');
    }
  },

  // ===============================================
  // 🔧 UTILIDADES Y VALIDACIONES
  // ===============================================

  /**
   * Validar datos de dirección antes de enviar
   * @param {Object} addressData - Datos a validar
   * @returns {Object} - { isValid: boolean, errors: string[] }
   */
  validateAddressData: (addressData) => {
    const errors = [];
    
    if (!addressData.address || addressData.address.trim().length < 10) {
      errors.push('La dirección debe tener al menos 10 caracteres');
    }
    
    if (addressData.userId && !addressData.guestEmail) {
      // Usuario registrado
      if (!addressData.userId) {
        errors.push('ID de usuario requerido');
      }
    } else if (addressData.guestEmail && !addressData.userId) {
      // Guest
      if (!addressData.guestEmail || !addressData.guestEmail.includes('@')) {
        errors.push('Email válido requerido para guest');
      }
    } else {
      errors.push('Debe especificar userId o guestEmail');
    }
    
    if (addressData.phone && addressData.phone.trim().length > 0) {
      // Validación básica de teléfono mexicano
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(addressData.phone.replace(/\D/g, ''))) {
        errors.push('El teléfono debe tener 10 dígitos');
      }
    }
    
    if (addressData.latitude && (addressData.latitude < -90 || addressData.latitude > 90)) {
      errors.push('Latitud debe estar entre -90 y 90');
    }
    
    if (addressData.longitude && (addressData.longitude < -180 || addressData.longitude > 180)) {
      errors.push('Longitud debe estar entre -180 y 180');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Formatear dirección para mostrar
   * @param {Object} address - Objeto de dirección
   * @returns {string} - Dirección formateada
   */
  formatAddressForDisplay: (address) => {
    if (!address || !address.address) return 'Dirección no disponible';
    
    let formatted = address.address;
    
    // Agregar indicador si es primaria (solo para usuarios registrados)
    if (address.is_primary) {
      formatted = `🏠 ${formatted}`;
    }
    
    return formatted;
  },

  /**
   * Obtener dirección primaria de usuario
   * @param {string|number} userId - ID del usuario
   * @returns {Promise} - Dirección primaria o null
   */
  getPrimaryUserAddress: async (userId) => {
    try {
      const addresses = await newAddressService.getUserAddresses(userId);
      
      const primaryAddress = addresses.find(addr => addr.is_primary);
      
      
      return primaryAddress || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Contar direcciones de usuario
   * @param {string|number} userId - ID del usuario
   * @returns {Promise} - Número de direcciones
   */
  countUserAddresses: async (userId) => {
    try {
      const addresses = await newAddressService.getUserAddresses(userId);
      return addresses.length;
    } catch (error) {
      return 0;
    }
  }
};

export default newAddressService;