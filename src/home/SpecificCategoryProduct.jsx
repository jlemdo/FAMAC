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
          `https://occr.pixelcrafters.digital/api/products/${categoryName}`,
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
                    
                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                    
                    {/* Sección de precios - posición prominente */}
                    <View style={styles.priceSection}>
                    {discountNum > 0 ? (
                      <>
                        {/* Original tachado solo si hay descuento */}
                        <Text style={styles.originalPriceStriked}>
                          {formatPriceWithSymbol(item.price)}
                        </Text>
                        {/* Precio descontado */}
                        <Text style={styles.discountedPrice}>
                          {formatPriceWithSymbol(discountedPrice)}
                        </Text>
                        {/* Etiqueta "Ahorro" */}
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>
                            ¡Ahorras ${discountNum}!
                          </Text>
                        </View>
                      </>
                    ) : (
                      /* Si no hay descuento, solo muestro el precio normal */
                      <Text style={styles.regularPrice}>{formatPriceWithSymbol(item.price)}</Text>
                    )}
                    </View>
                    
                    {/* Metadatos: peso y descripción */}
                    <View style={styles.metadataSection}>
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>250g</Text>
                      </View>
                      <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                      </Text>
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
    padding: 12, // Reducido de 16 a 12
    margin: cardSpacing,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    width: cardWidth, // Ancho responsive calculado
    minHeight: 300, // Altura mínima fija para uniformidad
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.1)',
    position: 'relative',
    overflow: 'visible',
    justifyContent: 'space-between', // Distribuir contenido uniformemente
  },
  topSection: {
    alignItems: 'center',
    flex: 1, // Toma el espacio disponible
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
    width: cardWidth - 24, // Ancho de tarjeta menos padding
    height: cardWidth - 24, // Alto igual al ancho para mantener aspecto cuadrado
    borderRadius: 12,
    marginBottom: 8, // Reducido de 12 a 8
  },
  name: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 4, // Reducido de 6 a 4
    paddingHorizontal: 4,
    lineHeight: 18, // Mejor control de altura
  },
  description: {
    fontSize: fonts.size.small,
    color: 'rgba(47,47,47,0.5)',
    textAlign: 'center',
    paddingHorizontal: 4,
    fontFamily: fonts.regular,
    lineHeight: 14,
    marginTop: 4,
  },
  weightBadge: {
    backgroundColor: 'rgba(139, 94, 60, 0.15)',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  weightText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.numericBold, // ✅ Fuente optimizada para pesos numéricos (250g)
    color: '#8B5E3C',
  },
  priceSection: {
    alignItems: 'center',
    marginVertical: 6,
    paddingVertical: 4,
  },
  metadataSection: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 8,
  },
  regularPrice: {
    fontSize: fonts.size.small, // ✅ Mantiene autoscaling
    fontFamily: fonts.price, // ✅ Nueva fuente optimizada para precios
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
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
    fontSize: fonts.size.small, // ✅ Mantiene autoscaling
    fontFamily: fonts.price, // ✅ Nueva fuente optimizada para precios
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  savingsBadge: {
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    paddingHorizontal: 6, // Reducido de 8 a 6
    paddingVertical: 2, // Reducido de 3 a 2
    borderRadius: 6, // Reducido de 8 a 6 para ser más sutil
    marginBottom: 2, // Reducido de 4 a 2
    borderWidth: 1,
    borderColor: '#33A744',
  },
  savingsText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#33A744',
  },
  priceSubtext: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
    fontStyle: 'italic',
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
