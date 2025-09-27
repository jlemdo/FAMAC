/**
 * Sistema de Sombras Centralizado FAMAC
 * Configuraciones extraídas del análisis - usado 25+ veces en la app
 */

const shadows = {
  // === SOMBRAS PRINCIPALES (extraídas del análisis) ===
  
  // Sombra pequeña - la MÁS USADA (aparece en 15+ lugares)
  small: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  
  // Sombra mediana - segunda más usada (aparece en 8+ lugares)
  medium: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  
  // Sombra grande - para modales (aparece en 6+ lugares)
  large: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  
  // === SOMBRAS ESPECÍFICAS ===
  
  // Para modales importantes
  modal: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 15,
  },
  
  // Para dropdowns (como el picker de órdenes)
  dropdown: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  
  // Para headers
  header: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  
  // === SOMBRAS TEMÁTICAS ===
  
  // Sombra con color de marca (para elementos especiales)
  primary: {
    shadowColor: '#D27F27',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  
  // Sin sombra (para reset)
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
};

// === FUNCIONES HELPER ===

/**
 * Crea una sombra personalizada
 * @param {number} elevation - Nivel de elevación (0-20)
 * @param {string} color - Color de la sombra (opcional)
 * @returns {object} Objeto de sombra
 */
export const createShadow = (elevation = 2, color = '#000') => {
  const opacity = Math.min(0.05 + (elevation * 0.01), 0.3);
  const radius = Math.max(2, elevation * 0.8);
  const offsetY = Math.max(1, elevation * 0.5);
  
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
    elevation: elevation,
  };
};

export default shadows;