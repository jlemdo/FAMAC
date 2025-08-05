/**
 * Sistema de Espaciado Responsivo FAMAC
 * Auto-scaling basado en tamaño de pantalla - Valores extraídos del análisis
 */

import { scaleSpacing } from '../utils/responsiveUtils';

// Valores base que se escalarán automáticamente
const baseSpacing = {
  xs: 4,      // Espacios muy pequeños
  sm: 8,      // Usado 20+ veces en la app
  md: 12,     // Usado 25+ veces en la app  
  lg: 16,     // Usado 35+ veces en la app - MÁS COMÚN
  xl: 24,     // Usado 15+ veces en la app
  xxl: 32,    // Espacios grandes
  xxxl: 40,   // Espacios muy grandes
};

const spacing = {
  // === ESPACIADO BÁSICO RESPONSIVO ===
  xs: scaleSpacing(baseSpacing.xs),
  sm: scaleSpacing(baseSpacing.sm),
  md: scaleSpacing(baseSpacing.md),
  lg: scaleSpacing(baseSpacing.lg),
  xl: scaleSpacing(baseSpacing.xl),
  xxl: scaleSpacing(baseSpacing.xxl),
  xxxl: scaleSpacing(baseSpacing.xxxl),
  
  // === ESPACIADO ESPECÍFICO RESPONSIVO ===
  padding: {
    small: scaleSpacing(8),
    medium: scaleSpacing(12),
    large: scaleSpacing(16),
    xlarge: scaleSpacing(20),
    xxlarge: scaleSpacing(24),
  },
  
  margin: {
    small: scaleSpacing(8),
    medium: scaleSpacing(12), 
    large: scaleSpacing(16),
    xlarge: scaleSpacing(20),
    xxlarge: scaleSpacing(24),
  },
  
  // === BORDER RADIUS RESPONSIVO ===
  borderRadius: {
    small: scaleSpacing(8),     // Usado 22+ veces
    medium: scaleSpacing(12),   // Usado 18+ veces
    large: scaleSpacing(16),    // Usado 8+ veces
    round: 50,                  // Para elementos circulares - no escalar
  },
  
  // === ELEMENTOS ESPECÍFICOS RESPONSIVOS ===
  button: {
    paddingVertical: scaleSpacing(12),    // Estándar para botones
    paddingHorizontal: scaleSpacing(16),  // Estándar para botones
  },
  
  input: {
    paddingVertical: scaleSpacing(12),    // Estándar para inputs
    paddingHorizontal: scaleSpacing(12),  // Estándar para inputs
  },
  
  card: {
    padding: scaleSpacing(16),            // Estándar para cards
    margin: scaleSpacing(16),             // Estándar para cards
  },
  
  modal: {
    padding: scaleSpacing(24),            // Estándar para modales
    margin: scaleSpacing(20),             // Estándar para modales
  },
  
  // === VALORES BASE PARA REFERENCIA ===
  base: baseSpacing,
};

export default spacing;
