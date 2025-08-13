// Configuración global para aplicar fuente especial a todos los números automáticamente
import { Text, Platform } from 'react-native';

// Fuente especial para números
const NUMERIC_FONT = Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto';

/**
 * Detecta si un texto contiene números
 * @param {any} children - Contenido del Text component
 * @returns {boolean}
 */
const hasNumbers = (children) => {
  if (typeof children === 'string' || typeof children === 'number') {
    return /\d/.test(children.toString());
  }
  
  if (Array.isArray(children)) {
    return children.some(child => hasNumbers(child));
  }
  
  if (children && typeof children === 'object' && children.props) {
    return hasNumbers(children.props.children);
  }
  
  return false;
};

/**
 * Combina estilos preservando el estilo original y agregando fuente numérica
 * @param {any} originalStyle - Estilo original del componente
 * @returns {array} - Array de estilos combinados
 */
const combineWithNumericFont = (originalStyle) => {
  const numericStyle = {
    fontFamily: NUMERIC_FONT,
    fontVariantNumeric: ['tabular-nums'], // Números monospaced
  };
  
  if (Array.isArray(originalStyle)) {
    return [...originalStyle, numericStyle];
  } else if (originalStyle) {
    return [originalStyle, numericStyle];
  } else {
    return [numericStyle];
  }
};

/**
 * Inicializa el override global de Text para números
 * DEBE ser llamado UNA VEZ al inicio de la app
 */
export const initializeGlobalNumericFont = () => {
  // Guardar el render original
  const OriginalText = Text.render;
  
  // Override del render de Text
  Text.render = function(props, ref) {
    const { children, style, ...otherProps } = props;
    
    // Detectar si el contenido tiene números
    if (hasNumbers(children)) {
      // Aplicar fuente especial para números
      const enhancedStyle = combineWithNumericFont(style);

      
      return OriginalText.call(this, {
        ...otherProps,
        style: enhancedStyle,
        children,
      }, ref);
    }
    
    // Si no tiene números, usar comportamiento normal
    return OriginalText.call(this, props, ref);
  };
  
};

/**
 * Restaura el comportamiento original de Text (para debugging)
 */
export const disableGlobalNumericFont = () => {
  // Esto requeriría guardar la referencia original, 
  // por ahora solo mostrar advertencia
  console.warn('⚠️ Para deshabilitar, reinicia la app');
};