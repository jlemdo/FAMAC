/**
 * HOOK PERSONALIZADO PARA RESPONSIVE DESIGN FAMAC
 * Facilita el uso del sistema de responsive design en componentes
 */

import React, { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  scaleFontSize,
  scaleSpacing,
  scaleWidth,
  scaleHeight,
  getScreenSize,
  isSmallScreen,
  isLargeScreen,
  getModalDimensions,
  getCardDimensions,
  getButtonDimensions,
  getInputDimensions,
  getDeviceInfo
} from '../utils/responsiveUtils';

/**
 * Hook principal para responsive design
 * @returns {object} Utilidades y información responsive
 */
export const useResponsive = () => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });

    return () => subscription?.remove();
  }, []);

  return {
    // Información de pantalla
    screenWidth: screenData.width,
    screenHeight: screenData.height,
    screenSize: getScreenSize(),
    isSmallScreen: isSmallScreen(),
    isLargeScreen: isLargeScreen(),
    deviceInfo: getDeviceInfo(),

    // Funciones de escalado
    scale: {
      font: scaleFontSize,
      spacing: scaleSpacing,
      width: scaleWidth,
      height: scaleHeight,
    },

    // Dimensiones pre-calculadas para componentes comunes
    dimensions: {
      modal: getModalDimensions(),
      card: getCardDimensions(),
      button: (size) => getButtonDimensions(size),
      input: getInputDimensions(),
    },

    // Breakpoints helper
    breakpoint: {
      isXS: getScreenSize() === 'xs',
      isSM: getScreenSize() === 'sm',
      isMD: getScreenSize() === 'md',
      isLG: getScreenSize() === 'lg',
      isXL: getScreenSize() === 'xl',
    }
  };
};

/**
 * Hook específico para fuentes responsivas
 * @param {number} baseSize - Tamaño base de fuente
 * @returns {number} Tamaño escalado
 */
export const useResponsiveFont = (baseSize) => {
  return scaleFontSize(baseSize);
};

/**
 * Hook específico para espaciado responsivo
 * @param {number|object} spacing - Espaciado base o objeto con múltiples valores
 * @returns {number|object} Espaciado escalado
 */
export const useResponsiveSpacing = (spacing) => {
  if (typeof spacing === 'number') {
    return scaleSpacing(spacing);
  }
  
  if (typeof spacing === 'object' && spacing !== null) {
    const scaledSpacing = {};
    Object.keys(spacing).forEach(key => {
      scaledSpacing[key] = scaleSpacing(spacing[key]);
    });
    return scaledSpacing;
  }
  
  return spacing;
};

/**
 * Hook para estilos condicionales según tamaño de pantalla
 * @param {object} styles - Objeto con estilos por breakpoint
 * @returns {object} Estilo aplicable para la pantalla actual
 */
export const useResponsiveStyle = (styles) => {
  const screenSize = getScreenSize();
  
  // Orden de prioridad: específico -> menor siguiente -> base
  return styles[screenSize] || 
         styles.md || 
         styles.base || 
         styles.default || 
         {};
};

/**
 * Hook para valores condicionales según tamaño de pantalla
 * @param {object} values - Valores por breakpoint
 * @returns {any} Valor para la pantalla actual
 */
export const useResponsiveValue = (values) => {
  const screenSize = getScreenSize();
  
  if (typeof values === 'object' && values !== null) {
    return values[screenSize] || 
           values.md || 
           values.base || 
           values.default;
  }
  
  return values;
};

/**
 * Hook para layout adaptativo
 * @returns {object} Configuraciones de layout según pantalla
 */
export const useAdaptiveLayout = () => {
  const { screenSize, screenWidth } = useResponsive();
  
  const configs = {
    xs: {
      columns: 1,
      padding: scaleSpacing(12),
      margin: scaleSpacing(8),
      itemSpacing: scaleSpacing(8),
      modalWidth: '95%',
    },
    sm: {
      columns: 2,
      padding: scaleSpacing(16),
      margin: scaleSpacing(12),
      itemSpacing: scaleSpacing(12),
      modalWidth: '90%',
    },
    md: {
      columns: 2,
      padding: scaleSpacing(20),
      margin: scaleSpacing(16),
      itemSpacing: scaleSpacing(16),
      modalWidth: '85%',
    },
    lg: {
      columns: 3,
      padding: scaleSpacing(24),
      margin: scaleSpacing(20),
      itemSpacing: scaleSpacing(20),
      modalWidth: '80%',
    },
    xl: {
      columns: 4,
      padding: scaleSpacing(28),
      margin: scaleSpacing(24),
      itemSpacing: scaleSpacing(24),
      modalWidth: '70%',
    }
  };

  return configs[screenSize] || configs.md;
};

export default useResponsive;