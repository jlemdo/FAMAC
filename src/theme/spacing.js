/**
 * Sistema de Espaciado Centralizado FAMAC
 * Valores extraídos del análisis de componentes existentes
 */

const spacing = {
  // === ESPACIADO BÁSICO (basado en análisis real) ===
  xs: 4,      // Espacios muy pequeños
  sm: 8,      // Usado 20+ veces en la app
  md: 12,     // Usado 25+ veces en la app  
  lg: 16,     // Usado 35+ veces en la app - MÁS COMÚN
  xl: 24,     // Usado 15+ veces en la app
  xxl: 32,    // Espacios grandes
  xxxl: 40,   // Espacios muy grandes
  
  // === ESPACIADO ESPECÍFICO (valores exactos encontrados) ===
  padding: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 20,
    xxlarge: 24,
  },
  
  margin: {
    small: 8,
    medium: 12, 
    large: 16,
    xlarge: 20,
    xxlarge: 24,
  },
  
  // === BORDER RADIUS (valores más usados) ===
  borderRadius: {
    small: 8,     // Usado 22+ veces
    medium: 12,   // Usado 18+ veces
    large: 16,    // Usado 8+ veces
    round: 50,    // Para elementos circulares
  },
  
  // === ELEMENTOS ESPECÍFICOS ===
  button: {
    paddingVertical: 12,    // Estándar para botones
    paddingHorizontal: 16,  // Estándar para botones
  },
  
  input: {
    paddingVertical: 12,    // Estándar para inputs
    paddingHorizontal: 12,  // Estándar para inputs
  },
  
  card: {
    padding: 16,            // Estándar para cards
    margin: 16,             // Estándar para cards
  },
  
  modal: {
    padding: 24,            // Estándar para modales
    margin: 20,             // Estándar para modales
  }
};

export default spacing;
