import axios from 'axios';
import Config from 'react-native-config';

/**
 * Configuración de geocoding para CDMX y Estado de México
 */
const GEOCODING_CONFIG = {
  // Bounds estrictos para CDMX y Estado de México
  bounds: '19.048,-99.365|19.761,-98.877',
  
  // Componentes permitidos (solo CDMX y Estado de México)
  components: 'country:MX|locality:Ciudad de México|administrative_area:Ciudad de México|administrative_area:México',
  
  // Coordenadas por defecto (Zócalo CDMX)
  defaultCoords: {
    latitude: 19.4326,
    longitude: -99.1332,
  },
  
  // Validación de bounds
  isWithinBounds: (lat, lng) => {
    return lat >= 19.048 && lat <= 19.761 && lng >= -99.365 && lng <= -98.877;
  },
  
  // Validación de ubicación válida
  isValidLocation: (addressComponents) => {
    return addressComponents.some(component => 
      component.types.includes('administrative_area_level_1') &&
      (component.long_name.includes('Ciudad de México') || 
       component.long_name.includes('México') ||
       component.short_name === 'CDMX' ||
       component.short_name === 'MEX')
    );
  },
  
  // Validación de precisión
  isHighPrecision: (locationType) => {
    return locationType === 'ROOFTOP' || locationType === 'RANGE_INTERPOLATED';
  },
};

/**
 * Función principal de geocoding unificada
 * @param {string} address - Dirección a geocodificar
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.strictValidation - Aplicar validaciones estrictas (default: true)
 * @param {boolean} options.requireHighPrecision - Requerir alta precisión (default: true)
 * @param {boolean} options.useDefaultOnError - Usar coordenadas por defecto si falla (default: true)
 * @returns {Promise<Object|null>} - Coordenadas {latitude, longitude} o null si falla
 */
export const geocodeAddress = async (address, options = {}) => {
  const {
    strictValidation = true,
    requireHighPrecision = true,
    useDefaultOnError = true,
  } = options;

  // Validación básica de entrada
  if (!address || typeof address !== 'string' || address.trim().length < 10) {
    console.warn('⚠️ GEOCODING: Dirección muy corta o inválida:', address);
    return useDefaultOnError ? GEOCODING_CONFIG.defaultCoords : null;
  }

  // Validaciones adicionales para modo estricto
  if (strictValidation) {
    const hasStreetNumber = /\d+/.test(address);
    const hasStreetName = address.split(' ').length >= 2;
    
    if (!hasStreetNumber || !hasStreetName) {
      console.warn('⚠️ GEOCODING: Dirección incompleta (falta número o calle):', address);
      return useDefaultOnError ? GEOCODING_CONFIG.defaultCoords : null;
    }
  }

  try {
    console.log('🧠 GEOCODING iniciado para:', address.substring(0, 50) + '...');
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: `${address}, México`,
          key: Config.GOOGLE_DIRECTIONS_API_KEY,
          language: 'es',
          region: 'mx',
          bounds: GEOCODING_CONFIG.bounds,
          components: GEOCODING_CONFIG.components,
        },
      }
    );

    if (response.data.status !== 'OK' || !response.data.results.length) {
      console.warn('⚠️ GEOCODING: Sin resultados para:', address);
      return useDefaultOnError ? GEOCODING_CONFIG.defaultCoords : null;
    }

    const result = response.data.results[0];
    const location = result.geometry.location;
    
    // Validar ubicación si está habilitada la validación estricta
    if (strictValidation && !GEOCODING_CONFIG.isValidLocation(result.address_components)) {
      console.warn('⚠️ GEOCODING: Ubicación fuera de CDMX/EdoMex');
      return useDefaultOnError ? GEOCODING_CONFIG.defaultCoords : null;
    }
    
    // Validar precisión si se requiere
    if (requireHighPrecision && !GEOCODING_CONFIG.isHighPrecision(result.geometry.location_type)) {
      console.warn('⚠️ GEOCODING: Precisión insuficiente');
      return useDefaultOnError ? GEOCODING_CONFIG.defaultCoords : null;
    }
    
    const coordinates = {
      latitude: location.lat,
      longitude: location.lng,
    };
    
    // Validar bounds finales
    if (!GEOCODING_CONFIG.isWithinBounds(coordinates.latitude, coordinates.longitude)) {
      console.warn('⚠️ GEOCODING: Coordenadas fuera de bounds');
      return useDefaultOnError ? GEOCODING_CONFIG.defaultCoords : null;
    }
    
    console.log('✅ GEOCODING EXITOSO:', coordinates);
    return coordinates;

  } catch (error) {
    console.warn('❌ GEOCODING ERROR:', error.message);
    return useDefaultOnError ? GEOCODING_CONFIG.defaultCoords : null;
  }
};

/**
 * Geocoding optimizado para Guest (menos restrictivo)
 * @param {string} address - Dirección de Guest
 * @returns {Promise<Object|null>} - Coordenadas o coordenadas por defecto
 */
export const geocodeGuestAddress = async (address) => {
  return geocodeAddress(address, {
    strictValidation: false,
    requireHighPrecision: false,
    useDefaultOnError: true,
  });
};

/**
 * Geocoding estricto para formularios (más restrictivo)
 * @param {string} address - Dirección del formulario
 * @returns {Promise<Object|null>} - Coordenadas o null si no cumple criterios
 */
export const geocodeFormAddress = async (address) => {
  return geocodeAddress(address, {
    strictValidation: true,
    requireHighPrecision: true,
    useDefaultOnError: false,
  });
};

/**
 * Converter coordenadas al formato usado en Cart.jsx
 * @param {Object} coords - {latitude, longitude}
 * @returns {Object} - {driver_lat, driver_long}
 */
export const convertToDriverCoords = (coords) => {
  if (!coords) return null;
  return {
    driver_lat: coords.latitude,
    driver_long: coords.longitude,
  };
};

/**
 * Converter coordenadas del formato Cart.jsx al estándar
 * @param {Object} driverCoords - {driver_lat, driver_long}
 * @returns {Object} - {latitude, longitude}
 */
export const convertFromDriverCoords = (driverCoords) => {
  if (!driverCoords) return null;
  return {
    latitude: driverCoords.driver_lat,
    longitude: driverCoords.driver_long,
  };
};

export default {
  geocodeAddress,
  geocodeGuestAddress,
  geocodeFormAddress,
  convertToDriverCoords,
  convertFromDriverCoords,
  GEOCODING_CONFIG,
};