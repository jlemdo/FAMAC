import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; // ← y esto si aún no lo tienes
import MapView, {Marker} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Config from 'react-native-config';
import axios from 'axios';
import fonts from '../../theme/fonts';

const CustomerTracking = ({order}) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const mapRef = useRef(null);
  const [eta, setEta] = useState({distance: 0, duration: 0});
  const [routeCoords, setRouteCoords] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isFollowingDriver, setIsFollowingDriver] = useState(true); // Auto-seguimiento del driver
  const lastDriverLocationRef = useRef(null); // Para detectar cambios de ubicación

  const fetchDriverLocation = useCallback(async (attempt = 0) => {
    try {
      const res = await axios.get(
        `https://occr.pixelcrafters.digital/api/driverlocationsagainstorder/${order.id}`,
        { timeout: 8000 } // 8s timeout
      );
      const lastLoc = res.data.data;
      const lastLocation = lastLoc[lastLoc.length - 1];
      
      if (lastLocation?.driver_lat && lastLocation?.driver_long) {
        const newLocation = {
          driver_lat: parseFloat(lastLocation.driver_lat),
          driver_long: parseFloat(lastLocation.driver_long),
        };

        setDriverLocation(newLocation);

        // Auto-zoom al driver si está en modo seguimiento
        if (isFollowingDriver && mapRef.current) {
          // Solo animar si la ubicación cambió significativamente
          const prevLoc = lastDriverLocationRef.current;
          if (!prevLoc ||
              Math.abs(prevLoc.driver_lat - newLocation.driver_lat) > 0.0001 ||
              Math.abs(prevLoc.driver_long - newLocation.driver_long) > 0.0001) {

            mapRef.current.animateToRegion({
              latitude: newLocation.driver_lat,
              longitude: newLocation.driver_long,
              latitudeDelta: 0.01, // Zoom cercano al driver
              longitudeDelta: 0.01,
            }, 1000); // Animación suave de 1 segundo
          }
        }

        lastDriverLocationRef.current = newLocation;

        // Éxito: resetear contadores de error
        setIsConnected(true);
        setRetryCount(0);
      }
    } catch (err) {
      // ARREGLADO: Manejo mejorado de errores y throttling
      const maxRetries = 3;
      const isNetworkError = !err.response;
      const isThrottleError = err.response?.data?.message?.includes('Too Many Attempts');

      if (isThrottleError) {
        // Throttling - no es un error real, solo esperamos más tiempo
        // console.warn('⚠️ Rate limiting en customer tracking - esperando');
        setIsConnected(true); // Mantener como conectado
        setRetryCount(0); // No contar como retry
      } else if (isNetworkError && attempt < maxRetries) {
        // Retry con exponential backoff: 3s, 6s, 12s (más conservador)
        const backoffDelay = Math.pow(2, attempt + 1) * 1500;
        setIsConnected(false);
        setRetryCount(attempt + 1);

        setTimeout(() => {
          fetchDriverLocation(attempt + 1);
        }, backoffDelay);
      } else {
        // Max retries alcanzado o error del servidor
        setIsConnected(false);
        setRetryCount(maxRetries);
      }
    }
  }, [order.id]);

  useEffect(() => {
    fetchDriverLocation();
    
    // Polling mejorado para evitar rate limiting
    const setupSmartPolling = () => {
      let interval;
      const updateInterval = () => {
        // ARREGLADO: Frecuencias más conservadoras para evitar throttling
        let pollRate = 15000; // Default: 15 segundos (era 8s)

        if (eta.duration <= 5) {
          pollRate = 8000; // Muy cerca: cada 8s (era 3s)
        } else if (eta.duration <= 15) {
          pollRate = 12000; // Cerca: cada 12s (era 5s)
        } else if (eta.duration <= 30) {
          pollRate = 15000; // Medio: cada 15s (era 8s)
        } else {
          pollRate = 20000; // Lejos: cada 20s (era 12s)
        }

        clearInterval(interval);
        interval = setInterval(fetchDriverLocation, pollRate);
      };
      
      updateInterval();
      
      // Reajustar cada vez que cambie el ETA
      const metaInterval = setInterval(updateInterval, 30000); // cada 30s
      
      return () => {
        clearInterval(interval);
        clearInterval(metaInterval);
      };
    };
    
    const cleanup = setupSmartPolling();
    return cleanup;
  }, [fetchDriverLocation, eta.duration]);

  // Define customer coords antes del return
  const customer = {
    latitude: parseFloat(order.customer_lat),
    longitude: parseFloat(order.customer_long),
  };

  // Return JSX
  return (
    <View style={styles.container}>

      {/* Warnings de estado */}
      {order?.payment_status !== 'paid' && (
        <View style={styles.paymentWarning}>
          <Ionicons name="warning-outline" size={16} color="#FF9800" />
          <Text style={styles.paymentWarningText}>
            ⚠️ Pago pendiente - El repartidor no puede procesar esta orden aún
          </Text>
        </View>
      )}
      
      {!isConnected && (
        <View style={styles.connectionStatus}>
          <Ionicons name="wifi-outline" size={16} color="#E63946" />
          <Text style={styles.connectionText}>
            {retryCount < 3 
              ? `Reintentando conexión... (${retryCount}/3)` 
              : 'Sin conexión - Toca para reintentar'
            }
          </Text>
          {retryCount >= 3 && (
            <TouchableOpacity 
              onPress={() => fetchDriverLocation(0)} 
              style={styles.retryButton}>
              <Ionicons name="refresh" size={16} color="#2196F3" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {driverLocation ? (
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            showsTraffic={true}
            initialRegion={{
              latitude: (driverLocation.driver_lat + customer.latitude) / 2,
              longitude: (driverLocation.driver_long + customer.longitude) / 2,
              latitudeDelta:
                Math.abs(driverLocation.driver_lat - customer.latitude) * 1.5,
              longitudeDelta:
                Math.abs(driverLocation.driver_long - customer.longitude) * 1.5,
            }}>
            {/* Trazar ruta */}
            <MapViewDirections
              origin={{
                latitude: driverLocation.driver_lat,
                longitude: driverLocation.driver_long,
              }}
              destination={customer}
              apikey={Config.GOOGLE_DIRECTIONS_API_KEY}
              strokeWidth={4}
              strokeColor="#8B5E3C"
              onReady={result => {
                setEta({distance: result.distance, duration: result.duration});
                setRouteCoords(result.coordinates); // ← Guardamos coords
                mapRef.current.fitToCoordinates(result.coordinates, {
                  edgePadding: {top: 80, right: 40, bottom: 80, left: 40},
                  animated: true,
                });
              }}
              onError={errorMessage => {
                // Directions error
              }}
            />

            {/* Marcadores con iconos personalizados */}
            <Marker
              coordinate={{
                latitude: driverLocation.driver_lat,
                longitude: driverLocation.driver_long,
              }}
              title="Repartidor"
              description="Tu repartidor está aquí"
              anchor={{x: 0.5, y: 0.5}}
            >
              <View style={styles.markerContainer}>
                <Text style={styles.cowIcon}>🐄</Text>
              </View>
            </Marker>
            <Marker
              coordinate={customer}
              title="Tu ubicación"
              description="Lugar de entrega"
              anchor={{x: 0.5, y: 0.5}}
            >
              <View style={styles.markerContainer}>
                <Text style={styles.houseIcon}>🏠</Text>
              </View>
            </Marker>
          </MapView>
          {eta && (
            <View style={styles.hud}>
              <Text style={styles.hudText}>
                🚗 {eta.distance.toFixed(1)} km · ⏱ {Math.ceil(eta.duration)}{' '}
                min
              </Text>
            </View>
          )}
          {/* Botón para centrar en driver */}
          <TouchableOpacity
            style={[styles.recenterBtn, isFollowingDriver && styles.recenterBtnActive]}
            onPress={() => {
              if (isFollowingDriver) {
                // Si está siguiendo, mostrar ruta completa
                setIsFollowingDriver(false);
                if (routeCoords.length) {
                  mapRef.current.fitToCoordinates(routeCoords, {
                    edgePadding: {top: 80, right: 40, bottom: 80, left: 40},
                    animated: true,
                  });
                }
              } else {
                // Si no está siguiendo, activar seguimiento del driver
                setIsFollowingDriver(true);
                if (driverLocation) {
                  mapRef.current.animateToRegion({
                    latitude: driverLocation.driver_lat,
                    longitude: driverLocation.driver_long,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }, 1000);
                }
              }
            }}>
            <Ionicons
              name={isFollowingDriver ? "navigate" : "locate-outline"}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          {/* Indicador de modo seguimiento */}
          {isFollowingDriver && (
            <View style={styles.followingIndicator}>
              <Text style={styles.followingText}>Siguiendo al repartidor</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.waitingCard}>
          <View style={styles.waitingContent}>
            <Ionicons name="time-outline" size={48} color="#D27F27" />
            <Text style={styles.waitingTitle}>Esperando a tu repartidor</Text>
            <Text style={styles.waitingText}>
              Tu pedido ha sido asignado a un repartidor. En unos momentos aparecerá su ubicación en tiempo real.
            </Text>
            <ActivityIndicator style={styles.waitingSpinner} size="large" color="#D27F27" />
          </View>
        </View>
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4', // Crema Suave
    // padding: 16,                    // escala: 16px
  },
  deliveryInfo: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F', // Gris Carbón
    marginBottom: 8,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#444',
    marginBottom: 4,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C', // Marrón Tierra
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  map: {
    width: '100%',
    height: 300,
  },
  loader: {
    marginTop: 16,
  },
  hud: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 10,
  },
  hudText: {
    fontFamily: fonts.bold,
    color: '#FFF',
    fontSize: fonts.size.small,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#33A744',
    padding: 12,
    borderRadius: 24,
    elevation: 4,
  },
  recenterBtnActive: {
    backgroundColor: '#D27F27', // Color naranja cuando está siguiendo
  },
  followingIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(210, 127, 39, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 3,
  },
  followingText: {
    color: '#FFF',
    fontSize: fonts.size.tiny,
    fontFamily: fonts.bold,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cowIcon: {
    fontSize: 32,
    textAlign: 'center',
  },
  houseIcon: {
    fontSize: 28,
    textAlign: 'center',
  },
  
  // Connection Status Styles
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E63946',
  },
  connectionText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#E63946',
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    marginLeft: 8,
    padding: 4,
  },
  
  // 🆕 Payment Warning Styles
  paymentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  paymentWarningText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#F57C00',
    marginLeft: 8,
    flex: 1,
  },
  
  // 🆕 Waiting Card Styles
  waitingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  waitingContent: {
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  waitingSpinner: {
    marginTop: 8,
  },
});

export default CustomerTracking;
