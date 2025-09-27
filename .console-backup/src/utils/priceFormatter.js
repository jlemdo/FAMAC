/**
 * Formatea un precio al formato estándar: 1,062.00 MN
 * @param {number|string} price - El precio a formatear
 * @returns {string} - El precio formateado
 */
export const formatPrice = (price) => {
  // Convertir a número si es string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Validar que sea un número válido
  if (isNaN(numPrice) || numPrice < 0) {
    return '0.00 MN';
  }
  
  // Formatear con comas para miles y 2 decimales
  const formatted = numPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${formatted} MN`;
};

/**
 * Formatea un precio sin la moneda (solo números)
 * @param {number|string} price - El precio a formatear
 * @returns {string} - El precio formateado sin MN
 */
export const formatPriceNumber = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice) || numPrice < 0) {
    return '0.00';
  }
  
  return numPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Función de conveniencia para precios con símbolo $
 * @param {number|string} price - El precio a formatear
 * @returns {string} - El precio formateado con $
 */
export const formatPriceWithSymbol = (price) => {
  const formatted = formatPriceNumber(price);
  return `$${formatted} MN`;
};