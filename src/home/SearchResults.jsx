import React, { useEffect, useState, useContext, useRef } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CartContext } from '../context/CartContext';
import fonts from '../theme/fonts';
import { API_BASE_URL } from '../config/environment';
import { formatPriceWithSymbol } from '../utils/priceFormatter';
import { formatQuantityWithUnit } from '../utils/unitFormatter';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columnas con padding

const SearchResults = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { query } = route.params;
  const { addToCart } = useContext(CartContext);

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [addedProduct, setAddedProduct] = useState(null);

  // Animación para la alerta
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertTranslateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/products`);
        const all = response.data?.data || [];

        const searchLower = query.toLowerCase();
        const filtered = all.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower)
        );

        setResults(filtered);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handleProductPress = (item) => {
    navigation.navigate('MainTabs', {
      screen: 'ProductDetails',
      params: { productData: item }
    });
  };

  // Función para mostrar la alerta de éxito
  const showSuccessMessage = (product) => {
    setAddedProduct(product);
    setShowSuccessAlert(true);

    // Animación de entrada
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

    // Auto-ocultar después de 2.5 segundos
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
    // Formatear cantidad con unidad
    const formattedQuantity = formatQuantityWithUnit(item.quantity, item.unit, 1);

    // Calcular descuento
    const discountNum = Number(item.discount) || 0;
    const discountedPrice = item.price - discountNum;
    const hasDiscount = discountNum > 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.8}>

        {/* Badge de descuento */}
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

          {/* Etiqueta de medida */}
          <View style={styles.measureBadge}>
            <Text style={styles.measureText}>{formattedQuantity}</Text>
          </View>

          {/* Precios */}
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
      <Ionicons name="search-outline" size={80} color="#DDD" />
      <Text style={styles.emptyTitle}>Sin resultados</Text>
      <Text style={styles.emptyText}>
        No encontramos productos para "{query}"
      </Text>
      <Text style={styles.emptyHint}>
        Intenta con otro término o revisa la ortografía
      </Text>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Volver a buscar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header compacto */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Resultados para</Text>
          <Text style={styles.headerQuery} numberOfLines={1}>"{query}"</Text>
        </View>
      </View>

      {/* Alerta de éxito - igual que ProductDetails */}
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
          <Text style={styles.loadingText}>Buscando productos...</Text>
        </View>
      ) : results.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Contador de resultados */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {results.length} producto{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Grid de productos */}
          <FlatList
            data={results}
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
};

const getStatusBarHeight = () => {
  if (Platform.OS === 'ios') {
    const { height } = Dimensions.get('window');
    return height >= 812 ? 44 : 20;
  }
  return StatusBar.currentHeight || 24;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  // Header compacto
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
    marginRight: 6,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.regular,
    color: '#888',
  },
  headerQuery: {
    fontSize: fonts.size.medium,
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
  emptyHint: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  backButton: {
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
  // Estilos de la alerta de éxito (igual que ProductDetails)
  successAlert: {
    position: 'absolute',
    top: getStatusBarHeight() + 60,
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

export default SearchResults;
