// Sistema de fuentes FAMAC con auto-scaling responsivo
// ✅ UNIFICADO: Toda la app usa SF Pro/Roboto para consistencia visual
import { scaleFontSize } from '../utils/responsiveUtils';
import { Platform } from 'react-native';

// 1. Familias de fuentes disponibles
const fontFamilyHeadings = 'GreatVibes-Regular';
// ✅ Fuente principal: SF Pro (iOS) / Roboto (Android) - limpia y profesional
const fontFamilyMain = Platform.OS === 'ios' ? 'System' : 'Roboto';
const fontFamilyMainMedium = Platform.OS === 'ios' ? 'System' : 'Roboto-Medium';
const fontFamilyMainBold = Platform.OS === 'ios' ? 'System' : 'Roboto-Bold';

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
  XS: 11,
};

// 3. Exporta fuentes con escalado automático
const fonts = {
  original: fontFamilyHeadings,
  regular: fontFamilyMain,
  bold: fontFamilyMainBold,
  headingBold: 'PlayfairDisplay-Bold',

  // ✅ Precios y números - misma fuente para consistencia
  price: fontFamilyMain,
  priceBold: fontFamilyMainBold,
  numeric: fontFamilyMain,
  numericBold: fontFamilyMainBold,

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
    XS: scaleFontSize(baseSizes.XS),
  },

  // Tamaños base para referencia
  baseSize: baseSizes,

  // Estilos numéricos
  numericStyles: {
    tabular: {
      fontFamily: fontFamilyMain,
    },
    tabularBold: {
      fontFamily: fontFamilyMainBold,
    },
    proportional: {
      fontFamily: fontFamilyMain,
    },
    proportionalBold: {
      fontFamily: fontFamilyMainBold,
    },
  },
};

export default fonts;
