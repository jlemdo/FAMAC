/**
 * Validador de códigos postales para zonas de entrega
 * FAMAC - Sistema de validación por CP específicos
 */

// 📍 ZONAS DE ENTREGA PERMITIDAS
// Puedes actualizar estos rangos según las zonas donde quieras entregar
const ALLOWED_POSTAL_CODES = {
  // 🏙️ CDMX - Alcaldías seleccionadas
  CDMX: {
    // Benito Juárez
    '03100': 'Benito Juárez - Del Valle Centro',
    '03103': 'Benito Juárez - Del Valle Norte',
    '03104': 'Benito Juárez - Del Valle Sur',
    '03200': 'Benito Juárez - Acacias',
    '03300': 'Benito Juárez - Portales Norte',
    '03400': 'Benito Juárez - Álamos',
    
    // Miguel Hidalgo
    '11000': 'Miguel Hidalgo - Anzures',
    '11100': 'Miguel Hidalgo - Polanco',
    '11200': 'Miguel Hidalgo - Reforma Social',
    '11300': 'Miguel Hidalgo - Ampliación Granada',
    
    // Cuauhtémoc
    '06000': 'Cuauhtémoc - Centro Histórico',
    '06100': 'Cuauhtémoc - Centro',
    '06140': 'Cuauhtémoc - Tabacalera',
    '06200': 'Cuauhtémoc - Tlatelolco',
    '06300': 'Cuauhtémoc - Doctores',
    '06400': 'Cuauhtémoc - Obrera',
    '06500': 'Cuauhtémoc - Algarin',
    
    // Álvaro Obregón
    '01000': 'Álvaro Obregón - San Ángel',
    '01100': 'Álvaro Obregón - San Ángel Inn',
    '01200': 'Álvaro Obregón - Tlacopac',
    '01300': 'Álvaro Obregón - Santa María Nonoalco',
    
    // Coyoacán
    '04000': 'Coyoacán - Villa Coyoacán',
    '04100': 'Coyoacán - Del Carmen',
    '04200': 'Coyoacán - Copilco Universidad',
    '04300': 'Coyoacán - Copilco',
    '04400': 'Coyoacán - Pedregal de Santa Úrsula',
  },
  
  // 🏘️ ESTADO DE MÉXICO - Municipios seleccionados
  EDOMEX: {
    // Naucalpan
    '53000': 'Naucalpan - Centro',
    '53100': 'Naucalpan - San Bartolomé Naucalpan',
    '53200': 'Naucalpan - Echegaray',
    
    // Tlalnepantla
    '54000': 'Tlalnepantla - Centro',
    '54030': 'Tlalnepantla - Hab San Javier',
    '54040': 'Tlalnepantla - Hab Valle Dorado',
    
    // Atizapán de Zaragoza
    '52900': 'Atizapán - Centro',
    '52930': 'Atizapán - Condado de Sayavedra',
    '52977': 'Atizapán - Lomas Lindas',
  }
};

// 🎯 FUNCIÓN PRINCIPAL: Validar código postal
export const validatePostalCode = (postalCode) => {
  // Validación básica
  if (!postalCode || typeof postalCode !== 'string') {
    return {
      isValid: false,
      error: 'MISSING_POSTAL_CODE',
      message: 'El código postal es obligatorio'
    };
  }
  
  // Limpiar y validar formato
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
  
  // Verificar si está en zonas permitidas (CDMX o EdoMex)
  const locationInfo = getPostalCodeInfo(cleanCP);
  
  if (!locationInfo) {
    return {
      isValid: false,
      error: 'DELIVERY_NOT_AVAILABLE',
      message: 'Lo sentimos, solo entregamos en CDMX y Estado de México',
      suggestion: 'Códigos postales válidos: CDMX (01000-16999) o EdoMex (50000-57999)'
    };
  }
  
  return {
    isValid: true,
    postalCode: cleanCP,
    location: locationInfo
  };
};

// 📍 FUNCIÓN: Obtener información de un código postal (LÓGICA SIMPLIFICADA - VALIDACIÓN DE ZONA DESACTIVADA)
export const getPostalCodeInfo = (postalCode) => {
  const cleanCP = postalCode?.trim();
  
  // No procesar si el CP está vacío o no tiene el formato correcto
  if (!cleanCP || !/^\d{5}$/.test(cleanCP)) {
    return null;
  }

  // Devolver una respuesta genérica exitosa para cualquier CP de 5 dígitos
  return {
    state: 'CDMX', // Se mantiene un valor por defecto para compatibilidad
    zone: 'Zona General',
    description: 'Zona de entrega válida',
    deliveryAvailable: true
  };
};

// 📋 FUNCIÓN: Obtener todos los códigos postales permitidos
export const getAllowedPostalCodes = () => {
  const allCodes = [];
  
  Object.keys(ALLOWED_POSTAL_CODES.CDMX).forEach(cp => {
    allCodes.push({
      code: cp,
      state: 'CDMX',
      description: ALLOWED_POSTAL_CODES.CDMX[cp]
    });
  });
  
  Object.keys(ALLOWED_POSTAL_CODES.EDOMEX).forEach(cp => {
    allCodes.push({
      code: cp,
      state: 'Estado de México', 
      description: ALLOWED_POSTAL_CODES.EDOMEX[cp]
    });
  });
  
  return allCodes;
};

// 🔧 FUNCIÓN: Agregar nuevos códigos postales (para administración futura)
export const addPostalCode = (postalCode, state, description) => {
  const cleanCP = postalCode?.trim();
  const stateKey = state === 'CDMX' ? 'CDMX' : 'EDOMEX';
  
  if (cleanCP && /^\d{5}$/.test(cleanCP) && description) {
    ALLOWED_POSTAL_CODES[stateKey][cleanCP] = description;
    return true;
  }
  
  return false;
};

// 📊 FUNCIÓN: Obtener estadísticas de cobertura
export const getCoverageStats = () => {
  const cdmxCount = Object.keys(ALLOWED_POSTAL_CODES.CDMX).length;
  const edomexCount = Object.keys(ALLOWED_POSTAL_CODES.EDOMEX).length;
  
  return {
    total: cdmxCount + edomexCount,
    cdmx: cdmxCount,
    edomex: edomexCount,
    coverage: {
      'CDMX': Object.keys(ALLOWED_POSTAL_CODES.CDMX),
      'Estado de México': Object.keys(ALLOWED_POSTAL_CODES.EDOMEX)
    }
  };
};

export default {
  validatePostalCode,
  getPostalCodeInfo,
  getAllowedPostalCodes,
  addPostalCode,
  getCoverageStats
};