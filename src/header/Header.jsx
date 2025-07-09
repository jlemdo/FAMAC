// import React, { useState, useContext } from 'react';
// import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { useNavigation } from '@react-navigation/native';
// import { AuthContext } from '../context/AuthContext';
// import { useNotification } from '../context/NotificationContext';

// const Header = ({ onSearch, onLogout }) => {
//   const navigation = useNavigation();
//   const [searchText, setSearchText] = useState('');
//   const [suggestions, setSuggestions] = useState([]);
//   const { logout } = useContext(AuthContext);
//   const { notifications } = useNotification();
//   const unreadCount = notifications.filter((n) => !n.read).length;

//   const handleSearch = (text) => {
//     setSearchText(text);
//     if (text.length > 0) {
//       setSuggestions(data.filter((item) => item.toLowerCase().includes(text.toLowerCase())));
//     } else {
//       setSuggestions([]);
//     }
//     onSearch(text);
//   };

//   const logoutFunc = () => {
//     logout();
//   }

//   return (
//     <View style={styles.container}>
//       {/* Top Bar */}
//       <View style={styles.headerTop}>
//         <Text style={styles.appName}>Food App</Text>

//         <View style={styles.rightIcons}>
//           <TouchableOpacity style={styles.iconContainer}
//            onPress={() => navigation.navigate('Notifications')}
//           >
//             <Ionicons name="notifications-outline" size={24} color="black" />
//             {notifications.length > 0 && (
//               <View style={styles.badge}>
//                 <Text style={styles.badgeText}>{notifications.length}</Text>
//               </View>
//             )}
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.iconContainer}  onPress={logoutFunc} >
//             <Ionicons name="log-out-outline" size={24} color="black" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Search Bar */}
//       <View style={styles.searchContainer}>
//         <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
//         <TextInput
//           style={styles.searchInput}
//           placeholder="Search products..."
//           value={searchText}
//           placeholderTextColor="#666"
//           onChangeText={handleSearch}
//         />
//       </View>

//       {/* Search Suggestions */}
//       {suggestions.length > 0 && (
//         <FlatList
//           data={suggestions}
//           keyExtractor={(item) => item}
//           renderItem={({ item }) => (
//             <TouchableOpacity
//               style={styles.suggestionItem}
//               onPress={() => {
//                 setSearchText(item);
//                 setSuggestions([]);
//                 onSearch(item);
//               }}
//             >
//               <Text style={styles.suggestionText}>{item}</Text>
//             </TouchableOpacity>
//           )}
//           style={styles.suggestionsList}
//         />
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: '#fff',
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 3,
//   },
//   headerTop: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//   },
//   appName: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   rightIcons: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   iconContainer: {
//     marginLeft: 15,
//     position: 'relative',
//   },
//   badge: {
//     position: 'absolute',
//     top: -3,
//     right: -3,
//     backgroundColor: 'red',
//     borderRadius: 10,
//     width: 18,
//     height: 18,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   badgeText: {
//     color: 'white',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: "#ccc",
//     // backgroundColor: '#F0F0F0',
//     borderRadius: 5,
//     paddingHorizontal: 10,
//     height: 40,
//     justifyContent: "center",
//     marginTop:10,
//     marginBottom: 15,
//     // shadowColor: "#000",
//     // shadowOffset: { width: 0, height: 2 },
//     // shadowOpacity: 0.1,
//     // shadowRadius: 5,
//     // elevation: 3
//   },
//   searchIcon: {
//     marginRight: 10,
//   },
//   searchInput: {
//     flex: 1,
//     fontSize: 16,
//     color: '#333',
//   },
//   suggestionsList: {
//     marginTop: 5,
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     elevation: 3,
//   },
//   suggestionItem: {
//     padding: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ddd',
//   },
//   suggestionText: {
//     fontSize: 16,
//     color: '#333',
//   },
// });

