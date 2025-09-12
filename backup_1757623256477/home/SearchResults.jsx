// import React, { useEffect, useState } from 'react';
// import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
// import axios from 'axios';
// import { useNavigation, useRoute } from '@react-navigation/native';

// const SearchResults = () => {
//   const route = useRoute();
//   const navigation = useNavigation();
//   const { query } = route.params;

//   const [loading, setLoading] = useState(true);
//   const [results, setResults] = useState([]);

//   useEffect(() => {
//     const fetchResults = async () => {
//       try {
//         const response = await axios.get(`https://occr.pixelcrafters.digital/api/searchproducts?cat=&product=${query}`);
//         setResults(response.data?.products || []); // adjust according to your API response shape
//       } catch (err) {
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchResults();
//   }, [query]);

//   if (loading) {
//     return <ActivityIndicator size="large" color="tomato" />;
//   }

//   if (results.length === 0) {
//     return <Text style={{ textAlign: 'center', marginTop: 20 }}>No products found</Text>;
//   }

//   return (
//     <FlatList
//       data={results}
//       keyExtractor={(item) => item.id.toString()}
//       renderItem={({ item }) => (
//         <TouchableOpacity
//           style={styles.item}
//           onPress={() => navigation.navigate('ProductDetails', { product: item })}
//         >
//           <Text>{item.name}</Text>
//         </TouchableOpacity>
//       )}
//     />
//   );
// };

// const styles = StyleSheet.create({
//   item: {
//     padding: 15,
//     borderBottomWidth: 1,
//     borderColor: '#ccc'
//   }
// });

// export default SearchResults;
import React, { useEffect, useState, useContext } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Image } from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CartContext } from '../context/CartContext';
import fonts from '../theme/fonts';

const SearchResults = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { query } = route.params;
  const { addToCart } = useContext(CartContext);

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

useEffect(() => {
  const fetchResults = async () => {
    try {
      const response = await axios.get('https://occr.pixelcrafters.digital/api/products');
      const all = response.data?.data || [];

      const filtered = all.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );

      setResults(filtered);
    } catch (err) {
      // Error en SearchResults
    } finally {
      setLoading(false);
    }
  };

  fetchResults();
}, [query]);


  if (loading) {
    return <ActivityIndicator size="large" color="tomato" style={{ marginTop: 50 }} />;
  }

  if (results.length === 0) {
    return <Text style={{ textAlign: 'center', marginTop: 20 }}>No products found</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
         <Text style={styles.title}>Resultados de “{query}”</Text>
      </View>
      {/* <Text style={styles.heading}>Search Result</Text> */}
      <FlatList
  data={results}
  keyExtractor={(item) => item.id.toString()}
  renderItem={({ item }) => (
    <View style={styles.item}>
      <TouchableOpacity onPress={() => {
        // Navigate to ProductDetails in MainTabs from RootStack
        navigation.navigate('MainTabs', {
          screen: 'ProductDetails', 
          params: { productData: item }
        });
      }}>
        <Image source={{ uri: item.photo }} style={styles.image} />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={styles.txt}>{item.name}</Text>
        <Text style={styles.price}>{item.price} $MXN </Text>
      </View>

      <TouchableOpacity style={styles.cartButton} onPress={() => addToCart(item)}>
        <Text style={styles.cartButtonText}>Agregar al Carrito</Text>
      </TouchableOpacity>
    </View>
  )}
/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
   flex: 1, backgroundColor: '#F8F8F8',
  },
  backButton: { marginRight: 10 },
  heading: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',

    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 6,
  },
  title: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    textAlign: 'center',
    flex: 1,
  },
  txt: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
  },
  price: {
    marginTop: 5,
    fontSize: fonts.size.small,
    color: 'tomato',
    fontFamily: fonts.regular,
  },
  cartButton: {
    backgroundColor: 'tomato',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  cartButtonText: {
    color: 'white',
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
    marginTop: 20,
  },
});

export default SearchResults;
