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
  
  // === CARDS (el patrón MÁS repetido - 15+ veces) ===
  
  // Card estándar - aparece en múltiples componentes
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.card.padding,
    marginBottom: spacing.card.margin,
    ...shadows.small,
  },
  
  // Card de orden - específico para órdenes
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  
  // Card de producto - específico para productos
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  
  // Card de perfil/información
  infoCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  
  // === MODALES (patrón muy repetido - 12+ veces) ===
  
  // Contenedor principal del modal
  modalContainer: {
    flex: 1,
  },
  
  // Overlay del modal - fondo semi-transparente
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.modal.margin,
  },
  
  // Contenido del modal
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.large,
    padding: spacing.modal.padding,
    width: '100%',
    maxWidth: 400,
    ...shadows.modal,
  },
  
  // === HEADERS ===
  
  // Header de pantalla
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.header,
  },
  
  // Header de sección
  sectionHeader: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.medium,
    marginBottom: spacing.md,
    ...shadows.small,
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