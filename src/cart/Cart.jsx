import React, {useContext, useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Switch,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {CartContext} from '../context/CartContext';
import {AuthContext} from '../context/AuthContext';
import {useStripe} from '@stripe/stripe-react-native';
import {useNotification} from '../context/NotificationContext';
// import CheckBox from '@react-native-community/checkbox';
import CheckBox from 'react-native-check-box';
// import { useStripe } from "@stripe/stripe-react-native";
import axios from 'axios';
import GetLocation from 'react-native-get-location';
import Geolocation from 'react-native-geolocation-service';
import fonts from '../theme/fonts';

export default function Cart() {
  const {addNotification} = useNotification();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
  } = useContext(CartContext);
  const {user} = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const {initPaymentSheet, presentPaymentSheet} = useStripe();
  const [timers, setTimers] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [needInvoice, setNeedInvoice] = useState(false);
  const [taxDetails, setTaxDetails] = useState('');
  const [toggleCheckBox, setToggleCheckBox] = useState(false);
  const [upsellItems, setUpsellItems] = useState([]);
  const [loadingUpsell, setLoadingUpsell] = useState(true);
  const [latlong, setLatlong] = useState({
    driver_lat: '',
    driver_long: '',
  });
  // const { initPaymentSheet, presentPaymentSheet } = useStripe();
  // const upsellItems = [
  //     { id: 101, name: "Cheez", price: 49.99, photo: "https://media.istockphoto.com/id/531048911/photo/portion-of-cheddar.jpg?s=612x612&w=0&k=20&c=mzcYWuuRiPHm-UOIk1GToW7O0qhPEkb-3WDa46M2lbg=" },
  //     { id: 102, name: "Cheez", price: 99.99, photo: "https://media.istockphoto.com/id/531048911/photo/portion-of-cheddar.jpg?s=612x612&w=0&k=20&c=mzcYWuuRiPHm-UOIk1GToW7O0qhPEkb-3WDa46M2lbg=" },
  //     { id: 103, name: "Cheez", price: 29.99, photo: "https://media.istockphoto.com/id/531048911/photo/portion-of-cheddar.jpg?s=612x612&w=0&k=20&c=mzcYWuuRiPHm-UOIk1GToW7O0qhPEkb-3WDa46M2lbg=" },
  //     { id: 104, name: "Cheez", price: 49.99, photo: "https://media.istockphoto.com/id/531048911/photo/portion-of-cheddar.jpg?s=612x612&w=0&k=20&c=mzcYWuuRiPHm-UOIk1GToW7O0qhPEkb-3WDa46M2lbg=" },
  //     { id: 105, name: "Cheez", price: 99.99, photo: "https://media.istockphoto.com/id/531048911/photo/portion-of-cheddar.jpg?s=612x612&w=0&k=20&c=mzcYWuuRiPHm-UOIk1GToW7O0qhPEkb-3WDa46M2lbg=" },
  //     { id: 106, name: "Cheez", price: 29.99, photo: "https://media.istockphoto.com/id/531048911/photo/portion-of-cheddar.jpg?s=612x612&w=0&k=20&c=mzcYWuuRiPHm-UOIk1GToW7O0qhPEkb-3WDa46M2lbg=" }
  // ];

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);

  const checkInventory = productId => {
    const inventory = {1: 10, 2: 5, 3: 2};
    return inventory[productId] || 0;
  };

  // const handleCheckout = () => {
  //     if (!user) {
  //         setModalVisible(true);
  //     } else {
  //         console.log("Proceeding with checkout for logged-in user");
  //         console.log("Need Invoice:", needInvoice, "Tax Details:", taxDetails);
  //     }
  // };

  // useEffect(() => {
  //   const checkLocation = async () => {
  //     if (Platform.OS === 'android') {
  //       const granted = await PermissionsAndroid.request(
  //         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  //       );
  //       console.log('granted', granted);
  //       if (PermissionsAndroid.RESULTS.GRANTED === 'granted') {
  //         GetLocation.getCurrentPosition({
  //           enableHighAccuracy: true,
  //           timeout: 60000,
  //         })
  //           .then(location => {
  //             /*
  //                             const [latlong, setLatlong] = useState({
  //           driver_lat: "",
  //           driver_long: ""
  //       })
  //                           */
  //             console.log(location);
  //             setLatlong({
  //               ...latlong,
  //               driver_lat: location.latitude,
  //               driver_long: location.longitude,
  //             });
  //           })
  //           .catch(error => {
  //             const {code, message} = error;
  //             console.warn(code, message);
  //           });
  //       }
  //     }
  //   };
  //   checkLocation();
  // }, [latlong]);
  useEffect(() => {
    const checkLocation = async () => {
      try {
        let granted = false;

        if (Platform.OS === 'android') {
          // Android: solicitamos permiso
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Permiso de ubicación',
              message: 'Necesitamos tu ubicación para mostrar dónde estás',
            },
          );
          granted = result === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // iOS: solicitamos permiso con react-native-permissions
          const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
          granted = status === RESULTS.GRANTED;
          if (granted) {
            // Abre el diálogo nativo de iOS
            await Geolocation.requestAuthorization('whenInUse');
          }
        }

        if (!granted) {
          console.warn('Permiso de ubicación no otorgado');
          return;
        }

        // Obtenemos la posición en ambas plataformas
        GetLocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 60000,
        })
          .then(location => {
            console.log('Location:', location);
            setLatlong({
              ...latlong,
              driver_lat: location.latitude,
              driver_long: location.longitude,
            });
          })
          .catch(error => {
            const {code, message} = error;
            console.warn('Location error:', code, message);
          });
      } catch (error) {
        console.warn('Error al solicitar permiso:', error);
      }
    };

    checkLocation();
  }, [latlong]);

  const decideCheckout = async () => {
    completeOrder();
  };

  const completeOrder = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        'https://food.siliconsoft.pk/api/create-payment-intent',
        {
          amount: totalPrice * 100,
          currency: 'usd',
          email: user.email,
        },
      );

      if (!response.data.clientSecret) {
        Alert.alert('Error', 'Failed to get payment intent');
        setLoading(false);
        return;
      }

      const {clientSecret} = response.data;
      console.log('clientSecret', clientSecret);
      const {error} = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Food App',
      });

      if (error) {
        console.error('Payment Sheet Initialization Error:', error);
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }

      const {error: paymentError} = await presentPaymentSheet();

      if (paymentError) {
        completeOrderFunc();
        Alert.alert('Payment Failed', paymentError.message);
      } else {
        Alert.alert('Success', 'Payment successful!');
        completeOrderFunc();
      }
    } catch (error) {
      console.error('Checkout Error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeOrderFunc = async () => {
    try {
      setLoading(true);

      // Lanza la Payment Sheet de Stripe
      const {error: paymentError} = await presentPaymentSheet();

      if (paymentError) {
        // Si el usuario cierra la pasarela (toca la "X")
        if (paymentError.code === 'Canceled') {
          console.log('Pago cancelado por el usuario');
          setLoading(false);
          return;
        }
        // Otro error de pago
        Alert.alert('Payment Failed', paymentError.message);
        setLoading(false);
        return;
      }

      // Pago exitoso: preparar datos de la orden
      let cartUpdateArr = cart.map(it => ({
        item_name: it.name,
        item_price: it.price,
        item_qty: it.quantity,
        item_image: it.photo,
      }));

      const payload = {
        userid: user.id,
        orderno: '1',
        orderdetails: cartUpdateArr,
        customer_lat: latlong.driver_lat,
        customer_long: latlong.driver_long,
      };

      // Enviar orden al backend
      const response = await axios.post(
        'https://food.siliconsoft.pk/api/ordersubmit',
        payload,
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Order Placed Successfully');
        clearCart();
      } else {
        Alert.alert(
          'Order Failed',
          'Ha ocurrido un error al enviar tu pedido.',
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Algo salió mal. Por favor inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (user.usertype === 'Guest') {
      setModalVisible(true);
      return;
    }
    decideCheckout();
  };

  const handleGuestPayment = () => {
    if (!email.trim() || !address.trim() || !zipCode.trim()) {
      Alert.alert(
        'Datos incompletos',
        'Por favor ingresa correo, dirección y código postal.',
      );
      return;
    }
    // Ya validamos, procedemos:
    setModalVisible(false);
    decideCheckout();
  };

  useEffect(() => {
    const fetchUpsellItems = async () => {
      try {
        const response = await fetch(
          'https://food.siliconsoft.pk/api/products/upselling',
        );
        const json = await response.json();

        if (json.status === 'successupselling') {
          setUpsellItems(json.data);
        } else {
          console.error('Error fetching upsell items:', json);
        }
      } catch (error) {
        console.error('Error fetching upsell items:', error);
      } finally {
        setLoadingUpsell(false);
      }
    };

    fetchUpsellItems();
  }, []);

  useEffect(() => {
    const initialTimers = {};
    cart.forEach(item => {
      if (timers[item.id] == null) {
        initialTimers[item.id] = 900;
      }
    });
    if (Object.keys(initialTimers).length > 0) {
      setTimers(prev => ({...prev, ...initialTimers}));
    }
  }, [cart, timers]);

  useEffect(() => {
    const interval = setInterval(() => {
      const expiredIds = [];

      // 1️⃣ Actualizamos los timers
      setTimers(prevTimers => {
        const updatedTimers = {...prevTimers};

        Object.keys(updatedTimers).forEach(id => {
          if (updatedTimers[id] > 0) {
            updatedTimers[id] -= 1;

            if (updatedTimers[id] === 600) {
              addNotification(
                'Cart Expiry',
                'Your cart item will expire in 5 minutes.',
              );
            }

            if (updatedTimers[id] === 0) {
              // Sólo marcamos el id como expirado, sin tocar el contexto
              expiredIds.push(id);
              delete updatedTimers[id];
            }
          }
        });

        return updatedTimers;
      });

      // 2️⃣ Fuera del setTimers, eliminamos los expirados
      if (expiredIds.length > 0) {
        expiredIds.forEach(id => removeFromCart(parseInt(id, 10)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [addNotification, removeFromCart]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carrito de Compras</Text>

      {cart.length === 0 ? (
        // Carrito vacío: sólo mostramos el mensaje
        <Text style={styles.emptyCart}>Tu carrito está vacío.</Text>
      ) : (
        // Carrito con ítems: lista, totales y sugerencias
        <>
          <FlatList
            data={cart}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({item}) => (
              <View style={styles.cartItem}>
                <Image source={{uri: item.photo}} style={styles.image} />
                <View style={styles.info}>
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.timer}>
                      {timers[item.id] > 0
                        ? `${Math.floor(timers[item.id] / 60)}:${
                            timers[item.id] % 60
                          }`
                        : 'Expirado'}
                    </Text>
                  </View>
                  <Text style={styles.price}>
                    ${item.price} x {item.quantity}
                  </Text>
                  <Text style={styles.stock}>
                    Inventario:{' '}
                    {checkInventory(item.id) > 0
                      ? checkInventory(item.id)
                      : 'Agotado'}
                  </Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, 'decrease')}
                      style={styles.button}>
                      <Text style={styles.buttonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, 'increase')}
                      style={styles.button}>
                      <Text style={styles.buttonText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.id)}
                      style={styles.deleteButton}>
                      <Text style={styles.deleteText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            ListFooterComponent={() => (
              <>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalText}>Total: ${totalPrice}</Text>
                  {needInvoice && (
                    <TextInput
                      style={styles.input}
                      placeholder="Ingresa datos fiscales"
                      value={taxDetails}
                      onChangeText={setTaxDetails}
                      placeholderTextColor="rgba(47,47,47,0.6)"
                    />
                  )}
                  <TouchableOpacity
                    style={styles.checkoutButton}
                    onPress={handleCheckout}>
                    <Text style={styles.checkoutText}>Proceder al Pago</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.suggestionsTitle}>
                  También te puede interesar
                </Text>
                {loadingUpsell ? (
                  <ActivityIndicator size="large" color="#33A744" />
                ) : (
                  <FlatList
                    data={upsellItems}
                    keyExtractor={i => i.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({item}) => (
                      <View style={styles.upsellItem}>
                        <Image
                          source={{uri: item.photo}}
                          style={styles.upsellImage}
                        />
                        <Text style={styles.upsellName}>{item.name}</Text>
                        <Text style={styles.upsellPrice}>${item.price}</Text>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => addToCart(item)}>
                          <Text style={styles.addButtonText}>
                            Agregar al carrito
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </>
            )}
            ListFooterComponentStyle={{paddingTop: 16}}
          />
        </>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Compra como invitado</Text>
            <TextInput
              placeholder="Correo electrónico"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholderTextColor="rgba(47,47,47,0.6)"
            />
            <TextInput
              placeholder="Dirección"
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="rgba(47,47,47,0.6)"
            />
            <TextInput
              placeholder="Código postal"
              style={styles.input}
              value={zipCode}
              onChangeText={setZipCode}
              keyboardType="numeric"
              placeholderTextColor="rgba(47,47,47,0.6)"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cerrar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButtonSave,
                  // si falta alguno, atenuamos el botón
                  (!email.trim() || !address.trim() || !zipCode.trim()) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={handleGuestPayment}
                disabled={!email.trim() || !address.trim() || !zipCode.trim()}>
                <Text style={styles.modalButtonText}>Pagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16, // base spacing
    backgroundColor: '#F2EFE4', // Crema Suave
  },
  title: {
    fontSize: fonts.size.XLLL,
    fontFamily: fonts.original,
    color: '#2F2F2F', // Gris Carbón
    textAlign: 'center',
    marginBottom: 24, // escala: 24px
  },
  emptyCart: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)', // Gris Carbón @60%
    textAlign: 'center',
    marginTop: 50,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // escala: 8px
  },
  name: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  timer: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27', // Dorado Campo
  },
  price: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  stock: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  button: {
    width: 44, // touch ≥44×44
    height: 44,
    backgroundColor: '#D27F27', // Dorado Campo
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  buttonText: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  quantity: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginHorizontal: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 16,
  },
  deleteText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
  },
  totalContainer: {
    marginTop: 24, // escala: 24px
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  totalText: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
  checkoutButton: {
    backgroundColor: '#D27F27', // Dorado Campo
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  suggestionsTitle: {
    fontSize: fonts.size.XLL,
    fontFamily: fonts.original,
    color: '#2F2F2F',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  upsellItem: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  upsellImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  upsellName: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  upsellPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#8B5E3C', // Marrón Tierra
    borderRadius: 8,
    marginBottom: 16,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#8B5E3C', // Marrón Tierra
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonSave: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#33A744', // Verde Bosque
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
});
