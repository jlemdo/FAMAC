import React, {useContext, useState, useEffect, useCallback} from 'react';
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import MapView, {Marker} from 'react-native-maps';
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

  console.log('order', order);

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
      console.log(error);
    }
  }, [order.id, latlong, fetchOrder]);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/orderdetails/${order.id}`,
      );
      setCurrentStatus(res?.data?.order?.status);
      // console.log("res?.data?.order?.status", res?.data?.order?.status)
      // if (res?.data?.order?.status == "On the Way") {
      //     completeOrderFromDriver()
      // }
    } catch (err) {
      console.log('Order fetch error:', err);
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
      console.log('response', response);
    } catch (error) {
      console.log(error);
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
  //                 console.warn('Location permission not granted.');
  //             }
  //         }
  //     } catch (error) {
  //         const { code, message } = error;
  //         console.warn('Location error:', code, message);
  //     } finally {
  //     }
  // };

  const getCurrentLocation = async () => {
    try {
      let granted = false;

      if (Platform.OS === 'android') {
        // Android: PermissionsAndroid
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación',
            message: 'Necesitamos tu ubicación para mostrar dónde estás',
          },
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // iOS: react-native-permissions + geolocation-service
        const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        granted = status === RESULTS.GRANTED;
        if (granted) {
          // Muestra el diálogo nativo de iOS
          await Geolocation.requestAuthorization('whenInUse');
        }
      }

      if (!granted) {
        console.warn('Permiso de ubicación no otorgado');
        return;
      }

      // Una vez autorizado, obtenemos la posición
      const location = await GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 60000,
      });

      if (location) {
        setLatlong({
          driver_lat: location.latitude,
          driver_long: location.longitude,
        });
      }
    } catch (error) {
      const {code, message} = error;
      console.warn('Location error:', code, message);
    }
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
      console.log('Driver location fetch error:', error);
    }
  }, [order.id]);

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
              style={styles.map}
              initialRegion={{
                latitude: latlong.driver_lat,
                longitude: latlong.driver_long,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}>
              {/* Driver Marker */}
              <Marker
                coordinate={{
                  latitude: latlong.driver_lat,
                  longitude: latlong.driver_long,
                }}
                title="Driver Location"
                description="Your driver is here"
              />

              {/* Customer Marker */}
              <Marker
                coordinate={{
                  latitude: parseFloat(order.customer_lat),
                  longitude: parseFloat(order.customer_long),
                }}
                title="Customer Location"
                pinColor="green"
                description="Customer address"
              />
            </MapView>
          </View>
        ) : (
          <ActivityIndicator
            size="large"
            color="#0000ff"
            style={{marginTop: 20}}
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
});

export default DriverTracking;
