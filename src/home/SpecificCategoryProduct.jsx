import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import fonts from '../theme/fonts';
import { formatPriceWithSymbol } from '../utils/priceFormatter';
import { formatQuantityWithUnit } from '../utils/unitFormatter';
import { API_BASE_URL } from '../config/environment';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function SpecificCategoryProduct() {
  const route = useRoute();
  const navigation = useNavigation();
  const { categoryName } = route.params;
  const { addToCart } = useContext(CartContext);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [addedProduct, setAddedProduct] = useState(null);

  // Animación para la alerta
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertTranslateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/products/${categoryName}`,
        );
        setProducts(response.data.data || []);
      } catch (err) {
        setError('No se pudieron cargar los productos. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryName]);

  const handleProductPress = (item) => {
    const tabNavigator = navigation.getParent();
    tabNavigator?.navigate('ProductDetails', { productData: item });
  };

  // Función para mostrar la alerta de éxito
  const showSuccessMessage = (product) => {
    setAddedProduct(product);
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
        setAddedProduct(null);
      });
    }, 2500);
  };

  const handleAddToCart = (item) => {
    addToCart(item);
    showSuccessMessage(item);
  };

  const renderProduct = ({ item }) => {
    const formattedQuantity = formatQuantityWithUnit(item.quantity, item.unit, 1);
    const discountNum = Number(item.discount) || 0;
    const discountedPrice = item.price - discountNum;
    const hasDiscount = discountNum > 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.8}>

        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-${discountNum}</Text>
          </View>
        )}

        <Image
          source={{ uri: item.photo }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.measureBadge}>
            <Text style={styles.measureText}>{formattedQuantity}</Text>
          </View>

          <View style={styles.priceContainer}>
            {hasDiscount ? (
              <>
                <Text style={styles.discountedPrice}>
                  {formatPriceWithSymbol(discountedPrice)}
                </Text>
                <Text style={styles.originalPrice}>
                  {formatPriceWithSymbol(item.price)}
                </Text>
              </>
            ) : (
              <Text style={styles.productPrice}>
                {formatPriceWithSymbol(item.price)}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={(e) => {
            e.stopPropagation();
            handleAddToCart(item);
          }}
          activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={80} color="#DDD" />
      <Text style={styles.emptyTitle}>Sin productos</Text>
      <Text style={styles.emptyText}>
        No hay productos disponibles en esta categoría
      </Text>
      <TouchableOpacity
        style={styles.backButtonEmpty}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
      </View>

      {/* Alerta de éxito */}
      {showSuccessAlert && addedProduct && (
        <Animated.View
          style={[
            styles.successAlert,
            {
              opacity: alertOpacity,
              transform: [{ translateY: alertTranslateY }],
            },
          ]}>
          <View style={styles.successAlertContent}>
            <Ionicons name="checkmark-circle" size={20} color="#33A744" />
            <View style={styles.successAlertTextContainer}>
              <Text style={styles.successAlertText}>
                ¡{addedProduct.name} agregado al carrito!
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Contenido */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D27F27" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#E63946" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
            }}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {products.length} producto{products.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
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
  headerBackButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#888',
    marginTop: 12,
  },
  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#D27F27',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  // Results Header
  resultsHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
  },
  // Grid
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  // Product Card
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    position: 'relative',
  },
  // Badge de descuento
  discountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#E63946',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    transform: [{ rotate: '12deg' }],
  },
  discountBadgeText: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH * 0.85,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productInfo: {
    padding: 10,
    paddingBottom: 14,
  },
  productName: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    lineHeight: 18,
    minHeight: 36,
  },
  // Etiqueta de medida
  measureBadge: {
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
  },
  measureText: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
  },
  // Contenedor de precios
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  productPrice: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.priceBold,
    color: '#D27F27',
  },
  discountedPrice: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.priceBold,
    color: '#E63946',
  },
  originalPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  addButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#D27F27',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginTop: 20,
  },
  emptyText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  backButtonEmpty: {
    marginTop: 24,
    backgroundColor: '#D27F27',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  // Alerta de éxito
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#33A744',
  },
  successAlertTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  successAlertText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#33A744',
    textAlign: 'left',
    lineHeight: 18,
  },
});
