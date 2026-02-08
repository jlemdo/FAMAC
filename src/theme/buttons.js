/**
 * Sistema de Botones Centralizado FAMAC
 * Estilos extraídos del análisis - patrones repetidos 20+ veces
 */

import colors from './colors';
import spacing from './spacing';
import shadows from './shadows';
import fonts from './fonts';

const buttons = {
  // === BOTONES PRINCIPALES - Diseño profesional ===

  // Botón primario - EL MÁS USADO
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.button.paddingHorizontal,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    // Sombra naranja profesional
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Botón secundario/éxito
  secondary: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: spacing.button.paddingHorizontal,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  // Botón outline/cancelar - estilo tenue
  outline: {
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderWidth: 2,
    borderColor: colors.secondary,
    paddingVertical: 16,
    paddingHorizontal: spacing.button.paddingHorizontal,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  
  // === BOTONES ESPECÍFICOS - Diseño profesional ===

  // Botón de soporte/atención al cliente
  support: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  // Botón de logout/cerrar sesión
  logout: {
    backgroundColor: '#6B4226',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6B4226',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  // Botón de editar perfil - estilo pill profesional
  edit: {
    backgroundColor: 'rgba(210, 127, 39, 0.08)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },

  // Botón de cancelar edición
  cancelEdit: {
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
    borderWidth: 1.5,
    borderColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  
  // === BOTONES DE MODAL - Diseño profesional ===

  // Botón de enviar en modales
  modalSend: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  // Botón de cancelar en modales
  modalCancel: {
    flex: 1,
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderWidth: 1.5,
    borderColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  // === ESTADOS DE BOTONES ===

  // Botón deshabilitado
  disabled: {
    backgroundColor: colors.disabled,
    paddingVertical: 16,
    paddingHorizontal: spacing.button.paddingHorizontal,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },

  // === TAMAÑOS ESPECÍFICOS ===

  // Botón pequeño
  small: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },

  // Botón grande
  large: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 56,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: fonts.size.medium,
    color: colors.primary,
  },

  // Texto de botón de cancelar edición
  cancelEdit: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: colors.error,
  },
};

export default buttons;