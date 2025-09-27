// Sistema de fuentes FAMAC con auto-scaling responsivo
import { scaleFontSize } from '../utils/responsiveUtils';
import { Platform } from 'react-native';

// 1. Familias de fuentes disponibles
const fontFamilyHeadings = 'GreatVibes-Regular';
const fontFamilyParagraph = 'Raleway';
const fontFamilyPrices = Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto'; // ✅ Fuente optimizada para precios

// 2. Tamaños base (se escalan automáticamente según pantalla)
const baseSizes = {
  tiny: 10,
  small: 12,
  medium: 16,
  large: 20,
  extraLarge: 24,
  XL: 30,
  XLL: 36,
  XLLL: 48,
  title: 25,
};

// 3. Exporta fuentes con escalado automático
const fonts = {
  original: fontFamilyHeadings,
  regular: `${fontFamilyParagraph}-Medium`,
  bold: `${fontFamilyParagraph}-Medium`,
  headingBold: 'PlayfairDisplay-Bold',
  
  // ✅ NUEVA: Fuentes especializadas para números (perfectos y consistentes)
  price: fontFamilyPrices,
  priceBold: Platform.OS === 'ios' ? 'SF Pro Display-Semibold' : 'Roboto-Medium',
  
  // ✅ Para TODOS los números (cantidades, teléfonos, fechas, IDs, etc.)
  numeric: fontFamilyPrices, // Misma fuente que precios para consistencia
  numericBold: Platform.OS === 'ios' ? 'SF Pro Display-Semibold' : 'Roboto-Medium',
  
  // Tamaños responsivos - se calculan dinámicamente
  size: {
    tiny: scaleFontSize(baseSizes.tiny),
    small: scaleFontSize(baseSizes.small),
    medium: scaleFontSize(baseSizes.medium),
    large: scaleFontSize(baseSizes.large),
    extraLarge: scaleFontSize(baseSizes.extraLarge),
    XL: scaleFontSize(baseSizes.XL),
    XLL: scaleFontSize(baseSizes.XLL),
    XLLL: scaleFontSize(baseSizes.XLLL),
    title: scaleFontSize(baseSizes.title),
  },
  
  // Tamaños base para referencia (no usar directamente en componentes)
  baseSize: baseSizes,
  
  // ✅ NUEVO: Estilos específicos para números con fontVariantNumeric
  numericStyles: {
    // Para números monospaced (precios, cantidades, IDs)
    tabular: {
      fontFamily: fontFamilyPrices,
      fontVariantNumeric: ['tabular-nums'],
    },
    tabularBold: {
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Display-Semibold' : 'Roboto-Medium',
      fontVariantNumeric: ['tabular-nums'],
    },
    // Para números proporcionales (cuando sea necesario)
    proportional: {
      fontFamily: fontFamilyPrices,
      fontVariantNumeric: ['proportional-nums'],
    },
    proportionalBold: {
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Display-Semibold' : 'Roboto-Medium',
      fontVariantNumeric: ['proportional-nums'],
    },
  },
};

export default fonts;
