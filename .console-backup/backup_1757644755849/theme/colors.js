/**
 * Sistema de Colores Centralizado FAMAC
 * Todos los colores extraídos del análisis de componentes existentes
 */

const colors = {
  // === COLORES PRINCIPALES (extraídos del análisis) ===
  background: '#F2EFE4',      // Crema Suave - usado en 8 archivos
  surface: '#FFF',            // Blanco - usado en 8 archivos
  text: '#2F2F2F',           // Gris Carbón - usado en 8 archivos
  
  // === COLORES DE MARCA ===
  primary: '#D27F27',         // Dorado Campo - usado en 8 archivos
  secondary: '#8B5E3C',       // Marrón Tierra - usado en 8 archivos
  success: '#33A744',         // Verde Bosque - usado en 6 archivos
  
  // === COLORES FUNCIONALES ===
  error: '#E63946',           // Rojo - usado en 3 archivos
  warning: '#F77F00',         // Naranja - advertencias
  info: '#4285f4',           // Azul - información
  
  // === COLORES CON TRANSPARENCIA (extraídos del análisis) ===
  overlay: 'rgba(0, 0, 0, 0.5)',              // Modal overlay - usado en múltiples archivos
  placeholder: 'rgba(47, 47, 47, 0.6)',       // Placeholder text - usado en 8 archivos
  disabled: '#EEE',                            // Estados deshabilitados
  
  // === COLORES TEMÁTICOS ===
  theme: {
    primaryLight: 'rgba(210, 127, 39, 0.1)',   // Primary con 10% opacidad
    primaryMedium: 'rgba(210, 127, 39, 0.3)',  // Primary con 30% opacidad
    secondaryLight: 'rgba(139, 94, 60, 0.1)',  // Secondary con 10% opacidad
    successLight: 'rgba(51, 167, 68, 0.1)',    // Success con 10% opacidad
    errorLight: 'rgba(230, 57, 70, 0.1)',      // Error con 10% opacidad
  },
  
  // === COLORES ESPECÍFICOS DE ÓRDENES ===
  order: {
    pending: '#F77F00',      // Naranja - orden pendiente
    confirmed: '#4285f4',    // Azul - orden confirmada  
    preparing: '#8B5E3C',    // Marrón - orden en preparación
    delivering: '#D27F27',   // Dorado - orden en camino
    delivered: '#33A744',    // Verde - orden entregada
    cancelled: '#E63946',    // Rojo - orden cancelada
  }
};

// === FUNCIONES HELPER ===

/**
 * Obtiene el color de estado de una orden
 * @param {string} status - Estado de la orden
 * @returns {string} Color correspondiente
 */
export const getOrderStatusColor = (status) => {
  const statusLower = status?.toLowerCase() || 'pending';
  return colors.order[statusLower] || colors.order.pending;
};

export default colors;
