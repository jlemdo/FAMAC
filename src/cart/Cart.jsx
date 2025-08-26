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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  generateCallbackId, 
  registerNavigationCallback, 
  cleanupNavigationCallback 
} from '../utils/navigationCallbacks';
import CheckBox from 'react-native-check-box';
import axios from 'axios';
import fonts from '../theme/fonts';
import { getCurrentLocation } from '../utils/locationUtils';
import {formatPriceWithSymbol} from '../utils/priceFormatter';
import {formatOrderId} from '../utils/orderIdFormatter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addressService } from '../services/addressService';

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
  const [selectedAddress, setSelectedAddress] = useState(null); // Nueva dirección seleccionada
  const [userAddresses, setUserAddresses] = useState([]); // Lista de direcciones del usuario
  const [loadingAddresses, setLoadingAddresses] = useState(false);
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
  const [isRestoringDeliveryInfo, setIsRestoringDeliveryInfo] = useState(false);
  
  // 🔍 DEBUG: Monitorear cambios en deliveryInfo
  useEffect(() => {
    // console.log('🚨 DELIVERY INFO CAMBIÓ:', {
      // valor: deliveryInfo,
      // esNull: deliveryInfo === null,
      // stackTrace: new Error().stack
    // });
    
    // Guardar deliveryInfo en AsyncStorage cuando cambie (solo para usuarios registrados)
    if (deliveryInfo && user?.id && user?.usertype !== 'Guest' && cart.length > 0) {
      saveDeliveryInfo(deliveryInfo, user.id);
    }
  }, [deliveryInfo, user?.id, cart.length]);
  
  // 🔍 DEBUG: Monitorear cambios en coordenadas
  useEffect(() => {
    // console.log('📍 COORDENADAS CAMBIARON:', {
      // latlong: latlong,
      // hasCoords: !!(latlong?.driver_lat && latlong?.driver_long)
    // });
    
    // Guardar coordenadas en AsyncStorage cuando cambien (solo para usuarios registrados)
    if (latlong?.driver_lat && latlong?.driver_long && user?.id && user?.usertype !== 'Guest' && cart.length > 0) {
      saveCoordinates(latlong, user.id);
    }
  }, [latlong, user?.id, cart.length]);
  
  // 🛒 MONITOR: Resetear datos cuando carrito esté vacío
  useEffect(() => {
    // console.log('🛒 CARRITO CAMBIÓ:', {
      // cartLength: cart.length,
      // totalPrice: totalPrice,
      // isEmpty: cart.length === 0
    // });
    
    // Si el carrito está vacío, resetear todos los datos
    if (cart.length === 0) {
      // console.log('🧹 CARRITO VACÍO - Reseteando datos...');
      
      // Resetear fecha y hora de entrega
      setDeliveryInfo(null);
      
      // 🆕 GUEST FIX: No resetear coordenadas para Guest que ya las tiene
      // Solo resetear coordenadas si NO es Guest o Guest sin coordenadas válidas
      if (user?.usertype !== 'Guest' || 
          !latlong?.driver_lat || 
          !latlong?.driver_long) {
        setLatlong({
          driver_lat: '',
          driver_long: '',
        });
      }
      // console.log('📏 Coordenadas Guest preservadas entre compras:', latlong);
      
      // Resetear datos de facturación
      setNeedInvoice(false);
      setTaxDetails('');
      
      // Limpiar AsyncStorage si hay usuario registrado
      if (user?.id && user?.usertype !== 'Guest') {
        clearSavedDeliveryInfo(user.id);
        clearSavedCoordinates(user.id);
      }
      
      // Para Guest, no hay AsyncStorage que limpiar, solo resetear estado local
      
      // console.log('✅ Datos reseteados para carrito nuevo');
    }
  }, [cart.length, totalPrice, user?.id]);
  
  // Función para guardar deliveryInfo en AsyncStorage
  const saveDeliveryInfo = async (info, userId) => {
    try {
      const key = `deliveryInfo_${userId}`;
      const dataToSave = {
        ...info,
        date: info.date.toISOString() // Serializar Date a string
      };
      await AsyncStorage.setItem(key, JSON.stringify(dataToSave));
      // console.log('💾 DELIVERY INFO GUARDADO:', dataToSave);
    } catch (error) {
      // console.error('❌ Error guardando deliveryInfo:', error);
    }
  };
  
  // Función para restaurar deliveryInfo desde AsyncStorage
  const restoreDeliveryInfo = async (userId) => {
    setIsRestoringDeliveryInfo(true);
    try {
      const key = `deliveryInfo_${userId}`;
      const savedData = await AsyncStorage.getItem(key);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const restoredInfo = {
          ...parsedData,
          date: new Date(parsedData.date) // Deserializar string a Date
        };
        // console.log('📂 DELIVERY INFO RESTAURADO:', restoredInfo);
        setDeliveryInfo(restoredInfo);
        // Pequeño delay para asegurar que el estado se actualice
        setTimeout(() => {
          setIsRestoringDeliveryInfo(false);
        }, 100);
        return restoredInfo;
      }
    } catch (error) {
      // console.error('❌ Error restaurando deliveryInfo:', error);
    }
    setIsRestoringDeliveryInfo(false);
    return null;
  };
  
  // Función para limpiar deliveryInfo guardado
  const clearSavedDeliveryInfo = async (userId) => {
    try {
      const key = `deliveryInfo_${userId}`;
      await AsyncStorage.removeItem(key);
      // console.log('🗑️ DELIVERY INFO LIMPIADO del AsyncStorage');
    } catch (error) {
      // console.error('❌ Error limpiando deliveryInfo:', error);
    }
  };
  
  // Función para guardar coordenadas en AsyncStorage
  const saveCoordinates = async (coords, userId) => {
    try {
      const key = `coordinates_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(coords));
      // console.log('💾 COORDENADAS GUARDADAS:', coords);
    } catch (error) {
      // console.error('❌ Error guardando coordenadas:', error);
    }
  };
  
  // Función para restaurar coordenadas desde AsyncStorage
  const restoreCoordinates = async (userId) => {
    try {
      const key = `coordinates_${userId}`;
      const savedData = await AsyncStorage.getItem(key);
      if (savedData) {
        const restoredCoords = JSON.parse(savedData);
        // console.log('📂 COORDENADAS RESTAURADAS:', restoredCoords);
        setLatlong(restoredCoords);
        return restoredCoords;
      }
    } catch (error) {
      // console.error('❌ Error restaurando coordenadas:', error);
    }
    return null;
  };
  
  // Función para limpiar coordenadas guardadas
  const clearSavedCoordinates = async (userId) => {
    try {
      const key = `coordinates_${userId}`;
      await AsyncStorage.removeItem(key);
      // console.log('🗑️ COORDENADAS LIMPIADAS del AsyncStorage');
    } catch (error) {
      // console.error('❌ Error limpiando coordenadas:', error);
    }
  };
  
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // Perfil completo del usuario
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh falso
  const [mapCallbackId] = useState(() => generateCallbackId()); // ID único para callbacks del mapa
  
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

  // Función para cargar direcciones del usuario
  const fetchUserAddresses = async () => {
    if (!user?.id || user?.usertype === 'Guest') return;
    
    setLoadingAddresses(true);
    try {
      const addresses = await addressService.getAllAddresses(user.id);
      setUserAddresses(addresses);
      
      // Si hay una dirección predeterminada, seleccionarla automáticamente
      const defaultAddress = addresses.find(addr => 
        addr.is_default === "1" || addr.is_default === 1
      );
      if (defaultAddress && !selectedAddress) {
        setSelectedAddress(defaultAddress);
        setAddress(defaultAddress.address);
      }
    } catch (error) {
      console.error('❌ Error cargando direcciones:', error);
      setUserAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // TEMPORALMENTE DESHABILITADO - El callback automático está causando problemas
  // useEffect(() => {
  //   const clearDeliveryInfo = () => {
  //     console.log('🧹 CALLBACK CLEAR DELIVERY INFO EJECUTADO');
  //     console.trace('Stack trace del callback clearDeliveryInfo:');
  //     setDeliveryInfo(null);
  //   };
  //   
  //   if (setCartClearCallback) {
  //     setCartClearCallback(clearDeliveryInfo);
  //   }
  // }, [setCartClearCallback]);

  // Inicializar estados cuando cambia el usuario
  useEffect(() => {
    // console.log('🔄 USUARIO CAMBIÓ - Inicializando estados:', {
      // userType: user?.usertype,
      // userId: user?.id,
      // deliveryInfoAntes: deliveryInfo
    // });
    
    if (user?.usertype === 'Guest') {
      const hasEmail = user?.email && user?.email?.trim() !== '';
      setEmail(hasEmail ? user.email : '');
    } else {
      // Usuario registrado
      setEmail(user?.email || '');
      // Cargar perfil completo para obtener dirección actualizada
      fetchUserProfile();
      // Cargar direcciones del usuario
      fetchUserAddresses();
    }
    
    // console.log('🔄 Estados inicializados para usuario:', user?.usertype);
  }, [user]);

  // Actualizar perfil cuando la pantalla gana foco (para refrescar dirección actualizada)
  useFocusEffect(
    React.useCallback(() => {
      const handleFocus = async () => {
        // console.log('📱 PANTALLA CART GANÓ FOCO:', {
          // userType: user?.usertype,
          // deliveryInfoActual: deliveryInfo,
          // timestamp: new Date().toISOString()
        // });
        
        if (user?.usertype !== 'Guest' && user?.id) {
          fetchUserProfile();
          fetchUserAddresses();
          // Solo restaurar datos si hay productos en el carrito
          if (cart.length > 0) {
            // Restaurar deliveryInfo para usuarios registrados
            if (!deliveryInfo) {
              const restored = await restoreDeliveryInfo(user.id);
              // console.log('🔄 RESTAURACIÓN COMPLETADA:', restored);
            }
            // Restaurar coordenadas para usuarios registrados
            if (!latlong?.driver_lat || !latlong?.driver_long) {
              const restoredCoords = await restoreCoordinates(user.id);
              // console.log('🔄 COORDENADAS RESTAURADAS:', restoredCoords);
            }
          } else {
            // console.log('⚠️ Carrito vacío - no se restauran datos');
          }
        }
      };
      
      handleFocus();
      
      // Revisar si hay datos de guest en los parámetros de navegación
      // Intentar múltiples formas de obtener los parámetros
      const navState = navigation.getState();
      const mainTabsRoute = navState?.routes?.find(route => route.name === 'MainTabs');
      const carritoRoute = mainTabsRoute?.state?.routes?.find(route => route.name === 'Carrito');
      
      const params1 = mainTabsRoute?.params;
      const params2 = carritoRoute?.params;
      const params3 = route?.params;
      
      const params = params2 || params1 || params3;
      
      // console.log('🔍 PARÁMETROS DE NAVEGACIÓN DETALLADOS:', {
        // navState: JSON.stringify(navState, null, 2),
        // mainTabsRoute: JSON.stringify(mainTabsRoute, null, 2),
        // carritoRoute: JSON.stringify(carritoRoute, null, 2),
        // params1: JSON.stringify(params1, null, 2),
        // params2: JSON.stringify(params2, null, 2),
        // params3: JSON.stringify(params3, null, 2),
        // paramsFinales: JSON.stringify(params, null, 2),
        // hasGuestData: !!params?.guestData
      // });
      
      if (params?.guestData && user?.usertype === 'Guest') {
        // Usar los datos del guest checkout
        setEmail(params.guestData.email);
        setAddress(params.guestData.address);
        
        // CRITICAL: Restaurar también los datos del formulario si existen
        if (params.guestData.preservedDeliveryInfo) {
          // console.log('🔄 RESTAURANDO DELIVERY INFO:', params.guestData.preservedDeliveryInfo);
          // Convertir el string de fecha de vuelta a Date object
          const deliveryInfoToRestore = {
            ...params.guestData.preservedDeliveryInfo,
            date: new Date(params.guestData.preservedDeliveryInfo.date), // Convertir string a Date
          };
          // console.log('📅 DELIVERY INFO RESTAURADO:', deliveryInfoToRestore);
          setDeliveryInfo(deliveryInfoToRestore);
        }
        if (params.guestData.preservedNeedInvoice !== undefined) {
          setNeedInvoice(params.guestData.preservedNeedInvoice);
        }
        if (params.guestData.preservedTaxDetails !== undefined) {
          setTaxDetails(params.guestData.preservedTaxDetails);
        }
        if (params.guestData.preservedCoordinates) {
          // console.log('🔄 RESTAURANDO COORDENADAS GUEST:', params.guestData.preservedCoordinates);
          setLatlong(params.guestData.preservedCoordinates);
        }
        
        // NUEVO: Si Guest también tiene mapCoordinates, procesar auto-pago aquí mismo
        if (params?.mapCoordinates && user?.usertype === 'Guest') {
          // console.log('🚀 Guest: Procesando guestData + mapCoordinates juntos');
          
          // Actualizar coordenadas también
          setLatlong({
            driver_lat: params.mapCoordinates.latitude,
            driver_long: params.mapCoordinates.longitude,
          });
          
          // ✅ NUEVO ENFOQUE: Marcar flag para auto-pago una vez que el estado esté listo
          // Esto será manejado por un useEffect que vigila cuando todos los datos están completos
          
          // console.log('🏃‍♂️ MARCANDO GUEST PARA AUTO-PAGO...');
          
          // Pequeño delay para asegurar que todos los setState terminen
          setTimeout(() => {
            // Limpiar parámetros después de procesar
            navigation.setParams({ guestData: null, mapCoordinates: null });
            // console.log('✅ Parámetros limpiados, esperando que useEffect detecte datos completos...');
          }, 100);
          
        } else {
          // Limpiar solo guestData si no hay mapCoordinates
          navigation.setParams({ guestData: null });
          
          // Scroll automático normal - si tiene deliveryInfo, ir al botón de pago, si no al de horario
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
      }
      
      // NUEVO: Manejar coordenadas regresadas de MapSelector (solo User registrado)
      // Guest se procesa arriba junto con guestData
      if (params?.mapCoordinates && user?.usertype !== 'Guest') {
        // console.log('🗺️ User registrado: Coordenadas recibidas de MapSelector:', params.mapCoordinates);
        
        // Guardar coordenadas en el estado
        setLatlong({
          driver_lat: params.mapCoordinates.latitude,
          driver_long: params.mapCoordinates.longitude,
        });
        
        // Limpiar parámetros
        navigation.setParams({ mapCoordinates: null });
        
        // Proceder directamente al pago con coordenadas frescas
        setTimeout(() => {
          // console.log('🚀 User registrado: Auto-iniciando pago después de confirmar coordenadas');
          completeOrder();
        }, 300);
      }
      
      // NUEVO: Scroll automático al entrar al carrito para TODOS los usuarios
      if (cart.length > 0) {
        setTimeout(() => {
          if (deliveryInfo) {
            // Ya tiene horario seleccionado → scroll al botón "Pagar"
            // console.log('Usuario con horario - scroll hacia botón pagar');
            flatListRef.current?.scrollToEnd({ animated: true });
          } else {
            // No tiene horario → scroll al botón "Seleccionar Horario"
            // console.log('Usuario sin horario - scroll hacia selección horario');
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }, 800); // Delay para asegurar que todo esté renderizado
      }
    }, [user?.id, user?.usertype, navigation, cart.length, deliveryInfo])
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

  // 🚀 AUTO-PAGO GUEST: Detectar cuando todos los datos están completos y lanzar auto-pago
  useEffect(() => {
    // Solo para Guest users con datos completos
    if (user?.usertype === 'Guest' && 
        deliveryInfo && 
        email?.trim() && 
        address?.trim() && 
        latlong?.driver_lat && 
        latlong?.driver_long &&
        cart.length > 0) {
      
      // console.log('🎯 GUEST AUTO-PAGO: Todos los datos están completos!', {
        // deliveryInfo: !!deliveryInfo,
        // email: email,
        // address: address.substring(0, 50) + '...',
        // coordinates: latlong,
        // cartItems: cart.length
      // });
      
      // Pequeño delay para asegurar que la UI esté lista
      const autoPayTimeout = setTimeout(() => {
        // console.log('🚀 EJECUTANDO AUTO-PAGO GUEST...');
        completeOrder();
      }, 300);
      
      return () => clearTimeout(autoPayTimeout);
    }
  }, [user?.usertype, deliveryInfo, email, address, latlong?.driver_lat, latlong?.driver_long, cart.length]);

  // Invocado desde el botón de checkout
  const decideCheckout = () => {
    completeOrder();
  };


  // 1) Flujo único y robusto de pago
  const completeOrder = async () => {
    
    if (loading) return;
    
    // console.log('🔍 COMPLETE ORDER - VALIDACIONES:', {
      // deliveryInfo: deliveryInfo,
      // isRestoringDeliveryInfo: isRestoringDeliveryInfo,
      // userType: user?.usertype,
      // totalPrice: totalPrice,
      // email: email,
      // address: address,
      // latlong: latlong,
      // userProfile: userProfile
    // });
    
    // VALIDACIONES CRÍTICAS ANTES DE ABRIR PASARELA
    
    // 1. Validar carrito no vacío
    if (totalPrice <= 0) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No hay productos en el carrito.',
        confirmText: 'Cerrar',
      });
      return;
    }
    
    // 2. Validar información de entrega (CRÍTICO)
    // Si está restaurando, mostrar mensaje diferente
    if (isRestoringDeliveryInfo) {
      showAlert({
        type: 'info',
        title: 'Cargando datos',
        message: 'Espera un momento mientras restauramos tu información de entrega...',
        confirmText: 'Cerrar',
      });
      return;
    }
    
    if (!deliveryInfo) {
      // Intentar restaurar una vez más antes de fallar
      // console.log('⚠️ deliveryInfo es null, intentando restaurar...');
      if (user?.id && user?.usertype !== 'Guest') {
        // Usuario registrado: intentar restaurar de AsyncStorage
        const restored = await restoreDeliveryInfo(user.id);
        if (!restored) {
          showAlert({
            type: 'error',
            title: 'Información incompleta',
            message: 'Por favor selecciona la fecha y hora de entrega.',
            confirmText: 'Cerrar',
          });
          return;
        }
        // console.log('✅ deliveryInfo restaurado en validación:', restored);
        // Continuar con la orden usando el deliveryInfo restaurado
      } else if (user?.usertype === 'Guest') {
        // Guest: esperar un momento más para que se actualice el estado
        // console.log('⚠️ Guest sin deliveryInfo, esperando actualización de estado...');
        setTimeout(() => {
          if (deliveryInfo) {
            // console.log('✅ Guest deliveryInfo actualizado, reintentando pago');
            completeOrder();
          } else {
            showAlert({
              type: 'error',
              title: 'Información incompleta',
              message: 'Por favor selecciona la fecha y hora de entrega.',
              confirmText: 'Cerrar',
            });
          }
        }, 200);
        return;
      } else {
        showAlert({
          type: 'error',
          title: 'Información incompleta',
          message: 'Por favor selecciona la fecha y hora de entrega.',
          confirmText: 'Cerrar',
        });
        return;
      }
    }
    
    // 3. Validar datos según tipo de usuario
    if (user?.usertype === 'Guest') {
      // Guest: requiere email, dirección Y coordenadas del mapa
      if (!email?.trim()) {
        showAlert({
          type: 'error',
          title: 'Información incompleta',
          message: 'Por favor proporciona tu email.',
          confirmText: 'Cerrar',
        });
        return;
      }
      
      if (!address?.trim()) {
        showAlert({
          type: 'error',
          title: 'Información incompleta', 
          message: 'Por favor proporciona tu dirección.',
          confirmText: 'Cerrar',
        });
        return;
      }
      
      // Guest también necesita coordenadas del mapa
      if (!latlong?.driver_lat || !latlong?.driver_long) {
        // console.log('⚠️ Guest sin coordenadas, esperando actualización de estado...');
        setTimeout(() => {
          if (latlong?.driver_lat && latlong?.driver_long) {
            // console.log('✅ Guest coordenadas actualizadas, reintentando pago');
            completeOrder();
          } else {
            showAlert({
              type: 'error',
              title: 'Ubicación requerida',
              message: 'Por favor confirma tu ubicación exacta en el mapa.',
              confirmText: 'Cerrar',
            });
          }
        }, 200);
        return;
      }
    } else {
      // Usuario registrado: requiere dirección Y coordenadas del mapa
      const savedAddress = userProfile?.address || user?.address;
      if (!savedAddress?.trim() && !address?.trim()) {
        showAlert({
          type: 'error',
          title: 'Dirección requerida',
          message: 'Por favor agrega una dirección en tu perfil o proporciona una dirección.',
          confirmText: 'Cerrar',
        });
        return;
      }
      
      if (!latlong?.driver_lat || !latlong?.driver_long) {
        // Intentar restaurar coordenadas antes de fallar
        // console.log('⚠️ Coordenadas faltantes, intentando restaurar...');
        if (user?.id) {
          const restoredCoords = await restoreCoordinates(user.id);
          if (!restoredCoords || !restoredCoords.driver_lat || !restoredCoords.driver_long) {
            showAlert({
              type: 'error',
              title: 'Ubicación requerida',
              message: 'Por favor confirma tu ubicación exacta en el mapa.',
              confirmText: 'Cerrar',
            });
            return;
          }
          // console.log('✅ Coordenadas restauradas en validación:', restoredCoords);
        } else {
          showAlert({
            type: 'error',
            title: 'Ubicación requerida',
            message: 'Por favor confirma tu ubicación exacta en el mapa.',
            confirmText: 'Cerrar',
          });
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Las coordenadas ya fueron confirmadas por el usuario en el mapa
      // No necesitamos pedir permisos de ubicación nuevamente
      // Si no se obtiene ubicación, continuar igual (es opcional para users/guests)
      // 1.1) Crear PaymentIntent en el servidor
      const orderEmail = user?.usertype === 'Guest' ? (email?.trim() || user?.email || '') : (user?.email || '');
      
      const {data} = await axios.post(
        'https://food.siliconsoft.pk/api/create-payment-intent',
        {amount: parseFloat(totalPrice) * 100, currency: 'mxn', email: orderEmail},
      );
      const clientSecret = data.clientSecret;
      if (!clientSecret) {
        throw new Error('No se obtuvo clientSecret del servidor.');
      }

      // 1.2) Inicializar Stripe PaymentSheet
      const {error: initError} = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Lácteos y más',
        allowsDelayedPaymentMethods: true, // CAMBIADO: true para OXXO y otros métodos delayed
        returnURL: 'occr-productos-app://stripe-redirect',
        // Configuración de métodos de pago específicos para México
        defaultBillingDetails: {
          address: {
            country: 'MX', // México
          },
        },
        applePay: {
          // sólo iOS
          merchantCountryCode: 'MX',
          merchantIdentifier: 'merchant.com.occr.productos',
        },
        googlePay: {
          // sólo Android
          merchantCountryCode: 'MX', // México
          testEnv: false, // producción (live)
          currencyCode: 'MXN', // Pesos mexicanos
        },
        // Configuración explícita de métodos de pago
        primaryButtonLabel: `Pagar ${formatPriceWithSymbol(totalPrice)}`,
        // Asegurar que se acepten tarjetas internacionales
        appearance: {
          primaryButton: {
            colors: {
              light: {
                background: '#D27F27',
              },
              dark: {
                background: '#D27F27',
              },
            },
          },
        },
      });
      if (initError) {
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
        await updateUser({ email: email.trim() });
      }
      
      // Crear resumen del pedido
      const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
      const deliveryText = deliveryInfo ? 
        `📅 ${deliveryInfo.date.toLocaleDateString('es-ES')} - ${deliveryInfo.slot}` : 
        'Horario pendiente';
      
      // Obtener número de orden de la respuesta
      const orderNumber = orderData?.order_id || orderData?.id;
      const isValidOrderId = orderNumber && orderNumber !== 'N/A' && orderNumber.toString().trim() !== '';
      
      // console.log('=== MODAL ÉXITO PEDIDO ===');
      // console.log('orderData completo:', orderData);
      // console.log('orderNumber extraído:', orderNumber);
      // console.log('isValidOrderId:', isValidOrderId);
      
      // Limpiar datos inmediatamente después del pedido exitoso
      clearCart();
      setDeliveryInfo(null);
      setLatlong(null);
      
      // Limpiar deliveryInfo y coordenadas guardados en AsyncStorage
      if (user?.id) {
        clearSavedDeliveryInfo(user.id);
        clearSavedCoordinates(user.id);
      }
      
      // Actualizar órdenes
      refreshOrders();
      
      // Navegar al inicio inmediatamente con los datos del pedido para mostrar el modal
      navigation.navigate('MainTabs', { 
        screen: 'Inicio',
        params: { 
          screen: 'CategoriesList',
          showSuccessModal: true,
          orderData: {
            orderNumber: formatOrderId(orderData?.created_at || new Date().toISOString()),
            totalPrice: totalPrice,
            itemCount: itemCount,
            deliveryText: deliveryText,
            needInvoice: needInvoice,
            orderId: isValidOrderId ? orderNumber.toString() : null
          }
        }
      });
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
    
    if (userType === 'Guest') {
      // Guest: usa dirección manual que escribió + coordenadas del mapa
      return {
        customer_lat: latlong.driver_lat || '', // Coordenadas del MapSelector
        customer_long: latlong.driver_long || '', // Coordenadas del MapSelector
        address_source: 'guest_manual_address',
        delivery_address: address?.trim() || ''
      };
    } 
    else {
      // Usuario registrado: usa dirección guardada + coordenadas del MapSelector
      const savedAddress = userProfile?.address || user?.address;
      return {
        customer_lat: latlong.driver_lat || '', // Coordenadas del MapSelector
        customer_long: latlong.driver_long || '', // Coordenadas del MapSelector
        address_source: 'registered_user_address',
        delivery_address: savedAddress?.trim() || address?.trim() || ''
      };
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
      
      // console.log('📍 DATOS DE ENVÍO:', {
        // coordinates: coordinates,
        // finalDeliveryAddress: coordinates.delivery_address || address?.trim() || '',
        // userType: user?.usertype
      // });

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
    // console.log('🔍 HANDLE CHECKOUT - ESTADO ACTUAL:', {
      // deliveryInfo: deliveryInfo,
      // isRestoringDeliveryInfo: isRestoringDeliveryInfo,
      // userType: user?.usertype,
      // cartLength: cart.length
    // });
    
    if (user?.usertype === 'Guest') {
      
      // Verificar si el guest ya tiene email y dirección
      const hasEmail = email?.trim() && email.trim() !== '';
      const hasAddress = address?.trim() && address.trim() !== '';
      
      if (hasEmail && hasAddress) {
        // Guest ya completó sus datos: proceder directamente al pago
        completeOrder();
      } else {
        // Guest necesita completar datos: ir a GuestCheckout
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
          preservedCoordinates: latlong, // Preservar coordenadas para Guest
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
        // Usuario tiene dirección: verificar si ya tiene coordenadas
        const hasCoordinates = latlong?.driver_lat && latlong?.driver_long;
        
        if (hasCoordinates) {
          // ✅ Ya tiene coordenadas: proceder directamente al pago
          completeOrder();
        } else {
          // No tiene coordenadas: ir a MapSelector (flujo legacy)
          navigation.navigate('MapSelector', {
            userAddress: userProfile.address,
            title: 'Confirmar ubicación para entrega',
            // No pasamos onConfirm como callback, MapSelector regresará aquí con coordenadas
          });
        }
      }
    }
  };

  // ✅ NUEVA FUNCIÓN: Ir al mapa directamente desde el carrito (usuarios registrados)
  const goToMapFromCart = async () => {
    const userAddress = userProfile?.address || user?.address || '';
    
    // ✅ REGISTRAR CALLBACK para recibir coordenadas del mapa
    const handleLocationReturn = (coordinates) => {
      setLatlong({
        driver_lat: coordinates.latitude,
        driver_long: coordinates.longitude,
      });
    };
    
    registerNavigationCallback(mapCallbackId, handleLocationReturn);
    
    navigation.navigate('AddressMap', {
      addressForm: {},
      selectedLocation: { latitude: 19.4326, longitude: -99.1332 }, // Centro CDMX por defecto
      callbackId: mapCallbackId, // ✅ PASAR ID DE CALLBACK
      userWrittenAddress: userAddress, // Pasar dirección del usuario para contexto
      fromGuestCheckout: false, // Es un usuario registrado
    });
  };

  // ✅ CLEANUP: Limpiar callback del mapa al desmontar componente
  useEffect(() => {
    return () => {
      cleanupNavigationCallback(mapCallbackId);
    };
  }, [mapCallbackId]);

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
      {/* Overlay de loading que bloquea toda la pantalla */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#33A744" />
            <Text style={styles.loadingText}>🔄 Procesando pago...</Text>
            <Text style={styles.loadingSubtext}>Por favor no cierres la aplicación</Text>
          </View>
        </View>
      )}
      
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
                isRestoringDeliveryInfo={isRestoringDeliveryInfo}
                loading={loading}
                setTaxDetails={setTaxDetails}
                handleCheckout={handleCheckout}
                setPickerVisible={setPickerVisible}
                loadingUpsell={loadingUpsell}
                upsellItems={upsellItems}
                addToCart={addToCart}
                user={user}
                email={email}
                address={address}
                cart={cart}
                latlong={latlong}
                userProfile={userProfile}
                goToMapFromCart={goToMapFromCart} // ✅ NUEVA: Función para ir al mapa desde el carrito
              />
            }
            ListFooterComponentStyle={{paddingTop: 8}}
          />
        </>
      )}

      <DeliverySlotPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={({date, slot}) => {
          // console.log('📅 CART - RECIBIENDO DE PICKER:');
          // console.log('- date recibido:', date);
          // console.log('- date type:', typeof date);
          // console.log('- slot recibido:', slot);
          
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
                <Text style={styles.modalTitle}>📍 Seleccionar Dirección</Text>
                
                {loadingAddresses ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B5E3C" />
                    <Text style={styles.loadingText}>Cargando direcciones...</Text>
                  </View>
                ) : userAddresses.length > 1 ? (
                  // Usuario CON MÚLTIPLES direcciones guardadas - Mostrar selector
                  <>
                    <Text style={styles.modalMessage}>
                      Selecciona la dirección donde quieres recibir tu pedido:
                    </Text>
                    
                    <ScrollView style={styles.addressList} nestedScrollEnabled={true}>
                      {userAddresses.map((addr) => {
                        const isSelected = selectedAddress?.id === addr.id;
                        const isDefault = addr.is_default === "1" || addr.is_default === 1;
                        
                        return (
                          <TouchableOpacity
                            key={addr.id}
                            style={[
                              styles.addressOption,
                              isSelected && styles.selectedAddressOption,
                              isDefault && styles.defaultAddressOption
                            ]}
                            onPress={() => {
                              setSelectedAddress(addr);
                              setAddress(addr.address);
                            }}>
                            <View style={styles.addressOptionHeader}>
                              <View style={styles.addressIconContainer}>
                                <Ionicons 
                                  name={isDefault ? "home" : "location-outline"} 
                                  size={18} 
                                  color={isSelected ? "#33A744" : isDefault ? "#D27F27" : "#8B5E3C"} 
                                />
                                {isDefault && (
                                  <Text style={styles.defaultBadgeSmall}>Predeterminada</Text>
                                )}
                              </View>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={20} color="#33A744" />
                              )}
                            </View>
                            <Text style={[
                              styles.addressOptionText,
                              isSelected && styles.selectedAddressText
                            ]} numberOfLines={3}>
                              {addr.address}
                            </Text>
                            {addr.phone && (
                              <Text style={styles.phoneTextSmall}>
                                📱 {addr.phone}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalButtonSecondary}
                        onPress={() => {
                          setShowAddressModal(false);
                          navigation.navigate('AddressManager');
                        }}>
                        <Text style={styles.modalButtonSecondaryText}>⚙️ Gestionar Direcciones</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.modalButtonPrimary,
                          !selectedAddress && styles.modalButtonDisabled
                        ]}
                        disabled={!selectedAddress}
                        onPress={() => {
                          setShowAddressModal(false);
                          completeOrder(); // Usar dirección seleccionada
                        }}>
                        <Text style={[
                          styles.modalButtonPrimaryText,
                          !selectedAddress && styles.modalButtonDisabledText
                        ]}>
                          📋 Usar Dirección Seleccionada
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : userAddresses.length === 1 ? (
                  // Usuario CON UNA SOLA dirección - Usar automáticamente
                  <>
                    <Text style={styles.modalMessage}>
                      Usaremos tu dirección guardada para este pedido:
                    </Text>
                    
                    <View style={[styles.addressOption, styles.singleAddressPreview]}>
                      <View style={styles.addressOptionHeader}>
                        <View style={styles.addressIconContainer}>
                          <Ionicons 
                            name="home" 
                            size={18} 
                            color="#33A744"
                          />
                          <Text style={styles.defaultBadgeSmall}>Tu dirección</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={20} color="#33A744" />
                      </View>
                      <Text style={[styles.addressOptionText, styles.selectedAddressText]} numberOfLines={3}>
                        {userAddresses[0].address}
                      </Text>
                      {userAddresses[0].phone && (
                        <Text style={styles.phoneTextSmall}>
                          📱 {userAddresses[0].phone}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalButtonSecondary}
                        onPress={() => {
                          setShowAddressModal(false);
                          navigation.navigate('AddressManager');
                        }}>
                        <Text style={styles.modalButtonSecondaryText}>⚙️ Gestionar Direcciones</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalButtonPrimary}
                        onPress={() => {
                          setSelectedAddress(userAddresses[0]);
                          setAddress(userAddresses[0].address);
                          setShowAddressModal(false);
                          completeOrder(); // Usar la única dirección
                        }}>
                        <Text style={styles.modalButtonPrimaryText}>📋 Usar Esta Dirección</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  // Usuario SIN direcciones guardadas
                  <>
                    <Text style={styles.modalMessage}>
                      Aún no tienes direcciones guardadas.{'\n\n'}
                      Puedes agregar una nueva dirección o usar tu ubicación actual para esta compra.
                    </Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalButtonSecondary}
                        onPress={() => {
                          setShowAddressModal(false);
                          navigation.navigate('AddressFormUberStyle', {
                            title: 'Agregar Dirección',
                            editMode: false,
                            fromCart: true,
                          });
                        }}>
                        <Text style={styles.modalButtonSecondaryText}>➕ Agregar Dirección</Text>
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
    marginTop: 8,
    marginBottom: 8,
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
  guestAddressContainer: {
    flex: 1,
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
  // Estilos para overlay de loading
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F2F2F',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  
  // 🐛 Estilos para caja de debug
  debugContainer: {
    backgroundColor: '#2F2F2F',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  debugHeader: {
    backgroundColor: '#FF6B35',
    padding: 12,
    alignItems: 'center',
  },
  debugTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginBottom: 2,
  },
  debugSubtitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.9)',
  },
  debugContent: {
    padding: 16,
  },
  debugSection: {
    marginBottom: 16,
  },
  debugSectionTitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FF6B35',
    marginBottom: 8,
  },
  debugText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#FFF',
    marginBottom: 4,
    lineHeight: 18,
  },
  debugValidation: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  debugValid: {
    color: '#4CAF50',
  },
  debugInvalid: {
    color: '#F44336',
  },
  
  // ✅ NUEVOS ESTILOS PARA SECCIÓN DE UBICACIÓN DE USUARIOS REGISTRADOS
  registeredUserLocationSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  locationSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#2F2F2F',
    marginBottom: 8,
  },
  userAddressText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#2F2F2F',
    marginBottom: 12,
    lineHeight: 20,
  },
  locationStatusContainer: {
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.1)',
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationStatusText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#2F2F2F',
  },
  adjustLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  adjustLocationButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#8B5E3C',
  },
  selectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#8B5E3C',
    borderRadius: 6,
  },
  selectLocationButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#FFF',
  },
  
  // ✅ ESTILOS PARA SELECTOR DE MÚLTIPLES DIRECCIONES
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
  },
  addressList: {
    maxHeight: 300,
    marginVertical: 16,
  },
  addressOption: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedAddressOption: {
    borderColor: '#33A744',
    borderWidth: 2,
    backgroundColor: 'rgba(51, 167, 68, 0.05)',
  },
  defaultAddressOption: {
    borderColor: '#D27F27',
  },
  addressOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  defaultBadgeSmall: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#D27F27',
    color: '#FFF',
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    borderRadius: 4,
  },
  addressOptionText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 20,
    marginBottom: 4,
  },
  selectedAddressText: {
    color: '#33A744',
    fontFamily: fonts.bold,
  },
  phoneTextSmall: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
  },
  modalButtonDisabled: {
    backgroundColor: '#CCC',
  },
  modalButtonDisabledText: {
    color: '#999',
  },
  singleAddressPreview: {
    borderColor: '#33A744',
    borderWidth: 2,
    backgroundColor: 'rgba(51, 167, 68, 0.05)',
    marginVertical: 16,
  },
});

// <-- justo después de StyleSheet.create({...})
const CartFooter = ({
  deliveryInfo,
  totalPrice,
  needInvoice,
  setNeedInvoice,
  taxDetails,
  isRestoringDeliveryInfo,
  loading,
  setTaxDetails,
  handleCheckout,
  setPickerVisible,
  loadingUpsell,
  upsellItems,
  addToCart,
  user,
  email,
  address,
  cart, // ✅ NUEVO: Para construir payload debug
  latlong, // ✅ NUEVO: Para mostrar coordenadas
  userProfile, // ✅ NUEVO: Para direcciones de usuario registrado
  goToMapFromCart, // ✅ NUEVA: Función para ir al mapa desde el carrito
}) => {
  
  // 🐛 FUNCIÓN DEBUG: Construir payload que se enviará al backend - TEMPORALMENTE DESHABILITADA
  /*
  const buildDebugPayload = () => {
    if (!cart || cart.length === 0) return null;
    
    try {
      // Construir array de productos igual que en completeOrderFunc
      const cartUpdateArr = cart.map(it => {
        const itemDiscount = Number(it.discount) || 0;
        const finalPrice = it.price - itemDiscount;
        
        return {
          item_name: it.name,
          item_price: finalPrice.toString(),
          item_original_price: it.price.toString(),
          item_discount: itemDiscount.toString(),
          item_qty: it.quantity.toString(),
          item_image: it.photo,
        };
      });
      
      // Email según tipo de usuario
      const userEmailForOrder = user?.usertype === 'Guest' 
        ? (email?.trim() || user?.email || '') 
        : (user?.email || '');
      
      // Coordenadas según tipo de usuario (lógica simplificada)
      let coordinates = {
        customer_lat: latlong?.driver_lat || '',
        customer_long: latlong?.driver_long || '',
        address_source: user?.usertype === 'Guest' ? 'guest_manual_address' : 'registered_user_address',
        delivery_address: ''
      };
      
      if (user?.usertype === 'Guest') {
        coordinates.delivery_address = address?.trim() || '';
      } else {
        const savedAddress = userProfile?.address || user?.address;
        coordinates.delivery_address = savedAddress?.trim() || address?.trim() || '';
      }
      
      // Payload completo
      const payload = {
        userid: user?.id,
        orderno: '1',
        user_email: userEmailForOrder,
        orderdetails: cartUpdateArr,
        customer_lat: coordinates.customer_lat,
        customer_long: coordinates.customer_long,
        address_source: coordinates.address_source,
        delivery_address: coordinates.delivery_address,
        need_invoice: needInvoice ? "true" : "false",
        tax_details: needInvoice ? (taxDetails || '') : '',
        delivery_date: deliveryInfo?.date ? deliveryInfo.date.toISOString().split('T')[0] : '',
        delivery_slot: deliveryInfo?.slot || '',
      };
      
      return payload;
    } catch (error) {
      return { error: error.message };
    }
  };
  */
  
  // const debugPayload = buildDebugPayload(); // TEMPORALMENTE DESHABILITADO
  
  return (
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
                <View style={styles.guestAddressContainer}>
                  <Text style={styles.guestIndicatorText}>Dirección:</Text>
                  <Text style={styles.guestIndicatorValue} numberOfLines={0}>
                    {address}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ✅ NUEVA SECCIÓN: Ubicación opcional para usuarios registrados */}
        {user && user.usertype !== 'Guest' && deliveryInfo && userProfile?.address && (
          <View style={styles.registeredUserLocationSection}>
            <Text style={styles.locationSectionTitle}>📍 Ubicación de entrega</Text>
            <Text style={styles.userAddressText}>
              {userProfile.address}
            </Text>
            
            {/* Estado de la ubicación en mapa */}
            <View style={styles.locationStatusContainer}>
              {latlong?.driver_lat && latlong?.driver_long ? (
                <View style={styles.locationStatusRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#33A744" />
                  <Text style={styles.locationStatusText}>
                    Ubicación confirmada en el mapa
                  </Text>
                  <TouchableOpacity
                    style={styles.adjustLocationButton}
                    onPress={goToMapFromCart}>
                    <Ionicons name="map-outline" size={16} color="#8B5E3C" />
                    <Text style={styles.adjustLocationButtonText}>Ajustar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.locationStatusRow}>
                  <Ionicons name="location-outline" size={20} color="#D27F27" />
                  <Text style={styles.locationStatusText}>
                    Para mayor precisión, puedes confirmar tu ubicación
                  </Text>
                  <TouchableOpacity
                    style={styles.selectLocationButton}
                    onPress={goToMapFromCart}>
                    <Ionicons name="map" size={16} color="#FFF" />
                    <Text style={styles.selectLocationButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.checkoutButton, (!deliveryInfo || isRestoringDeliveryInfo || loading) && {opacity: 0.5}]}
          onPress={handleCheckout}
          disabled={!deliveryInfo || isRestoringDeliveryInfo || loading}>
          <Text style={styles.checkoutText}>
            {loading ? '🔄 Procesando pago...' : 
             isRestoringDeliveryInfo ? '⏳ Cargando...' : 
             `💳 Pagar ${totalPrice} MXN`}
          </Text>
        </TouchableOpacity>
      </View>
    )}
    
    {/* 🐛 DEBUG: Caja para mostrar payload que se enviará al backend - TEMPORALMENTE DESHABILITADO */}
    {/*
    {debugPayload && (
      <View style={styles.debugContainer}>
        <TouchableOpacity 
          style={styles.debugHeader}
          onPress={() => {
            // Toggle para expandir/contraer (simplificado)
          }}>
          <Text style={styles.debugTitle}>🐛 Debug: Payload Backend</Text>
          <Text style={styles.debugSubtitle}>Datos que se enviarán al API</Text>
        </TouchableOpacity>
        
        <View style={styles.debugContent}>
          <View style={styles.debugSection}>
            <Text style={styles.debugSectionTitle}>📋 Información básica:</Text>
            <Text style={styles.debugText}>👤 Usuario: {debugPayload.user_email || 'Sin email'}</Text>
            <Text style={styles.debugText}>🏷️ Tipo: {user?.usertype || 'Unknown'}</Text>
            <Text style={styles.debugText}>📦 Items: {debugPayload.orderdetails?.length || 0}</Text>
            <Text style={styles.debugText}>💰 Total: ${totalPrice} MXN</Text>
          </View>
          
          <View style={styles.debugSection}>
            <Text style={styles.debugSectionTitle}>🚚 Entrega:</Text>
            <Text style={styles.debugText}>📅 Fecha: {debugPayload.delivery_date || 'No seleccionada'}</Text>
            <Text style={styles.debugText}>⏰ Horario: {debugPayload.delivery_slot || 'No seleccionado'}</Text>
            <Text style={styles.debugText} numberOfLines={2}>
              📍 Dirección: {debugPayload.delivery_address || 'Sin dirección'}
            </Text>
          </View>
          
          <View style={styles.debugSection}>
            <Text style={styles.debugSectionTitle}>🗺️ Coordenadas:</Text>
            <Text style={styles.debugText}>📐 Lat: {debugPayload.customer_lat || 'Sin coordenadas'}</Text>
            <Text style={styles.debugText}>📐 Lng: {debugPayload.customer_long || 'Sin coordenadas'}</Text>
            <Text style={styles.debugText}>🏗️ Origen: {debugPayload.address_source}</Text>
          </View>
          
          {needInvoice && (
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>🧾 Facturación:</Text>
              <Text style={styles.debugText}>✅ Requiere factura</Text>
              <Text style={styles.debugText} numberOfLines={1}>
                📄 RFC: {debugPayload.tax_details || 'Sin datos fiscales'}
              </Text>
            </View>
          )}
          
          <View style={[styles.debugSection, styles.debugValidation]}>
            <Text style={styles.debugSectionTitle}>✅ Validación:</Text>
            <Text style={[styles.debugText, 
              debugPayload.user_email ? styles.debugValid : styles.debugInvalid]}>
              Email: {debugPayload.user_email ? '✅' : '❌'}
            </Text>
            <Text style={[styles.debugText, 
              debugPayload.delivery_address ? styles.debugValid : styles.debugInvalid]}>
              Dirección: {debugPayload.delivery_address ? '✅' : '❌'}
            </Text>
            <Text style={[styles.debugText, 
              (debugPayload.customer_lat && debugPayload.customer_long) ? styles.debugValid : styles.debugInvalid]}>
              Coordenadas: {(debugPayload.customer_lat && debugPayload.customer_long) ? '✅' : '❌'}
            </Text>
            <Text style={[styles.debugText, 
              (debugPayload.delivery_date && debugPayload.delivery_slot) ? styles.debugValid : styles.debugInvalid]}>
              Horario: {(debugPayload.delivery_date && debugPayload.delivery_slot) ? '✅' : '❌'}
            </Text>
          </View>
        </View>
      </View>
    )}
    */}
  </View>
  );
};