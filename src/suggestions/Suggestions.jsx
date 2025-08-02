import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import fonts from '../theme/fonts';
import {formatPriceWithSymbol} from '../utils/priceFormatter';

export default function Suggestions() {
  const navigation = useNavigation();
  
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(
          'https://food.siliconsoft.pk/api/products/sugerencias',
        );
        const json = await response.json();

        if (json.status === 'successsugerencias') {
          setSuggestions(json.data);
        } else {
          setError('Error al cargar las sugerencias');
        }
      } catch (error) {
        setError('Error de conexión. Inténtalo de nuevo.');
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);



  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B5E3C" />
        <Text style={styles.loadingText}>Cargando sugerencias...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con botón de regreso */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Sugerencias para ti</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="tomato" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : suggestions.length > 0 ? (
        <FlatList
          data={suggestions}
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
                  // Navigate to ProductDetails directly (it's a hidden tab)
                  navigation.navigate('ProductDetails', {productData: item});
                }}>
                <View style={styles.productCard}>
                  {/* Banderín de promoción */}
                  {discountNum > 0 && (
                    <View style={styles.promotionBanner}>
                      <Text style={styles.promotionText}>-${discountNum}</Text>
                    </View>
                  )}
                  
                  <Image source={{uri: item.photo}} style={styles.image} />
                  
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description || 'Producto recomendado especialmente para ti'}
                  </Text>

                  {/* Indicador de peso */}
                  <View style={styles.weightBadge}>
                    <Text style={styles.weightText}>250g</Text>
                  </View>

                  {/* Sección de precios */}
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
                    {/* <Text style={styles.priceSubtext}>por unidad</Text> */}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <Text style={styles.noData}>No hay sugerencias disponibles</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
    paddingHorizontal: 10,
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
    fontSize: fonts.size.XL,
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
    padding: 16,
    margin: 8,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    width: 180,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.1)',
    position: 'relative',
    overflow: 'visible',
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
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  name: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 32,
  },
  description: {
    fontSize: fonts.size.small,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: fonts.regular,
    minHeight: 28,
  },
  weightBadge: {
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  weightText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  priceSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  regularPrice: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 4,
  },
  originalPriceStriked: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  discountedPrice: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#33A744',
    marginBottom: 6,
  },
  savingsBadge: {
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
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