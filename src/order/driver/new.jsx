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

const OrderDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.order;
  console.log('order', orderId);
  const {user} = useContext(AuthContext);
  const {addToOrder} = useContext(OrderContext);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [order, setOrder] = useState(null);

  const [latlong, setLatlong] = useState(null);
  const orderStatus = order?.status;
  const [buttontxt, setButtontxt] = useState(null);
  const [getLocation, setGetLocation] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);

  // get current location
  // const getCurrentLocation = async () => {
  //     setLoadingLocation(true);
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
  //                     setLatlong(null);
  //                     setLatlong({
  //                         driver_lat: location.latitude,
  //                         driver_long: location.longitude,
  //                     });
  //                     setGetLocation(true);
  //                 }

  //             } else {
  //                 console.warn('Location permission not granted.');
  //             }
  //         }
  //     } catch (error) {
  //         const { code, message } = error;
  //         console.warn('Location error:', code, message);
  //     } finally {
  //         setLoadingLocation(false);
  //     }
  // };
  const getCurrentLocation = async () => {
    // Inicias el loading
    setLoadingLocation(true);

    try {
      let granted = false;

      if (Platform.OS === 'android') {
        // Android: solicitud con PermissionsAndroid
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación',
            message: 'Necesitamos tu ubicación para mostrar dónde estás',
          },
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // iOS: solicitud con react-native-permissions + geolocation-service
        const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        granted = status === RESULTS.GRANTED;

        if (granted) {
          // Esto dispara el diálogo nativo de iOS
          await Geolocation.requestAuthorization('whenInUse');
        }
      }

      if (!granted) {
        console.warn('Permiso de ubicación no otorgado');
        return;
      }

      // Una vez autorizado en ambas plataformas, obtenemos la ubicación
      const location = await GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 60000,
      });

      if (location) {
        // Limpias el estado anterior y guardas la nueva ubicación
        setLatlong(null);
        setLatlong({
          driver_lat: location.latitude,
          driver_long: location.longitude,
        });
        setGetLocation(true);
      }
    } catch (error) {
      const {code, message} = error;
      console.warn('Location error:', code, message);
    } finally {
      // Siempre quitas el loading al final
      setLoadingLocation(false);
    }
  };

  // Post driver location
  const handleDriverLocation = async () => {
    console.log('order.status', order.status);
    if (order.status == 'Open') {
      console.log('order.status', order.status);
      order.status = 'On the Way';
      submitDriverLocation();
    } else if (order.status == 'On the Way') {
      completeOrderFromDriver();
      order.status = 'Delivered';
    }
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
      console.log('driver location submit res', response);
    } catch (error) {
      console.log(error);
    }
  }, [order.id, latlong]);

  const completeOrderFromDriver = async () => {
    try {
      const response = await axios.post(
        'https://food.siliconsoft.pk/api/orderdel',
        {
          orderid: order.id,
        },
      );
      console.log('response', response);
    } catch (error) {
      console.log(error);
    }
  };

  // change button text dynamic
  const getButtonText = () => {
    if (order.status === 'Open') {
      return 'Accept';
    } else if (order.status === 'On the Way') {
      return 'Delivered';
    }
  };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/order/${order.id}`,
      );
      setOrder(res.data.data); // adjust according to your response shape
    } catch (err) {
      console.log('Order fetch error:', err);
    } finally {
    }
  }, [order.id]);

  useEffect(() => {
    fetchOrder();
    let intervalId = null;
    let msgInterval = null;

    if (order.status === 'Open') {
      console.log('check12');
      getCurrentLocation();
    }

    if (order.status == 'On the Way') {
      getCurrentLocation();
      getDriverLocaton();
      submitDriverLocation();

      intervalId = setInterval(() => {
        getCurrentLocation();
        getDriverLocaton();
        submitDriverLocation();
      }, 5000);
    }
    fetchMessages();
    msgInterval = setInterval(() => {
      fetchMessages();
    }, 5000);

    addToOrder(10);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (msgInterval) {
        clearInterval(msgInterval);
      }
    };
  }, [
    order.status,
    order.id,
    addToOrder,
    fetchMessages,
    fetchOrder,
    getDriverLocaton,
    submitDriverLocation,
  ]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://food.siliconsoft.pk/api/msgfetch/${order.id}`,
      );
      console.log('response', response);
      if (response.data) {
        const formattedMessages = response.data.data.reverse().map(msg => ({
          sender: msg.sender,
          senderName: msg.sender === 'driver' ? 'Driver' : 'Customer',
          text: msg.message,
        }));
        setChatMessages(formattedMessages);
      }
    } catch (err) {
      console.log('Chat fetch error:', err);
    }
  }, [order.id]);

  const getDriverLocaton = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const response = await axios.get(
        `https://food.siliconsoft.pk/api/driverlocationsagainstorder/${order.id}`,
      );
      // if (response?.data?.data?.length) {
      const locations = response.data.data;
      const lastLocation = locations[locations.length - 1];
      console.log('lastLocation', lastLocation);
      // if (lastLocation?.driver_lat && lastLocation?.driver_long) {
      setLatlong(null);
      setLatlong({
        driver_lat: parseFloat(lastLocation.driver_lat),
        driver_long: parseFloat(lastLocation.driver_long),
      });
      // }
      // }
    } catch (error) {
      console.log('Driver location fetch error:', error);
    } finally {
      setLoadingLocation(false);
    }
  }, [order.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    try {
      const payload = {
        orderid: order.id,
        sender: user.usertype,
        message: newMessage,
      };
      const response = await axios.post(
        'https://food.siliconsoft.pk/api/msgsubmit',
        payload,
      );

      if (response) {
        setNewMessage('');
      }
    } catch (error) {
      console.log('Send message error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderText}>Order ID: #{order?.id}</Text>
          <Text style={styles.orderText}>Status: {orderStatus}</Text>
          <Text style={styles.orderText}>
            Total Price: ${order?.total_price}
          </Text>
        </View>

        <View style={styles.deliveryInfo}>
          <Text style={styles.sectionTitle}>Delivery Man Info</Text>
          <Text style={styles.infoText}>
            Name: {order?.driver?.name || 'John Doe'}
          </Text>
          <Text style={styles.infoText}>
            Email: {order?.driver?.email || 'johndoe@example.com'}
          </Text>
          <Text style={styles.infoText}>
            Phone: {order?.driver?.phone || '+1 234 567 890'}
          </Text>
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

        {/* {latlong && latlong.driver_lat && latlong.driver_long && (
                    <View style={styles.mapContainer}>
                        <Text style={styles.sectionTitle}>Delivery Route</Text>
                        <MapView
                            style={styles.map}
                            initialRegion={{
                                latitude: latlong.driver_lat,
                                longitude: latlong.driver_long,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: latlong.driver_lat,
                                    longitude: latlong.driver_long
                                }}
                                title="Delivery Man"
                                pinColor="green"
                            />
                        </MapView>
                    </View>
                )} */}

        {latlong &&
          latlong.driver_lat &&
          latlong.driver_long &&
          order.customer_lat &&
          order.customer_long && (
            <View style={styles.mapContainer}>
              <Text style={styles.sectionTitle}>Delivery Route</Text>
              <MapView
                style={styles.map}
                region={{
                  latitude: latlong.driver_lat,
                  longitude: latlong.driver_long,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}>
                {/* Delivery Man Marker */}
                <Marker
                  coordinate={{
                    latitude: latlong.driver_lat,
                    longitude: latlong.driver_long,
                  }}
                  title="Delivery Man"
                  pinColor="green"
                />

                {/* Customer Marker */}
                <Marker
                  coordinate={{
                    latitude: parseFloat(order.customer_lat),
                    longitude: parseFloat(order.customer_long),
                  }}
                  title="Customer"
                  pinColor="blue"
                />
              </MapView>
            </View>
          )}

        {user.usertype == 'driver' && (
          <>
            <TouchableOpacity
              style={styles.rescheduleButton}
              onPress={handleDriverLocation}>
              <Text style={styles.rescheduleText}>{currentStatus}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.chatContainer}>
          <Text style={styles.sectionTitle}>Chat</Text>

          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribir Mensaje..."
              value={newMessage}
              onChangeText={setNewMessage}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              style={styles.sendButton}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {chatMessages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.chatBubble,
                msg.sender === user.usertype
                  ? styles.chatBubbleRight
                  : styles.chatBubbleLeft,
              ]}>
              <Text style={styles.chatText}>{msg.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
/* <ActivityIndicator size="large" color="tomato" /> */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
    marginTop: 20,
  },
  backButton: {
    marginRight: 20,
  },
  title: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    textAlign: 'center',
    flex: 1,
    color: '#333',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  chatContainer: {
    marginTop: 5,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 15,
  },

  chatBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
  },

  chatBubbleLeft: {
    backgroundColor: '#f1f0f0',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
  },

  chatBubbleRight: {
    backgroundColor: '#daf8cb',
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10,
  },

  chatInput: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
  },

  sendButton: {
    backgroundColor: '#28a745',
    padding: 10,
    marginLeft: 8,
    borderRadius: 20,
  },

  senderName: {
    fontSize: fonts.size.small,
    color: '#555',
    marginBottom: 2,
    fontFamily: fonts.bold,
  },

  chatText: {
    fontSize: fonts.size.small,
    color: '#333',
    fontFamily: fonts.regular,
  },

  orderInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 15,
  },
  orderText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    marginBottom: 5,
    color: '#444',
  },
  sectionTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    marginBottom: 10,
    color: '#333',
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
    fontFamily: fonts.regular,
    color: '#222',
  },
  itemPrice: {
    fontSize: fonts.size.small,
    color: '#777',
    fontFamily: fonts.regular,
  },
  mapContainer: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  map: {
    flex: 1,
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

export default OrderDetails;
