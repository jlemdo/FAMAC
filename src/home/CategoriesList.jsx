import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import axios from 'axios';
import fonts from '../theme/fonts';

export default function CategoriesList() {
  const navigation = useNavigation();

  // State hooks for categories, loading, and error handling
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories from the API
  useEffect(() => {
    axios
      .get('https://food.siliconsoft.pk/api/productscats')
      .then(response => {
        console.log('response category', response);
        setCategories(response.data.data); // Assuming the API returns an array
        setLoading(false);
      })
      .catch(err => {
        setError(
          'Error al cargar las categorías. Por favor, inténtalo de nuevo más tarde.',
        );
        setLoading(false);
      });
  }, []);

   return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>Categorías</Text>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="tomato" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={categories}
          keyExtractor={item => item.id.toString()}

          // FORZAMOS UNA SOLA COLUMNA Y AÑADIMOS UN KEY
          numColumns={1}
          key="single-column"

          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() =>
                navigation.navigate('CategoryProducts', {
                  categoryId: item.id,
                  categoryName: item.name,
                })
              }
              accessibilityRole="button"
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: item.photo }}
                  style={styles.categoryImage}
                  accessible
                  accessibilityLabel={`Imagen de la categoría ${item.name}`}
                />
              </View>
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text
                style={styles.categoryDescription}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.description || 'Sin descripción disponible.'}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingHorizontal: 16, // escala: 16px
  },
  mainTitle: {
    fontSize: fonts.size.XLLL,
    fontFamily: fonts.original,
    textAlign: 'center',
    color: '#2F2F2F',
    marginBottom: 20,
    // textTransform: "uppercase",
    letterSpacing: 1,
  },
  categoryList: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  categoryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    // sombra iOS
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    // elevación Android
    elevation: 5,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#EEE',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryName: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.original,
    color: '#2F2F2F',
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFF',
  },
  categoryDescription: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#666',
    textAlign: 'center',
    paddingBottom: 12,
    paddingHorizontal: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  errorMessage: {
    fontSize: fonts.size.medium,
    color: 'red',
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
});
