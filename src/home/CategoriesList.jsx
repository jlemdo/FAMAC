import React, {useState, useEffect, useCallback, useMemo, memo} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
  Modal,
  StatusBar,
  PanResponder,
  Animated,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import axios from 'axios';
import fonts from '../theme/fonts';
import {useAlert} from '../context/AlertContext';
import { API_BASE_URL } from '../config/environment';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// COMPONENTE OPTIMIZADO DE IMAGEN CON SKELETON
// ============================================
const OptimizedImage = memo(({ uri, style, containerStyle }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];

  const onLoad = useCallback(() => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const onError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  return (
    <View style={containerStyle}>
      {/* Skeleton placeholder */}
      {!loaded && (
        <View style={[style, styles.skeleton]}>
          <ActivityIndicator size="small" color="#D27F27" />
        </View>
      )}

      {/* Imagen real */}
      {!error && (
        <Animated.Image
          source={{ uri, cache: 'force-cache' }}
          style={[style, { opacity, position: loaded ? 'relative' : 'absolute' }]}
          onLoad={onLoad}
          onError={onError}
          resizeMode="cover"
        />
      )}

      {/* Fallback si hay error */}
      {error && (
        <View style={[style, styles.errorPlaceholder]}>
          <Ionicons name="image-outline" size={24} color="#CCC" />
        </View>
      )}
    </View>
  );
});

