import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, FlatList, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
      .then((response) => {
        console.log('response category',response);
        setCategories(response.data.data); // Assuming the API returns an array
        setLoading(false);
      })
      .catch((err) => {
        setError('Error al cargar las categorías. Por favor, inténtalo de nuevo más tarde.');
        setLoading(false);
      });
  }, []);

  return (
    <View style={styles.container}>
      {/* <ScrollView showsVerticalScrollIndicator={false}> */}
        <Text style={styles.mainTitle}>Categorías</Text>

        {loading ? (
          // Activity Indicator displayed in the center of the screen
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="tomato" />
          </View>
        ) : error ? (
          // Error message if the API fails
          <View style={styles.errorContainer}>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : (
          // Display categories after loading
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.categoryList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => navigation.navigate('CategoryProducts', { categoryId: item.id, categoryName: item.name })}
              >
                <View style={styles.imageContainer}>
                  <Image source={{ uri: item.photo }} style={styles.categoryImage} />
                </View>
                <Text style={styles.categoryName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      {/* </ScrollView> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
    paddingHorizontal: 15,
    paddingTop: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    margin: 30,
  },
  imageContainer: {
    width: 130,
    height: 130,
    borderRadius: 60, // Circle shape
    borderWidth: 1, // Thin border
    borderColor: '#D27F27', // Light gray border
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImage: {
    width: 120,
    height: 120,
    borderRadius: 400 / 2,
  },
  categoryName: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
     // textTransform: "uppercase",
    color: '#2F2F2F',
    textAlign: 'center',
    marginTop: 8,
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
