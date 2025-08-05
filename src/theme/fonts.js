// Sistema de fuentes FAMAC con auto-scaling responsivo
import { scaleFontSize } from '../utils/responsiveUtils';

// 1. Familias de fuentes disponibles
const fontFamilyHeadings = 'GreatVibes-Regular';
const fontFamilyParagraph = 'Raleway';

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
};

export default fonts;
