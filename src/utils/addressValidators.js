/**
 * Utilidades de validación para direcciones y datos relacionados
 * Centraliza todas las validaciones repetidas en la aplicación
 */

/**
 * Validar formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si es válido
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Catálogos de alcaldías y municipios
 */
export const ALCALDIAS_CDMX = [
  'Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán',
  'Cuajimalpa', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa',
  'Magdalena Contreras', 'Miguel Hidalgo', 'Milpa Alta', 'Tláhuac',
  'Tlalpan', 'Venustiano Carranza', 'Xochimilco', 'Cuauhtémoc'
];

export const MUNICIPIOS_EDOMEX = [
  'Naucalpan', 'Tlalnepantla', 'Ecatepec', 'Nezahualcóyotl', 
  'Chimalhuacán', 'Atizapán', 'Tultitlán', 'Coacalco',
  'Cuautitlán Izcalli', 'Huixquilucan', 'Nicolás Romero', 
  'Tecámac', 'La Paz', 'Chalco', 'Ixtapaluca'
];

/**
 * Validar código postal según ciudad
 * @param {string} postalCode - Código postal
 * @param {string} city - 'CDMX' o 'Estado de México'
 * @returns {boolean} - true si es válido
 */
export const validatePostalCode = (postalCode, city) => {
  if (!postalCode || !city) return false;
  
  const cp = postalCode.trim();
  if (!/^\d{5}$/.test(cp)) return false; // Debe ser 5 dígitos
  
  if (city === 'CDMX') {
    return cp >= '01000' && cp <= '16999';
  } else if (city === 'Estado de México') {
    return cp >= '50000' && cp <= '56999';
  }
  
  return false;
};

/**
 * Mapeos especiales para nombres de alcaldías/municipios
 */
const SPECIAL_MAPPINGS = {
  'benito juarez': 'Benito Juárez',
  'gustavo a madero': 'Gustavo A. Madero',
  'cuauhtemoc': 'Cuauhtémoc',
  'miguel hidalgo': 'Miguel Hidalgo',
  'venustiano carranza': 'Venustiano Carranza',
  'neza': 'Nezahualcóyotl',
  'nezahualcoyotl': 'Nezahualcóyotl',
  'atizapan': 'Atizapán',
  'cuautitlan': 'Cuautitlán Izcalli'
};

/**
 * Mapear componente de dirección a alcaldía conocida
 * @param {string} componentName - Nombre del componente de Google Maps
 * @returns {Object|null} - {name: string, city: string} o null si no se encuentra
 */
export const mapToKnownAlcaldia = (componentName) => {
  if (!componentName) return null;
  
  const name = componentName.toLowerCase();
  
  // Estrategia 1: Coincidencia exacta
  let foundAlcaldia = ALCALDIAS_CDMX.find(a => a.toLowerCase() === name);
  if (foundAlcaldia) {
    return { name: foundAlcaldia, city: 'CDMX' };
  }
  
  let foundMunicipio = MUNICIPIOS_EDOMEX.find(m => m.toLowerCase() === name);
  if (foundMunicipio) {
    return { name: foundMunicipio, city: 'Estado de México' };
  }
  
  // Estrategia 2: Coincidencia parcial
  foundAlcaldia = ALCALDIAS_CDMX.find(a => 
    a.toLowerCase().includes(name) || name.includes(a.toLowerCase())
  );
  if (foundAlcaldia) {
    return { name: foundAlcaldia, city: 'CDMX' };
  }
  
  foundMunicipio = MUNICIPIOS_EDOMEX.find(m => 
    m.toLowerCase().includes(name) || name.includes(m.toLowerCase())
  );
  if (foundMunicipio) {
    return { name: foundMunicipio, city: 'Estado de México' };
  }
  
  // Estrategia 3: Mapeos especiales
  const specialMapping = SPECIAL_MAPPINGS[name];
  if (specialMapping) {
    const isInCDMX = ALCALDIAS_CDMX.includes(specialMapping);
    return {
      name: specialMapping,
      city: isInCDMX ? 'CDMX' : 'Estado de México'
    };
  }
  
  return null;
};

