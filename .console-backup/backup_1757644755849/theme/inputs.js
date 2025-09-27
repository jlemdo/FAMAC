/**
 * Sistema de Inputs/Formularios Centralizado FAMAC
 * Estilos extraídos del análisis - patrones repetidos 18+ veces
 */

import colors from './colors';
import spacing from './spacing';
import fonts from './fonts';

const inputs = {
  // === INPUT ESTÁNDAR (el MÁS USADO - aparece en 6 archivos) ===
  standard: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.input.paddingHorizontal,
    marginBottom: spacing.md, // ESPACIADO AGREGADO
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  
  // Input sin margin (para cuando tiene error)
  standardNoMargin: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.input.paddingHorizontal,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    backgroundColor: colors.surface,
    // Sin marginBottom - el error text se encarga del espaciado
  },
  
  // Input con error sin margin (para cuando tiene error)
  errorNoMargin: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.input.paddingHorizontal,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    backgroundColor: colors.surface,
    // Sin marginBottom - el error text se encarga del espaciado
  },
  
  // === VARIANTES DE INPUTS ===
  
  // Input con error de validación
  error: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.input.paddingHorizontal,
    marginBottom: spacing.md, // ESPACIADO AGREGADO
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  
  // Input deshabilitado
  disabled: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.input.paddingHorizontal,
    marginBottom: spacing.md, // ESPACIADO AGREGADO
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.placeholder,
    backgroundColor: colors.disabled,
  },
  
  // TextArea (input multilinea)
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.input.paddingHorizontal,
    paddingVertical: spacing.input.paddingVertical,
    marginBottom: spacing.md, // ESPACIADO AGREGADO
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
  
  // TextArea sin margin (para cuando tiene error)
  textAreaNoMargin: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.input.paddingHorizontal,
    paddingVertical: spacing.input.paddingVertical,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
    // Sin marginBottom - el error text se encarga del espaciado
  },
  
  // === INPUTS ESPECÍFICOS ===
  
  // Input de búsqueda
  search: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: spacing.borderRadius.medium,
    paddingHorizontal: spacing.input.paddingHorizontal,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    backgroundColor: '#FAFAFA',
  },
  
  // Input de modal
  modal: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: spacing.borderRadius.small,
    paddingHorizontal: spacing.input.paddingHorizontal,
    marginBottom: spacing.md, // ESPACIADO AGREGADO
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    backgroundColor: colors.surface,
  },
};

// === CONTENEDORES DE INPUTS ===
export const inputContainers = {
  // Contenedor estándar de input
  standard: {
    marginBottom: spacing.lg,
  },
  
  // Contenedor de input en fila (para inputs lado a lado)
  row: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  
  // Contenedor de input en modal
  modal: {
    marginBottom: spacing.lg,
  },
};

// === LABELS Y TEXTOS ===
export const inputLabels = {
  // Label estándar
  standard: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  // Label pequeño
  small: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  // Label de modal
  modal: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  // Texto de error
  error: {
    color: colors.error,
    fontSize: fonts.size.small,
    marginTop: 4,
    marginBottom: spacing.md, // Se encarga del espaciado al siguiente elemento
    fontFamily: fonts.regular,
  },
  
  // Texto de ayuda
  helper: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: colors.placeholder,
    marginTop: 4,
    textAlign: 'center',
  },
};

// === PICKERS PERSONALIZADOS ===
export const customPickers = {
  // Selector personalizado (como el de órdenes)
  standard: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: spacing.borderRadius.small,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.input.paddingHorizontal,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  
  // Texto del picker
  text: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
    flex: 1,
  },
  
  // Placeholder del picker
  placeholder: {
    color: colors.placeholder,
  },
  
  // Flecha del picker
  arrow: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  
  // Wrapper del selector (para z-index)
  wrapper: {
    position: 'relative',
    zIndex: 99999,
  },
  
  // Wrapper expandido (con espacio para dropdown)
  wrapperExpanded: {
    marginBottom: 160,
  },
};

// === DROPDOWNS ===
export const dropdowns = {
  // Dropdown estándar
  standard: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderTopWidth: 0,
    borderRadius: spacing.borderRadius.small,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    backgroundColor: colors.surface,
    maxHeight: 150,
    zIndex: 999999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    marginTop: 1,
  },
  
  // Opción de dropdown
  option: {
    paddingHorizontal: spacing.input.paddingHorizontal,
    paddingVertical: spacing.input.paddingVertical,
    borderBottomWidth: 1,
    borderBottomColor: colors.theme.secondaryLight,
  },
  
  // Opción seleccionada
  optionSelected: {
    backgroundColor: colors.theme.secondaryLight,
  },
  
  // Texto de opción
  optionText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: colors.text,
  },
  
  // Texto de opción seleccionada
  optionTextSelected: {
    fontFamily: fonts.bold,
    color: colors.secondary,
  },
};

export default inputs;