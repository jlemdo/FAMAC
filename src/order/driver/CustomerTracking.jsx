import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';
import fonts from '../../theme/fonts';

const CustomerTracking = ({ order }) => {
    const [driverLocation, setDriverLocation] = useState(null);
    console.log('order', order);
    const fetchDriverLocation = useCallback(async () => {
        try {
            const res = await axios.get(`https://food.siliconsoft.pk/api/driverlocationsagainstorder/${order.id}`);
            //  console.log('Respuesta ubicación conductor:', res.data);
            const lastLoc = res.data.data;
            const lastLocation = lastLoc[lastLoc.length - 1];
            console.log('lastLocation', lastLocation);

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
        // Optional: Uncomment to auto-refresh every 5 seconds
        const intervalId = setInterval(fetchDriverLocation, 5000);
        return () => clearInterval(intervalId);
    }, [fetchDriverLocation]);

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
          style={styles.map}
          initialRegion={{
            latitude: driverLocation.driver_lat,
            longitude: driverLocation.driver_long,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <Marker
            coordinate={{
              latitude: driverLocation.driver_lat,
              longitude: driverLocation.driver_long,
            }}
            title="Ubicación del conductor"
            description="Tu conductor está aquí"
          />
          <Marker
            coordinate={{
              latitude: parseFloat(order.customer_lat),
              longitude: parseFloat(order.customer_long),
            }}
            title="Ubicación del cliente"
            pinColor="#33A744"
            description="Dirección del cliente"
          />
        </MapView>
      </View>
    ) : (
      <ActivityIndicator
        style={styles.loader}
        size="large"
        color="#33A744"
      />
    )}
  </View>
);

};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',    // Crema Suave
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
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',               // Gris Carbón
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
    borderColor: '#8B5E3C',         // Marrón Tierra
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  map: {
    width: '100%',
    height: 300,
  },
  loader: {
    marginTop: 16,
  },
});


export default CustomerTracking;
