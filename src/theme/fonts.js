// 1. Elije la familia de fuentes que desees utilizar en la aplicación.
// Opciones disponibles: 'Quicksand', 'Raleway', 'futura', 'Wendy LP Std Medium'.
const fontFamilyHeadings = 'Raleway';
const fontFamilyParagraph = 'Raleway';

// 2. Exporta los nombres de las fuentes basados en la familia de fuentes seleccionada.
const fonts = {
  original: fontFamilyHeadings,
  regular: `${fontFamilyParagraph}-Medium`,
  bold: `${fontFamilyParagraph}-Medium`,
  // regular: `${fontFamily}-Regular`,
  // bold: `${fontFamily}-Bold`,
  size: {
    small: 12,
    medium: 16,
    large: 20,
    extraLarge: 24,
    XL: 30,
    XLL: 36,
    XLLL: 48,

  },
};

export default fonts;
