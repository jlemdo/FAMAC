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

  const fetchDriverLocation = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/driverlocationsagainstorder/${order.id}`,
      );
      const lastLoc = res.data.data;
      const lastLocation = lastLoc[lastLoc.length - 1];
      if (lastLocation?.driver_lat && lastLocation?.driver_long) {
        setDriverLocation({
          driver_lat: parseFloat(lastLocation.driver_lat),
          driver_long: parseFloat(lastLocation.driver_long),
        });
      }
    } catch (err) {
      console.log('Driver location fetch failed:', err);
    }
  }, [order.id]);

  useEffect(() => {
    fetchDriverLocation();
    const intervalId = setInterval(fetchDriverLocation, 5000);
    return () => clearInterval(intervalId);
  }, [fetchDriverLocation]);

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
                console.log('🗺️ Directions result:', result);
                setEta({distance: result.distance, duration: result.duration});
                setRouteCoords(result.coordinates); // ← Guardamos coords
                mapRef.current.fitToCoordinates(result.coordinates, {
                  edgePadding: {top: 80, right: 40, bottom: 80, left: 40},
                  animated: true,
                });
              }}
              onError={errorMessage => {
                console.error('❌ Directions error:', errorMessage);
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
});

export default CustomerTracking;
