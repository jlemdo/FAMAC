/**
 * Sistema de Tipografía Centralizado FAMAC
 * Estilos de texto extraídos del análisis - patrones repetidos 10+ veces
 */

import colors from './colors';
import fonts from './fonts';

const typography = {
  // === TÍTULOS Y HEADERS ===
  
  // Título principal de pantalla
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.XL,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Título de sección
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.secondary,
    marginBottom: 8,
  },
  
  // Título de card/modal
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // === TEXTO PRINCIPAL ===
  
  // Texto de cuerpo estándar
  body: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    lineHeight: 22,
  },
  
  // Texto pequeño
  small: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: colors.text,
  },
  
  // Texto muy pequeño
  tiny: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.tiny,
    color: colors.placeholder,
  },
  
  // === TEXTO DE ESTADO ===
  
  // Texto de error (muy repetido)
  error: {
    color: colors.error,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  
  // Texto de éxito
  success: {
    color: colors.success,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
  },
  
  // Texto de advertencia
  warning: {
    color: colors.warning,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
  },
  
  // Placeholder (muy repetido - aparece en 8 archivos)
  placeholder: {
    color: colors.placeholder,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
  },
  
  // Texto deshabilitado
  disabled: {
    color: colors.disabled,
    fontFamily: fonts.regular,  
    fontSize: fonts.size.medium,
  },
  
  // === TEXTO ESPECÍFICO ===
  
  // Precio/dinero (resaltado)
  price: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.success,
  },
  
  // Precio grande
  priceXL: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: colors.success,
  },
  
  // ID de orden (formato especial)
  orderId: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  
  // Fecha
  date: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: colors.placeholder,
  },
  
  // Estado de orden
  status: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
  },
  
  // === TEXTO DE NAVEGACIÓN ===
  
  // Nombre de app en header
  appName: {
    fontSize: fonts.size.title,
    fontFamily: fonts.original,
    color: colors.text,
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  
  // === TEXTO DE BOTONES ===
  
  // Texto de botón principal
  buttonPrimary: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.surface,
  },
  
  // Texto de botón secundario
  buttonSecondary: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.surface,
  },
  
  // Texto de botón outline
  buttonOutline: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.secondary,
  },
  
  // === TEXTO DE LISTAS ===
  
  // Texto de ítem de lista
  listItem: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
  },
  
  // Texto de ítem seleccionado
  listItemSelected: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.secondary,
  },
  
  // === TEXTO INFORMATIVO ===
  
  // Texto de ayuda/información
  helper: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: colors.placeholder,
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // Texto de descripción
  description: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Texto de subtítulo
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: colors.placeholder,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  
  // === TEXTO ESPECIAL ===
  
  // Texto resaltado/destacado
  highlight: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Texto con énfasis
  emphasis: {
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  
  // Texto de enlace
  link: {
    fontFamily: fonts.bold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  
  // === TEXTO DE ESTADO VACÍO ===
  
  // Título de estado vacío
  emptyTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  
  // Descripción de estado vacío
  emptyDescription: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  
  // Subtexto de estado vacío
  emptySubtext: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: colors.placeholder,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
};

export default typography;