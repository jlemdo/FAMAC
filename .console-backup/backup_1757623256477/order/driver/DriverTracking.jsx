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
import axios from 'axios';
import {OrderContext} from '../../context/OrderContext';
import fonts from '../../theme/fonts';
import { getCurrentLocation as getCurrentLocationUtil, startLocationTracking, stopLocationTracking } from '../../utils/locationUtils';

const DriverTracking = ({order}) => {
  const navigation = useNavigation();
  const [latlong, setLatlong] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState({distance: 0, duration: 0});
  const mapRef = useRef(null);


  const handleDriverLocation = async () => {
    // ✅ JUST-IN-TIME: Pedir ubicación solo cuando acepta la orden
    await getCurrentLocation();
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
        'https://occr.pixelcrafters.digital/api/driverlocsubmit',
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
        `https://occr.pixelcrafters.digital/api/orderdetails/${order.id}`,
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
        'https://occr.pixelcrafters.digital/api/orderdel',
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

  const getCurrentLocation = async () => {
    console.log('🚚 INICIANDO getCurrentLocation...');
    try {
      // ✅ UBICACIÓN FIJA TEMPORAL PARA DEBUGGING
      const fakeDriverLocation = {
        latitude: 19.4326,  // Centro CDMX
        longitude: -99.1332
      };
      
      console.log('🚚 USANDO UBICACIÓN TEMPORAL:', fakeDriverLocation);
      
      setLatlong({
        driver_lat: fakeDriverLocation.latitude,
        driver_long: fakeDriverLocation.longitude,
      });
      
      // TODO: Reemplazar con ubicación real después del debug
      /*
      await getCurrentLocationUtil(
        'driver',
        (coordinates) => {
          setLatlong({
            driver_lat: coordinates.latitude,
            driver_long: coordinates.longitude,
          });
        },
        (error) => {
          console.log('❌ Error ubicación driver:', error);
        }
      );
      */
    } catch (error) {
      console.log('❌ CRASH en getCurrentLocation:', error);
    }
  };

  const getDriverLocaton = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://occr.pixelcrafters.digital/api/driverlocationsagainstorder/${order.id}`,
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

  // ✅ INICIALIZACIÓN CRÍTICA: Driver SIEMPRE necesita ubicación
  useEffect(() => {
    console.log('🚚 DRIVER INIT - Estado:', currentStatus);
    
    // CRÍTICO: Obtener ubicación inmediatamente para cualquier estado
    getCurrentLocation();
    
    if (currentStatus === 'On the Way') {
      // Para órdenes en proceso, también obtener ubicación guardada
      getDriverLocaton();
      
      const interval = setInterval(() => {
        getDriverLocaton();
        getCurrentLocation();
        submitDriverLocation();
      }, 5000);
      return () => clearInterval(interval);
    } else if (currentStatus === 'Delivered') {
      // Para órdenes entregadas, obtener ubicación final guardada
      getDriverLocaton();
    }
  }, [order.id]); // Dependencia simple para ejecutar solo al cargar

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
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🚚 DEBUG - INFORMACIÓN DE UBICACIÓN</Text>
          
          <Text style={styles.debugText}>
            📍 Cliente: {order.customer_lat}, {order.customer_long}
          </Text>
          
          <Text style={styles.debugText}>
            🚗 Driver: {latlong ? `${latlong.driver_lat}, ${latlong.driver_long}` : 'Cargando...'}
          </Text>
          
          <Text style={styles.debugText}>
            📊 Estado orden: {currentStatus}
          </Text>
          
          <Text style={styles.debugText}>
            💳 Estado pago: {order?.payment_status}
          </Text>
          
          {latlong && (
            <Text style={styles.debugSuccess}>
              ✅ UBICACIONES LISTAS - Mapa funcionaría aquí
            </Text>
          )}
        </View>
      </View>

      <>
        {/* 🆕 Validación: Solo mostrar botones si el pago está completado */}
        {order?.payment_status === 'completed' ? (
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
        ) : (
          // 🔴 Mostrar mensaje si pago no está completado
          <View style={styles.paymentPendingContainer}>
            <Text style={styles.paymentPendingText}>
              ⚠️ Esta orden no puede procesarse hasta que se confirme el pago
            </Text>
            <Text style={styles.paymentStatusInfo}>
              Estado del pago: {order?.payment_status === 'pending' ? 'Pendiente' : 
                                order?.payment_status === 'failed' ? 'Fallido' : 'Desconocido'}
            </Text>
          </View>
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
  
  // 🆕 Payment Validation Styles
  paymentPendingContainer: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  paymentPendingText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#F57C00',
    textAlign: 'center',
    marginBottom: 8,
  },
  paymentStatusInfo: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#E65100',
    textAlign: 'center',
  },
  
  // 🗺️ Map placeholder styles
  mapPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  
  // 🚚 DEBUG styles
  debugContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  debugTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  debugText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    marginBottom: 8,
  },
  debugSuccess: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#33A744',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default DriverTracking;
