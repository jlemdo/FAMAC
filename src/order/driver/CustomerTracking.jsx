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

  const fetchDriverLocation = useCallback(async (attempt = 0) => {
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/driverlocationsagainstorder/${order.id}`,
        { timeout: 8000 } // 8s timeout
      );
      const lastLoc = res.data.data;
      const lastLocation = lastLoc[lastLoc.length - 1];
      
      if (lastLocation?.driver_lat && lastLocation?.driver_long) {
        setDriverLocation({
          driver_lat: parseFloat(lastLocation.driver_lat),
          driver_long: parseFloat(lastLocation.driver_long),
        });
        
        // Éxito: resetear contadores de error
        setIsConnected(true);
        setRetryCount(0);
      }
    } catch (err) {
      // Manejo inteligente de errores con retry
      const maxRetries = 3;
      const isNetworkError = !err.response; // No response = network issue
      
      if (isNetworkError && attempt < maxRetries) {
        // Retry con exponential backoff: 2s, 4s, 8s
        const backoffDelay = Math.pow(2, attempt + 1) * 1000;
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
    
    // Polling inteligente basado en distancia/ETA
    const setupSmartPolling = () => {
      let interval;
      const updateInterval = () => {
        // Determinar frecuencia basada en ETA
        let pollRate = 8000; // Default: 8 segundos
        
        if (eta.duration <= 5) {
          pollRate = 3000; // Muy cerca: cada 3s
        } else if (eta.duration <= 15) {
          pollRate = 5000; // Cerca: cada 5s
        } else if (eta.duration <= 30) {
          pollRate = 8000; // Medio: cada 8s
        } else {
          pollRate = 12000; // Lejos: cada 12s
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
      <View style={styles.deliveryInfo}>
        <Text style={styles.sectionTitle}>Información del conductor</Text>
        
        {/* 🆕 Payment Status Indicator */}
        {order?.payment_status !== 'completed' && (
          <View style={styles.paymentWarning}>
            <Ionicons name="warning-outline" size={16} color="#FF9800" />
            <Text style={styles.paymentWarningText}>
              ⚠️ Pago pendiente - El conductor no puede procesar esta orden aún
            </Text>
          </View>
        )}
        
        {/* Connection Status Indicator */}
        {!isConnected && (
          <View style={styles.connectionStatus}>
            <Ionicons name="wifi-outline" size={16} color="#E63946" />
            <Text style={styles.connectionText}>
              {retryCount < 3 
                ? `Reintentando conexión... (${retryCount}/3)` 
                : 'Sin conexión - Tocca para reintentar'
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
        
        <Text style={styles.infoText}>
          Nombre: {order?.driver?.first_name} {order?.driver?.last_name}
        </Text>
        <Text style={styles.infoText}>
          Correo: {order?.driver?.email ?? 'correo@ejemplo.com'}
        </Text>
      </View>

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

            {/* Marcadores */}
            <Marker
              coordinate={{
                latitude: driverLocation.driver_lat,
                longitude: driverLocation.driver_long,
              }}
              title="Conductor"
              description="Tu repartidor está aquí"
            />
            <Marker
              coordinate={customer}
              title="Cliente"
              pinColor="#33A744"
              description="Ubicación del cliente"
            />
          </MapView>
          {eta && (
            <View style={styles.hud}>
              <Text style={styles.hudText}>
                🚗 {eta.distance.toFixed(1)} km · ⏱ {Math.ceil(eta.duration)}{' '}
                min
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={() => {
              if (routeCoords.length) {
                mapRef.current.fitToCoordinates(routeCoords, {
                  edgePadding: {top: 80, right: 40, bottom: 80, left: 40},
                  animated: true,
                });
              }
            }}>
            <Ionicons name="locate-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <ActivityIndicator style={styles.loader} size="large" color="#33A744" />
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
  
  // Connection Status Styles
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
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
});

export default CustomerTracking;
