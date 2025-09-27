/**
 * SISTEMA DE RESPONSIVE DESIGN Y AUTO-SCALING FAMAC 2025
 * Herramientas para adaptar dimensiones automáticamente según el tamaño de pantalla
 * Compatible con iPhone SE hasta iPhone 15 Pro Max y Android diversos
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

// === CONFIGURACIÓN DE DIMENSIONES BASE ===
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensiones de referencia (iPhone 12 - pantalla común donde funciona bien)
const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;

// === UTILIDADES DE ESCALADO ===

/**
 * Escala horizontal basada en el ancho de pantalla
 * @param {number} size - Tamaño original
 * @returns {number} Tamaño escalado
 */
export const scaleWidth = (size) => {
  const scale = SCREEN_WIDTH / REFERENCE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Escala vertical basada en la altura de pantalla
 * @param {number} size - Tamaño original
 * @returns {number} Tamaño escalado
 */
export const scaleHeight = (size) => {
  const scale = SCREEN_HEIGHT / REFERENCE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Escala moderada para fuentes - más conservadora para mejor legibilidad
 * @param {number} fontSize - Tamaño de fuente original
 * @returns {number} Tamaño de fuente escalado
 */
export const scaleFontSize = (fontSize) => {
  const scale = Math.min(SCREEN_WIDTH / REFERENCE_WIDTH, SCREEN_HEIGHT / REFERENCE_HEIGHT);
  // Limitamos el escalado entre 0.75 y 1.35 para evitar fuentes muy pequeñas o muy grandes
  const constrainedScale = Math.max(0.75, Math.min(1.35, scale));
  return Math.round(PixelRatio.roundToNearestPixel(fontSize * constrainedScale));
};

/**
 * Escala espaciado (padding, margin) de forma balanceada
 * @param {number} spacing - Espaciado original
 * @returns {number} Espaciado escalado
 */
export const scaleSpacing = (spacing) => {
  const scale = Math.min(SCREEN_WIDTH / REFERENCE_WIDTH, SCREEN_HEIGHT / REFERENCE_HEIGHT);
  // Escalado más suave para espaciados
  const constrainedScale = Math.max(0.8, Math.min(1.25, scale));
  return Math.round(PixelRatio.roundToNearestPixel(spacing * constrainedScale));
};

// === BREAKPOINTS PARA PANTALLAS ===

export const BREAKPOINTS = {
  // iPhone SE, iPhone 5/5s - pantallas muy pequeñas
  xs: { width: 320, height: 568 },
  // iPhone 6/7/8, iPhone SE 2020 - pantallas pequeñas
  sm: { width: 375, height: 667 },
  // iPhone 12/13/14, iPhone 6/7/8 Plus - pantallas medianas
  md: { width: 390, height: 844 },
  // iPhone 12/13/14 Pro Max - pantallas grandes
  lg: { width: 428, height: 926 },
  // Tablets - pantallas extra grandes
  xl: { width: 768, height: 1024 }
};

/**
 * Detecta el tipo de pantalla actual
 * @returns {string} Tamaño de pantalla (xs, sm, md, lg, xl)
 */
export const getScreenSize = () => {
  if (SCREEN_WIDTH <= BREAKPOINTS.xs.width) return 'xs';
  if (SCREEN_WIDTH <= BREAKPOINTS.sm.width) return 'sm';
  if (SCREEN_WIDTH <= BREAKPOINTS.md.width) return 'md';
  if (SCREEN_WIDTH <= BREAKPOINTS.lg.width) return 'lg';
  return 'xl';
};

/**
 * Verifica si es una pantalla pequeña (iPhone SE, mini devices)
 * @returns {boolean}
 */
export const isSmallScreen = () => {
  return SCREEN_WIDTH <= BREAKPOINTS.sm.width || SCREEN_HEIGHT <= BREAKPOINTS.sm.height;
};

/**
 * Verifica si es una pantalla grande (Pro Max, tablets)
 * @returns {boolean}
 */
export const isLargeScreen = () => {
  return SCREEN_WIDTH >= BREAKPOINTS.lg.width;
};

// === UTILIDADES DE PLATAFORMA ===

/**
 * Aplica estilos específicos por plataforma con escalado
 * @param {object} iosStyle - Estilos para iOS
 * @param {object} androidStyle - Estilos para Android
 * @returns {object} Estilos escalados según plataforma
 */
export const platformStyles = (iosStyle = {}, androidStyle = {}) => {
  const baseStyle = Platform.OS === 'ios' ? iosStyle : androidStyle;
  
  // Escalar dimensiones en los estilos
  const scaledStyle = {};
  Object.keys(baseStyle).forEach(key => {
    const value = baseStyle[key];
    
    if (typeof value === 'number') {
      // Escalar propiedades de dimensión
      if (key.includes('fontSize')) {
        scaledStyle[key] = scaleFontSize(value);
      } else if (key.includes('padding') || key.includes('margin') || 
                 key.includes('width') || key.includes('height') ||
                 key.includes('borderRadius')) {
        scaledStyle[key] = scaleSpacing(value);
      } else {
        scaledStyle[key] = value;
      }
    } else {
      scaledStyle[key] = value;
    }
  });
  
  return scaledStyle;
};

// === UTILIDADES PARA COMPONENTES ESPECÍFICOS ===

/**
 * Calcula dimensiones responsivas para modales
 * @returns {object} Dimensiones del modal
 */
export const getModalDimensions = () => {
  const screenSize = getScreenSize();
  
  switch (screenSize) {
    case 'xs':
      return {
        width: SCREEN_WIDTH * 0.95,
        maxHeight: SCREEN_HEIGHT * 0.85,
        padding: scaleSpacing(16)
      };
    case 'sm':
      return {
        width: SCREEN_WIDTH * 0.92,
        maxHeight: SCREEN_HEIGHT * 0.8,
        padding: scaleSpacing(20)
      };
    case 'md':
      return {
        width: SCREEN_WIDTH * 0.9,
        maxHeight: SCREEN_HEIGHT * 0.75,
        padding: scaleSpacing(24)
      };
    default:
      return {
        width: SCREEN_WIDTH * 0.85,
        maxHeight: SCREEN_HEIGHT * 0.7,
        padding: scaleSpacing(28)
      };
  }
};

/**
 * Calcula dimensiones responsivas para cards
 * @returns {object} Dimensiones de la card
 */
export const getCardDimensions = () => {
  return {
    padding: scaleSpacing(16),
    margin: scaleSpacing(12),
    borderRadius: scaleSpacing(12),
    minHeight: scaleHeight(80)
  };
};

/**
 * Calcula dimensiones responsivas para botones
 * @param {string} size - Tamaño del botón ('small', 'medium', 'large')
 * @returns {object} Dimensiones del botón
 */
export const getButtonDimensions = (size = 'medium') => {
  const sizes = {
    small: {
      paddingVertical: scaleSpacing(8),
      paddingHorizontal: scaleSpacing(16),
      fontSize: scaleFontSize(14),
      borderRadius: scaleSpacing(8)
    },
    medium: {
      paddingVertical: scaleSpacing(12),
      paddingHorizontal: scaleSpacing(24),
      fontSize: scaleFontSize(16),
      borderRadius: scaleSpacing(12)
    },
    large: {
      paddingVertical: scaleSpacing(16),
      paddingHorizontal: scaleSpacing(32),
      fontSize: scaleFontSize(18),
      borderRadius: scaleSpacing(16)
    }
  };
  
  return sizes[size] || sizes.medium;
};

/**
 * Calcula dimensiones responsivas para inputs
 * @returns {object} Dimensiones del input
 */
export const getInputDimensions = () => {
  return {
    paddingVertical: scaleSpacing(12),
    paddingHorizontal: scaleSpacing(16),
    fontSize: scaleFontSize(16),
    borderRadius: scaleSpacing(8),
    minHeight: scaleHeight(48)
  };
};

// === INFORMACIÓN DEL DISPOSITIVO ===

/**
 * Obtiene información completa del dispositivo y pantalla
 * @returns {object} Información del dispositivo
 */
export const getDeviceInfo = () => {
  return {
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    screenSize: getScreenSize(),
    isSmallScreen: isSmallScreen(),
    isLargeScreen: isLargeScreen(),
    platform: Platform.OS,
    pixelRatio: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale()
  };
};

// === HOOKS PARA REACT ===

/**
 * Hook para obtener dimensiones actualizadas de la pantalla
 * Útil para reaccionar a cambios de orientación
 */
export const useScreenDimensions = () => {
  const [screenData, setScreenData] = React.useState(Dimensions.get('window'));

  React.useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  return {
    ...screenData,
    screenSize: getScreenSize(),
    isSmallScreen: isSmallScreen(),
    isLargeScreen: isLargeScreen()
  };
};

// === FUNCIONES DE COMPATIBILIDAD ===

/**
 * Función legacy para mantener compatibilidad con código existente
 * Convierte tamaños fijos a responsivos gradualmente
 */
export const normalize = scaleFontSize; // Alias para mantener compatibilidad

/**
 * Calcula línea de altura responsiva basada en fontSize
 * @param {number} fontSize - Tamaño de fuente
 * @returns {number} Altura de línea recomendada
 */
export const getResponsiveLineHeight = (fontSize) => {
  const scaledFontSize = scaleFontSize(fontSize);
  return Math.round(scaledFontSize * 1.4); // Factor 1.4 para buena legibilidad
};

export default {
  scaleWidth,
  scaleHeight,
  scaleFontSize,
  scaleSpacing,
  getScreenSize,
  isSmallScreen,
  isLargeScreen,
  platformStyles,
  getModalDimensions,
  getCardDimensions,
  getButtonDimensions,
  getInputDimensions,
  getDeviceInfo,
  normalize,
  getResponsiveLineHeight
};