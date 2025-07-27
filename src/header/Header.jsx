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
  Animated,
  Platform,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
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
  const [showSearchBar, setShowSearchBar] = useState(false);
  const allProductsRef = useRef(null);
  const cancelTokenRef = useRef(null);
  
  // Animación para la barra de búsqueda
  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;

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

  // Función para toggle de la barra de búsqueda
  const toggleSearchBar = () => {
    const newShowState = !showSearchBar;
    setShowSearchBar(newShowState);
    
    if (newShowState) {
      // Mostrar barra de búsqueda
      Animated.parallel([
        Animated.timing(searchBarHeight, {
          toValue: 52, // altura optimizada del search container
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(searchBarOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Ocultar barra de búsqueda
      Animated.parallel([
        Animated.timing(searchBarHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(searchBarOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Limpiar búsqueda al cerrar
        setSearchText('');
        setSuggestions([]);
      });
    }
  };

  // Auto-cerrar si el usuario no está buscando y no hay texto
  useEffect(() => {
    if (showSearchBar && searchText === '' && suggestions.length === 0) {
      const timeout = setTimeout(() => {
        toggleSearchBar();
      }, 3000); // Se cierra después de 3 segundos de inactividad
      
      return () => clearTimeout(timeout);
    }
  }, [showSearchBar, searchText, suggestions]);

  const [showNotif, setShowNotif] = useState(false);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.headerTop}>
        <Text style={styles.appName}>Lácteos y más...</Text>

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
          <TouchableOpacity style={styles.iconContainer} onPress={toggleSearchBar}>
            <Ionicons 
              name={showSearchBar ? "close-outline" : "search-outline"} 
              size={24} 
              color="black" 
            />
          </TouchableOpacity>
        </View>
        <Modal
          visible={showNotif}
          transparent
          animationType="fade"
          onRequestClose={() => {
            Keyboard.dismiss();
            setShowNotif(false);
          }}>
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              setShowNotif(false);
            }}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
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
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>

      {/* Search Bar Animada */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            height: searchBarHeight,
            opacity: searchBarOpacity,
            overflow: 'hidden',
          }
        ]}>
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
          returnKeyType="search"                         // muestra "Buscar" en el teclado
          onSubmitEditing={() => {
            if (searchText.trim()) {
              setSuggestions([]);                         // limpia sugerencias
              navigation.navigate('SearchResults', {
                query: searchText.trim()
              });
              Keyboard.dismiss();
              toggleSearchBar(); // Cerrar después de buscar
            }
          }}
          onBlur={() => {
            // No cerrar automáticamente al perder foco para permitir tocar sugerencias
          }}
          autoFocus={showSearchBar} // Auto-focus cuando se abre
        />
      </Animated.View>

      {/* Search Suggestions */}
      {showSearchBar && suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => {
                Keyboard.dismiss();
                handleSelectSuggestion(item);
                toggleSearchBar(); // Cerrar después de seleccionar
              }}>
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
    paddingTop: Platform.OS === 'ios' ? StatusBar.currentHeight || 44 : StatusBar.currentHeight || 0,
    paddingBottom: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56, // Altura estándar de header
    paddingVertical: 8,
  },
  appName: {
    fontSize: fonts.size.XLL, // Reducido ligeramente para mejor proporción
    fontFamily: fonts.original,
    color: '#2F2F2F',
    letterSpacing: 0.5,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#D27F27',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#FAFAFA',
  },
  searchIcon: {
    marginRight: 8,
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
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    maxHeight: 160,
    marginHorizontal: 8,
    marginTop: 4,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
  },
  suggestionText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  dropdown: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    maxHeight: 320,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  empty: {
    textAlign: 'center',
    color: 'rgba(47,47,47,0.6)',
    padding: 16,
    fontFamily: fonts.regular,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
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