/**
 * Validar que una dirección tenga los campos mínimos requeridos
 * @param {Object} addressFields - Campos de dirección
 * @param {string} addressFields.street - Calle
 * @param {string} addressFields.exteriorNumber - Número exterior
 * @param {string} addressFields.neighborhood - Colonia
 * @param {string} addressFields.postalCode - Código postal
 * @param {string} addressFields.municipality - Alcaldía/Municipio
 * @returns {Object} - {isValid: boolean, missingFields: string[]}
 */
export const validateAddressFields = (addressFields) => {
  const required = [
    { field: 'street', name: 'Calle' },
    { field: 'exteriorNumber', name: 'Número exterior' },
    { field: 'neighborhood', name: 'Colonia' },
    { field: 'postalCode', name: 'Código postal' },
    { field: 'municipality', name: 'Alcaldía/Municipio' }
  ];
  
  const missingFields = required
    .filter(({ field }) => !addressFields[field]?.trim())
    .map(({ name }) => name);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Validar dirección completa como string
 * @param {string} address - Dirección completa
 * @returns {Object} - {isValid: boolean, reason: string}
 */
export const validateFullAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { isValid: false, reason: 'Dirección vacía o inválida' };
  }
  
  const trimmed = address.trim();
  
  if (trimmed.length < 10) {
    return { isValid: false, reason: 'Dirección muy corta' };
  }
  
  // Validar que tenga número
  if (!/\d+/.test(trimmed)) {
    return { isValid: false, reason: 'Falta número de casa/edificio' };
  }
  
  // Validar que tenga al menos 2 palabras
  if (trimmed.split(' ').length < 2) {
    return { isValid: false, reason: 'Dirección incompleta' };
  }
  
  return { isValid: true, reason: '' };
};

/**
 * Parsear componentes de dirección de Google Maps
 * @param {Array} components - address_components de Google Maps
 * @param {string} fullAddress - Dirección formateada completa
 * @param {Object} existingData - Datos existentes a preservar
 * @returns {Object} - Datos de dirección parseados
 */
export const parseAddressComponents = (components, fullAddress, existingData = {}) => {
  const addressData = {
    ...existingData,
    fullAddress: fullAddress,
  };

  components.forEach(component => {
    const types = component.types;
    
    if (types.includes('street_number')) {
      addressData.exteriorNumber = component.long_name;
    } else if (types.includes('route')) {
      addressData.street = component.long_name;
    } else if (types.includes('postal_code')) {
      addressData.postalCode = component.long_name;
      
      // Auto-detectar ciudad por código postal
      if (validatePostalCode(component.long_name, 'CDMX')) {
        addressData.city = 'CDMX';
      } else if (validatePostalCode(component.long_name, 'Estado de México')) {
        addressData.city = 'Estado de México';
      }
    } else if (
      types.includes('sublocality') || 
      types.includes('sublocality_level_1') || 
      types.includes('political') || 
      types.includes('locality') || 
      types.includes('administrative_area_level_2') || 
      types.includes('administrative_area_level_1')
    ) {
      // Intentar mapear a alcaldía/municipio conocido
      const mapped = mapToKnownAlcaldia(component.long_name);
      if (mapped) {
        addressData.alcaldia = mapped.name;
        addressData.city = mapped.city;
      }
    }
  });

  return addressData;
};

/**
 * Validaciones específicas para Guest
 */
export const validateGuestData = (guestData) => {
  const errors = [];
  
  if (!guestData.email?.trim()) {
    errors.push('Email requerido');
  } else if (!validateEmail(guestData.email)) {
    errors.push('Email inválido');
  }
  
  if (!guestData.address?.trim()) {
    errors.push('Dirección requerida');
  } else {
    const addressValidation = validateFullAddress(guestData.address);
    if (!addressValidation.isValid) {
      errors.push(`Dirección: ${addressValidation.reason}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  validateEmail,
  validatePostalCode,
  validateAddressFields,
  validateFullAddress,
  validateGuestData,
  mapToKnownAlcaldia,
  parseAddressComponents,
  ALCALDIAS_CDMX,
  MUNICIPIOS_EDOMEX,
};