import React, {
  useState,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {AuthContext} from '../context/AuthContext';
import {useNotification} from '../context/NotificationContext';
import axios from 'axios';
import debounce from 'lodash.debounce'; // instala lodash.debounce
import fonts from '../theme/fonts';

const Header = ({onLogout}) => {
  const navigation = useNavigation();
  const {logout} = useContext(AuthContext);
  const {notifications, markAsRead} = useNotification();
  const unreadCount = notifications.filter(n => !n.read).length;

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const allProductsRef = useRef(null);
  const cancelTokenRef = useRef(null);

  // Función de búsqueda (client-side)
  const fetchSuggestions = useCallback(async text => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel(); // abortar petición anterior
    }
    cancelTokenRef.current = axios.CancelToken.source();

    if (text.length === 0) {
      setSuggestions([]);
      return;
    }

    try {
      // Si no hemos cargado aún el catálogo, lo pedimos una sola vez
      if (!allProductsRef.current) {
        const resp = await axios.get(
          'https://food.siliconsoft.pk/api/products',
          {cancelToken: cancelTokenRef.current.token},
        );
        allProductsRef.current = resp.data?.data || [];
      }
      // Filtrado en cliente
      const filtered = allProductsRef.current.filter(p =>
        p.name.toLowerCase().includes(text.toLowerCase()),
      );
      setSuggestions(filtered);
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Search API error:', err);
      }
    }
  }, []);

  // Debounced wrapper (300ms)
  const debouncedFetch = useMemo(
    () => debounce(fetchSuggestions, 300),
    [fetchSuggestions],
  );

  // Cada vez que cambie el texto lanzamos la búsqueda debounceada
  useEffect(() => {
    debouncedFetch(searchText);
    return () => {
      // cleanup al desmontar / nueva llamada
      debouncedFetch.cancel();
      if (cancelTokenRef.current) {cancelTokenRef.current.cancel();}
    };
  }, [searchText, debouncedFetch]);

  const handleSearch = text => {
    setSearchText(text);
  };

  const handleSelectSuggestion = item => {
    setSearchText('');
    setSuggestions([]);
    navigation.navigate('SearchResults', {query: item.name});
  };

  const logoutFunc = () => {
    logout();
  };

  const [showNotif, setShowNotif] = useState(false);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.headerTop}>
        <Text style={styles.appName}>Occr Productos</Text>

        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => {
              notifications.filter(n => !n.read).forEach(n => markAsRead(n.id));
              setShowNotif(v => !v);
            }}>
            <Ionicons name="notifications-outline" size={24} color="black" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconContainer} onPress={logoutFunc}>
            <Ionicons name="log-out-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>
        <Modal
          visible={showNotif}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNotif(false)}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPressOut={() => setShowNotif(false)}>
            <View style={styles.dropdown}>
              {notifications.length === 0 ? (
                <Text style={styles.empty}>Sin notificaciones</Text>
              ) : (
                notifications.map(item => (
                  <View key={item.id} style={styles.item}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.desc}>{item.description}</Text>
                  </View>
                ))
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#888"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar Productos..."
          value={searchText}
          placeholderTextColor="#666"
          onChangeText={handleSearch}
          returnKeyType="search"                         // muestra “Buscar” en el teclado
          onSubmitEditing={() => {
            if (searchText.trim()) {
              setSuggestions([]);                         // limpia sugerencias
              navigation.navigate('SearchResults', {
                query: searchText.trim()
              });
            }
          }}
        />
      </View>

      {/* Search Suggestions */}
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelectSuggestion(item)}>
              <Text style={styles.suggestionText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          style={styles.suggestionsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    paddingVertical: 16,          // escala: 16px
    paddingHorizontal: 16,        // escala: 16px
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
                // escala: 16px
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,             // escala: 16px
    marginTop: 18, 
    paddingTop: 20,
  },
  appName: {
    fontSize: fonts.size.XLL,
    fontFamily: fonts.original,
    color: '#2F2F2F',             // Gris Carbón
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,                    // touch ≥44×44
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,               // escala: 16px
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#D27F27',   // Dorado Campo
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5E3C',       // Marrón Tierra
    borderRadius: 8,
    paddingHorizontal: 12,        // escala: 12px
    height: 44,                   // touch ≥44
    marginTop: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,              // escala: 12px
  },
  searchInput: {
    flex: 1,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    fontFamily: fonts.regular,
  },
  suggestionsList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    maxHeight: 150,
    marginHorizontal: 16,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  suggestionText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 56,
  },
  dropdown: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  empty: {
    textAlign: 'center',
    color: 'rgba(47,47,47,0.6)',
    padding: 16,
    fontFamily: fonts.regular,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  desc: {
    fontSize: fonts.size.small,
    color: '#444',
    fontFamily: fonts.regular,
  },
});

export default Header;
