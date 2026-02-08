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
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {AuthContext} from '../context/AuthContext';
import {useNotification} from '../context/NotificationContext';
import axios from 'axios';
import debounce from 'lodash.debounce'; // instala lodash.debounce
import fonts from '../theme/fonts';
import { API_BASE_URL } from '../config/environment';

const Header = ({onLogout}) => {
  const navigation = useNavigation();
  const {user, logout} = useContext(AuthContext);
  const {notifications, markAsRead} = useNotification();
  const unreadCount = notifications.filter(n => !n.read).length;

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const allProductsRef = useRef(null);
  const cancelTokenRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // Animaciones para la barra de búsqueda (versión estable)
  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;
  
  // Animaciones para el logo
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  // Función de búsqueda (client-side)
  const fetchSuggestions = useCallback(async text => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel();
    }
    cancelTokenRef.current = axios.CancelToken.source();

    if (text.length === 0) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      // Cargar productos si no están en cache
      if (!allProductsRef.current) {
        const resp = await axios.get(
          `${API_BASE_URL}/api/products`,
          {cancelToken: cancelTokenRef.current.token},
        );
        allProductsRef.current = resp.data?.data || [];
      }

      const searchLower = text.toLowerCase();

      // Filtrado de productos - busca en nombre
      const filtered = allProductsRef.current.filter(p =>
        p.name?.toLowerCase().includes(searchLower)
      );
      setSuggestions(filtered.slice(0, 6));

    } catch (err) {
      if (!axios.isCancel(err)) {
        console.log('Search error:', err);
        setSuggestions([]);
      }
    } finally {
      setIsSearching(false);
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
    // Guardar en búsquedas recientes
    const newRecent = [item.name, ...recentSearches.filter(s => s !== item.name)].slice(0, 5);
    setRecentSearches(newRecent);

    setSearchText('');
    setSuggestions([]);
    toggleSearchBar();
    navigation.navigate('SearchResults', {query: item.name});
  };

  // Función para buscar desde texto escrito
  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      // Guardar en búsquedas recientes
      const newRecent = [searchText.trim(), ...recentSearches.filter(s => s !== searchText.trim())].slice(0, 5);
      setRecentSearches(newRecent);

      setSuggestions([]);
      toggleSearchBar();
      navigation.navigate('SearchResults', {query: searchText.trim()});
      Keyboard.dismiss();
    }
  };

  // Función para usar búsqueda reciente
  const handleRecentSearch = (term) => {
    setSearchText('');
    setSuggestions([]);
    toggleSearchBar();
    navigation.navigate('SearchResults', {query: term});
  };

  // Limpiar búsqueda reciente
  const clearRecentSearches = () => {
    setRecentSearches([]);
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

  // Focus automático cuando se abre la búsqueda
  useEffect(() => {
    if (showSearchBar && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    }
  }, [showSearchBar]);

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
          {/* Modal con overlay + barra de búsqueda + panel flotante */}
          {showSearchBar && (
            <Modal
              visible={showSearchBar}
              transparent
              animationType="fade"
              onRequestClose={() => {
                Keyboard.dismiss();
                toggleSearchBar();
              }}>
              <TouchableWithoutFeedback
                onPress={() => {
                  Keyboard.dismiss();
                  toggleSearchBar();
                }}>
                <View style={styles.searchOverlay}>
                  <TouchableWithoutFeedback onPress={() => {}}>
                    <View style={styles.searchModalContent}>
                      {/* Barra de búsqueda dentro del modal */}
                      <View style={styles.searchBarInModal}>
                        <Ionicons
                          name="search-outline"
                          size={20}
                          color="#8B5E3C"
                          style={styles.searchIcon}
                        />
                        <TextInput
                          ref={searchInputRef}
                          style={styles.searchInput}
                          placeholder="¿Qué estás buscando?"
                          value={searchText}
                          placeholderTextColor="#999"
                          onChangeText={handleSearch}
                          returnKeyType="search"
                          keyboardShouldPersistTaps="handled"
                          onSubmitEditing={handleSearchSubmit}
                          autoFocus={true}
                        />
                        {searchText.length > 0 && (
                          <TouchableOpacity
                            onPress={() => {
                              setSearchText('');
                              setSuggestions([]);
                            }}
                            style={styles.clearButton}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                          </TouchableOpacity>
                        )}
                        {isSearching && (
                          <ActivityIndicator size="small" color="#D27F27" style={styles.searchLoader} />
                        )}
                        <TouchableOpacity
                          onPress={() => {
                            Keyboard.dismiss();
                            toggleSearchBar();
                          }}
                          style={styles.closeSearchButton}>
                          <Ionicons name="close" size={22} color="#666" />
                        </TouchableOpacity>
                      </View>

                      {/* Panel de sugerencias con scroll */}
                      <ScrollView
                        style={styles.searchPanel}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}>
                        {/* Búsquedas Recientes */}
                        {searchText.length === 0 && recentSearches.length > 0 && (
                          <View style={styles.recentSection}>
                            <View style={styles.recentHeader}>
                              <Text style={styles.recentTitle}>Búsquedas recientes</Text>
                              <TouchableOpacity onPress={clearRecentSearches}>
                                <Text style={styles.clearText}>Limpiar</Text>
                              </TouchableOpacity>
                            </View>
                            {recentSearches.map((term, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.recentItem}
                                onPress={() => handleRecentSearch(term)}>
                                <Ionicons name="time-outline" size={18} color="#888" />
                                <Text style={styles.recentItemText}>{term}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Sugerencias de Productos */}
                        {searchText.length > 0 && suggestions.length > 0 && (
                          <View style={styles.suggestionsSection}>
                            <Text style={styles.suggestionsTitle}>
                              {suggestions.length} producto{suggestions.length !== 1 ? 's' : ''} encontrado{suggestions.length !== 1 ? 's' : ''}
                            </Text>
                            {suggestions.map((item) => (
                              <TouchableOpacity
                                key={item.id.toString()}
                                style={styles.suggestionItem}
                                onPress={() => {
                                  Keyboard.dismiss();
                                  handleSelectSuggestion(item);
                                }}>
                                <Image
                                  source={{uri: item.photo}}
                                  style={styles.suggestionImage}
                                />
                                <View style={styles.suggestionInfo}>
                                  <Text style={styles.suggestionText} numberOfLines={1}>
                                    {item.name}
                                  </Text>
                                  <Text style={styles.suggestionPrice}>
                                    ${parseFloat(item.price || 0).toFixed(2)} MXN
                                  </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#CCC" />
                              </TouchableOpacity>
                            ))}
                            {/* Botón Ver Todos */}
                            <TouchableOpacity
                              style={styles.viewAllButton}
                              onPress={handleSearchSubmit}>
                              <Text style={styles.viewAllText}>Ver todos los resultados</Text>
                              <Ionicons name="arrow-forward" size={18} color="#D27F27" />
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Sin Resultados */}
                        {searchText.length > 0 && !isSearching && suggestions.length === 0 && (
                          <View style={styles.noResultsSection}>
                            <Ionicons name="search-outline" size={48} color="#DDD" />
                            <Text style={styles.noResultsText}>
                              No encontramos "{searchText}"
                            </Text>
                            <Text style={styles.noResultsHint}>
                              Intenta con otro término o revisa la ortografía
                            </Text>
                          </View>
                        )}

                        {/* Mensaje inicial */}
                        {searchText.length === 0 && recentSearches.length === 0 && (
                          <View style={styles.initialSection}>
                            <Ionicons name="search" size={40} color="#DDD" />
                            <Text style={styles.initialText}>
                              Busca productos...
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
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
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  searchLoader: {
    marginLeft: 8,
  },
  // Overlay para cerrar al tocar fuera
  searchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? getStatusBarHeight() + 8 : 12,
  },
  // Contenedor del modal de búsqueda
  searchModalContent: {
    marginHorizontal: 16,
  },
  // Barra de búsqueda dentro del modal
  searchBarInModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  closeSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Panel de búsqueda flotante
  searchPanel: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    maxHeight: 400,
    overflow: 'hidden',
  },
  // Búsquedas recientes
  recentSection: {
    padding: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  recentItemText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#333',
    marginLeft: 10,
  },
  // Sugerencias de productos
  suggestionsSection: {
    padding: 12,
  },
  suggestionsTitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#888',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  suggestionImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  suggestionPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  viewAllText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginRight: 6,
  },
  // Sin resultados
  noResultsSection: {
    alignItems: 'center',
    padding: 32,
  },
  noResultsText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#666',
    marginTop: 12,
  },
  noResultsHint: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  // Estado inicial
  initialSection: {
    alignItems: 'center',
    padding: 24,
  },
  initialText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#999',
    marginTop: 8,
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
