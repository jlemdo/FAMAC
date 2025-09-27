// Utilidades para aplicar fontVariantNumeric a números en la app
import fonts from '../theme/fonts';

/**
 * Combina estilos de texto con configuración numérica
 * @param {object} baseStyle - Estilos base del Text
 * @param {string} variant - 'tabular' | 'proportional' 
 * @param {boolean} bold - Si usar versión bold
 * @returns {object} - Estilo combinado
 */
export const getNumericStyle = (baseStyle = {}, variant = 'tabular', bold = false) => {
  const numericStyleKey = bold ? `${variant}Bold` : variant;
  const numericStyle = fonts.numericStyles[numericStyleKey] || fonts.numericStyles.tabular;
  
  return {
    ...baseStyle,
    ...numericStyle,
  };
};

/**
 * Estilos preconfigurados para casos comunes
 */
export const numericPresets = {
  // Para precios (ej: $123.45)
  price: (baseStyle = {}) => getNumericStyle(baseStyle, 'tabular', false),
  priceBold: (baseStyle = {}) => getNumericStyle(baseStyle, 'tabular', true),
  
  // Para cantidades (ej: 5 productos)
  quantity: (baseStyle = {}) => getNumericStyle(baseStyle, 'tabular', false),
  quantityBold: (baseStyle = {}) => getNumericStyle(baseStyle, 'tabular', true),
  
  // Para IDs de orden (ej: #12345)
  orderId: (baseStyle = {}) => getNumericStyle(baseStyle, 'tabular', true),
  
  // Para números en texto (ej: "Hace 5 minutos")
  inlineNumber: (baseStyle = {}) => getNumericStyle(baseStyle, 'proportional', false),
};

/**
 * Detecta si un string contiene números y aplica estilo automáticamente
 * @param {string} text - Texto a analizar
 * @param {object} baseStyle - Estilos base
 * @returns {object} - Estilo con fontVariantNumeric si contiene números
 */
export const autoNumericStyle = (text, baseStyle = {}) => {
  const hasNumbers = /\d/.test(text);
  if (hasNumbers) {
    return getNumericStyle(baseStyle, 'tabular', false);
  }
  return baseStyle;
};