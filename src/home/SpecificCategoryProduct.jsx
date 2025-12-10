import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import fonts from '../theme/fonts';
import {formatPriceWithSymbol} from '../utils/priceFormatter';
import {formatProductMeasure} from '../utils/unitFormatter';
import { API_BASE_URL } from '../config/environment';

export default function SpecificCategoryProduct() {
  const route = useRoute();
  const navigation = useNavigation();
  const {categoryName} = route.params;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(
          `/api/products/${categoryName}`,
        );
        setProducts(response.data.data || []);
      } catch (err) {
        setError('Failed to fetch products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryName]);

  return (
    <View style={styles.container}>
      {/* Back Button with Category Name */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>{categoryName}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="tomato" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : products.length > 0 ? (
        <FlatList
          data={products}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          renderItem={({item}) => {
            // Forzamos a número (null → 0, "20" → 20)
            const discountNum = Number(item.discount) || 0;
            // Calculamos el precio final
            const discountedPrice = item.price - discountNum;

            return (
              <TouchableOpacity
                onPress={() => {
                  // Navigate to ProductDetails via the Tab Navigator
                  const tabNavigator = navigation.getParent();
                  tabNavigator?.navigate('ProductDetails', {productData: item});
                }}>
                <View style={styles.productCard}>
                  {/* Banderín de promoción */}
                  {discountNum > 0 && (
                    <View style={styles.promotionBanner}>
                      <Text style={styles.promotionText}>-${discountNum}</Text>
                    </View>
                  )}
                  
                  {/* Sección superior: Imagen y contenido */}
                  <View style={styles.topSection}>
                    <Image source={{uri: item.photo}} style={styles.image} />
                    
                    {/* Contenido inferior organizado */}
                    <View style={styles.contentSection}>
                      {/* Nombre del producto */}
                      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>

                      {/* Medida del producto */}
                      <Text style={styles.measure}>
                        {formatProductMeasure(item.quantity, item.unit)}
                      </Text>

                      {/* Sección de precios */}
                      <View style={styles.priceContainer}>
                        {discountNum > 0 ? (
                          <View style={styles.priceWithDiscount}>
                            <Text style={styles.discountedPrice}>
                              {formatPriceWithSymbol(discountedPrice)}
                            </Text>
                            <Text style={styles.originalPrice}>
                              {formatPriceWithSymbol(item.price)}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.regularPrice}>
                            {formatPriceWithSymbol(item.price)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <Text style={styles.noData}>No products available</Text>
      )}
    </View>
  );
}

// Calcular ancho responsive de tarjetas
const screenWidth = Dimensions.get('window').width;
const cardSpacing = 6; // Reducido de 8 a 6 para más espacio
const containerPadding = 10; // padding del container
const availableWidth = screenWidth - (containerPadding * 2);
const cardWidth = (availableWidth - (cardSpacing * 4)) / 2; // 4 espacios: 2 por tarjeta + 2 exteriores

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
    paddingHorizontal: containerPadding,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
    marginTop: 10,
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: fonts.size.XL, // Reducido desde XLLL (48px) a XL (30px) para mejor compatibilidad
    fontFamily: fonts.bold,
    textAlign: 'center',
    flex: 1,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#FFF',
    padding: 12,
    margin: cardSpacing,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    width: cardWidth,
    height: 320, // Altura fija para uniformidad
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.1)',
    position: 'relative',
    overflow: 'visible',
  },
  topSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
  },
  promotionBanner: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E63946',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    transform: [{ rotate: '15deg' }],
  },
  promotionText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  image: {
    width: cardWidth - 24,
    height: 140, // Altura fija para uniformidad
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  contentSection: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  name: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'left',
    marginBottom: 6,
    lineHeight: 20,
    minHeight: 40, // Altura fija para 2 líneas
  },
  measure: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    textAlign: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
    overflow: 'hidden',
  },
  priceContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
  priceWithDiscount: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  regularPrice: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'left',
  },
  originalPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
    textAlign: 'left',
    marginTop: 2,
  },
  originalPriceStriked: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
    textAlign: 'center',
    marginBottom: 2,
  },
  discountedPrice: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#E63946',
    textAlign: 'left',
  },
  noData: {
    textAlign: 'center',
    fontSize: fonts.size.medium,
    color: 'gray',
    marginTop: 20,
    fontFamily: fonts.regular,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    textAlign: 'center',
    fontSize: fonts.size.medium,
    color: 'white',
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 20,
    marginTop: 20,
    fontFamily: fonts.regular,
  },
});
