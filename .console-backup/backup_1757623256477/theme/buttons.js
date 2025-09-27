/**
 * Sistema de Botones Centralizado FAMAC
 * Estilos extraídos del análisis - patrones repetidos 20+ veces
 */

import colors from './colors';
import spacing from './spacing';
import shadows from './shadows';
import fonts from './fonts';

const buttons = {
  // === BOTONES PRINCIPALES (extraídos del análisis) ===
  
  // Botón primario - EL MÁS USADO (aparece 15+ veces)
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.button.paddingVertical,
    paddingHorizontal: spacing.button.paddingHorizontal,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadows.small,
  },
  
  // Botón secundario/éxito - segundo más usado (aparece 10+ veces)
  secondary: {
    backgroundColor: colors.success,
    paddingVertical: spacing.button.paddingVertical,
    paddingHorizontal: spacing.button.paddingHorizontal,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadows.small,
  },
  
  // Botón outline/cancelar - tercero más usado (aparece 8+ veces)
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
    paddingVertical: spacing.button.paddingVertical,
    paddingHorizontal: spacing.button.paddingHorizontal,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  
  // === BOTONES ESPECÍFICOS ===
  
  // Botón de soporte/atención al cliente
  support: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: spacing.borderRadius.medium,
    alignItems: 'center',
    marginBottom: 24,
    ...shadows.medium,
  },
  
  // Botón de logout/cerrar sesión
  logout: {
    backgroundColor: '#6B4226',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: spacing.borderRadius.medium,
    alignItems: 'center',
    marginBottom: 24,
    ...shadows.medium,
  },
  
  // Botón de editar perfil
  edit: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    ...shadows.small,
  },
  
  // Botón de cancelar edición
  cancelEdit: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  
  // === BOTONES DE MODAL ===
  
  // Botón de enviar en modales
  modalSend: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: spacing.button.paddingVertical,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
  },
  
  // Botón de cancelar en modales
  modalCancel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
    paddingVertical: spacing.button.paddingVertical,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
  },
  
  // === ESTADOS DE BOTONES ===
  
  // Botón deshabilitado
  disabled: {
    backgroundColor: colors.disabled,
    paddingVertical: spacing.button.paddingVertical,
    paddingHorizontal: spacing.button.paddingHorizontal,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  
  // === TAMAÑOS ESPECÍFICOS ===
  
  // Botón pequeño
  small: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: spacing.borderRadius.small,
    alignItems: 'center',
  },
  
  // Botón grande
  large: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: spacing.borderRadius.medium,
    alignItems: 'center',
    minHeight: 48,
    ...shadows.medium,
  },
};

// === ESTILOS DE TEXTO PARA BOTONES ===
export const buttonText = {
  // Texto de botón primario
  primary: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.surface,
  },
  
  // Texto de botón secundario
  secondary: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.surface,
  },
  
  // Texto de botón outline
  outline: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.secondary,
  },
  
  // Texto de botón deshabilitado
  disabled: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.placeholder,
  },
  
  // Texto de botón pequeño
  small: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: colors.surface,
  },
  
  // Texto de botón de edición
  edit: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: colors.secondary,
  },
  
  // Texto de botón de cancelar edición
  cancelEdit: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: colors.error,
  },
};

export default buttons;