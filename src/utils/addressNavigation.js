/**
 * Helper centralizado para navegación a AddressFormUberStyle
 * Reduce duplicación de código y centraliza la lógica de parámetros
 */

/**
 * Configuraciones predeterminadas para diferentes flujos
 */
const NAVIGATION_PRESETS = {
  // ✅ FLUJO CONSOLIDADO: Guest checkout con email integrado en AddressFormUberStyle
  GUEST_CHECKOUT: {
    title: 'Datos de Entrega',
    fromGuestCheckout: true,
    returnToCart: true,
    showBackButton: true,
  },

  GUEST_EDIT: {
    title: 'Cambiar Dirección',
    fromGuestCheckout: true,
    returnToCart: true,
    showBackButton: true,
  },
  
  CART_NEW: {
    title: 'Agregar Dirección',
    fromCart: true,
    editMode: false,
    showBackButton: true,
  },
  
  PROFILE_EDIT: {
    title: 'Editar Dirección Principal',
    fromProfile: true,
    editMode: true,
    skipMapStep: true,
    showBackButton: true,
  },
  
  ADDRESS_MANAGER_NEW: {
    title: 'Agregar Nueva Dirección',
    fromAddressManager: true,
    editMode: false,
    showBackButton: true,
  },
  
  ADDRESS_MANAGER_EDIT: {
    title: 'Editar Dirección',
    fromAddressManager: true,
    editMode: true,
    showBackButton: true,
  }
};

/**
 * Navegar a AddressFormUberStyle con configuración unificada
 * @param {object} navigation - Objeto de navegación de React Navigation
 * @param {string} preset - Preset predefinido (GUEST_CHECKOUT, CART_NEW, etc.)
 * @param {object} customParams - Parámetros adicionales o sobrescribir preset
 * @returns {void}
 */
export const navigateToAddressForm = (navigation, preset, customParams = {}) => {
  const presetConfig = NAVIGATION_PRESETS[preset] || {};
  
  // Combinar preset con parámetros personalizados
  const finalParams = {
    ...presetConfig,
    ...customParams
  };
  
  // console.log(`🧭 Navegando a AddressFormUberStyle con preset: ${preset}`, finalParams);
  
  navigation.navigate('AddressFormUberStyle', finalParams);
};

/**
 * Helpers específicos para cada flujo (para mayor claridad en el código)
 */

export const navigateToGuestCheckout = (navigation, params = {}) => {
  return navigateToAddressForm(navigation, 'GUEST_CHECKOUT', params);
};

export const navigateToGuestEdit = (navigation, params = {}) => {
  return navigateToAddressForm(navigation, 'GUEST_EDIT', params);
};

export const navigateToCartNew = (navigation, params = {}) => {
  return navigateToAddressForm(navigation, 'CART_NEW', params);
};

export const navigateToProfileEdit = (navigation, params = {}) => {
  return navigateToAddressForm(navigation, 'PROFILE_EDIT', params);
};

export const navigateToAddressManagerNew = (navigation, params = {}) => {
  return navigateToAddressForm(navigation, 'ADDRESS_MANAGER_NEW', params);
};

export const navigateToAddressManagerEdit = (navigation, params = {}) => {
  return navigateToAddressForm(navigation, 'ADDRESS_MANAGER_EDIT', params);
};

/**
 * Validar parámetros comunes para evitar errores
 * @param {object} params - Parámetros a validar
 * @returns {object} - {isValid: boolean, errors: string[]}
 */
export const validateAddressParams = (params) => {
  const errors = [];
  
  // Validaciones específicas
  if (params.editMode && !params.addressData && !params.userId) {
    errors.push('Modo edición requiere addressData o userId');
  }
  
  if (params.fromGuestCheckout && !params.guestEmail && !params.initialAddress) {
    errors.push('Flujo Guest requiere guestEmail o initialAddress');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Construir parámetros de regreso al mapa
 * @param {object} baseParams - Parámetros base
 * @param {object} locationData - Datos de ubicación
 * @returns {object} - Parámetros para AddressMap
 */
export const buildMapParams = (baseParams, locationData = {}) => {
  return {
    addressForm: baseParams.addressForm || {},
    selectedLocation: locationData.coordinates || { latitude: 19.4326, longitude: -99.1332 },
    userWrittenAddress: baseParams.initialAddress || '',
    fromMapSelector: baseParams.fromMapSelector || false,
    fromGuestCheckout: baseParams.fromGuestCheckout || false,
    callbackId: baseParams.callbackId,
    ...locationData
  };
};

export default {
  navigateToAddressForm,
  navigateToGuestCheckout,
  navigateToGuestEdit,
  navigateToCartNew,
  navigateToProfileEdit,
  navigateToAddressManagerNew,
  navigateToAddressManagerEdit,
  validateAddressParams,
  buildMapParams,
  NAVIGATION_PRESETS
};