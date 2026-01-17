import React, {useContext, useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import MapView, {Marker} from 'react-native-maps';
import {AuthContext} from '../../context/AuthContext';
import axios from 'axios';
import {OrderContext} from '../../context/OrderContext';
import fonts from '../../theme/fonts';
import { getCurrentLocation as getCurrentLocationUtil } from '../../utils/locationUtils';
import { API_BASE_URL } from '../../config/environment';

// ✅ FUNCIÓN: Traducir estados de órdenes a español para drivers
const translateStatus = (status) => {
  if (!status) return 'Desconocido';
  
  const translations = {
    // Estados principales
    'open': 'Abierto',
    'pending': 'Pendiente', 
    'confirmed': 'Confirmado',
    'preparing': 'Preparando',
    'on the way': 'En camino',
    'delivered': 'Entregado',
    'completed': 'Completado',
    'cancelled': 'Cancelado',
    'rejected': 'Rechazado',
    'failed': 'Fallido',
    
    // Estados adicionales
    'processing': 'Procesando',
    'ready': 'Listo',
    'picked up': 'Recogido',
    'out for delivery': 'En reparto',
    'delayed': 'Retrasado',
    'returned': 'Devuelto'
  };
  
  return translations[status.toLowerCase()] || status;
};

const OrderDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.order;
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
  // ✅ Estados para cancelación de pedido
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

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
  //             }
  //         }
  //     } catch (error) {
  //         const { code, message } = error;
  //     } finally {
  //         setLoadingLocation(false);
  //     }
  // };
  const getCurrentLocation = async () => {
    // ✅ Usar sistema optimizado para drivers
    setLoadingLocation(true);

    try {
      await getCurrentLocationUtil(
        'driver',
        (coordinates) => {
          // Limpiar estado anterior y guardar nueva ubicación
          setLatlong(null);
          setLatlong({
            driver_lat: coordinates.latitude,
            driver_long: coordinates.longitude,
          });
          setGetLocation(true);
        },
        (error) => {
          // Error crítico para drivers
        }
      );
    } catch (error) {
    } finally {
      setLoadingLocation(false);
    }
  };

  // Post driver location
  const handleDriverLocation = async () => {
    if (order.status == 'Open') {
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
        `${API_BASE_URL}/api/driverlocsubmit`,
        payload,
      );
    } catch (error) {
      // Error submitting driver location
    }
  }, [order.id, latlong]);

  const completeOrderFromDriver = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/orderdel`,
        {
          orderid: order.id,
        },
      );
    } catch (error) {
      // Error completing order
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
        `/api/order/${order.id}`,
      );
      setOrder(res.data.data); // adjust according to your response shape
    } catch (err) {
      // Order fetch error
    } finally {
    }
  }, [order.id]);

  useEffect(() => {
    fetchOrder();
    let intervalId = null;
    let msgInterval = null;

    if (order.status === 'Open') {
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
        `/api/msgfetch/${order.id}`,
      );
      if (response.data) {
        const formattedMessages = response.data.data.reverse().map(msg => ({
          sender: msg.sender,
          senderName: msg.sender === 'driver' ? 'Driver' : 'Customer',
          text: msg.message,
        }));
        setChatMessages(formattedMessages);
      }
    } catch (err) {
      // Chat fetch error
    }
  }, [order.id]);

  const getDriverLocaton = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const response = await axios.get(
        `/api/driverlocationsagainstorder/${order.id}`,
      );
      // if (response?.data?.data?.length) {
      const locations = response.data.data;
      const lastLocation = locations[locations.length - 1];
      // if (lastLocation?.driver_lat && lastLocation?.driver_long) {
      setLatlong(null);
      setLatlong({
        driver_lat: parseFloat(lastLocation.driver_lat),
        driver_long: parseFloat(lastLocation.driver_long),
      });
      // }
      // }
    } catch (error) {
      // Driver location fetch error
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
        `${API_BASE_URL}/api/msgsubmit`,
        payload,
      );

      if (response) {
        setNewMessage('');
      }
    } catch (error) {
      // Send message error
    }
  };

  // ✅ Función para detectar si mostrar botón de cancelar
  const shouldShowCancelButton = () => {
    if (!order) return false;

    const status = order.status?.toLowerCase();

    // No mostrar si ya está cancelado, entregado o completado
    const finishedStatuses = ['cancelled', 'cancelado', 'delivered', 'entregado', 'completed', 'completado'];
    if (finishedStatuses.includes(status)) return false;

    return true;
  };

  // ✅ Función para manejar cancelación de pedido (DRIVER)
  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Por favor ingresa un motivo de cancelación');
      return;
    }

    setCancelLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/orders/cancel`,
        {
          order_id: order?.id,
          cancellation_reason: cancelReason.trim(),
          cancelled_by: 'driver'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        alert('Pedido cancelado exitosamente');
        setShowCancelModal(false);
        setCancelReason('');
        // Recargar datos de la orden
        fetchOrder();
      } else {
        alert(response.data.message || 'No se pudo cancelar el pedido');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'No se pudo cancelar el pedido. Inténtalo de nuevo');
    } finally {
      setCancelLoading(false);
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
          <Text style={styles.orderText}>Pedido: #{order?.order_number || order?.id}</Text>
          <Text style={styles.orderText}>Estado: {translateStatus(orderStatus)}</Text>
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
              <Text style={styles.rescheduleText}>{translateStatus(currentStatus)}</Text>
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

        {/* ✅ Botón de Cancelar Pedido - Para drivers */}
        {shouldShowCancelButton() && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color="#FFF" />
            <Text style={styles.cancelButtonText}>No puedo entregar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ✅ Modal de Cancelar Pedido */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowCancelModal(false);
        }}>
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          setShowCancelModal(false);
        }}>
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <ScrollView
                  contentContainerStyle={styles.modalContent}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}>
                  <View style={styles.cancelModalHeader}>
                    <Ionicons name="close-circle" size={50} color="#E63946" />
                    <Text style={styles.cancelModalTitle}>No Puedo Entregar</Text>
                  </View>

                  <View style={styles.cancelWarningBox}>
                    <Text style={styles.cancelWarningText}>
                      ⚠️ Esta acción cancelará el pedido y notificará al cliente.
                    </Text>
                  </View>

                  {/* Información de la orden */}
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>Orden a cancelar</Text>
                    <View style={styles.orderInfoBox}>
                      <Text style={styles.orderInfoText}>
                        Pedido #{order?.order_number || order?.id}
                      </Text>
                      <Text style={styles.orderInfoPrice}>
                        Total: ${order?.total_price}
                      </Text>
                    </View>
                  </View>

                  {/* Motivo de cancelación */}
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>Motivo *</Text>
                    <TextInput
                      style={[
                        styles.modalTextArea,
                        !cancelReason.trim() && cancelLoading && styles.modalInputError
                      ]}
                      placeholder="Por favor explica por qué no puedes entregar este pedido..."
                      placeholderTextColor="rgba(47,47,47,0.6)"
                      value={cancelReason}
                      onChangeText={setCancelReason}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      returnKeyType="done"
                    />
                  </View>

                  {/* Botones */}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowCancelModal(false);
                        setCancelReason('');
                      }}
                      disabled={cancelLoading}>
                      <Text style={styles.modalCancelButtonText}>Volver</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmCancelButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleCancelOrder();
                      }}
                      disabled={cancelLoading}>
                      {cancelLoading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.confirmCancelButtonText}>Confirmar Cancelación</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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

  // ✅ Estilos para botón de cancelar pedido
  cancelButton: {
    backgroundColor: '#E63946',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 8,
  },
  cancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // ✅ Estilos para modal de cancelación
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingView: {
    width: '90%',
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    flexGrow: 1,
  },
  cancelModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelModalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#E63946',
    textAlign: 'center',
    marginTop: 12,
  },
  cancelWarningBox: {
    backgroundColor: '#FFE5E7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#E63946',
  },
  cancelWarningText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#C1121F',
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  orderInfoBox: {
    backgroundColor: '#F2EFE4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  orderInfoText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  orderInfoPrice: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#33A744',
  },
  modalTextArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
  },
  modalInputError: {
    borderColor: '#E63946',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#E63946',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
});

export default OrderDetails;
