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
  KeyboardAvoidingView,
} from 'react-native';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
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
import fonts from '../theme/fonts';
import { getCurrentLocation } from '../utils/locationUtils';
import {formatPriceWithSymbol} from '../utils/priceFormatter';
import {formatOrderId} from '../utils/orderIdFormatter';

export default function Cart() {
  const navigation = useNavigation();
  const route = useRoute();
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
  const [email, setEmail] = useState((user?.email && typeof user?.email === 'string') ? user?.email : '');
  const [address, setAddress] = useState('');
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
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // Perfil completo del usuario
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh falso
  
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

  // Función para obtener el perfil completo del usuario (con dirección actualizada)
  const fetchUserProfile = async () => {
    if (!user?.id || user?.usertype === 'Guest') return;
    
    setLoadingProfile(true);
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/userdetails/${user.id}`
      );
      const profileData = res.data?.data?.[0] || {};
      setUserProfile(profileData);
    } catch (error) {
      // Error cargando perfil de usuario
    } finally {
      setLoadingProfile(false);
    }
  };

  // Registrar callback para limpiar deliveryInfo cuando se limpia el carrito
  useEffect(() => {
    const clearDeliveryInfo = () => {
      setDeliveryInfo(null);
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
    } else {
      // Usuario registrado
      setEmail(user?.email || '');
      // Cargar perfil completo para obtener dirección actualizada
      fetchUserProfile();
    }
  }, [user]);

  // Actualizar perfil cuando la pantalla gana foco (para refrescar dirección actualizada)
  useFocusEffect(
    React.useCallback(() => {
      if (user?.usertype !== 'Guest' && user?.id) {
        fetchUserProfile();
      }
      
      // Revisar si hay datos de guest en los parámetros de navegación
      console.log('=== VERIFICANDO GUEST DATA EN CART ===');
      console.log('User type:', user?.usertype);
      
      // Intentar múltiples formas de obtener los parámetros
      const params1 = navigation.getState()?.routes?.find(route => route.name === 'MainTabs')?.params;
      const params2 = route?.params;
      
      console.log('Params método 1 (MainTabs):', params1);
      console.log('Params método 2 (route):', params2);
      
      const params = params1 || params2;
      console.log('Params finales:', params);
      console.log('GuestData encontrado:', params?.guestData);
      
      if (params?.guestData && user?.usertype === 'Guest') {
        // Usar los datos del guest checkout
        setEmail(params.guestData.email);
        setAddress(params.guestData.address);
        
        // CRITICAL: Restaurar también los datos del formulario si existen
        if (params.guestData.preservedDeliveryInfo) {
          // Convertir el string de fecha de vuelta a Date object
          const deliveryInfoToRestore = {
            ...params.guestData.preservedDeliveryInfo,
            date: new Date(params.guestData.preservedDeliveryInfo.date), // Convertir string a Date
          };
          setDeliveryInfo(deliveryInfoToRestore);
        }
        if (params.guestData.preservedNeedInvoice !== undefined) {
          setNeedInvoice(params.guestData.preservedNeedInvoice);
        }
        if (params.guestData.preservedTaxDetails !== undefined) {
          setTaxDetails(params.guestData.preservedTaxDetails);
        }
        
        console.log('=== GUEST CHECKOUT COMPLETADO ===');
        console.log('Email configurado:', params.guestData.email);
        console.log('Dirección configurada:', params.guestData.address);
        console.log('DeliveryInfo restaurado:', params.guestData.preservedDeliveryInfo);
        console.log('NeedInvoice restaurado:', params.guestData.preservedNeedInvoice);
        console.log('TaxDetails restaurado:', params.guestData.preservedTaxDetails);
        
        // Limpiar los parámetros para evitar reutilización
        navigation.setParams({ guestData: null });
        
        // Scroll automático - si tiene deliveryInfo, ir al botón de pago, si no al de horario
        setTimeout(() => {
          if (params.guestData.preservedDeliveryInfo) {
            // Tiene horario seleccionado - ir directo al botón "Proceder al Pago"
            flatListRef.current?.scrollToEnd({ animated: true });
          } else {
            // No tiene horario - ir al botón "Seleccionar Horario"
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }, 500); // Delay más largo para que se rendericen los datos primero
      }
    }, [user?.id, user?.usertype, navigation])
  );


  // ✅ OPTIMIZACIÓN: Ya no pedimos ubicación al cargar Cart
  // La ubicación se obtiene justo antes del checkout en completeOrder()

  // Efecto para limpiar timers cuando cambia el usuario (CartContext ya maneja la limpieza del carrito)
  useEffect(() => {
    const userId = user?.id || null;
    
    // Si hay un usuario previo diferente al actual, limpiar timers
    if (currentUserId !== null && currentUserId !== userId) {
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
    console.log('=== COMPLETE ORDER INICIADO ===');
    console.log('Loading:', loading);
    console.log('TotalPrice:', totalPrice);
    console.log('Email actual:', email);
    console.log('Address actual:', address);
    console.log('User type:', user?.usertype);
    
    if (loading) return;
    if (totalPrice <= 0) {
      console.log('ERROR: No hay productos en carrito');
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
      // ✅ JUST-IN-TIME: Obtener ubicación solo cuando se va a hacer el pedido
      const userType = user?.usertype === 'Guest' ? 'guest' : 'user';
      const location = await getCurrentLocation(userType);
      if (location) {
        setLatlong({
          driver_lat: location.latitude,
          driver_long: location.longitude,
        });
      }
      // Si no se obtiene ubicación, continuar igual (es opcional para users/guests)
      // 1.1) Crear PaymentIntent en el servidor
      const orderEmail = user?.usertype === 'Guest' ? (email?.trim() || user?.email || '') : (user?.email || '');
      
      const {data} = await axios.post(
        'https://food.siliconsoft.pk/api/create-payment-intent',
        {amount: parseFloat(totalPrice), currency: 'mxn', email: orderEmail},
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
          testEnv: false, // producción (live)
        },
      });
      if (initError) {
        throw initError;
      }

      // 1.3) Presentar la UI de pago
      console.log('=== PRESENTANDO PAYMENT SHEET ===');
      console.log('ClientSecret obtenido:', clientSecret);
      const {error: paymentError} = await presentPaymentSheet();
      console.log('PaymentSheet resultado:', paymentError ? 'ERROR' : 'SUCCESS');
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
        await updateUser({ email: email.trim() });
      }
      
      // Crear resumen del pedido
      const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
      const deliveryText = deliveryInfo ? 
        `📅 ${deliveryInfo.date.toLocaleDateString('es-ES')} - ${deliveryInfo.slot}` : 
        'Horario pendiente';
      
      // Obtener número de orden de la respuesta
      const orderNumber = orderData?.order_id || orderData?.id || 'N/A';
      
      showAlert({
        type: 'success',
        title: '¡Pedido Realizado Exitosamente!',
        message: `Tu pedido ha sido procesado correctamente.\n\n` +
                 `📋 Número de pedido: ${formatOrderId(orderData?.created_at || new Date().toISOString())}\n` +
                 `💰 Total: $${totalPrice}\n` +
                 `📦 ${itemCount} producto${itemCount !== 1 ? 's' : ''}\n` +
                 `🚚 ${deliveryText}` +
                 `${needInvoice ? '\n🧾 Factura solicitada' : ''}`,
        confirmText: 'Ver mi pedido',
        cancelText: 'Ir al Inicio',
        onConfirm: () => {
          // Actualizar órdenes y navegar a detalles del pedido
          refreshOrders();
          navigation.navigate('MainTabs', { 
            screen: 'Pedidos',
            params: { 
              screen: 'OrderDetail',
              params: { orderId: orderNumber }
            }
          });
        },
        onCancel: () => {
          // Actualizar órdenes y ir al inicio
          refreshOrders();
          navigation.navigate('MainTabs', { 
            screen: 'Inicio',
            params: { screen: 'CategoriesList' }
          });
        }
      });
      
      // Limpiar carrito y información de entrega después del pedido exitoso
      clearCart();
      setDeliveryInfo(null);
    } catch (err) {
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
      
      return {
        customer_lat: latlong.driver_lat || '',
        customer_long: latlong.driver_long || '',
        address_source: 'real_time_location'
      };
    } 
    else if (userType === 'Guest') {
      // 4. Guest: siempre usa dirección manual (nunca ubicación automática)
      return {
        customer_lat: '', // No enviar coordenadas para guest
        customer_long: '',
        address_source: 'manual_address',
        delivery_address: address?.trim() || ''
      };
    } 
    else {
      // Usuario registrado
      const savedAddress = userProfile?.address || user?.address;
      if (savedAddress && savedAddress.trim()) {
        // 1. Usuario registrado con dirección: usar dirección guardada actualizada
        return {
          customer_lat: '', // No usar ubicación, usar dirección
          customer_long: '',
          address_source: 'saved_address',
          delivery_address: savedAddress
        };
      } else {
        // 3. Usuario sin dirección que eligió usar ubicación actual
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
      const cartUpdateArr = cart.map(it => {
        // Calcular precio final con descuento aplicado
        const itemDiscount = Number(it.discount) || 0;
        const finalPrice = it.price - itemDiscount;
        
        return {
          item_name: it.name,
          item_price: finalPrice.toString(), // Precio con descuento aplicado
          item_original_price: it.price.toString(), // Precio original para referencia
          item_discount: itemDiscount.toString(), // Descuento aplicado
          item_qty: it.quantity.toString(),
          item_image: it.photo,
        };
      });
      
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
      
      const response = await axios.post('https://food.siliconsoft.pk/api/ordersubmit', payload);
      return response.data;
    } catch (err) {
      
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
      console.log('=== GUEST CHECKOUT DECISION ===');
      console.log('Email actual:', email);
      console.log('Address actual:', address);
      console.log('Email válido:', !!email?.trim());
      console.log('Address válido:', !!address?.trim());
      
      // Verificar si el guest ya tiene email y dirección
      const hasEmail = email?.trim() && email.trim() !== '';
      const hasAddress = address?.trim() && address.trim() !== '';
      
      if (hasEmail && hasAddress) {
        // Guest ya completó sus datos: proceder directamente al pago
        console.log('=== GUEST CON DATOS COMPLETOS - PROCEDIENDO AL PAGO ===');
        completeOrder();
      } else {
        // Guest necesita completar datos: ir a GuestCheckout
        console.log('=== GUEST SIN DATOS - ENVIANDO A GUEST CHECKOUT ===');
        const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
        
        navigation.navigate('GuestCheckout', {
          totalPrice: totalPrice,
          itemCount: itemCount,
          returnToCart: true,
          // CRITICAL: Preservar TODOS los datos del formulario - convertir Date a string
          preservedDeliveryInfo: deliveryInfo ? {
            ...deliveryInfo,
            date: deliveryInfo.date.toISOString(), // Convertir Date a string serializable
          } : null,
          preservedNeedInvoice: needInvoice,
          preservedTaxDetails: taxDetails,
          // También preservar email/address actuales si existen
          currentEmail: email,
          currentAddress: address,
        });
      }
    } else {
      // Usuario registrado: verificar si tiene dirección REAL del perfil
      const hasProfileAddress = userProfile?.address && userProfile?.address?.trim() !== '';
      
      if (!hasProfileAddress) {
        // No tiene dirección: mostrar modal para seleccionar/agregar
        setShowAddressModal(true);
      } else {
        // Usuario tiene dirección: proceder directo al pago
        completeOrder();
      }
    }
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
        }
      } catch (error) {
        // Error fetching upsell items
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
        <FlatList
          data={[]}
          renderItem={null}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            // Pull-to-refresh falso - solo efecto visual
            setTimeout(() => setRefreshing(false), 800);
          }}
          contentContainerStyle={styles.emptyCartScrollContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
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
          }
        />
      ) : (
        <>
          {/* Total sticky - siempre visible */}
          <View style={styles.stickyTotalContainer}>
            <View style={styles.stickyTotalContent}>
              <Text style={styles.stickyTotalLabel}>Total de tu compra:</Text>
              <Text style={styles.stickyTotalPrice}>{formatPriceWithSymbol(totalPrice)}</Text>
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
            renderItem={({item}) => {
              const itemDiscount = Number(item.discount) || 0;
              const discountedPrice = item.price - itemDiscount;
              const hasDiscount = itemDiscount > 0;
              
              return (
                <View style={styles.cartItem}>
                  <View style={styles.imageContainer}>
                    {/* Etiqueta de descuento sobre la imagen */}
                    {hasDiscount && (
                      <View style={styles.cartDiscountBadge}>
                        <Text style={styles.cartDiscountText}>-${itemDiscount}</Text>
                      </View>
                    )}
                    <Image source={{uri: item.photo}} style={styles.image} />
                  </View>
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
                    
                    {/* Display de precios corregido */}
                    {hasDiscount ? (
                      <View style={styles.priceWithDiscountRow}>
                        <Text style={styles.originalPriceStrikedCart}>
                          {formatPriceWithSymbol(item.price)}
                        </Text>
                        <Text style={styles.discountedPriceCart}>
                          {formatPriceWithSymbol(discountedPrice)}
                        </Text>
                        <Text style={styles.quantityInfoCart}>
                          x {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} ({formatQuantity(item.quantity)})
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.price}>
                        {formatPriceWithSymbol(item.price)} x {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} ({formatQuantity(item.quantity)})
                      </Text>
                    )}
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
            );
            }}
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
                user={user}
                email={email}
                address={address}
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

      {/* Modal para usuario registrado sin dirección */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddressModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAddressModal(false)}>
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
                <Text style={styles.modalTitle}>📍 Dirección de Entrega</Text>
                
                {userProfile?.address && userProfile?.address?.trim() !== '' ? (
                  // Usuario CON dirección guardada
                  <>
                    <Text style={styles.modalMessage}>
                      Tienes una dirección guardada en tu perfil:{'\n\n'}
                      <Text style={styles.savedAddressText}>📍 {userProfile.address}</Text>
                      {'\n\n'}¿Cómo quieres recibir tu pedido?
                    </Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalButtonSecondary}
                        onPress={() => {
                          setShowAddressModal(false);
                          completeOrder(); // Usar ubicación actual
                        }}>
                        <Text style={styles.modalButtonSecondaryText}>🗺️ Usar Mi Ubicación</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalButtonPrimary}
                        onPress={() => {
                          setShowAddressModal(false);
                          // Actualizar dirección en memoria para este pedido
                          setAddress(userProfile.address);
                          completeOrder(); // Usar dirección guardada
                        }}>
                        <Text style={styles.modalButtonPrimaryText}>📋 Usar Dirección Guardada</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  // Usuario SIN dirección guardada
                  <>
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
                        <Text style={styles.modalButtonSecondaryText}>⚙️ Configurar Perfil</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalButtonPrimary}
                        onPress={() => {
                          setShowAddressModal(false);
                          completeOrder(); // Proceder con ubicación actual
                        }}>
                        <Text style={styles.modalButtonPrimaryText}>🗺️ Usar Mi Ubicación</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                </ScrollView>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
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
    fontFamily: fonts.bold,
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
  emptyCartScrollContainer: {
    flexGrow: 1,
    paddingVertical: 20,
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
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
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
    fontSize: fonts.size.small, // ✅ Mantiene autoscaling
    fontFamily: fonts.price, // ✅ Nueva fuente optimizada para precios
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
    fontSize: fonts.size.medium, // ✅ Mantiene autoscaling
    fontFamily: fonts.numericBold, // ✅ Fuente optimizada para números
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
    fontSize: fonts.size.medium, // ✅ Reducido de large a medium
    fontFamily: fonts.priceBold, // ✅ Nueva fuente bold optimizada para precios totales
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
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
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
    position: 'relative',
    overflow: 'visible',
    width: 140, // Ancho fijo para consistencia
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
    fontFamily: fonts.price, // ✅ Fuente optimizada para precios
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
  keyboardAvoidingView: {
    width: '80%',
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    flexGrow: 1,
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
    fontSize: fonts.size.large, // ✅ Reducido de XL a large
    fontFamily: fonts.priceBold, // ✅ Fuente optimizada para precios totales
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
  savedAddressText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
    fontStyle: 'italic',
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  
  // Estilos para descuentos en items del carrito
  cartDiscountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#E63946',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
    transform: [{ rotate: '8deg' }],
  },
  cartDiscountText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  priceWithDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  originalPriceStrikedCart: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountedPriceCart: {
    fontSize: fonts.size.small, // ✅ Mantiene autoscaling
    fontFamily: fonts.priceBold, // ✅ Nueva fuente bold optimizada para precios
    color: '#D27F27',
    marginRight: 8,
  },
  quantityInfoCart: {
    fontSize: fonts.size.small, // ✅ Mantiene autoscaling
    fontFamily: fonts.numeric, // ✅ Fuente optimizada para números (contiene cantidades)
    color: '#2F2F2F',
    flexShrink: 1,
  },
  
  // Estilos para descuentos en productos recomendados (upsell)
  upsellDiscountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E63946',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
    transform: [{ rotate: '12deg' }],
  },
  upsellDiscountText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  upsellPriceContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  upsellOriginalPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  upsellDiscountedPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.priceBold, // ✅ Fuente optimizada para precios con descuento
    color: '#000',
  },
  
  // Estilos para indicadores de guest
  guestIndicators: {
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderWidth: 1,
    borderColor: '#D27F27',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  guestIndicatorsTitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 8,
  },
  guestIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  guestIndicatorIcon: {
    fontSize: fonts.size.medium,
    marginRight: 8,
    marginTop: 1,
  },
  guestIndicatorText: {
    flex: 1,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 18,
  },
  guestIndicatorValue: {
    fontFamily: fonts.bold,
    color: '#D27F27',
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
  user,
  email,
  address,
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
        renderItem={({item}) => {
          // Aplicar misma lógica de descuentos que otras pantallas
          const discountNum = Number(item.discount) || 0;
          const discountedPrice = item.price - discountNum;
          const hasDiscount = discountNum > 0;
          
          return (
            <View style={styles.upsellItem}>
              {/* Badge de descuento */}
              {hasDiscount && (
                <View style={styles.upsellDiscountBadge}>
                  <Text style={styles.upsellDiscountText}>-${discountNum}</Text>
                </View>
              )}
              
              <Image source={{uri: item.photo}} style={styles.upsellImage} />
              <Text style={styles.upsellName}>{item.name}</Text>
              
              {/* Mostrar precios con/sin descuento */}
              {hasDiscount ? (
                <View style={styles.upsellPriceContainer}>
                  <Text style={styles.upsellOriginalPrice}>
                    {formatPriceWithSymbol(item.price)}
                  </Text>
                  <Text style={styles.upsellDiscountedPrice}>
                    {formatPriceWithSymbol(discountedPrice)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.upsellPrice}>{formatPriceWithSymbol(item.price)}</Text>
              )}
              
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item)}>
                <Text style={styles.addButtonText}>Agregar al carrito</Text>
              </TouchableOpacity>
            </View>
          );
        }}
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
        <Text style={styles.totalText}>Total: {formatPriceWithSymbol(totalPrice)}</Text>

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

        {/* Indicadores para guests */}
        {user && user.usertype === 'Guest' && (email || address) && (
          <View style={styles.guestIndicators}>
            <Text style={styles.guestIndicatorsTitle}>📋 Información de entrega guardada:</Text>
            
            {email && (
              <View style={styles.guestIndicatorItem}>
                <Text style={styles.guestIndicatorIcon}>📧</Text>
                <Text style={styles.guestIndicatorText}>
                  Email: <Text style={styles.guestIndicatorValue}>{email}</Text>
                </Text>
              </View>
            )}
            
            {address && (
              <View style={styles.guestIndicatorItem}>
                <Text style={styles.guestIndicatorIcon}>📍</Text>
                <Text style={styles.guestIndicatorText}>
                  Dirección: <Text style={styles.guestIndicatorValue}>{address.length > 50 ? address.substring(0, 50) + '...' : address}</Text>
                </Text>
              </View>
            )}
          </View>
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