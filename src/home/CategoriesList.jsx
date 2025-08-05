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
  Dimensions,
  Modal,
  StatusBar,
  PanResponder,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import axios from 'axios';
import fonts from '../theme/fonts';

export default function CategoriesList() {
  const navigation = useNavigation();

  // State hooks for categories, loading, and error handling
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para el carrusel de videos
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoCarouselReady, setVideoCarouselReady] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  
  // Estados para el modal de pantalla completa
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [fullscreenVideoIndex, setFullscreenVideoIndex] = useState(0);
  const [fullscreenPaused, setFullscreenPaused] = useState(false);
  const [fullscreenMuted, setFullscreenMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Videos locales - listos para reemplazar con tus videos descargados
  const videos = [
    {
      id: 1,
      title: "100% Productos Naturales",
      description: "Sin conservadores artificiales, directo del campo a tu mesa",  
      source: require('../assets/welcome.mp4'), // Temporal: cambiar por video1.mp4 cuando tengas el archivo
    },
    {
      id: 2,
      title: "Trato Ético con Animales",
      description: "Cuidamos el bienestar animal en cada paso del proceso",
      source: require('../assets/welcome.mp4'), // Temporal: cambiar por video2.mp4 cuando tengas el archivo
    },
    {
      id: 3,
      title: "Amor en Cada Producto", 
      description: "Elaborados con dedicación y respeto por la naturaleza",
      source: require('../assets/welcome.mp4'), // Temporal: cambiar por video3.mp4 cuando tengas el archivo
    },
  ];

  // Funciones para el video en pantalla completa
  const openFullscreenVideo = (index) => {
    // Usar el índice actual del carrusel si no se especifica uno
    const videoIndex = index !== undefined ? index : currentVideoIndex;
    setFullscreenVideoIndex(videoIndex);
    setShowFullscreenVideo(true);
    setFullscreenPaused(false);
    setFullscreenMuted(false);
    setShowControls(true);
  };

  const closeFullscreenVideo = () => {
    setShowFullscreenVideo(false);
    setFullscreenPaused(false);
  };

  const toggleFullscreenPlay = () => {
    setFullscreenPaused(!fullscreenPaused);
    setShowControls(true);
    // Ocultar controles después de 3 segundos
    setTimeout(() => {
      if (!fullscreenPaused) {
        setShowControls(false);
      }
    }, 3000);
  };

  const toggleFullscreenMute = () => {
    setFullscreenMuted(!fullscreenMuted);
  };

  // Funciones para navegar entre videos
  const goToNextVideo = () => {
    const nextIndex = (fullscreenVideoIndex + 1) % videos.length;
    setFullscreenVideoIndex(nextIndex);
    setFullscreenPaused(false);
  };

  const goToPreviousVideo = () => {
    const prevIndex = fullscreenVideoIndex === 0 ? videos.length - 1 : fullscreenVideoIndex - 1;
    setFullscreenVideoIndex(prevIndex);
    setFullscreenPaused(false);
  };

  // PanResponder para gestos de swipe
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 30; // Reducido el umbral
    },
    onPanResponderGrant: () => {
      // El usuario ha comenzado a hacer swipe
    },
    onPanResponderMove: (evt, gestureState) => {
      // Opcional: agregar feedback visual durante el gesto
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy < -80) {
        // Swipe up - siguiente video
        goToNextVideo();
      } else if (gestureState.dy > 80) {
        // Swipe down - video anterior
        goToPreviousVideo();
      }
    },
    onPanResponderTerminationRequest: () => false, // No permitir que otros componentes tomen el control
  });

  // Función para ordenar las categorías según el orden deseado
  const sortCategoriesByOrder = (categories) => {
    const desiredOrder = [
      'Quesos Frescos',
      'Quesos Maduros', 
      'Otros Lácteos',
      'Otros Productos'
    ];

    const sortedCategories = [];
    
    // Primero agregar las categorías en el orden deseado
    desiredOrder.forEach(categoryName => {
      const category = categories.find(cat => 
        cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
        categoryName.toLowerCase().includes(cat.name.toLowerCase())
      );
      if (category) {
        sortedCategories.push(category);
      }
    });
    
    // Luego agregar cualquier categoría restante que no esté en el orden deseado
    categories.forEach(category => {
      if (!sortedCategories.find(sorted => sorted.id === category.id)) {
        sortedCategories.push(category);
      }
    });
    
    return sortedCategories;
  };

  // Fetch categories from the API
  useEffect(() => {
    axios
      .get('https://food.siliconsoft.pk/api/productscats')
      .then(response => {
        const originalCategories = response.data.data;
        const sortedCategories = sortCategoriesByOrder(originalCategories);
        setCategories(sortedCategories);
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
      {/* <Text style={styles.mainTitle}>Categorías</Text> */}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="tomato" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      ) : (
        <>
          {/* Fila de 4 categorías distribuidas uniformemente */}
          <View style={styles.categoriesRow}>
            {categories
              .filter(item => !item.name.toLowerCase().includes('sugerencias'))
              .map((item) => (
              <TouchableOpacity
                key={`row-${item.id}`}
                style={styles.rowCategory}
                onPress={() =>
                  navigation.navigate('CategoryProducts', {
                    categoryId: item.id,
                    categoryName: item.name,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Categoría ${item.name}`}>
                <View style={styles.rowImageContainer}>
                  <Image
                    source={{ uri: item.photo }}
                    style={styles.rowImage}
                    accessible={false}
                  />
                </View>
                <Text style={styles.rowCategoryName} numberOfLines={2}>
                  {item.name}
                </Text>
              </TouchableOpacity>
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
              snapToInterval={Dimensions.get('window').width}
              snapToAlignment="center"
              onScrollBeginDrag={() => setScrolling(true)}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(
                  event.nativeEvent.contentOffset.x / Dimensions.get('window').width
                );
                if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
                  setCurrentVideoIndex(newIndex);
                }
                setScrolling(false);
              }}>
              {videos.map((video, index) => (
                <View key={video.id} style={styles.videoCard}>
                  <TouchableOpacity
                    style={styles.videoContainer}
                    onPress={() => openFullscreenVideo(index)}
                    activeOpacity={0.9}>
                    <Video
                      source={video.source}
                      style={styles.video}
                      resizeMode="cover"
                      repeat={true}
                      muted={true}
                      paused={!videoCarouselReady || scrolling || index !== currentVideoIndex}
                      onLoad={() => {
                        if (index === 0 && !videoCarouselReady) {
                          setVideoCarouselReady(true);
                        }
                      }}
                      onError={(error) => {
                        // Video error
                      }}
                      bufferConfig={{
                        minBufferMs: 1000,
                        maxBufferMs: 5000,
                        bufferForPlaybackMs: 500,
                        bufferForPlaybackAfterRebufferMs: 1000
                      }}
                      maxBitRate={1000000}
                    />
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
              ))}
            </ScrollView>
            
            {/* Indicadores de página */}
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
                  onLoad={() => {
                    // Fullscreen video loaded
                  }}
                  onError={(error) => {
                    // Fullscreen video error
                  }}
                />
              </TouchableOpacity>

              {/* Controles superpuestos */}
              {showControls && (
                <View style={styles.fullscreenControls}>
                  {/* Header con botón de cerrar y controles */}
                  <View style={styles.fullscreenHeader}>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={closeFullscreenVideo}>
                      <Ionicons name="close" size={30} color="#FFF" />
                    </TouchableOpacity>
                    
                    {/* Controles de reproducción debajo del botón cerrar */}
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

                  {/* Información del video */}
                  <View style={styles.fullscreenInfo}>
                    <Text style={styles.fullscreenTitle}>
                      {videos[fullscreenVideoIndex]?.title}
                    </Text>
                    <Text style={styles.fullscreenDescription}>
                      {videos[fullscreenVideoIndex]?.description}
                    </Text>
                  </View>

                  {/* Indicador de navegación */}
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
        </>
      )}

      {/* Lista original de categorías */}
          {/* <FlatList
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
          /> */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  mainTitle: {
    fontSize: fonts.size.XL, // Reducido desde XLLL (48px) a XL (30px) para mejor compatibilidad
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
    fontFamily: fonts.bold,
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
  
  // Estilos de la fila de 4 categorías (1x4)
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribuye uniformemente
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
    width: '100%',
  },
  rowCategory: {
    flex: 1, // Cada categoría toma el mismo espacio
    alignItems: 'center',
    maxWidth: 85, // Limita el ancho máximo para que no se estiren demasiado
  },
  rowImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    // Sombra sutil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Borde normal
    borderWidth: 2,
    borderColor: '#8B5E3C',
  },
  rowImage: {
    width: 56,  // Aumenté de 52 a 56 para que ocupe más espacio
    height: 56, // Aumenté de 52 a 56 para que ocupe más espacio
    borderRadius: 28, // Actualizado el radius proporcionalmente
    resizeMode: 'cover',
  },
  rowCategoryName: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
    minHeight: 28, // Altura mínima para 2 líneas (14 * 2)
    textAlignVertical: 'center', // Centra verticalmente el texto
  },
  
  // Estilos del carrusel de videos
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
    width: Dimensions.get('window').width,
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
  video: {
    width: '100%',
    flex: 1,
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
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
  
  // Estilos del modal de pantalla completa
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
