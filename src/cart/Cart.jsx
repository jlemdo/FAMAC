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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {CartContext} from '../context/CartContext';
import {AuthContext} from '../context/AuthContext';
import {OrderContext} from '../context/OrderContext';
import {useStripe} from '@stripe/stripe-react-native';
import {useNotification} from '../context/NotificationContext';
import {useAlert} from '../context/AlertContext';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import DeliverySlotPicker from '../components/DeliverySlotPicker';
import AddressPicker from '../components/AddressPicker';
import CheckBox from 'react-native-check-box';
import axios from 'axios';
import GetLocation from 'react-native-get-location';
import Geolocation from 'react-native-geolocation-service';
import fonts from '../theme/fonts';

export default function Cart() {
  const navigation = useNavigation();
  const {addNotification} = useNotification();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    setCartClearCallback,
  } = useContext(CartContext);
  const {user, updateUser} = useContext(AuthContext);
  const {refreshOrders} = useContext(OrderContext);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const {initPaymentSheet, presentPaymentSheet} = useStripe();
  const [timers, setTimers] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState((user?.email && typeof user?.email === 'string') ? user?.email : '');
  // DEBUG: Inicializar siempre desbloqueado y luego verificar
  const [emailLocked, setEmailLocked] = useState(false);
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
  const [pickerVisible, setPickerVisible] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  // Ref para el scroll automático al botón de pagar
  const flatListRef = React.useRef(null);

  // Función para formatear cantidad como en ProductDetails
  const formatQuantity = (units) => {
    const grams = units * 250; // cada unidad = 250g
    if (grams >= 1000) {
      const kg = grams / 1000;
      return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)}kg`;
    }
    return `${grams}g`;
  };

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => setIsEnabled(previousState => !previousState);

  const {showAlert} = useAlert();

  // Función simplificada - verificar si email debe bloquearse basado en contexto local
  const shouldLockEmailInput = () => {
    // Si el guest ya tiene email guardado, significa que ya hizo un pedido
    return user?.usertype === 'Guest' && user?.email && user?.email?.trim() !== '';
  };

  // Registrar callback para limpiar deliveryInfo cuando se limpia el carrito
  useEffect(() => {
    const clearDeliveryInfo = () => {
      setDeliveryInfo(null);
      console.log('📅 Información de entrega limpiada por cambio de usuario/logout');
    };
    
    if (setCartClearCallback) {
      setCartClearCallback(clearDeliveryInfo);
    }
  }, [setCartClearCallback]);

  // Inicializar estados cuando cambia el usuario
  useEffect(() => {
    if (user?.usertype === 'Guest') {
      const hasEmail = user?.email && user?.email?.trim() !== '';
      setEmail(hasEmail ? user.email : '');
      setEmailLocked(hasEmail); // Bloquear si ya tiene email (ya hizo pedido)
      
      if (hasEmail) {
        console.log('🔒 Guest con email guardado - bloqueando input:', user.email);
      } else {
        console.log('📧 Guest nuevo - permitiendo escribir email');
      }
    } else {
      // Usuario registrado
      setEmail(user?.email || '');
      setEmailLocked(false);
    }
  }, [user]);

  // Manejo simple del email - solo para guests nuevos
  const handleEmailChange = (newEmail) => {
    // Solo permitir cambios si no está bloqueado
    if (!emailLocked) {
      setEmail(newEmail);
    }
  };

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
          // iOS: abrimos el diálogo nativo y luego comprobamos el permiso
          Geolocation.requestAuthorization('whenInUse');
          const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
          console.log('Permiso iOS location status:', status);
          granted = status === RESULTS.GRANTED;
        }

        if (!granted) {
          console.warn('Permiso de ubicación no otorgado');
          return;
        }

        // Ya con permiso, obtenemos la posición en ambas plataformas
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
  }, []);

  // Efecto para limpiar timers cuando cambia el usuario (CartContext ya maneja la limpieza del carrito)
  useEffect(() => {
    const userId = user?.id || null;
    
    // Si hay un usuario previo diferente al actual, limpiar timers
    if (currentUserId !== null && currentUserId !== userId) {
      console.log('⏲️ Usuario cambió, limpiando timers:', {
        previousUser: currentUserId,
        currentUser: userId
      });
      setTimers({});
    }
    
    // Actualizar el ID del usuario actual
    setCurrentUserId(userId);
  }, [user?.id, currentUserId]);

  // Invocado desde el botón de checkout
  const decideCheckout = () => {
    completeOrder();
  };

  // 1) Flujo único y robusto de pago
  const completeOrder = async () => {
    if (loading) return;
    if (totalPrice <= 0) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No hay productos en el carrito.',
        confirmText: 'Cerrar',
      });

      return;
    }

    setLoading(true);
    try {
      // 1.1) Crear PaymentIntent en el servidor
      const orderEmail = user?.usertype === 'Guest' ? (email?.trim() || user?.email || '') : (user?.email || '');
      const {data} = await axios.post(
        'https://food.siliconsoft.pk/api/create-payment-intent',
        {amount: totalPrice * 100, currency: 'usd', email: orderEmail},
      );
      const clientSecret = data.clientSecret;
      if (!clientSecret) {
        throw new Error('No se obtuvo clientSecret del servidor.');
      }

      // 1.2) Inicializar Stripe PaymentSheet
      const {error: initError} = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Lácteos y más',
        allowsDelayedPaymentMethods: true,
        returnURL: 'occr-productos-app://stripe-redirect',
        applePay: {
          // sólo iOS
          merchantCountryCode: 'MX',
        },
        googlePay: {
          // sólo Android
          merchantCountryCode: 'MX',
          testEnv: true, // sandbox
        },
      });
      if (initError) {
        console.error('❌ Error inicializando Stripe:', initError);
        throw initError;
      }

      // 1.3) Presentar la UI de pago
      const {error: paymentError} = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          showAlert({
            type: 'warning',
            title: 'Pago cancelado',
            message: 'Has cancelado el pago.',
            confirmText: 'Entendido',
          });
        } else {
          showAlert({
            type: 'error',
            title: 'Error de pago',
            message: paymentError.message,
            confirmText: 'Intentar de nuevo',
          });
        }
        return;
      }
      // 1.4) Pago exitoso: enviar la orden
      const orderData = await completeOrderFunc();
      
      // Si es guest y no tenía email, actualizar el contexto con el email usado
      if (user?.usertype === 'Guest' && (!user?.email || user?.email?.trim() === '') && email?.trim()) {
        console.log('📧 Actualizando email de guest en contexto después del pedido:', email);
        await updateUser({ email: email.trim() });
      }
      
      // Crear resumen del pedido
      const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
      const deliveryText = deliveryInfo ? 
        `📅 ${deliveryInfo.date.toLocaleDateString('es-ES')} - ${deliveryInfo.slot}` : 
        'Horario pendiente';
      
      showAlert({
        type: 'success',
        title: '¡Pedido Realizado!',
        message: `Tu pedido ha sido procesado exitosamente.\n\n` +
                 `💰 Total: $${totalPrice}\n` +
                 `📦 ${itemCount} producto${itemCount !== 1 ? 's' : ''}\n` +
                 `🚚 ${deliveryText}` +
                 `${needInvoice ? '\n🧾 Factura solicitada' : ''}`,
        confirmText: 'Ir al Inicio',
        onConfirm: () => {
          // Actualizar órdenes inmediatamente después del pedido exitoso
          refreshOrders();
          // Redirigir al inicio
          navigation.navigate('MainTabs', { 
            screen: 'Inicio',
            params: { screen: 'CategoriesList' }
          });
        }
      });
      
      // Limpiar carrito y información de entrega después del pedido exitoso
      clearCart();
      setDeliveryInfo(null);
      console.log('🛒 Carrito y información de entrega limpiados después del pedido exitoso');
    } catch (err) {
      console.error('Checkout failed:', err);
      showAlert({
        type: 'error',
        title: 'Error',
        message: err?.message || 'Ha ocurrido un error durante el pago.',
        confirmText: 'Cerrar',
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar coordenadas según tipo de usuario y configuración
  const getOrderCoordinates = () => {
    const userType = user?.usertype;
    
    if (userType === 'driver') {
      // 2. Driver: siempre ubicación en tiempo real
      console.log('📍 Driver: usando ubicación en tiempo real para tracking');
      
      // Validación simple: si no hay GPS, mostrar alert pero continuar
      if (!latlong.driver_lat || !latlong.driver_long) {
        console.warn('⚠️ Driver sin coordenadas GPS');
      }
      
      return {
        customer_lat: latlong.driver_lat || '',
        customer_long: latlong.driver_long || '',
        address_source: 'real_time_location'
      };
    } 
    else if (userType === 'Guest') {
      // 4. Guest: siempre usa dirección manual (nunca ubicación automática)
      console.log('📍 Guest: usando dirección manual para entrega');
      return {
        customer_lat: '', // No enviar coordenadas para guest
        customer_long: '',
        address_source: 'manual_address',
        delivery_address: address?.trim() || ''
      };
    } 
    else {
      // Usuario registrado
      if (user?.address && user?.address?.trim()) {
        // 1. Usuario registrado con dirección: usar dirección guardada
        console.log('📍 Usuario registrado: usando dirección guardada para tracking');
        return {
          customer_lat: '', // No usar ubicación, usar dirección
          customer_long: '',
          address_source: 'saved_address',
          delivery_address: user.address
        };
      } else {
        // 3. Usuario sin dirección que eligió usar ubicación actual
        console.log('📍 Usuario sin dirección: usando ubicación en tiempo real para tracking');
        return {
          customer_lat: latlong.driver_lat || '',
          customer_long: latlong.driver_long || '',
          address_source: 'real_time_location'
        };
      }
    }
  };

  // 2) Envía la orden al backend y maneja fallos
  const completeOrderFunc = async () => {
    try {
      const cartUpdateArr = cart.map(it => ({
        item_name: it.name,
        item_price: it.price.toString(),
        item_qty: it.quantity.toString(),
        item_image: it.photo,
      }));
      
      // Determinar el email correcto para enviar
      const userEmailForOrder = user?.usertype === 'Guest' 
        ? (email?.trim() || user?.email || '') 
        : (user?.email || '');

      // Obtener coordenadas según la lógica de usuario
      const coordinates = getOrderCoordinates();

      const payload = {
        userid: user?.id,
        orderno: '1',
        user_email: userEmailForOrder,
        orderdetails: cartUpdateArr,
        customer_lat: coordinates.customer_lat,
        customer_long: coordinates.customer_long,
        address_source: coordinates.address_source, // Nuevo campo para el backend
        delivery_address: coordinates.delivery_address || address?.trim() || '', // Dirección cuando aplique
        need_invoice: needInvoice ? "true" : "false",
        tax_details: needInvoice ? (taxDetails || '') : '',
        delivery_date: deliveryInfo?.date ? deliveryInfo.date.toISOString().split('T')[0] : '',
        delivery_slot: deliveryInfo?.slot || '',
      };
      
      console.log('🛒 Enviando orden al backend:', payload);
      
      const response = await axios.post('https://food.siliconsoft.pk/api/ordersubmit', payload);
      
      console.log('✅ Orden enviada exitosamente:', response.data);
      return response.data;
    } catch (err) {
      console.error('❌ Order submit failed:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo enviar la orden. Inténtalo de nuevo.',
        confirmText: 'Cerrar',
      });

      throw err; // para que completeOrder no continúe si falla
    }
  };

  // Decide flujo según tipo de usuario
  const handleCheckout = () => {
    if (user?.usertype === 'Guest') {
      setModalVisible(true);
    } else {
      // Usuario registrado: verificar si tiene dirección
      if (!user?.address || user?.address?.trim() === '') {
        setShowAddressModal(true);
      } else {
        completeOrder();
      }
    }
  };

  // Validaciones antes de pago de invitado
  const handleGuestPayment = () => {
    // Guest SIEMPRE necesita dirección manual - nunca usar ubicación automática
    if (!email?.trim() || !address?.trim() || !zipCode?.trim()) {
      showAlert({
        type: 'warning',
        title: 'Datos incompletos',
        message: 'Los invitados deben proporcionar una dirección completa para la entrega.\n\nPor favor ingresa correo, dirección y código postal.',
        confirmText: 'Entendido',
      });
      return;
    }
    
    console.log('🏠 Guest completando pedido con dirección manual:', address);
    setModalVisible(false);
    completeOrder();
  };

  useEffect(() => {
    const fetchUpsellItems = async () => {
      try {
        const response = await fetch(
          'https://food.siliconsoft.pk/api/products/sugerencias',
        );
        const json = await response.json();

        if (json.status === 'successsugerencias') {
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
        initialTimers[item.id] = 3600; // 1 hora = 3600 segundos
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
              setTimeout(() => {
                addNotification(
                  'Vencimiento del carrito',
                  'Tu artículo en el carrito expirará en 10 minutos.',
                );
              }, 0);
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

  // Ya no necesitamos limpiar timeouts

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carrito de Compras</Text>

      {cart.length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <Text style={styles.emptyCartTitle}>🛒 Tu carrito está vacío</Text>
          <Text style={styles.emptyCartText}>
            ¡Es el momento perfecto para descubrir nuestros deliciosos lácteos frescos!
          </Text>
          <Text style={styles.emptyCartHighlight}>
            🥛 Productos artesanales • 🧀 Quesos premium • 🫐 Y más...
          </Text>
          <Text style={styles.emptyCartSubtext}>
            Agrega productos desde cualquier categoría y aparecerán aquí listos para pagar
          </Text>
          <TouchableOpacity
            style={styles.shopNowButton}
            onPress={() => navigation.navigate('MainTabs', { 
              screen: 'Inicio',
              params: { screen: 'CategoriesList' }
            })}
            activeOpacity={0.8}>
            <Text style={styles.shopNowButtonText}>🛍️ Explorar Productos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Total sticky - siempre visible */}
          <View style={styles.stickyTotalContainer}>
            <View style={styles.stickyTotalContent}>
              <Text style={styles.stickyTotalLabel}>Total de tu compra:</Text>
              <Text style={styles.stickyTotalPrice}>${totalPrice}</Text>
            </View>
            <View style={styles.stickyTotalDetails}>
              <Text style={styles.stickyTotalItems}>
                {cart.reduce((total, item) => total + item.quantity, 0)} {cart.reduce((total, item) => total + item.quantity, 0) === 1 ? 'producto' : 'productos'}
              </Text>
            </View>
          </View>
          <FlatList
            ref={flatListRef}
            data={cart}
            keyExtractor={item => item.id.toString()}
            style={{flex: 1}}
            contentContainerStyle={{flexGrow: 1}}
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
                    ${item.price} x {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} ({formatQuantity(item.quantity)})
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
            ListFooterComponent={
              <CartFooter
                deliveryInfo={deliveryInfo}
                totalPrice={totalPrice}
                needInvoice={needInvoice}
                setNeedInvoice={setNeedInvoice}
                taxDetails={taxDetails}
                setTaxDetails={setTaxDetails}
                handleCheckout={handleCheckout}
                setPickerVisible={setPickerVisible}
                loadingUpsell={loadingUpsell}
                upsellItems={upsellItems}
                addToCart={addToCart}
              />
            }
            ListFooterComponentStyle={{paddingTop: 16}}
          />
        </>
      )}

      <DeliverySlotPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={({date, slot}) => {
          setDeliveryInfo({date, slot});
          setPickerVisible(false);
          
          // Scroll automático al final donde está el botón de pagar
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 300); // Pequeño delay para que se actualice el estado primero
        }}
      />
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalVisible(false);
        }}>
        <TouchableWithoutFeedback 
          onPress={() => {
            Keyboard.dismiss();
            setModalVisible(false);
          }}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Compra como invitado</Text>
                <TextInput
                  placeholder="Correo electrónico"
                  style={[styles.input, emailLocked && styles.disabledInput]}
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  placeholderTextColor="rgba(47,47,47,0.6)"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  returnKeyType="next"
                  editable={!emailLocked}
                />
                {emailLocked && (
                  <Text style={styles.blockedText}>
                    🔒 Bloqueado para este dispositivo
                  </Text>
                )}
                
                {/* Campo de dirección con AddressPicker */}
                <TouchableOpacity
                  style={[styles.input, styles.addressInput]}
                  onPress={() => {
                    setModalVisible(false);  // Cerrar modal Guest primero
                    setTimeout(() => {
                      setShowAddressPicker(true);  // Abrir AddressPicker después
                    }, 300);  // Delay para que iOS procese el cierre
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={address ? styles.addressText : styles.addressPlaceholder}>
                    {address || 'Dirección completa'}
                  </Text>
                  <Text style={styles.addressIcon}>📍</Text>
                </TouchableOpacity>
                
                <TextInput
                  placeholder="Código postal"
                  style={styles.input}
                  value={zipCode}
                  onChangeText={setZipCode}
                  keyboardType="numeric"
                  placeholderTextColor="rgba(47,47,47,0.6)"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  returnKeyType="done"
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      Keyboard.dismiss();
                      setModalVisible(false);
                    }}>
                    <Text style={styles.modalButtonText}>Cerrar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButtonSave,
                      (!email?.trim() || !address?.trim() || !zipCode?.trim()) && {
                        opacity: 0.5,
                      },
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleGuestPayment();
                    }}
                    disabled={!email?.trim() || !address?.trim() || !zipCode?.trim()}>
                    <Text style={styles.modalButtonText}>Pagar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* AddressPicker Modal */}
      <AddressPicker
        visible={showAddressPicker}
        onClose={() => {
          setShowAddressPicker(false);
          // Volver a abrir modal Guest después de cerrar AddressPicker
          setTimeout(() => {
            setModalVisible(true);
          }, 300);
        }}
        onConfirm={(addressData) => {
          console.log('📍 Address selected:', addressData);
          setAddress(addressData.fullAddress);
          setShowAddressPicker(false);
          // Volver a abrir modal Guest después de confirmar dirección
          setTimeout(() => {
            setModalVisible(true);
          }, 300);
        }}
        initialAddress={address || ''}
        title="Dirección de Entrega"
      />

      {/* Modal para usuario registrado sin dirección */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddressModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAddressModal(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>📍 Dirección de Entrega</Text>
                <Text style={styles.modalMessage}>
                  Para completar tu pedido necesitamos una dirección de entrega.{'\n\n'}
                  Puedes agregar una dirección en tu perfil o usar tu ubicación actual para esta compra.
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => {
                      setShowAddressModal(false);
                      navigation.navigate('MainTabs', { screen: 'Perfil' });
                    }}>
                    <Text style={styles.modalButtonSecondaryText}>Configurar Perfil</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={() => {
                      setShowAddressModal(false);
                      completeOrder(); // Proceder con ubicación actual
                    }}>
                    <Text style={styles.modalButtonPrimaryText}>Usar Mi Ubicación</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    fontSize: fonts.size.XL, // Reducido desde XLLL (48px) a XL (30px) para mejor compatibilidad
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
  emptyCartContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 32,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyCartTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyCartText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyCartHighlight: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#33A744',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  emptyCartSubtext: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  shopNowButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  shopNowButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
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
  deliveryTime: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 5,
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
  modalMessage: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
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
  disabledInput: {
    backgroundColor: '#EEE',
    color: 'rgba(47,47,47,0.6)',
  },
  blockedText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
    marginTop: -12,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addressText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    flex: 1,
  },
  addressPlaceholder: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
    flex: 1,
  },
  addressIcon: {
    fontSize: fonts.size.medium,
    marginLeft: 8,
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
  modalButtonPrimary: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#D27F27', // Dorado Campo - color principal de la app
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalButtonSecondary: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#8B5E3C', // Marrón Tierra - color secundario
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalButtonPrimaryText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtonSecondaryText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  deliveryButton: {
    backgroundColor: '#D27F27',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  deliveryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deliverySummary: {
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  deliverySummaryTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  invoiceLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  
  // Estilos para el total sticky
  stickyTotalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  stickyTotalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stickyTotalLabel: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  stickyTotalPrice: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#D27F27',
  },
  stickyTotalDetails: {
    alignItems: 'center',
  },
  stickyTotalItems: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
  },
});

// <-- justo después de StyleSheet.create({...})
const CartFooter = ({
  deliveryInfo,
  totalPrice,
  needInvoice,
  setNeedInvoice,
  taxDetails,
  setTaxDetails,
  handleCheckout,
  setPickerVisible,
  loadingUpsell,
  upsellItems,
  addToCart,
}) => (
  <View>
    {/* Upsell */}
    <Text style={styles.suggestionsTitle}>También te puede interesar</Text>
    {loadingUpsell ? (
      <ActivityIndicator size="large" color="#33A744" />
    ) : (
      <FlatList
        data={upsellItems}
        keyExtractor={item => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({item}) => (
          <View style={styles.upsellItem}>
            <Image source={{uri: item.photo}} style={styles.upsellImage} />
            <Text style={styles.upsellName}>{item.name}</Text>
            <Text style={styles.upsellPrice}>${item.price}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(item)}>
              <Text style={styles.addButtonText}>Agregar al carrito</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    )}
    {/* Selector de horario */}
    <View style={styles.totalContainer}>
      <TouchableOpacity
        onPress={() => setPickerVisible(true)}
        style={styles.checkoutButton}>
        <Text style={styles.checkoutText}>Seleccionar Horario de Entrega</Text>
      </TouchableOpacity>

      {deliveryInfo ? (
        <View style={{marginTop: 10}}>
          <Text style={styles.deliveryTime}>
            Horario de Entrega seleccionada:
          </Text>
          <Text style={styles.deliveryTime}>
            {deliveryInfo.date.toLocaleDateString()} en horario{' '}
            {deliveryInfo.slot}
          </Text>
        </View>
      ) : (
        <Text
          style={{
            marginTop: 10,
            color: '#888',
            textAlign: 'center',
          }}>
          No has seleccionado un horario de entrega aún.
        </Text>
      )}
    </View>

    {/* Facturación (solo si hay deliveryInfo) */}
    {deliveryInfo && (
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total: ${totalPrice}</Text>

        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>¿Necesitas factura?</Text>
          <Switch
            value={needInvoice}
            onValueChange={setNeedInvoice}
            trackColor={{false: '#ccc', true: '#D27F27'}}
            thumbColor={needInvoice ? '#FFF' : '#f4f3f4'}
          />
        </View>

        {needInvoice && (
          <TextInput
            style={styles.input}
            placeholder="Ingresa datos fiscales"
            placeholderTextColor="rgba(47,47,47,0.6)"
            value={taxDetails || ''}
            onChangeText={setTaxDetails}
          />
        )}

        <TouchableOpacity
          style={[styles.checkoutButton, !deliveryInfo && {opacity: 0.5}]}
          onPress={handleCheckout}
          disabled={!deliveryInfo}>
          <Text style={styles.checkoutText}>Proceder al Pago</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);