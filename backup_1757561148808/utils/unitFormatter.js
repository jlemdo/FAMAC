/**
 * Utilidad para formatear y normalizar unidades de medida
 * Centraliza la lógica de conversión de unidades para mantener consistencia
 */

/**
 * Normaliza las unidades que vienen del backend
 * @param {string} unit - Unidad original del backend
 * @returns {string} - Unidad normalizada
 */
export const normalizeUnit = (unit) => {
  if (!unit) return '';
  
  const normalized = unit.toLowerCase().trim();
  
  // Normalizar variaciones comunes
  switch (normalized) {
    case 'gr':
    case 'GR':
      return 'gr';
    case 'pieces':
      return 'pieces'; // Mantenemos internamente, pero formateamos en display
    case 'kg':
    case 'KG':
      return 'kg';
    case 'ml':
    case 'ML':
      return 'ml';
    case 'l':
    case 'L':
      return 'L';
    default:
      return normalized;
  }
};

/**
 * Formatea la cantidad total basada en unidades y cantidad seleccionada
 * @param {number} quantity - Cantidad base del producto (ej: 250)
 * @param {string} unit - Unidad del producto (ej: 'gr', 'pieces')
 * @param {number} selectedUnits - Unidades seleccionadas por el usuario (ej: 2)
 * @returns {string} - Texto formateado (ej: "500gr", "2 piezas")
 */
export const formatQuantityWithUnit = (quantity, unit, selectedUnits = 1) => {
  const normalizedUnit = normalizeUnit(unit);
  const quantityPerUnit = parseFloat(quantity) || 1;
  
  // Para pieces: mostrar directamente las piezas seleccionadas
  if (normalizedUnit === 'pieces') {
    return selectedUnits === 1 ? '1 pieza' : `${selectedUnits} piezas`;
  }
  
  // Para peso/volumen: multiplicar quantity * selectedUnits
  const totalMeasure = quantityPerUnit * selectedUnits;
  
  switch (normalizedUnit) {
    case 'kg':
      return `${totalMeasure}kg`;
    
    case 'gr':
      // Convertir a kg si es >= 1000gr
      return totalMeasure >= 1000 
        ? `${(totalMeasure / 1000).toFixed(totalMeasure % 1000 === 0 ? 0 : 2)}kg`
        : `${totalMeasure}gr`;
    
    case 'l':
      return `${totalMeasure}l`;
    
    case 'ml':
      // Convertir a litros si es >= 1000ml
      return totalMeasure >= 1000
        ? `${(totalMeasure / 1000).toFixed(totalMeasure % 1000 === 0 ? 0 : 2)}l`
        : `${totalMeasure}ml`;
    
    default:
      // Para unidades no reconocidas, mostrar como unidades genéricas
      return selectedUnits === 1 ? '1 unidad' : `${selectedUnits} unidades`;
  }
};

/**
 * Formatea solo el peso/medida del producto para badges informativos
 * @param {number} quantity - Cantidad del producto
 * @param {string} unit - Unidad del producto
 * @returns {string} - Texto formateado para badge
 */
export const formatProductMeasure = (quantity, unit) => {
  const normalizedUnit = normalizeUnit(unit);
  const quantityNum = parseFloat(quantity) || 1;
  
  switch (normalizedUnit) {
    case 'pieces':
      return quantityNum === 1 ? '1 pieza' : `${quantityNum} piezas`;
    
    case 'kg':
      return `${quantityNum}kg`;
    
    case 'gr':
      return `${quantityNum}gr`;
    
    case 'l':
      return `${quantityNum}l`;
    
    case 'ml':
      return `${quantityNum}ml`;
    
    default:
      return `${quantityNum} ${unit || 'unidad'}`;
  }
};