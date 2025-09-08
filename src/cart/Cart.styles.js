import { StyleSheet } from 'react-native';
import fonts from '../theme/fonts';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16, // base spacing
    backgroundColor: '#F2EFE4', // Crema Suave
  },
  title: {
    fontSize: fonts.size.XL, // Reducido desde XLLL (48px) a XL (30px) para mejor compatibilidad
    fontFamily: fonts.bold,
    color: '#2F2F2F', // Gris Carbón
    textAlign: 'center',
    marginBottom: 24, // escala: 24px
  },
  emptyCart: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)', // Gris Carbón @60%
    textAlign: 'center',
    marginTop: 50,
  },
  emptyCartScrollContainer: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  emptyCartContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 32,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyCartTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyCartText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyCartHighlight: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#33A744',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emptyCartSubtext: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  shopNowButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  shopNowButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // escala: 8px
  },
  name: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  deliveryTime: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 5,
  },
  timer: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27', // Dorado Campo
  },
  price: {
    fontSize: fonts.size.small, // ✅ Mantiene autoscaling
    fontFamily: fonts.price, // ✅ Nueva fuente optimizada para precios
    color: '#2F2F2F',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  button: {
    width: 44, // touch ≥44×44
    height: 44,
    backgroundColor: '#D27F27', // Dorado Campo
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  buttonText: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  quantity: {
    fontSize: fonts.size.medium, // ✅ Mantiene autoscaling
    fontFamily: fonts.numericBold, // ✅ Fuente optimizada para números
    color: '#2F2F2F',
    marginHorizontal: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 16,
  },
  deleteText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
  },
  totalContainer: {
    marginTop: 24, // escala: 24px
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  // 📊 ESTILOS DESGLOSE DE TOTAL - COMPACTO
  totalBreakdownContainer: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4, // Reducido de 8 a 4
  },
  breakdownLabel: {
    fontSize: fonts.size.medium, // Vuelta a medium para mejor legibilidad
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  breakdownAmount: {
    fontSize: fonts.size.medium, // Vuelta a medium para mejor legibilidad
    fontFamily: fonts.priceBold,
    color: '#2F2F2F',
  },
  freeShippingText: {
    color: '#33A744', // Verde para envío gratis
    fontFamily: fonts.bold,
  },
  discountLabel: {
    color: '#D27F27',
  },
  discountAmount: {
    color: '#D27F27',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8, // Reducido de 12 a 8
    marginTop: 4, // Reducido de 8 a 4
  },
  totalLabel: {
    fontSize: fonts.size.large, // Vuelta a large para que resalte
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  totalAmount: {
    fontSize: fonts.size.large, // Vuelta a large para que resalte
    fontFamily: fonts.priceBold,
    color: '#D27F27',
  },
  // Estilos compactos para info adicional
  compactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  compactItemCount: {
    fontSize: fonts.size.small, // Un poco más grande que tiny
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
  },
  compactShippingText: {
    fontSize: fonts.size.small, // Un poco más grande que tiny
    fontFamily: fonts.regular,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  totalText: {
    fontSize: fonts.size.medium, // ✅ Reducido de large a medium
    fontFamily: fonts.priceBold, // ✅ Nueva fuente bold optimizada para precios totales
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
  checkoutButton: {
    backgroundColor: '#D27F27', // Dorado Campo
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  suggestionsTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  upsellItem: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
    position: 'relative',
    overflow: 'visible',
    width: 140, // Ancho fijo para consistencia
  },
  upsellImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  upsellName: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  upsellPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.price, // ✅ Fuente optimizada para precios
    color: '#2F2F2F',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardAvoidingView: {
    width: '80%',
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    flexGrow: 1,
  },
  modalTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#8B5E3C', // Marrón Tierra
    borderRadius: 8,
    marginBottom: 16,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  disabledInput: {
    backgroundColor: '#EEE',
    color: 'rgba(47,47,47,0.6)',
  },
  blockedText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
    marginTop: -12,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addressText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    flex: 1,
  },
  addressPlaceholder: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
    flex: 1,
  },
  addressIcon: {
    fontSize: fonts.size.medium,
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#8B5E3C', // Marrón Tierra
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonSave: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#33A744', // Verde Bosque
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  modalButtonPrimary: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#D27F27', // Dorado Campo - color principal de la app
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalButtonSecondary: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#8B5E3C', // Marrón Tierra - color secundario
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalButtonPrimaryText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtonSecondaryText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  deliveryButton: {
    backgroundColor: '#D27F27',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  deliveryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deliverySummary: {
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  deliverySummaryTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  invoiceLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  
  // Estilos para el total sticky
  stickyTotalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  stickyTotalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stickyTotalLabel: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  stickyTotalPrice: {
    fontSize: fonts.size.large, // ✅ Reducido de XL a large
    fontFamily: fonts.priceBold, // ✅ Fuente optimizada para precios totales
    color: '#D27F27',
  },
  stickyTotalDetails: {
    alignItems: 'center',
  },
  stickyTotalItems: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
  },
  stickyTotalDiscount: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#33A744',
    textAlign: 'center',
    marginTop: 2,
  },
  // 📦 NUEVO: Estilos para motivación de envío
  shippingMotivationContainer: {
    backgroundColor: 'rgba(139, 94, 60, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
  },
  shippingMotivationText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  shippingMotivationSuccess: {
    color: '#33A744', // Verde para envío gratis conseguido
  },
  shippingMotivationRegular: {
    color: '#D27F27', // Naranja para motivar compra adicional
  },
  shippingCostText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
    textAlign: 'center',
    opacity: 0.8,
  },
  savedAddressText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
    fontStyle: 'italic',
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  
  // Estilos para descuentos en items del carrito
  cartDiscountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#E63946',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
    transform: [{ rotate: '8deg' }],
  },
  cartDiscountText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  priceWithDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  originalPriceStrikedCart: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountedPriceCart: {
    fontSize: fonts.size.small, // ✅ Mantiene autoscaling
    fontFamily: fonts.priceBold, // ✅ Nueva fuente bold optimizada para precios
    color: '#D27F27',
    marginRight: 8,
  },
  quantityInfoCart: {
    fontSize: fonts.size.small, // ✅ Mantiene autoscaling
    fontFamily: fonts.numeric, // ✅ Fuente optimizada para números (contiene cantidades)
    color: '#2F2F2F',
    flexShrink: 1,
  },
  
  // Estilos para descuentos en productos recomendados (upsell)
  upsellDiscountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E63946',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
    transform: [{ rotate: '12deg' }],
  },
  upsellDiscountText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  upsellPriceContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  upsellOriginalPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  upsellDiscountedPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.priceBold, // ✅ Fuente optimizada para precios con descuento
    color: '#000',
  },
  
  // Estilos para indicadores de guest
  guestIndicators: {
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderWidth: 1,
    borderColor: '#D27F27',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  guestIndicatorsTitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 8,
  },
  guestIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  guestAddressContainer: {
    flex: 1,
  },
  guestIndicatorIcon: {
    fontSize: fonts.size.medium,
    marginRight: 8,
    marginTop: 1,
  },
  guestIndicatorText: {
    flex: 1,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 18,
  },
  guestIndicatorValue: {
    fontFamily: fonts.bold,
    color: '#D27F27',
  },
  changeAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  changeAddressButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
    marginLeft: 4,
  },
  // Estilos para overlay de loading
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F2F2F',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  
  // 🐛 Estilos para caja de debug
  debugContainer: {
    backgroundColor: '#2F2F2F',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  debugHeader: {
    backgroundColor: '#FF6B35',
    padding: 12,
    alignItems: 'center',
  },
  debugTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginBottom: 2,
  },
  debugSubtitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.9)',
  },
  debugContent: {
    padding: 16,
  },
  debugSection: {
    marginBottom: 16,
  },
  debugSectionTitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FF6B35',
    marginBottom: 8,
  },
  debugText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#FFF',
    marginBottom: 4,
    lineHeight: 18,
  },
  debugValidation: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  debugValid: {
    color: '#4CAF50',
  },
  debugInvalid: {
    color: '#F44336',
  },
  
  // ✅ NUEVOS ESTILOS PARA SECCIÓN DE UBICACIÓN DE USUARIOS REGISTRADOS
  registeredUserLocationSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#2F2F2F',
    flex: 1,
  },
  changeAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  changeAddressButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#8B5E3C',
    marginLeft: 4,
  },
  userAddressText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#2F2F2F',
    marginBottom: 12,
    lineHeight: 20,
  },
  locationStatusContainer: {
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.1)',
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationStatusText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#2F2F2F',
  },
  adjustLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  adjustLocationButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#8B5E3C',
  },
  selectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#8B5E3C',
    borderRadius: 6,
  },
  selectLocationButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#FFF',
  },
  
  // ✅ ESTILOS PARA SELECTOR DE MÚLTIPLES DIRECCIONES
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
  },
  addressList: {
    maxHeight: 300,
    marginVertical: 16,
  },
  addressOption: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedAddressOption: {
    borderColor: '#33A744',
    borderWidth: 2,
    backgroundColor: 'rgba(51, 167, 68, 0.05)',
  },
  defaultAddressOption: {
    borderColor: '#D27F27',
  },
  addressOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  defaultBadgeSmall: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#D27F27',
    color: '#FFF',
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    borderRadius: 4,
  },
  addressOptionText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 20,
    marginBottom: 4,
  },
  selectedAddressText: {
    color: '#33A744',
    fontFamily: fonts.bold,
  },
  phoneTextSmall: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
  },
  modalButtonDisabled: {
    backgroundColor: '#CCC',
  },
  modalButtonDisabledText: {
    color: '#999',
  },
  singleAddressPreview: {
    borderColor: '#33A744',
    borderWidth: 2,
    backgroundColor: 'rgba(51, 167, 68, 0.05)',
    marginVertical: 16,
  },
  
  // ✅ NUEVOS ESTILOS PARA GEOCODING INTELIGENTE
  geocodingInfoContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.1)',
  },
  geocodingInfoText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47, 47, 47, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default styles;
