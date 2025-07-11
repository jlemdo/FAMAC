import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import fonts from '../theme/fonts';

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
          `https://food.siliconsoft.pk/api/products/${categoryName}`,
        );
        console.log('response', response);
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
                onPress={() =>
                  navigation.navigate('ProductDetails', {productData: item})
                }>
                <View style={styles.productCard}>
                  <Image source={{uri: item.photo}} style={styles.image} />
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.description} numberOfLines={3}>
                    {item.description}
                  </Text>

                  {discountNum > 0 ? (
                    <>
                      {/* Original tachado solo si hay descuento */}
                      <Text
                        style={[
                          styles.originalPrice,
                          {textDecorationLine: 'line-through', color: '#999'},
                        ]}>
                        ${item.price}
                      </Text>
                      {/* Precio descontado */}
                      <Text style={styles.discountedPrice}>
                        ${discountedPrice}
                      </Text>
                      {/* Etiqueta “Save” */}
                      <Text style={styles.discountLabel}>
                        Save ${discountNum}
                      </Text>
                    </>
                  ) : (
                    /* Si no hay descuento, solo muestro el precio normal */
                    <Text style={styles.originalPrice}>${item.price}</Text>
                  )}
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
    fontSize: fonts.size.XLLL,
    fontFamily: fonts.original,
    textAlign: 'center',
    flex: 1,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: 'white',
    padding: 15,
    margin: 10,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    width: 170,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  name: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#222',
    marginTop: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: fonts.size.small,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 8,
    fontStyle: 'italic',
    fontFamily: fonts.regular,
  },
  originalPrice: {
    fontSize: fonts.size.medium,
    marginTop: 5,
    fontFamily: fonts.regular,
  },
  discountedPrice: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#E44D26',
    marginTop: 3,
  },
  discountLabel: {
    fontSize: fonts.size.small,
    color: 'green',
    fontFamily: fonts.bold,
    marginTop: 3,
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
