/**
 * Sistema de Contenedores Centralizado FAMAC
 * Cards, modales, contenedores - patrones repetidos 15+ veces
 */

import colors from './colors';
import spacing from './spacing';
import shadows from './shadows';

const containers = {
  // === CONTENEDORES PRINCIPALES ===
  
  // Contenedor principal de pantalla
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Contenido con scroll
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  
  // === CARDS - Diseño profesional ===

  // Card estándar - aparece en múltiples componentes
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.card.padding,
    marginBottom: spacing.card.margin,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Card de orden - específico para órdenes
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Card de producto - específico para productos
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Card de perfil/información
  infoCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  
  // === MODALES - Diseño profesional ===

  // Contenedor principal del modal
  modalContainer: {
    flex: 1,
  },

  // Overlay del modal - fondo semi-transparente
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.modal.margin,
  },

  // Contenido del modal
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.modal.padding,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  
  // === HEADERS - Diseño profesional ===

  // Header de pantalla
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Header de sección
  sectionHeader: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  
  // === CONTENEDORES ESPECÍFICOS ===
  
  // Contenedor de botones en fila
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.theme.secondaryLight,
  },
  
  // Contenedor de botones en modal
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  
  // Contenedor de información de orden
  orderInfo: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  
  // Contenedor de elementos en fila
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  // === CONTENEDORES DE ESTADO ===
  
  // Contenedor de mensaje vacío
  emptyState: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    padding: spacing.xl,
    borderRadius: spacing.borderRadius.medium,
    alignItems: 'center',
    ...shadows.small,
  },
  
  // Contenedor de carga
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  
  // Contenedor de error
  errorContainer: {
    backgroundColor: colors.theme.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  
  // === CONTENEDORES DE LISTA ===
  
  // Ítem de lista
  listItem: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.theme.secondaryLight,
  },
  
  // Último ítem de lista (sin borde inferior)
  listItemLast: {
    borderBottomWidth: 0,
  },
  
  // === CONTENEDORES ESPECIALES ===
  
  // Contenedor de imagen de producto
  productImageContainer: {
    width: 50,
    height: 50,
    borderRadius: spacing.borderRadius.small,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  
  // Contenedor de avatar/perfil
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  
  // Contenedor de categorías (circular)
  categoryContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    ...shadows.small,
  },
  
  // === SEPARADORES ===
  
  // Separador horizontal
  separator: {
    height: 1,
    backgroundColor: colors.theme.secondaryLight,
    marginVertical: spacing.lg,
  },
  
  // Separador con espacio
  spacedSeparator: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.theme.secondaryLight,
  },
};

export default containers;