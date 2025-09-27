/**
 * SISTEMA DE ESTILOS GLOBAL FAMAC
 * Unifica todos los estilos de la aplicación en un solo lugar
 * Basado en análisis de patrones repetidos en componentes existentes
 */

import colors from './colors';
import fonts from './fonts';
import spacing from './spacing';
import shadows from './shadows';
import buttons, { buttonText } from './buttons';
import inputs, { inputContainers, inputLabels, customPickers, dropdowns } from './inputs';
import containers from './containers';
import typography from './typography';

// === THEME PRINCIPAL ===
const theme = {
    colors,
    fonts,
    spacing,
    shadows,
    buttons,
    buttonText,
    inputs,
    inputContainers,
    inputLabels,
    customPickers,
    dropdowns,
    containers,
    typography,
};

// === EXPORTS INDIVIDUALES PARA FACILITAR IMPORTACIÓN ===
export {
    colors,
    fonts,
    spacing,
    shadows,
    buttons,
    buttonText,
    inputs,
    inputContainers,
    inputLabels,
    customPickers,
    dropdowns,
    containers,
    typography,
};

// === FUNCIONES HELPER GLOBALES ===

/**
 * Combina múltiples estilos de tema de forma segura
 * @param {...object} styles - Estilos a combinar
 * @returns {object} Estilos combinados
 */
export const combineStyles = (...styles) => {
    return Object.assign({}, ...styles.filter(Boolean));
};

/**
 * Aplica variante condicional de estilo
 * @param {object} baseStyle - Estilo base
 * @param {object} variant - Estilo variante
 * @param {boolean} condition - Condición para aplicar variante
 * @returns {object} Estilo resultante
 */
export const applyVariant = (baseStyle, variant, condition) => {
    return condition ? combineStyles(baseStyle, variant) : baseStyle;
};

/**
 * Crea estilo con override personalizado
 * @param {object} themeStyle - Estilo del tema
 * @param {object} override - Override personalizado
 * @returns {object} Estilo combinado
 */
export const withOverride = (themeStyle, override = {}) => {
    return combineStyles(themeStyle, override);
};

export default theme;
