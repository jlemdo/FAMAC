import axios from 'axios';

const BASE_URL = 'https://occr.pixelcrafters.digital/api';

// Servicio completo para gestión de direcciones múltiples
export const addressService = {
  
  /**
   * Obtener todas las direcciones de un usuario
   * @param {string|number} userId - ID del usuario
   * @returns {Promise} - Lista de direcciones
   */
  getAllAddresses: async (userId) => {
    try {
      console.log('📍 Obteniendo direcciones para usuario:', userId);
      
      const response = await axios.get(`${BASE_URL}/fetch_address/${userId}`);
      
      console.log('✅ Direcciones obtenidas:', response.data);
      console.log('🔍 Tipo de respuesta:', typeof response.data, 'Array?', Array.isArray(response.data));
      console.log('🔍 Status:', response.data?.status, 'Data disponible:', !!response.data?.data);
      
      // Manejar diferentes formatos de respuesta del backend
      if (response.data && Array.isArray(response.data)) {
        console.log('📋 Usando formato: Array directo');
        return response.data;
      } else if (response.data?.addresses && Array.isArray(response.data.addresses)) {
        console.log('📋 Usando formato: response.data.addresses');
        return response.data.addresses;
      } else if (response.data?.status === 'success' && response.data?.data) {
        console.log('📋 Usando formato: {status: success, data: Array}');
        return Array.isArray(response.data.data) ? response.data.data : [];
      } else if (response.data?.success && response.data?.data) {
        console.log('📋 Usando formato: {success: true, data: Array}');
        return Array.isArray(response.data.data) ? response.data.data : [];
      } else {
        console.log('⚠️ Formato de respuesta no reconocido, retornando array vacío');
        return [];
      }
    } catch (error) {
      console.error('❌ Error obteniendo direcciones:', error);
      throw new Error('No se pudieron cargar las direcciones');
    }
  },

  /**
   * Obtener una dirección específica por ID
   * @param {string|number} addressId - ID de la dirección
   * @returns {Promise} - Datos de la dirección
   */
  getAddressById: async (addressId) => {
    try {
      console.log('📍 Obteniendo dirección ID:', addressId);
      
      const response = await axios.get(`${BASE_URL}/fetch_address_single_edit/${addressId}`);
      
      console.log('✅ Dirección obtenida:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo dirección:', error);
      throw new Error('No se pudo cargar la dirección');
    }
  },

  /**
   * Agregar una nueva dirección
   * @param {Object} addressData - Datos de la dirección
   * @param {string} addressData.userId - ID del usuario
   * @param {string} addressData.address - Dirección completa
   * @param {string} addressData.phone - Teléfono (opcional)
   * @param {boolean} addressData.isDefault - Si es dirección predeterminada
   * @returns {Promise} - Respuesta del servidor
   */
  addAddress: async (addressData) => {
    try {
      console.log('➕ Agregando nueva dirección:', addressData);
      
      const payload = {
        userid: addressData.userId.toString(),
        address: addressData.address,
        phone: addressData.phone || '',
        is_default: addressData.isDefault ? "1" : "0"
      };
      
      const response = await axios.post(`${BASE_URL}/addaddress`, payload);
      
      console.log('✅ Dirección agregada:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error agregando dirección:', error);
      throw new Error('No se pudo agregar la dirección');
    }
  },

  /**
   * Actualizar una dirección existente
   * @param {Object} addressData - Datos de la dirección
   * @param {string} addressData.addressId - ID de la dirección a actualizar
   * @param {string} addressData.userId - ID del usuario
   * @param {string} addressData.address - Dirección completa
   * @param {string} addressData.phone - Teléfono (opcional)
   * @param {boolean} addressData.isDefault - Si es dirección predeterminada
   * @returns {Promise} - Respuesta del servidor
   */
  updateAddress: async (addressData) => {
    try {
      console.log('✏️ Actualizando dirección:', addressData);
      
      const payload = {
        userid: addressData.userId.toString(),
        address: addressData.address,
        phone: addressData.phone || '',
        is_default: addressData.isDefault ? "1" : "0",
        address_id: addressData.addressId.toString()
      };
      
      const response = await axios.post(`${BASE_URL}/updateaddress`, payload);
      
      console.log('✅ Dirección actualizada:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando dirección:', error);
      throw new Error('No se pudo actualizar la dirección');
    }
  },

  /**
   * Eliminar una dirección
   * @param {string|number} addressId - ID de la dirección a eliminar
   * @returns {Promise} - Respuesta del servidor
   */
  deleteAddress: async (addressId) => {
    try {
      console.log('🗑️ Eliminando dirección ID:', addressId);
      
      const payload = {
        id: addressId.toString()
      };
      
      const response = await axios.post(`${BASE_URL}/deleteaddress`, payload);
      
      console.log('✅ Dirección eliminada:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error eliminando dirección:', error);
      throw new Error('No se pudo eliminar la dirección');
    }
  },

  /**
   * Establecer una dirección como predeterminada
   * @param {Object} addressData - Datos mínimos de la dirección
   * @param {string} addressData.addressId - ID de la dirección
   * @param {string} addressData.userId - ID del usuario
   * @param {string} addressData.address - Dirección completa
   * @param {string} addressData.phone - Teléfono
   * @returns {Promise} - Respuesta del servidor
   */
  setDefaultAddress: async (addressData) => {
    try {
      console.log('🏠 Estableciendo dirección predeterminada:', addressData.addressId);
      
      const payload = {
        userid: addressData.userId.toString(),
        address: addressData.address,
        phone: addressData.phone || '',
        is_default: "1",
        address_id: addressData.addressId.toString()
      };
      
      const response = await axios.post(`${BASE_URL}/updateaddress`, payload);
      
      console.log('✅ Dirección predeterminada establecida:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error estableciendo predeterminada:', error);
      throw new Error('No se pudo establecer como predeterminada');
    }
  },

  /**
   * Obtener solo la dirección predeterminada del usuario
   * @param {string|number} userId - ID del usuario
   * @returns {Promise} - Dirección predeterminada o null
   */
  getDefaultAddress: async (userId) => {
    try {
      const addresses = await addressService.getAllAddresses(userId);
      
      const defaultAddress = addresses.find(addr => 
        addr.is_default === "1" || addr.is_default === 1
      );
      
      console.log('🏠 Dirección predeterminada:', defaultAddress);
      
      return defaultAddress || null;
    } catch (error) {
      console.error('❌ Error obteniendo dirección predeterminada:', error);
      return null;
    }
  },

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
    
    if (!addressData.userId) {
      errors.push('ID de usuario requerido');
    }
    
    if (addressData.phone && addressData.phone.trim().length > 0) {
      // Validación básica de teléfono (10 dígitos)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(addressData.phone.replace(/\D/g, ''))) {
        errors.push('El teléfono debe tener 10 dígitos');
      }
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
    
    // Agregar indicador si es predeterminada
    if (address.is_default === "1" || address.is_default === 1) {
      formatted = `🏠 ${formatted}`;
    }
    
    return formatted;
  }
};

export default addressService;