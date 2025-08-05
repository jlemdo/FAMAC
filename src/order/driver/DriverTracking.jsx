import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  PermissionsAndroid,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import {useNavigation, useRoute} from '@react-navigation/native';
import MapView, {Marker} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Config from 'react-native-config';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AuthContext} from '../../context/AuthContext';
import GetLocation from 'react-native-get-location';
import axios from 'axios';
import {OrderContext} from '../../context/OrderContext';
import fonts from '../../theme/fonts';

const DriverTracking = ({order}) => {
  const navigation = useNavigation();
  const [latlong, setLatlong] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState({distance: 0, duration: 0});
  const mapRef = useRef(null);


  const handleDriverLocation = async () => {
    submitDriverLocation();
  };

  const submitDriverLocation = useCallback(async () => {
    const payload = {
      orderid: order.id,
      driver_lat: latlong.driver_lat,
      driver_long: latlong.driver_long,
    };

    try {
      const response = await axios.post(
        'https://food.siliconsoft.pk/api/driverlocsubmit',
        payload,
      );
      if (response.status == 201) {
        fetchOrder();
      }
    } catch (error) {
    }
  }, [order.id, latlong, fetchOrder]);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/orderdetails/${order.id}`,
      );
      setCurrentStatus(res?.data?.order?.status);
      // if (res?.data?.order?.status == "On the Way") {
      //     completeOrderFromDriver()
      // }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  const completeOrderFromDriver = async () => {
    try {
      const response = await axios.post(
        'https://food.siliconsoft.pk/api/orderdel',
        {
          orderid: order.id,
        },
      );
      fetchOrder();
    } catch (error) {
    }
  };

  // const getCurrentLocation = async () => {
  //     try {
  //         if (Platform.OS === 'android') {
  //             const granted = await PermissionsAndroid.request(
  //                 PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  //             );
  //             if (granted === PermissionsAndroid.RESULTS.GRANTED) {
  //                 const location = await GetLocation.getCurrentPosition({
  //                     enableHighAccuracy: true,
  //                     timeout: 60000,
  //                 });

  //                 if (location != null) {
  //                     setLatlong({
  //                         driver_lat: location.latitude,
  //                         driver_long: location.longitude,
  //                     });
  //                 }
  //             } else {
  //             }
  //         }
  //     } catch (error) {
  //         const { code, message } = error;
  //     } finally {
  //     }
  // };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      pos => {
        setLatlong({
          driver_lat: pos.coords.latitude,
          driver_long: pos.coords.longitude,
        });
      },
      error => {
        // Error obteniendo ubicación
      },
      {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000},
    );
  };

  const getDriverLocaton = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://food.siliconsoft.pk/api/driverlocationsagainstorder/${order.id}`,
      );

      const locations = response.data.data;
      const lastLocation = locations[locations.length - 1];

      setLatlong({
        driver_lat: parseFloat(lastLocation.driver_lat),
        driver_long: parseFloat(lastLocation.driver_long),
      });
    } catch (error) {
    }
  }, [order.id]);

  // Define customer coords antes del return
  const customer = {
    latitude: parseFloat(order.customer_lat),
    longitude: parseFloat(order.customer_long),
  };

  useEffect(() => {
    async function askLocationPermission() {
      if (Platform.OS === 'ios') {
        Geolocation.requestAuthorization('whenInUse');
        const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (status !== RESULTS.GRANTED) {
          // Permiso de ubicación iOS no otorgado
        }
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          // Permiso de ubicación Android no otorgado
        }
      }
    }
    askLocationPermission();
  }, []);

  useEffect(() => {
    getCurrentLocation(); // for initial map display
  }, []);

  useEffect(() => {
    if (currentStatus == 'On the Way') {
      const interval = setInterval(() => {
        getDriverLocaton();
        getCurrentLocation();
        submitDriverLocation();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentStatus, getDriverLocaton, submitDriverLocation]);

  return (
    <>
      <View style={styles.deliveryInfo}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <Text style={styles.infoText}>
          Name:{' '}
          {order?.customer?.first_name + ' ' + order?.customer?.last_name ||
            'John Doe'}
        </Text>
        <Text style={styles.infoText}>Email: {order?.customer?.email}</Text>
        {/* <Text style={styles.infoText}>Phone: {order?.driver?.phone || '+1 234 567 890'}</Text> */}
      </View>

      <View style={styles.itemsContainer}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order?.order_details?.map(item => (
          <View key={item.id} style={styles.itemCard}>
            <Image source={{uri: item.item_image}} style={styles.itemImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.item_name}</Text>
              <Text style={styles.itemPrice}>
                ${item.item_price} x {item.item_qty}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.mapContainer}>
        {latlong ? (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              showsTraffic={true}
              initialRegion={{
                latitude: (latlong.driver_lat + customer.latitude) / 2,
                longitude: (latlong.driver_long + customer.longitude) / 2,
                latitudeDelta:
                  Math.abs(latlong.driver_lat - customer.latitude) * 1.5,
                longitudeDelta:
                  Math.abs(latlong.driver_long - customer.longitude) * 1.5,
              }}>
              {/* 1) Ruta */}
              <MapViewDirections
                origin={{
                  latitude: latlong.driver_lat,
                  longitude: latlong.driver_long,
                }}
                destination={customer}
                apikey={Config.GOOGLE_DIRECTIONS_API_KEY}
                strokeWidth={4}
                strokeColor="#D27F27"
                onReady={result => {
                  setEta({
                    distance: result.distance,
                    duration: result.duration,
                  });
                  setRouteCoords(result.coordinates);
                  mapRef.current.fitToCoordinates(result.coordinates, {
                    edgePadding: {
                      top: 80,
                      right: 40,
                      bottom: 80,
                      left: 40,
                    },
                    animated: true,
                  });
                }}
                onError={err => {/* Directions error */}}
              />

              {/* 2) Marcadores */}
              <Marker
                coordinate={{
                  latitude: latlong.driver_lat,
                  longitude: latlong.driver_long,
                }}
                title="Conductor"
              />
              <Marker
                coordinate={customer}
                title="Cliente"
                pinColor="#33A744"
              />
            </MapView>

            {/* 3) HUD de ETA */}
            <View style={styles.hud}>
              <Text style={styles.hudText}>
                🚗 {eta.distance.toFixed(1)} km · ⏱ {Math.ceil(eta.duration)}{' '}
                min
              </Text>
            </View>

            {/* 4) Botón recenter */}
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
          <ActivityIndicator
            style={styles.loader}
            size="large"
            color="#D27F27"
          />
        )}
      </View>

      <>
        {currentStatus == 'Open' && (
          <>
            <TouchableOpacity
              style={styles.rescheduleButton}
              onPress={handleDriverLocation}>
              <Text style={styles.rescheduleText}>Accept Order</Text>
            </TouchableOpacity>
          </>
        )}

        {currentStatus == 'On the Way' && (
          <>
            <TouchableOpacity
              style={styles.rescheduleButton}
              onPress={completeOrderFromDriver}>
              <Text style={styles.rescheduleText}>Deliver Now</Text>
            </TouchableOpacity>
          </>
        )}
      </>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // backgroundColor: '#F2EFE4',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  deliveryInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 15,
  },
  infoText: {
    fontSize: fonts.size.medium,
    marginBottom: 5,
    color: '#444',
    fontFamily: fonts.regular,
  },
  itemsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    marginBottom: 10,
    color: '#333',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#222',
  },
  itemPrice: {
    fontSize: fonts.size.small,
    color: '#777',
    fontFamily: fonts.regular,
  },
  map: {
    width: '100%',
    height: 300,
  },
  mapContainer: {
    marginHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden', // ensures the map respects borderRadius
    borderWidth: 1,
    borderColor: '#ccc',
    elevation: 5, // shadow for Android
    shadowColor: '#000', // shadow for iOS
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  rescheduleButton: {
    backgroundColor: '#D27F27',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  rescheduleText: {
    color: '#fff',
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
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
    backgroundColor: '#D27F27',
    padding: 12,
    borderRadius: 24,
    elevation: 4,
  },
});

export default DriverTracking;
