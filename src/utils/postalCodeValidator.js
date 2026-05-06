/**
 * Validador de códigos postales para zonas de entrega
 * FAMAC - Validación contra API backend
 */

import { API_BASE_URL } from '../config/environment';

const BASE_URL = `${API_BASE_URL}/api`;

// Cache de cobertura y feature status
let cachedCodes = null;
let cacheTimestamp = 0;
let cachedFeatureEnabled = null;
let featureCacheTimestamp = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

// Consultar si la feature está activa
export const fetchFeatureStatus = async () => {
  try {
    const now = Date.now();
    if (cachedFeatureEnabled !== null && (now - featureCacheTimestamp) < CACHE_DURATION) {
      return { enabled: cachedFeatureEnabled };
    }

    const response = await fetch(`${BASE_URL}/settings/postal-code-status`);
    const data = await response.json();
    cachedFeatureEnabled = data.enabled;
    featureCacheTimestamp = now;
    return { enabled: data.enabled };
  } catch (error) {
    return { enabled: false }; // fail-open: si falla, no bloquear
  }
};

// Obtener lista de CPs con cobertura (para cache local)
export const fetchCoverageFromAPI = async () => {
  try {
    const now = Date.now();
    if (cachedCodes && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedCodes;
    }

    const response = await fetch(`${BASE_URL}/postal-codes/coverage`);
    const data = await response.json();
    cachedCodes = data.postal_codes || [];
    cacheTimestamp = now;
    return cachedCodes;
  } catch (error) {
    return cachedCodes || []; // devolver cache viejo si hay, o vacío
  }
};

// Validar un CP contra el backend
export const validatePostalCodeAPI = async (cp, userId = null, guestEmail = null) => {
  try {
    let url = `${BASE_URL}/postal-codes/validate/${cp}`;
    const params = [];
    if (userId) params.push(`user_id=${userId}`);
    if (guestEmail) params.push(`guest_email=${encodeURIComponent(guestEmail)}`);
    if (params.length) url += `?${params.join('&')}`;

    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    // fail-open: si la API falla, dejar pasar
    return { valid: true, covered: true, feature_enabled: false };
  }
};

// Validar formato + cobertura
export const validatePostalCode = async (postalCode, userId = null, guestEmail = null) => {
  if (!postalCode || typeof postalCode !== 'string') {
    return {
      isValid: false,
      error: 'MISSING_POSTAL_CODE',
      message: 'El código postal es obligatorio'
    };
  }

  const cleanCP = postalCode.trim();

  if (cleanCP.length !== 5) {
    return {
      isValid: false,
      error: 'INVALID_FORMAT',
      message: 'El código postal debe tener exactamente 5 dígitos'
    };
  }

  if (!/^\d{5}$/.test(cleanCP)) {
    return {
      isValid: false,
      error: 'INVALID_CHARACTERS',
      message: 'El código postal solo puede contener números'
    };
  }

  // Consultar feature status
  const featureStatus = await fetchFeatureStatus();

  if (!featureStatus.enabled) {
    // Feature desactivada: aceptar todo
    return {
      isValid: true,
      postalCode: cleanCP,
      featureEnabled: false,
      location: { state: '', zone: '', description: '', deliveryAvailable: true }
    };
  }

  // Feature activa: validar contra API
  const result = await validatePostalCodeAPI(cleanCP, userId, guestEmail);

  if (result.covered) {
    return {
      isValid: true,
      postalCode: cleanCP,
      featureEnabled: true,
      location: result.info || { state: '', zone: '', description: '', deliveryAvailable: true }
    };
  }

  return {
    isValid: false,
    error: 'CP_NOT_COVERED',
    featureEnabled: true,
    message: 'Por el momento no contamos con cobertura en tu código postal.'
  };
};

// Obtener info de un CP desde cache
export const getPostalCodeInfo = async (postalCode) => {
  const cleanCP = postalCode?.trim();
  if (!cleanCP || !/^\d{5}$/.test(cleanCP)) return null;

  const featureStatus = await fetchFeatureStatus();

  if (!featureStatus.enabled) {
    return {
      state: '',
      zone: 'Zona General',
      description: 'Zona de entrega válida',
      deliveryAvailable: true
    };
  }

  const codes = await fetchCoverageFromAPI();
  const found = codes.find(c => c.cp === cleanCP);

  if (found) {
    return {
      state: found.state,
      municipality: found.municipality,
      neighborhood: found.neighborhood,
      zone: found.municipality,
      description: `${found.municipality} - ${found.neighborhood || ''}`.trim(),
      deliveryAvailable: true
    };
  }

  return null;
};

// Limpiar cache (útil al cambiar configuración)
export const clearPostalCodeCache = () => {
  cachedCodes = null;
  cacheTimestamp = 0;
  cachedFeatureEnabled = null;
  featureCacheTimestamp = 0;
};

export default {
  validatePostalCode,
  getPostalCodeInfo,
  fetchFeatureStatus,
  fetchCoverageFromAPI,
  validatePostalCodeAPI,
  clearPostalCodeCache
};