// ============================================
// COMPONENTE DE CATEGORÍA INDIVIDUAL OPTIMIZADO
// ============================================
const CategoryItem = memo(({ item, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <TouchableOpacity
      style={styles.rowCategory}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Categoría ${item.name}`}>
      <View style={styles.rowImageContainer}>
        <OptimizedImage
          uri={item.photo}
          style={styles.rowImage}
          containerStyle={styles.rowImageWrapper}
        />
      </View>
      <Text style={styles.rowCategoryName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
});

// ============================================
// COMPONENTE DE VIDEO OPTIMIZADO
// ============================================
const VideoCard = memo(({ video, index, isActive, isScrolling, onPress, onVideoReady }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    if (index === 0) {
      onVideoReady();
    }
  }, [index, onVideoReady]);

  const handlePress = useCallback(() => {
    onPress(index);
  }, [index, onPress]);

  // Solo renderizar el video si está activo o es adyacente
  const shouldRenderVideo = Math.abs(index - (isActive ? index : 0)) <= 1;

  return (
    <View style={styles.videoCard}>
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={handlePress}
        activeOpacity={0.9}>

        {/* Thumbnail/Placeholder mientras carga */}
        {!isLoaded && (
          <View style={styles.videoPlaceholder}>
            <ActivityIndicator size="large" color="#D27F27" />
          </View>
        )}

        {shouldRenderVideo && (
          <Video
            source={video.source}
            style={styles.video}
            resizeMode="cover"
            repeat={true}
            muted={true}
            paused={!isActive || isScrolling}
            onLoad={handleLoad}
            onError={() => {}}
            bufferConfig={{
              minBufferMs: 500,
              maxBufferMs: 3000,
              bufferForPlaybackMs: 250,
              bufferForPlaybackAfterRebufferMs: 500
            }}
            maxBitRate={800000}
            progressUpdateInterval={1000}
          />
        )}

        <View style={styles.videoOverlay}>
          <View style={styles.videoTextContainer}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {video.title}
            </Text>
            <Text style={styles.videoDescription} numberOfLines={2}>
              {video.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function CategoriesList() {
  const navigation = useNavigation();
  const route = useRoute();
  const {showAlert} = useAlert();

  // States
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoCarouselReady, setVideoCarouselReady] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  // Estados para el modal de pantalla completa
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [fullscreenVideoIndex, setFullscreenVideoIndex] = useState(0);
  const [fullscreenPaused, setFullscreenPaused] = useState(false);
  const [fullscreenMuted, setFullscreenMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Videos con fallback
  const [videos, setVideos] = useState([
    {
      id: 1,
      title: "100% Productos Naturales",
      description: "Sin conservadores artificiales, directo del campo a tu mesa",
      source: require('../assets/welcome.mp4'),
    },
    {
      id: 2,
      title: "Trato Ético con Animales",
      description: "Cuidamos el bienestar animal en cada paso del proceso",
      source: require('../assets/welcome.mp4'),
    },
    {
      id: 3,
      title: "Amor en Cada Producto",
      description: "Elaborados con dedicación y respeto por la naturaleza",
      source: require('../assets/welcome.mp4'),
    },
  ]);

  // ============================================
  // FUNCIONES MEMOIZADAS
  // ============================================

  const sortCategoriesByOrder = useCallback((cats) => {
    const desiredOrder = [
      'Quesos Frescos',
      'Quesos Maduros',
      'Otros Lácteos',
      'Otros Productos'
    ];

    const sortedCategories = [];

    desiredOrder.forEach(categoryName => {
      const category = cats.find(cat =>
        cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
        categoryName.toLowerCase().includes(cat.name.toLowerCase())
      );
      if (category) {
        sortedCategories.push(category);
      }
    });

    cats.forEach(category => {
      if (!sortedCategories.find(sorted => sorted.id === category.id)) {
        sortedCategories.push(category);
      }
    });

    return sortedCategories;
  }, []);

  const handleCategoryPress = useCallback((item) => {
    navigation.navigate('CategoryProducts', {
      categoryId: item.id,
      categoryName: item.name,
    });
  }, [navigation]);

  const openFullscreenVideo = useCallback((index) => {
    const videoIndex = index !== undefined ? index : currentVideoIndex;
    setFullscreenVideoIndex(videoIndex);
    setShowFullscreenVideo(true);
    setFullscreenPaused(false);
    setFullscreenMuted(false);
    setShowControls(true);
  }, [currentVideoIndex]);

  const closeFullscreenVideo = useCallback(() => {
    setShowFullscreenVideo(false);
    setFullscreenPaused(false);
  }, []);

  const toggleFullscreenPlay = useCallback(() => {
    setFullscreenPaused(prev => !prev);
    setShowControls(true);
    setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const toggleFullscreenMute = useCallback(() => {
    setFullscreenMuted(prev => !prev);
  }, []);

  const goToNextVideo = useCallback(() => {
    setFullscreenVideoIndex(prev => (prev + 1) % videos.length);
    setFullscreenPaused(false);
  }, [videos.length]);

  const goToPreviousVideo = useCallback(() => {
    setFullscreenVideoIndex(prev => prev === 0 ? videos.length - 1 : prev - 1);
    setFullscreenPaused(false);
  }, [videos.length]);

  const handleVideoReady = useCallback(() => {
    if (!videoCarouselReady) {
      setVideoCarouselReady(true);
    }
  }, [videoCarouselReady]);

  const handleScrollEnd = useCallback((event) => {
    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentVideoIndex(newIndex);
    }
    setScrolling(false);
  }, [currentVideoIndex, videos.length]);

  // PanResponder memoizado
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 30,
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy < -80) {
        goToNextVideo();
      } else if (gestureState.dy > 80) {
        goToPreviousVideo();
      }
    },
    onPanResponderTerminationRequest: () => false,
  }), [goToNextVideo, goToPreviousVideo]);

  // Categorías filtradas memoizadas
  const filteredCategories = useMemo(() =>
    categories.filter(item => !item.name.toLowerCase().includes('sugerencias')),
    [categories]
  );

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch categories
  useEffect(() => {
    const controller = new AbortController();

    axios
      .get(`${API_BASE_URL}/api/productscats`, { signal: controller.signal })
      .then(response => {
        const sortedCategories = sortCategoriesByOrder(response.data.data);
        setCategories(sortedCategories);
        setLoading(false);

        // Prefetch de imágenes de categorías
        sortedCategories.forEach(cat => {
          if (cat.photo) {
            Image.prefetch(cat.photo).catch(() => {});
          }
        });
      })
      .catch(err => {
        if (!axios.isCancel(err)) {
          setError('Error al cargar las categorías. Por favor, inténtalo de nuevo más tarde.');
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [sortCategoriesByOrder]);

  // Fetch Instagram videos
  useEffect(() => {
    const controller = new AbortController();

    axios
      .get(`${API_BASE_URL}/api/instagram-feed`, { signal: controller.signal })
      .then(response => {
        if (response.data.success && response.data.data.length > 0) {
          const instagramVideos = response.data.data.map(post => ({
            id: post.id,
            title: post.title,
            description: post.description,
            source: { uri: post.media_url },
            thumbnail: post.thumbnail_url,
            instagramUrl: post.instagram_url,
            type: post.type,
          }));
          setVideos(instagramVideos);
        }
      })
      .catch(() => {
        // Mantener videos de respaldo
      });

    return () => controller.abort();
  }, []);

  // Handle success modal from order
  useEffect(() => {
    const params = route.params;

    if (params?.showSuccessModal && params?.orderData) {
      const { orderData } = params;

      setTimeout(() => {
        if (orderData.oxxoInfo) {
          const expirationDate = new Date(orderData.oxxoInfo.expiration * 1000).toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          showAlert({
            type: 'warning',
            title: 'Voucher OXXO Listo',
            message: `Pedido #${orderData.orderNumber}\n\n` +
                     `Referencia:\n${orderData.oxxoInfo.voucherNumber}\n\n` +
                     `Monto: $${orderData.oxxoInfo.amount}\n` +
                     `Fecha límite: ${expirationDate}\n\n` +
                     `Presenta esta referencia en cualquier OXXO para completar tu pago.`,
            confirmText: 'Descargar Voucher',
            cancelText: 'Continuar',
            onConfirm: () => {
              Linking.openURL(orderData.oxxoInfo.voucherURL);
            },
            onCancel: () => {
              navigation.setParams({ showSuccessModal: false, orderData: null });
            }
          });
        } else {
          showAlert({
            type: 'success',
            title: '¡Pedido Confirmado!',
            message: `Pedido #${orderData.orderNumber}\n` +
                     `${orderData.itemCount} producto${orderData.itemCount !== 1 ? 's' : ''} • $${orderData.totalPrice.toFixed(2)}\n\n` +
                     `Fecha y hora de entrega:\n${orderData.deliveryText}` +
                     `${orderData.needInvoice ? '\n\nFactura solicitada' : ''}`,
            confirmText: 'Ver pedido',
            cancelText: 'Continuar',
            onConfirm: () => {
              if (orderData.orderId) {
                navigation.navigate('OrderDetails', { orderId: orderData.orderId });
              } else {
                navigation.navigate('MainTabs', { screen: 'Pedidos' });
              }
            },
            onCancel: () => {
              navigation.setParams({ showSuccessModal: false, orderData: null });
            }
          });
        }
      }, 500);

      navigation.setParams({ showSuccessModal: false, orderData: null });
    }
  }, [route.params, navigation, showAlert]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#D27F27" />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#E63946" />
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
            }}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fila de categorías */}
      <View style={styles.categoriesRow}>
        {filteredCategories.map((item) => (
          <CategoryItem
            key={`cat-${item.id}`}
            item={item}
            onPress={handleCategoryPress}
          />
        ))}
      </View>

      {/* Carrusel de Videos */}
      <View style={styles.videoSection}>
        <Text style={styles.videoSectionTitle}>Descubre más</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.videoCarousel}
          contentContainerStyle={styles.videoCarouselContent}
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="center"
          onScrollBeginDrag={() => setScrolling(true)}
          onMomentumScrollEnd={handleScrollEnd}
          removeClippedSubviews={true}>
          {videos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              index={index}
              isActive={index === currentVideoIndex && videoCarouselReady && !scrolling}
              isScrolling={scrolling}
              onPress={openFullscreenVideo}
              onVideoReady={handleVideoReady}
            />
          ))}
        </ScrollView>

        {/* Indicadores */}
        <View style={styles.videoIndicators}>
          {videos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.videoIndicator,
                index === currentVideoIndex && styles.videoIndicatorActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Modal de Video en Pantalla Completa */}
      <Modal
        visible={showFullscreenVideo}
        animationType="fade"
        transparent={false}
        onRequestClose={closeFullscreenVideo}>
        <StatusBar hidden />
        <View style={styles.fullscreenContainer} {...panResponder.panHandlers}>
          <TouchableOpacity
            style={styles.fullscreenVideoWrapper}
            onPress={toggleFullscreenPlay}
            activeOpacity={1}>
            <Video
              key={`fullscreen-video-${fullscreenVideoIndex}`}
              source={videos[fullscreenVideoIndex]?.source}
              style={styles.fullscreenVideo}
              resizeMode="contain"
              repeat={true}
              muted={fullscreenMuted}
              paused={fullscreenPaused}
            />
          </TouchableOpacity>

          {showControls && (
            <View style={styles.fullscreenControls}>
              <View style={styles.fullscreenHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeFullscreenVideo}>
                  <Ionicons name="close" size={30} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={toggleFullscreenPlay}>
                    <Ionicons
                      name={fullscreenPaused ? "play" : "pause"}
                      size={24}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={toggleFullscreenMute}>
                    <Ionicons
                      name={fullscreenMuted ? "volume-mute" : "volume-high"}
                      size={24}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fullscreenInfo}>
                <Text style={styles.fullscreenTitle}>
                  {videos[fullscreenVideoIndex]?.title}
                </Text>
                <Text style={styles.fullscreenDescription}>
                  {videos[fullscreenVideoIndex]?.description}
                </Text>
              </View>

              <View style={styles.navigationIndicator}>
                <Text style={styles.swipeHint}>
                  ↑ Desliza para siguiente video ↓
                </Text>
                <Text style={styles.videoCounter}>
                  {fullscreenVideoIndex + 1} de {videos.length}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // Loading & Error
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorMessage: {
    fontSize: fonts.size.medium,
    color: '#666',
    textAlign: 'center',
    fontFamily: fonts.regular,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#D27F27',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // Skeleton & Placeholders
  skeleton: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Categories Row
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
    width: '100%',
  },
  rowCategory: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 85,
  },
  rowImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#8B5E3C',
    overflow: 'hidden',
  },
  rowImageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  rowImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  rowCategoryName: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
    minHeight: 28,
    textAlignVertical: 'center',
  },

  // Video Section
  videoSection: {
    flex: 1,
    marginBottom: 24,
  },
  videoSectionTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 16,
    marginLeft: 8,
  },
  videoCarousel: {
    flex: 1,
    marginBottom: 16,
  },
  videoCarouselContent: {
    alignItems: 'center',
  },
  videoCard: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
    flex: 1,
  },
  videoContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    flex: 1,
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  video: {
    width: '100%',
    flex: 1,
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  videoTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  videoTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  videoDescription: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  videoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 94, 60, 0.3)',
    marginHorizontal: 4,
  },
  videoIndicatorActive: {
    backgroundColor: '#8B5E3C',
    width: 24,
  },

  // Fullscreen Modal
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideoWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullscreenControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  fullscreenHeader: {
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerControls: {
    flexDirection: 'column',
    gap: 10,
  },
  fullscreenInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fullscreenTitle: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  fullscreenDescription: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controlButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  navigationIndicator: {
    alignItems: 'center',
    marginBottom: 20,
  },
  swipeHint: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  videoCounter: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
