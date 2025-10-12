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
  Dimensions,
  Image,
  ScrollView,
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
  const {user, logout} = useContext(AuthContext);
  const {notifications, markAsRead} = useNotification();
  const unreadCount = notifications.filter(n => !n.read).length;

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const allProductsRef = useRef(null);
  const cancelTokenRef = useRef(null);
  
  // Animaciones para la barra de búsqueda (versión estable)
  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  
  // Animaciones para el logo
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

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
          'https://awsoccr.pixelcrafters.digital/api/products',
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
        // Search API error
      }
    }
  }, []);

  // Debounced wrapper optimizado (500ms para reducir calls)
  const debouncedFetch = useMemo(
    () => debounce(fetchSuggestions, 500),
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

  // Función para toggle de la barra de búsqueda (versión estable)
  const toggleSearchBar = () => {
    const newShowState = !showSearchBar;
    setShowSearchBar(newShowState);
    
    if (newShowState) {
      // Mostrar barra de búsqueda
      Animated.parallel([
        Animated.timing(searchBarHeight, {
          toValue: 44, // Reducido de 52 a 44
          duration: 250,
          useNativeDriver: false, // Para height debe ser false
        }),
        Animated.timing(searchBarOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false, // Mantenemos consistente
        }),
        // Logo se hace más pequeño
        Animated.timing(logoScale, {
          toValue: 0.85,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0.6,
          duration: 250,
          useNativeDriver: true,
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
          duration: 250,
          useNativeDriver: false,
        }),
        // Logo vuelve a normal
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Limpiar búsqueda al cerrar
        setSearchText('');
        setSuggestions([]);
      });
    }
  };

  // Auto-cerrar si no hay actividad
  useEffect(() => {
    if (showSearchBar && searchText === '' && suggestions.length === 0) {
      const timeout = setTimeout(() => {
        toggleSearchBar();
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [showSearchBar, searchText, suggestions]);

  const [showNotif, setShowNotif] = useState(false);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.headerTop}>
        {/* Logo + Texto */}
        <View style={styles.leftSection}>
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
              }
            ]}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.appName}>Sabores de Origen</Text>
        </View>

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
          {/* ✅ DRIVER FIX: Ocultar barra de búsqueda para drivers */}
          {user?.usertype !== 'driver' && (
            <TouchableOpacity style={styles.iconContainer} onPress={toggleSearchBar}>
              <Ionicons 
                name={showSearchBar ? "close-outline" : "search-outline"} 
                size={24} 
                color="black" 
              />
            </TouchableOpacity>
          )}
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
                    <ScrollView 
                      style={styles.notificationScrollView}
                      showsVerticalScrollIndicator={true}
                      contentContainerStyle={styles.scrollViewContent}
                    >
                      {notifications.slice().reverse().map(item => (
                        <TouchableOpacity 
                          key={item.id} 
                          style={styles.item}
                          onPress={() => {
                            // 🔪 CIRUGÍA: Navegación específica desde campanita
                            setShowNotif(false); // Cerrar modal
                            
                            // Extraer order_id del título o descripción (formato "Pedido #123" o "#123")
                            const titleMatch = item.title.match(/Pedido #(\d+)/);
                            const descriptionMatch = item.description.match(/#(\d+)/);
                            const orderId = titleMatch ? titleMatch[1] : (descriptionMatch ? descriptionMatch[1] : null);

                            // console.log('🔔 HEADER NOTIFICATION TAP:', {
                            // title: item.title,
                            // description: item.description,
                            // titleMatch,
                            // descriptionMatch,
                            // extractedOrderId: orderId,
                            // willNavigateTo: orderId ? 'OrderDetails' : 'Pedidos'
                            // });

                            if (orderId) {
                              // 🎯 NAVEGACIÓN DIRECTA A OrderDetails (igual que modal post-compra)
                              navigation.navigate('OrderDetails', { orderId: orderId });
                            } else {
                              // Si no hay orderId, ir a lista de pedidos
                              navigation.navigate('MainTabs', { screen: 'Pedidos' });
                            }
                          }}
                        >
                          <Text style={styles.title}>{item.title}</Text>
                          <Text style={styles.desc}>{item.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>

      {/* ✅ DRIVER FIX: Ocultar Search Bar para drivers */}
      {user?.usertype !== 'driver' && (
        <>
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
              returnKeyType="search"
              keyboardShouldPersistTaps="handled"
              onSubmitEditing={() => {
                if (searchText.trim()) {
                  setSuggestions([]);
                  navigation.navigate('SearchResults', {
                    query: searchText.trim()
                  });
                  Keyboard.dismiss();
                  toggleSearchBar();
                }
              }}
              autoFocus={showSearchBar}
            />
          </Animated.View>

          {/* Search Suggestions */}
          {showSearchBar && suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              keyExtractor={item => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleSelectSuggestion(item);
                    toggleSearchBar();
                  }}>
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              style={styles.suggestionsList}
            />
          )}
        </>
      )}
    </View>
  );
};

// Función para obtener safe area superior optimizada
const getStatusBarHeight = () => {
  if (Platform.OS === 'ios') {
    const { height } = Dimensions.get('window');
    // iPhone X y modelos más nuevos tienen notch
    return height >= 812 ? 44 : 20;
  }
  
  // Android - usar altura real de status bar
  return StatusBar.currentHeight || 24;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    paddingTop: getStatusBarHeight(),
    paddingBottom: Platform.OS === 'ios' ? 4 : 6, // Reducido de 8/12 a 4/6
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
    minHeight: Platform.OS === 'ios' ? 44 : 48, // Reducido de 60/56 a 44/48
    paddingVertical: Platform.OS === 'ios' ? 6 : 4, // Reducido de 12/8 a 6/4
    marginTop: 0, // Eliminado margen superior
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '70%', // Evita overflow en pantallas pequeñas
  },
  logoContainer: {
    marginRight: 10, // Reducido de 12 a 10
    shadowColor: '#D27F27',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logo: {
    width: 28, // Reducido de 32 a 28
    height: 28, // Reducido de 32 a 28
    borderRadius: 14, // Ajustado para mantener proporción
  },
  appName: {
    fontSize: Platform.OS === 'ios' ? fonts.size.title : fonts.size.title, // Reducido de XL a large
    fontFamily: fonts.original,
    color: '#2F2F2F',
    letterSpacing: 0.5,
    textAlign: 'left',
    flex: 1,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: Platform.OS === 'ios' ? 88 : 80, // Reducido de 100/90 a 88/80
  },
  iconContainer: {
    width: Platform.OS === 'ios' ? 38 : 36, // Reducido de 44/40 a 38/36
    height: Platform.OS === 'ios' ? 38 : 36, // Reducido de 44/40 a 38/36
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Platform.OS === 'ios' ? 6 : 8, // Reducido de 8/12 a 6/8
    borderRadius: Platform.OS === 'ios' ? 19 : 18, // Ajustado para mantener proporción
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
    fontSize: fonts.size.tiny,
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
    marginTop: Platform.OS === 'ios' ? 2 : 4, // Reducido de 4/8 a 2/4
    marginBottom: Platform.OS === 'ios' ? 4 : 2, // Reducido de 8/4 a 4/2
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
    paddingTop: Platform.OS === 'ios' ? getStatusBarHeight() + 70 : 80,
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
  // 🆕 ESTILOS PARA SCROLL EN MODAL NOTIFICACIONES
  notificationScrollView: {
    maxHeight: 280, // Un poco menos que el maxHeight del dropdown (320)
  },
  scrollViewContent: {
    paddingBottom: 4, // Padding inferior para mejor visibilidad
  },
});

export default Header;
