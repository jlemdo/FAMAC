import { StyleSheet, Dimensions, Platform } from 'react-native';
import fonts from '../theme/fonts';

const { width } = Dimensions.get('window');
const isIphoneX = Platform.OS === 'ios' && Dimensions.get('window').height >= 812;

const styles = StyleSheet.create({
  // ============================================
  // CONTENEDOR PRINCIPAL
  // ============================================
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },

  // ============================================
  // HEADER DEL CARRITO
  // ============================================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginLeft: 10,
    flex: 1,
  },
  headerBadge: {
    backgroundColor: '#D27F27',
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // ============================================
  // CARRITO VACÍO
  // ============================================
  emptyCartScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyCartContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emptyCartIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(210, 127, 39, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyCartIcon: {
    marginBottom: 20,
  },
  emptyCartTitle: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCartText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  emptyCartHighlight: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#33A744',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  shopNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D27F27',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#D27F27',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  shopNowButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // ============================================
  // RESUMEN SUPERIOR (STICKY)
  // ============================================
  totalBreakdownContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
  },
  breakdownAmount: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.priceBold,
    color: '#2F2F2F',
  },
  freeShippingText: {
    color: '#33A744',
    fontFamily: fonts.bold,
  },
  discountLabel: {
    color: '#33A744',
  },
  discountAmount: {
    color: '#33A744',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  totalAmount: {
    fontSize: fonts.size.large,
    fontFamily: fonts.priceBold,
    color: '#D27F27',
  },
  compactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  compactItemCount: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#888',
  },
  compactShippingText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  shippingMotivationSuccess: {
    color: '#33A744',
    fontFamily: fonts.bold,
  },
  shippingMotivationRegular: {
    color: '#D27F27',
    fontFamily: fonts.bold,
  },

  // ============================================
  // ITEMS DEL CARRITO
  // ============================================
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  cartDiscountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
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
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    flex: 1,
    lineHeight: 20,
  },
  priceWithDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  originalPriceStrikedCart: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountedPriceCart: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.priceBold,
    color: '#E63946',
    marginRight: 8,
  },
  price: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    marginTop: 4,
  },
  quantityInfoCart: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#888',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  button: {
    width: 36,
    height: 36,
    backgroundColor: '#D27F27',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonText: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  quantity: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  deleteButton: {
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#E63946',
  },

  // ============================================
  // PRODUCTOS SUGERIDOS (UPSELL)
  // ============================================
  suggestionsTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  upsellItem: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    width: 130,
    position: 'relative',
    overflow: 'visible',
  },
  upsellDiscountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
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
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  upsellImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  upsellName: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
    minHeight: 32,
  },
  upsellPriceContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  upsellOriginalPrice: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  upsellDiscountedPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.priceBold,
    color: '#E63946',
  },
  upsellPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.priceBold,
    color: '#D27F27',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // ============================================
  // SECCIÓN DE ENTREGA Y FACTURA
  // ============================================
  sectionContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 12,
  },
  deliveryButton: {
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderWidth: 1,
    borderColor: '#D27F27',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginLeft: 8,
  },
  deliveryScheduledContainer: {
    backgroundColor: 'rgba(51, 167, 68, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.2)',
  },
  deliveryScheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliverySummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(51, 167, 68, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.2)',
  },
  deliverySummaryTitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#33A744',
    marginLeft: 8,
  },
  deliveryTime: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    marginBottom: 2,
  },
  deliveryTimeSlot: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 4,
  },
  locationAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(51, 167, 68, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.2)',
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  invoiceRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invoiceLabel: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },

  // ============================================
  // INDICADORES GUEST
  // ============================================
  guestIndicators: {
    backgroundColor: 'rgba(210, 127, 39, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  guestIndicatorsTitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 10,
  },
  guestIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  guestAddressContainer: {
    flex: 1,
  },
  guestIndicatorIcon: {
    fontSize: fonts.size.medium,
    marginRight: 10,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  changeAddressButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
    marginLeft: 4,
  },

  // ============================================
  // UBICACIÓN USUARIO REGISTRADO
  // ============================================
  registeredUserLocationSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationSectionTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    flex: 1,
  },
  userAddressText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  locationStatusContainer: {
    backgroundColor: 'rgba(51, 167, 68, 0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.15)',
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationStatusText: {
    flex: 1,
    marginLeft: 8,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  adjustLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    borderRadius: 8,
  },
  adjustLocationButtonText: {
    marginLeft: 4,
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    color: '#8B5E3C',
  },
  selectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#8B5E3C',
    borderRadius: 8,
  },
  selectLocationButtonText: {
    marginLeft: 4,
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // ============================================
  // CUPONES
  // ============================================
  couponContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ============================================
  // PROMOCIONES AUTOMÁTICAS
  // ============================================
  automaticPromotionsContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  automaticPromotionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  automaticPromotionsTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginLeft: 8,
  },
  automaticPromotionCard: {
    backgroundColor: 'rgba(51, 167, 68, 0.06)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.15)',
  },
  automaticPromotionInfo: {
    flex: 1,
  },
  automaticPromotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  automaticPromotionName: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    flex: 1,
  },
  automaticPromotionBadge: {
    backgroundColor: '#33A744',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  automaticPromotionBadgeText: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  automaticPromotionDiscount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  automaticPromotionDiscountText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#33A744',
  },
  automaticPromotionAmount: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
  },
  automaticPromotionMinimum: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.regular,
    color: '#999',
    marginTop: 4,
  },
  birthdayMessage: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
  },

  // ============================================
  // BOTÓN DE CHECKOUT
  // ============================================
  checkoutContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  checkoutButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#D27F27',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
  },
  checkoutText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginLeft: 8,
  },
  totalText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.priceBold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 12,
  },

  // ============================================
  // MODALES
  // ============================================
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardAvoidingView: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
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
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.3)',
    borderRadius: 12,
    marginBottom: 16,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    backgroundColor: '#FAFAFA',
  },
  disabledInput: {
    backgroundColor: '#F0F0F0',
    color: '#999',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#D27F27',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#8B5E3C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#CCC',
  },
  modalButtonDisabledText: {
    color: '#999',
  },

  // ============================================
  // SELECTOR DE DIRECCIONES
  // ============================================
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
    color: '#888',
  },
  addressList: {
    maxHeight: 280,
    marginVertical: 16,
  },
  addressOption: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#D27F27',
    color: '#FFF',
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    borderRadius: 6,
    overflow: 'hidden',
  },
  addressOptionText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 20,
  },
  selectedAddressText: {
    color: '#33A744',
    fontFamily: fonts.bold,
  },
  phoneTextSmall: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.regular,
    color: '#888',
    marginTop: 4,
  },
  singleAddressPreview: {
    borderColor: '#33A744',
    borderWidth: 2,
    backgroundColor: 'rgba(51, 167, 68, 0.05)',
    marginVertical: 16,
  },

  // ============================================
  // LOADING OVERLAY
  // ============================================
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
  },

  // ============================================
  // ESTILOS LEGACY (para compatibilidad)
  // ============================================
  title: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCart: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
    textAlign: 'center',
    marginTop: 50,
  },
  timer: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
  },
  totalContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
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
    fontSize: fonts.size.large,
    fontFamily: fonts.priceBold,
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
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonSave: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#33A744',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
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

  // Debug (oculto en producción)
  debugContainer: {
    display: 'none',
  },
});

export default styles;
