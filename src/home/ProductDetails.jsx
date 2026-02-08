import React, {useState, useContext, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {CartContext} from '../context/CartContext';
import fonts from '../theme/fonts';
import {formatPriceWithSymbol} from '../utils/priceFormatter';
import {formatQuantityWithUnit} from '../utils/unitFormatter';

const { width, height } = Dimensions.get('window');
const isIphoneX = Platform.OS === 'ios' && height >= 812;

export default function ProductDetails() {
  const route = useRoute();
  const product = route.params?.productData;
  const navigation = useNavigation();
  const {addToCart} = useContext(CartContext);
  const [quantity, setQuantity] = useState(1);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const MIN_QUANTITY = 1;

  // Refs
  const scrollViewRef = useRef(null);

  // Animación para la alerta
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertTranslateY = useRef(new Animated.Value(-50)).current;

  // Obtener imágenes del producto
  const productImages = product?.images && Array.isArray(product.images) && product.images.length > 0
    ? product.images.map(img => img.photo || img.image_path || img)
    : product?.photo
      ? [product.photo]
      : [];

  // Resetear cuando cambia el producto
  useEffect(() => {
    setQuantity(1);
    setCurrentImageIndex(0);
    // Scroll al inicio
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [product?.id]);

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => quantity > MIN_QUANTITY && setQuantity(prev => prev - 1);

  // Calcular precios
  const discountNum = Number(product?.discount) || 0;
  const hasDiscount = discountNum > 0;
  const unitPrice = product?.price || 0;
  const discountedUnitPrice = unitPrice - discountNum;
  const totalPrice = discountedUnitPrice * quantity;
  const originalTotalPrice = unitPrice * quantity;
  const totalSavings = discountNum * quantity;

  const formatQuantity = (units) => {
    return formatQuantityWithUnit(product?.quantity, product?.unit, units);
  };

  // Alerta de éxito
  const showSuccessMessage = () => {
    setShowSuccessAlert(true);

    Animated.parallel([
      Animated.timing(alertOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(alertTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(alertOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(alertTranslateY, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessAlert(false);
      });
    }, 2500);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setQuantity(1);
    showSuccessMessage();
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Producto no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header fijo */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Imagen del producto */}
        <View style={styles.imageSection}>
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-${discountNum}</Text>
            </View>
          )}

          {productImages.length > 0 && (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(event) => {
                  const slideSize = event.nativeEvent.layoutMeasurement.width;
                  const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
                  setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
                style={styles.imageCarousel}>
                {productImages.map((imageUrl, index) => (
                  <Image
                    key={`${product?.id}-${index}`}
                    source={{uri: imageUrl}}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>

              {productImages.length > 1 && (
                <View style={styles.dotsContainer}>
                  {productImages.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === currentImageIndex && styles.dotActive
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Info del producto */}
        <View style={styles.infoSection}>
          {/* Nombre y medida */}
          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.measureBadge}>
            <Text style={styles.measureText}>{formatQuantity(1)}</Text>
          </View>

          {/* Precio unitario */}
          <View style={styles.unitPriceContainer}>
            {hasDiscount ? (
              <View style={styles.priceRow}>
                <Text style={styles.discountedUnitPrice}>
                  {formatPriceWithSymbol(discountedUnitPrice)}
                </Text>
                <Text style={styles.originalUnitPrice}>
                  {formatPriceWithSymbol(unitPrice)}
                </Text>
              </View>
            ) : (
              <Text style={styles.unitPrice}>
                {formatPriceWithSymbol(unitPrice)}
              </Text>
            )}
            <Text style={styles.perUnitText}>por unidad</Text>
          </View>

          {/* Descripción */}
          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}
        </View>

        {/* Selector de cantidad */}
        <View style={styles.quantitySection}>
          <Text style={styles.sectionLabel}>Cantidad</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              onPress={decreaseQuantity}
              style={[
                styles.quantityButton,
                quantity <= MIN_QUANTITY && styles.quantityButtonDisabled
              ]}
              disabled={quantity <= MIN_QUANTITY}>
              <Ionicons
                name="remove"
                size={22}
                color={quantity <= MIN_QUANTITY ? "#CCC" : "#FFF"}
              />
            </TouchableOpacity>

            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityNumber}>{quantity}</Text>
              <Text style={styles.quantityUnit}>{formatQuantity(quantity)}</Text>
            </View>

            <TouchableOpacity
              onPress={increaseQuantity}
              style={styles.quantityButton}>
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumen del total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.totalPriceContainer}>
              {hasDiscount && (
                <Text style={styles.originalTotalPrice}>
                  {formatPriceWithSymbol(originalTotalPrice)}
                </Text>
              )}
              <Text style={[styles.totalPrice, hasDiscount && styles.totalPriceDiscount]}>
                {formatPriceWithSymbol(totalPrice)}
              </Text>
            </View>
          </View>
          {hasDiscount && (
            <View style={styles.savingsRow}>
              <Ionicons name="pricetag" size={14} color="#33A744" />
              <Text style={styles.savingsText}>
                Ahorras {formatPriceWithSymbol(totalSavings)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Botón de agregar al carrito - Sticky */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          activeOpacity={0.8}>
          <Ionicons name="cart-outline" size={22} color="#FFF" style={styles.cartIcon} />
          <Text style={styles.addToCartText}>Agregar al carrito</Text>
          <Text style={styles.addToCartPrice}>{formatPriceWithSymbol(totalPrice)}</Text>
        </TouchableOpacity>
      </View>

      {/* Alerta de éxito */}
      {showSuccessAlert && (
        <Animated.View
          style={[
            styles.successAlert,
            {
              opacity: alertOpacity,
              transform: [{translateY: alertTranslateY}],
            },
          ]}>
          <View style={styles.successAlertContent}>
            <Ionicons name="checkmark-circle" size={20} color="#33A744" />
            <Text style={styles.successAlertText}>
              ¡{formatQuantity(quantity)} de {product.name} agregado!
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: isIphoneX ? 120 : 100,
  },
  // Imagen
  imageSection: {
    backgroundColor: '#FFF',
    position: 'relative',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#E63946',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    transform: [{ rotate: '12deg' }],
  },
  discountBadgeText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  imageCarousel: {
    width: width,
  },
  productImage: {
    width: width,
    height: width * 0.8,
    backgroundColor: '#F5F5F5',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#D27F27',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Info Section
  infoSection: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  productName: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  measureBadge: {
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  measureText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#8B5E3C',
  },
  unitPriceContainer: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitPrice: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.priceBold,
    color: '#D27F27',
  },
  discountedUnitPrice: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.priceBold,
    color: '#E63946',
  },
  originalUnitPrice: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  perUnitText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#888',
    marginTop: 2,
  },
  description: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    lineHeight: 22,
  },
  // Quantity Section
  quantitySection: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    width: 44,
    height: 44,
    backgroundColor: '#D27F27',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  quantityButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  quantityDisplay: {
    alignItems: 'center',
    marginHorizontal: 24,
    minWidth: 80,
  },
  quantityNumber: {
    fontSize: fonts.size.XLLL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  quantityUnit: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#888',
    marginTop: 2,
  },
  // Total Section
  totalSection: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  totalPriceContainer: {
    alignItems: 'flex-end',
  },
  originalTotalPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  totalPrice: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.priceBold,
    color: '#D27F27',
  },
  totalPriceDiscount: {
    color: '#E63946',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  savingsText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#33A744',
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D27F27',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#D27F27',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cartIcon: {
    marginRight: 8,
  },
  addToCartText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginRight: 12,
  },
  addToCartPrice: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.priceBold,
    color: '#FFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  // Success Alert
  successAlert: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  successAlertContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#33A744',
  },
  successAlertText: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#33A744',
    marginLeft: 10,
  },
  // Error
  errorText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});
