import React, {useContext, useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Switch,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import {CartContext} from '../context/CartContext';
import {AuthContext} from '../context/AuthContext';
import {OrderContext} from '../context/OrderContext';
import {useStripe} from '@stripe/stripe-react-native';
import {useNotification} from '../context/NotificationContext';
import {useAlert} from '../context/AlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeliverySlotPicker from '../components/DeliverySlotPicker';
import CouponInput from '../components/CouponInput';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  generateCallbackId, 
  registerNavigationCallback, 
  cleanupNavigationCallback 
} from '../utils/navigationCallbacks';
import axios from 'axios';
import Config from 'react-native-config';
import { geocodeGuestAddress, convertToDriverCoords, geocodeAddress } from '../utils/geocodingUtils';
import fonts from '../theme/fonts';
import styles from './Cart.styles';
import {formatPriceWithSymbol} from '../utils/priceFormatter';
import {formatOrderId} from '../utils/orderIdFormatter';
import { newAddressService } from '../services/newAddressService';
import {formatQuantityWithUnit} from '../utils/unitFormatter';
import NotificationService from '../services/NotificationService'; // 🔔 Para FCM token
import { API_BASE_URL } from '../config/environment';
import { validatePostalCode, getPostalCodeInfo } from '../utils/postalCodeValidator';
import { navigateToCartNew } from '../utils/addressNavigation';

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
    automaticPromotions,
    getAutomaticPromotions,
  } = useContext(CartContext);
  const {user, updateUser} = useContext(AuthContext);
  const {refreshOrders, updateOrders, enableGuestOrders} = useContext(OrderContext);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const {initPaymentSheet, presentPaymentSheet, retrievePaymentIntent} = useStripe();
  // TEMPORALMENTE COMENTADO - Sistema de temporizadores de productos
  // const [timers, setTimers] = useState({});
  const [email, setEmail] = useState((user?.email && typeof user?.email === 'string') ? user?.email : '');
  const [address, setAddress] = useState((user?.address && typeof user?.address === 'string') ? user?.address : '');
  const [selectedAddress, setSelectedAddress] = useState(null); // Nueva dirección seleccionada
  const [userAddresses, setUserAddresses] = useState([]); // Lista de direcciones del usuario
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [needInvoice, setNeedInvoice] = useState(false);
  const [taxDetails, setTaxDetails] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [upsellItems, setUpsellItems] = useState([]);
  const [loadingUpsell, setLoadingUpsell] = useState(true);
  const [showLoadingContent, setShowLoadingContent] = useState(true); // 🆕 Controlar si mostrar el cuadro o solo el overlay
  // 📦 NUEVO: Estados para sistema de envío motivacional
  const [shippingConfig, setShippingConfig] = useState(null);
  const [shippingMotivation, setShippingMotivation] = useState(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingCalculated, setShippingCalculated] = useState(false); // ⚡ Flag para saber si ya se calculó envío
  const [latlong, setLatlong] = useState({
    driver_lat: '',
    driver_long: '',
  });
  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [isRestoringDeliveryInfo, setIsRestoringDeliveryInfo] = useState(false);
  
  // 🔍 DEBUG: Monitorear cambios en deliveryInfo
  useEffect(() => {
    // Guardar deliveryInfo en AsyncStorage cuando cambie (solo para usuarios registrados)
    if (deliveryInfo && user?.id && user?.usertype !== 'Guest' && cart.length > 0) {
      saveDeliveryInfo(deliveryInfo, user.id);
    }
  }, [deliveryInfo, user?.id, cart.length]);

  // 🔄 NUEVO: Cargar automáticamente datos Guest desde BD al inicializar
  useEffect(() => {
    const loadGuestDataFromDatabase = async () => {
      // Solo para Guests con email y sin coordenadas ya cargadas
      if (user?.usertype === 'Guest' && user?.email && (!latlong?.driver_lat || !latlong?.driver_long)) {
        try {
          const guestData = await loadGuestDataFromDB(user.email);

          if (guestData) {
            setEmail(guestData.email);
            setAddress(guestData.address);
            if (guestData.coordinates) {
              setLatlong(guestData.coordinates);
            }

            // Calcular envío si tenemos datos completos
            const currentSubtotal = getSubtotal() - getDiscountAmount();
            if (currentSubtotal > 0 && guestData.address?.trim()) {
              setTimeout(() => {
                calculateShippingAndMotivation(currentSubtotal);
              }, 300);
            }
          }
        } catch (error) {
        }
      }
    };

    loadGuestDataFromDatabase();
  }, [user?.usertype, user?.email, latlong?.driver_lat, latlong?.driver_long]);

  // 🔍 DEBUG: Monitorear cambios en coordenadas
  useEffect(() => {
    // Guardar coordenadas en AsyncStorage cuando cambien (solo para usuarios registrados)
    if (latlong?.driver_lat && latlong?.driver_long && user?.id && user?.usertype !== 'Guest' && cart.length > 0) {
      saveCoordinates(latlong, user.id);
    }
  }, [latlong, user?.id, cart.length]);

  // 🛒 MONITOR: Resetear datos cuando carrito esté vacío
  useEffect(() => {
    // Si el carrito está vacío, resetear todos los datos
    if (cart.length === 0) {
      
      // Resetear fecha y hora de entrega
      setDeliveryInfo(null);
      
      // 🆕 GUEST FIX: NUNCA resetear coordenadas para Guest - siempre preservarlas
      // Solo resetear coordenadas para usuarios registrados
      if (user?.usertype !== 'Guest') {
        setLatlong({
          driver_lat: '',
          driver_long: '',
        });
      }
      
      // Resetear datos de facturación
      setNeedInvoice(false);
      setTaxDetails('');
      
      // 🆕 RESETEAR FLAGS para próxima compra
      setGuestJustCompletedAddress(false);
      setShippingCalculated(false); // ⚡ Resetear flag de envío calculado
      
      // Limpiar AsyncStorage si hay usuario registrado
      if (user?.id && user?.usertype !== 'Guest') {
        clearSavedDeliveryInfo(user.id);
        clearSavedCoordinates(user.id);
      }
      
      // Para Guest, no hay AsyncStorage que limpiar, solo resetear estado local
      
    }
  }, [cart.length, totalPrice, user?.id]);

  // 📦 NUEVO: Cargar configuración inicial de envío
  useEffect(() => {
    fetchShippingConfig();
  }, []);

  // 🛒 NUEVO: Verificar expiración del carrito (24h)
  useEffect(() => {
    const checkCartExpiration = async () => {
      try {
        // Solo verificar cuando el usuario esté definido
        if (user === undefined) return;
        
        // Obtener timestamp del carrito en AsyncStorage
        const currentUserId = user?.id?.toString() || user?.email || 'anonymous';
        const cartKey = `cart_${currentUserId}`;
        
        const savedCart = await AsyncStorage.getItem(cartKey);
        let lastModified = null;
        
        if (savedCart) {
          const cartData = JSON.parse(savedCart);
          lastModified = cartData.timestamp;
        }
        
        // Construir payload con timestamp
        const payload = {
          last_modified: lastModified,
          user_type: user?.id ? 'user' : user?.email ? 'guest' : 'anonymous'
        };

        const response = await axios.post(`${API_BASE_URL}/api/cart-cleanup`, payload);

        if (response.data.expired) {
          // 🚨 TEMPORAL: Deshabilitar limpieza automática para debug
          // clearCart();
        } else {
        }
        
      } catch (error) {
        // Fallar silenciosamente, mantener carrito actual
      }
    };
    
    // Solo ejecutar cuando AuthContext haya cargado completamente
    if (user !== undefined) {
      checkCartExpiration();
    }
  }, [user?.id, user?.email, user?.usertype]);

  // 📦 NUEVO: Recalcular envío cuando cambie el subtotal
  useEffect(() => {
    const currentSubtotal = getSubtotal() - getDiscountAmount();

    if (currentSubtotal > 0) {
      // 🚨 PREVENIR MÚLTIPLES LLAMADAS: Solo llamar si el subtotal cambió significativamente
      const timeoutId = setTimeout(() => {
        calculateShippingAndMotivation(currentSubtotal);
      }, 100); // Debounce de 100ms
      
      return () => clearTimeout(timeoutId);
    } else {
      setShippingCost(0);
      setShippingMotivation(null);
      setShippingCalculated(false); // ⚡ Resetear flag cuando no hay datos
    }
  }, [totalPrice, appliedCoupon, user?.usertype]);

  // 📦 NUEVO: Recalcular envío específicamente para Guest cuando complete datos
  useEffect(() => {
    if (user?.usertype === 'Guest' && email?.trim() && address?.trim()) {
      const currentSubtotal = getSubtotal() - getDiscountAmount();
      if (currentSubtotal > 0) {
        calculateShippingAndMotivation(currentSubtotal);
      }
    }
  }, [user?.usertype, email, address, cart.length, appliedCoupon, latlong?.driver_lat, latlong?.driver_long]);
  
  // Función para guardar deliveryInfo en AsyncStorage
  const saveDeliveryInfo = async (info, userId) => {
    try {
      const key = `deliveryInfo_${userId}`;
      const dataToSave = {
        ...info,
        date: info.date.toISOString() // Serializar Date a string
      };
      await AsyncStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (error) {
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
        setDeliveryInfo(restoredInfo);
        // Pequeño delay para asegurar que el estado se actualice
        setTimeout(() => {
          setIsRestoringDeliveryInfo(false);
        }, 100);
        return restoredInfo;
      }
    } catch (error) {
    }
    setIsRestoringDeliveryInfo(false);
    return null;
  };
  
  // Función para limpiar deliveryInfo guardado
  const clearSavedDeliveryInfo = async (userId) => {
    try {
      const key = `deliveryInfo_${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
    }
  };
  
  // Función para guardar coordenadas en AsyncStorage
  const saveCoordinates = async (coords, userId) => {
    try {
      const key = `coordinates_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(coords));
    } catch (error) {
    }
  };
  
  // Función para restaurar coordenadas desde AsyncStorage
  const restoreCoordinates = async (userId) => {
    try {
      const key = `coordinates_${userId}`;
      const savedData = await AsyncStorage.getItem(key);
      if (savedData) {
        const restoredCoords = JSON.parse(savedData);
        setLatlong(restoredCoords);
        return restoredCoords;
      }
    } catch (error) {
    }
    return null;
  };
  
  // Función para limpiar coordenadas guardadas
  const clearSavedCoordinates = async (userId) => {
    try {
      const key = `coordinates_${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
    }
  };

  // 🎫 FUNCIONES DE CUPONES
  const handleCouponApply = (couponData) => {
    setAppliedCoupon(couponData);
    showAlert({
      type: 'success',
      title: 'Cupón aplicado',
      message: `${couponData.description} aplicado correctamente`
    });
  };

  const handleCouponRemove = () => {
    setAppliedCoupon(null);
    showAlert({
      type: 'info',
      title: 'Cupón removido',
      message: 'El descuento ha sido eliminado'
    });
  };

  // 🧮 CÁLCULOS DINÁMICOS DE CUPONES
  const getSubtotal = () => totalPrice;
  
  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;

    const subtotal = getSubtotal();

    // Verificar si aún cumple el monto mínimo
    if (subtotal < appliedCoupon.minAmount) {
      return 0; // No aplica descuento si no cumple mínimo
    }

    // Determinar sobre qué base aplicar el descuento
    const appliesTo = appliedCoupon.appliesTo || 'total';
    const baseAmount = appliesTo === 'shipping' ? shippingCost : subtotal;

    // Recalcular descuento basado en el monto base correspondiente
    let newDiscountAmount = 0;
    if (appliedCoupon.type === 'percentage') {
      newDiscountAmount = (baseAmount * appliedCoupon.discount) / 100;
    } else {
      newDiscountAmount = appliedCoupon.discount;
    }

    // Asegurar que el descuento no exceda el monto base
    return Math.min(newDiscountAmount, baseAmount);
  };
  
  const getFinalTotal = () => {
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();

    // Si el cupón aplica a envío, restar descuento del shipping
    if (appliedCoupon && appliedCoupon.appliesTo === 'shipping') {
      const discountedShipping = Math.max(0, shippingCost - discount);
      return Math.max(0, subtotal + discountedShipping);
    }

    // Si aplica a total, restar descuento del subtotal y luego agregar shipping
    return Math.max(0, subtotal - discount + shippingCost);
  };

  // 📦 NUEVO: Obtener configuración de envío
  const fetchShippingConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/shipping-config`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (response.data.status === 'success') {
        setShippingConfig(response.data.data);
        return response.data.data;
      }
    } catch (error) {
    }
    return null;
  };

  // 🆕 NUEVO: Calcular envío y mensaje motivacional
  const calculateShippingAndMotivation = async (subtotal) => {
    console.log('🚚 [SHIPPING DEBUG] Iniciando cálculo de envío para subtotal:', subtotal);
    
    if (!subtotal || subtotal <= 0) {
      console.log('🚚 [SHIPPING DEBUG] Subtotal inválido, estableciendo envío en 0');
      setShippingCost(0);
      setShippingMotivation(null);
      return;
    }

    setLoadingShipping(true);
    
    try {
      const apiUrl = `${API_BASE_URL}/api/shipping-motivation/${subtotal}`;
      console.log('🚚 [SHIPPING DEBUG] Llamando endpoint:', apiUrl);

      const response = await axios.get(apiUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('🚚 [SHIPPING DEBUG] Respuesta completa:', JSON.stringify(response.data, null, 2));

      if (response.data.status === 'success') {
        const data = response.data.data;
        const newShippingCost = Number(data.shipping_cost) || 0;

        console.log('🚚 [SHIPPING DEBUG] Datos recibidos:', {
          shipping_cost: data.shipping_cost,
          shipping_cost_parseado: newShippingCost,
          tipo: typeof data.shipping_cost,
          motivation: data
        });

        setShippingMotivation(data);
        setShippingCost(newShippingCost);
        setShippingCalculated(true);
        
        console.log('🚚 [SHIPPING DEBUG] ✅ Envío establecido en:', newShippingCost);
      } else {
        console.log('🚚 [SHIPPING DEBUG] ❌ Respuesta no exitosa:', response.data);
      }
    } catch (error) {
      console.log('🚚 [SHIPPING DEBUG] ❌ ERROR:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // En caso de error, no mostrar información de envío
      setShippingCost(0);
      setShippingMotivation(null);
      setShippingCalculated(true);
    } finally {
      setLoadingShipping(false);
    }
  };
  
  const isCouponStillValid = () => {
    if (!appliedCoupon) return true;
    return getSubtotal() >= appliedCoupon.minAmount;
  };

  // 🔄 MONITOREO DINÁMICO DE CUPONES
  useEffect(() => {
    if (!appliedCoupon) return;

    const currentSubtotal = getSubtotal();
    const currentDiscount = getDiscountAmount();
    
    // Si el subtotal cambió
    if (lastSubtotal !== currentSubtotal && lastSubtotal > 0) {
      const wasValid = lastSubtotal >= appliedCoupon.minAmount;
      const isValid = currentSubtotal >= appliedCoupon.minAmount;
      
      // Caso 1: Cupón se volvió inválido
      if (wasValid && !isValid) {
        showAlert({
          type: 'warning',
          title: 'Cupón desactivado',
          message: `El cupón "${appliedCoupon.code.toUpperCase()}" requiere un mínimo de $${appliedCoupon.minAmount}. Agrega más productos para reactivarlo.`
        });
      }
      
      // Caso 2: Cupón se reactivó
      else if (!wasValid && isValid) {
        showAlert({
          type: 'success',
          title: 'Cupón reactivado',
          message: `¡El cupón "${appliedCoupon.code.toUpperCase()}" volvió a aplicarse! Descuento: $${currentDiscount.toFixed(2)}`
        });
      }
      
      // Caso 3: Descuento cambió (para porcentuales)
      else if (isValid && appliedCoupon.type === 'percentage') {
        const oldDiscount = (lastSubtotal * appliedCoupon.discount) / 100;
        const difference = Math.abs(currentDiscount - oldDiscount);
        
        if (difference > 5) { // Solo notificar si el cambio es significativo (>$5)
          showAlert({
            type: 'info',
            title: 'Descuento actualizado',
            message: `Tu descuento del ${appliedCoupon.discount}% se actualizó: $${currentDiscount.toFixed(2)}`
          });
        }
      }
    }
    
    setLastSubtotal(currentSubtotal);
  }, [totalPrice, appliedCoupon]); // Reacciona a cambios en precio total y cupón
  
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [temporaryAddress, setTemporaryAddress] = useState(null); // Dirección temporal para pedido actual
  const [isChangingAddress, setIsChangingAddress] = useState(false); // Flag para cambio manual
  const [userProfile, setUserProfile] = useState(null); // Perfil completo del usuario
  const [lastSubtotal, setLastSubtotal] = useState(0); // Para detectar cambios en subtotal
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh falso
  const [mapCallbackId] = useState(() => generateCallbackId()); // ID único para callbacks del mapa
  const [guestJustCompletedAddress, setGuestJustCompletedAddress] = useState(false); // 🆕 Flag para auto-pago inicial
  
  // Ref para el scroll automático al botón de pagar
  const flatListRef = React.useRef(null);

  // 🆕 FUNCIÓN: Geocoding para direcciones guardadas de Guest (usando utility)
  const handleGuestAddressGeocoding = async (addressString) => {
    
    const coordinates = await geocodeGuestAddress(addressString);
    const driverCoords = convertToDriverCoords(coordinates);
    
    setLatlong(driverCoords);
  };

  // 🔄 NUEVA FUNCIÓN: Guardar datos Guest en BD en lugar de AsyncStorage
  const saveGuestDataToDB = async (guestEmail, addressData, coordinatesData) => {
    try {
      if (!guestEmail?.trim()) return false;

      const addressPayload = {
        guestEmail: guestEmail.trim(),
        address: addressData?.address || '',
        latitude: coordinatesData?.driver_lat || null,
        longitude: coordinatesData?.driver_long || null,
        phone: null // Se puede agregar en el futuro
      };

      await newAddressService.saveGuestAddress(addressPayload);
      return true;
    } catch (error) {
      return false;
    }
  };

  // 🔄 NUEVA FUNCIÓN: Recuperar datos Guest desde BD en lugar de AsyncStorage
  const loadGuestDataFromDB = async (guestEmail) => {
    try {
      if (!guestEmail?.trim()) return null;

      const guestAddress = await newAddressService.getGuestAddress(guestEmail.trim());
      
      if (guestAddress) {
        return {
          email: guestEmail,
          address: guestAddress.address,
          coordinates: {
            driver_lat: guestAddress.latitude,
            driver_long: guestAddress.longitude
          }
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // 🆕 FUNCIÓN: Geocoding inteligente para usuarios registrados
  const handleUserAddressGeocoding = async (addressString) => {
    const coordinates = await geocodeAddress(addressString, {
      strictValidation: false, // Menos restrictivo para direcciones guardadas
      requireHighPrecision: false, // Permitir precisión media
      useDefaultOnError: true, // Usar coordenadas por defecto si falla
    });
    
    const driverCoords = convertToDriverCoords(coordinates);
    
    setLatlong(driverCoords);
    
    // Guardar coordenadas inmediatamente para futuras sesiones
    if (user?.id && driverCoords) {
      saveCoordinates(driverCoords, user.id);
    }
    
    return driverCoords;
  };

  // Función para calcular el total de medida usando la utilidad
  const getTotalMeasure = (item, unitsSelected) => {
    // Usar productQuantity (250gr) en lugar de quantity (2 unidades) si está disponible
    const baseQuantity = item.productQuantity || item.quantity || 1;
    return formatQuantityWithUnit(baseQuantity, item.unit, unitsSelected);
  };


  const {showAlert} = useAlert();

  // ✅ FUNCIÓN HELPER: Validar zona de entrega por código postal
  const validateDeliveryZone = (addressString) => {
    if (!addressString) return { isValid: false, error: 'Dirección vacía' };
    
    // Extraer código postal de la dirección usando regex
    const cpMatch = addressString.match(/\b(\d{5})\b/);
    
    if (!cpMatch) {
      return {
        isValid: false,
        error: 'No se encontró código postal en la dirección',
        suggestion: 'Asegúrate de que tu dirección incluya un código postal de 5 dígitos'
      };
    }
    
    const postalCode = cpMatch[1];
    const validation = validatePostalCode(postalCode);
    
    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.message,
        suggestion: validation.suggestion,
        postalCode: postalCode
      };
    }
    
    return {
      isValid: true,
      postalCode: postalCode,
      location: validation.location
    };
  };

  // Función para obtener el perfil completo del usuario (con dirección actualizada)
  const fetchUserProfile = async () => {
    if (!user?.id || user?.usertype === 'Guest') return;

    setLoadingProfile(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/userdetails/${user.id}`
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
      const addresses = await newAddressService.getUserAddresses(user.id);
      setUserAddresses(addresses);
      
      // Si hay una dirección predeterminada, seleccionarla automáticamente
      const defaultAddress = addresses.find(addr => 
        addr.is_primary === "1" || addr.is_primary === 1 || addr.is_primary === true
      );
      
      if (defaultAddress) {
        // 🔧 SIEMPRE actualizar con la dirección principal del backend
        setSelectedAddress(defaultAddress);
        setAddress(defaultAddress.address);
        // Las coordenadas ya vienen del backend
        if (defaultAddress.latitude && defaultAddress.longitude) {
          setLatlong({
            driver_lat: defaultAddress.latitude.toString(),
            driver_long: defaultAddress.longitude.toString(),
          });
          // console.log('📍 COORDENADAS ESTABLECIDAS:', {
            // lat: defaultAddress.latitude,
            // lng: defaultAddress.longitude
          // });
        }
      } else {
      }
    } catch (error) {
      setUserAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // TEMPORALMENTE DESHABILITADO - El callback automático está causando problemas
  // useEffect(() => {
  //   const clearDeliveryInfo = () => {
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
      const hasAddress = user?.address && user?.address?.trim() !== '';
      setEmail(hasEmail ? user.email : '');
      setAddress(hasAddress ? user.address : '');
      // console.log('🔄 GUEST: Inicializando email y dirección:', { email: user?.email, address: user?.address });
    } else {
      // Usuario registrado
      setEmail(user?.email || '');
      setAddress(''); // Limpiar dirección temporal para usuarios registrados
      // Cargar direcciones del usuario con el nuevo sistema
      fetchUserAddresses();
    }
    
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
          fetchUserAddresses();
          // Solo restaurar datos si hay productos en el carrito
          if (cart.length > 0) {
            // Restaurar deliveryInfo para usuarios registrados
            if (!deliveryInfo) {
              const restored = await restoreDeliveryInfo(user.id);
            }
            // Restaurar coordenadas para usuarios registrados
            if (!latlong?.driver_lat || !latlong?.driver_long) {
              const restoredCoords = await restoreCoordinates(user.id);
              
              // 🆕 Si no hay coordenadas guardadas, aplicar geocoding inteligente
              if (!restoredCoords || !restoredCoords.driver_lat || !restoredCoords.driver_long) {
                // Esperar a que el perfil se cargue para tener la dirección actualizada
                setTimeout(async () => {
                  const currentProfile = userProfile; // Usar perfil actual o esperar al siguiente render
                  const userAddress = currentProfile?.address || user?.address;
                  
                  if (userAddress && userAddress.trim().length > 10) {
                    await handleUserAddressGeocoding(userAddress);
                  }
                }, 1000); // Delay para asegurar que el perfil se haya cargado
              }
            }
          } else {
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
      
      // ✅ NUEVO: Leer datos de AsyncStorage si vienen de AddressForm simplificado (TEMPORAL: mantenemos AsyncStorage para datos temporales)
      if (params?.hasGuestDataInStorage && user?.usertype === 'Guest') {
        // Función async interna para manejar AsyncStorage
        const handleGuestDataFromStorage = async () => {
          try {
            const tempGuestDataStr = await AsyncStorage.getItem('tempGuestData');
          if (tempGuestDataStr) {
            const tempGuestData = JSON.parse(tempGuestDataStr);
            
            // Usar los datos recuperados (misma lógica que antes)
            setEmail(tempGuestData.email);
            setAddress(tempGuestData.address);
            
            // 🔄 NUEVO: Guardar en BD automáticamente cuando se completa la dirección
            if (tempGuestData.email?.trim() && tempGuestData.address?.trim() && tempGuestData.mapCoordinates) {
              await saveGuestDataToDB(
                tempGuestData.email,
                { address: tempGuestData.address },
                tempGuestData.mapCoordinates
              );
              // console.log('✅ Datos Guest guardados automáticamente en BD');
            }
            
            if (tempGuestData.preservedDeliveryInfo) {
              const deliveryInfoToRestore = {
                ...tempGuestData.preservedDeliveryInfo,
                date: new Date(tempGuestData.preservedDeliveryInfo.date),
              };
              setDeliveryInfo(deliveryInfoToRestore);
            }
            if (tempGuestData.preservedNeedInvoice !== undefined) {
              setNeedInvoice(tempGuestData.preservedNeedInvoice);
            }
            if (tempGuestData.preservedTaxDetails !== undefined) {
              setTaxDetails(tempGuestData.preservedTaxDetails);
            }
            // Restaurar coordenadas (usar mapCoordinates con prioridad, fallback a preservedCoordinates)
            const coordinatesToUse = tempGuestData.mapCoordinates || tempGuestData.preservedCoordinates;
            if (coordinatesToUse) {
              setLatlong(coordinatesToUse);
            }
            
            // 🚚 CRÍTICO: Forzar recálculo inmediato del envío después de restaurar datos
            setTimeout(() => {
              const currentSubtotal = getSubtotal() - getDiscountAmount();
              if (currentSubtotal > 0 && tempGuestData.email?.trim() && tempGuestData.address?.trim()) {
                calculateShippingAndMotivation(currentSubtotal);
              }
            }, 200); // Aumentado de 100ms a 200ms
            
            // 🚀 CRÍTICO: Activar flag de auto-pago para Guest que acaba de completar dirección
            setGuestJustCompletedAddress(true);
            
            // Limpiar AsyncStorage después de usar
            await AsyncStorage.removeItem('tempGuestData');
            
            // Scroll automático igual que antes
            setTimeout(() => {
              if (tempGuestData.preservedDeliveryInfo) {
                flatListRef.current?.scrollToEnd({ animated: true });
              } else {
                if (deliverySlotRef.current?.scrollToView) {
                  deliverySlotRef.current.scrollToView();
                } else {
                }
              }
            }, 600);
            
            return; // No procesar el flujo antiguo
          }
          } catch (error) {
            // Continuar con flujo normal si hay error
          }
        };
        
        // Ejecutar la función async
        handleGuestDataFromStorage();
      }
      
      // FLUJO ORIGINAL: params.guestData directo (mantener compatibilidad)
      if (params?.guestData && user?.usertype === 'Guest') {
        // Usar los datos del guest checkout
        setEmail(params.guestData.email);
        setAddress(params.guestData.address);
        
        // 🔄 NUEVO: Guardar en BD automáticamente cuando se reciben datos de Guest
        if (params.guestData.email?.trim() && params.guestData.address?.trim() && params.mapCoordinates) {
          saveGuestDataToDB(
            params.guestData.email,
            { address: params.guestData.address },
            params.mapCoordinates
          ).then(() => {
            // console.log('✅ Datos Guest guardados en BD desde guestData');
          }).catch((error) => {
            // console.error('❌ Error guardando datos Guest desde guestData:', error);
          });
        }
        
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
        if (params.guestData.preservedCoordinates) {
          setLatlong(params.guestData.preservedCoordinates);
        }
        
        // NUEVO: Si Guest también tiene mapCoordinates, procesar auto-pago aquí mismo
        if (params?.mapCoordinates && user?.usertype === 'Guest') {
          
          // Actualizar coordenadas también
          setLatlong({
            driver_lat: params.mapCoordinates.latitude,
            driver_long: params.mapCoordinates.longitude,
          });
          
          // 🆕 MARCAR QUE GUEST ACABA DE COMPLETAR SU DIRECCIÓN
          setGuestJustCompletedAddress(true);
          
          // 🚚 CRÍTICO: Forzar recálculo inmediato del envío (flujo params.guestData)
          setTimeout(() => {
            const currentSubtotal = getSubtotal() - getDiscountAmount();
            if (currentSubtotal > 0 && params.guestData.email?.trim() && params.guestData.address?.trim()) {
              // console.log('🚚 GUEST: Forzando recálculo de envío después de restaurar params.guestData + mapCoordinates:', {
                // email: params.guestData.email?.trim(),
                // address: params.guestData.address?.trim(),
                // subtotal: currentSubtotal,
                // timestamp: new Date().toISOString()
              // });
              calculateShippingAndMotivation(currentSubtotal);
            }
          }, 200); // Aumentado de 100ms a 200ms
          
          // Pequeño delay para asegurar que todos los setState terminen
          setTimeout(() => {
            // Limpiar parámetros después de procesar
            navigation.setParams({ guestData: null, mapCoordinates: null });
          }, 100);
          
        } else {
          // 🚚 CRÍTICO: Forzar recálculo inmediato del envío (flujo normal sin mapCoordinates)
          setTimeout(() => {
            const currentSubtotal = getSubtotal() - getDiscountAmount();
            if (currentSubtotal > 0 && params.guestData.email?.trim() && params.guestData.address?.trim()) {
              // console.log('🚚 GUEST: Forzando recálculo de envío después de restaurar params.guestData normal:', {
                // email: params.guestData.email?.trim(),
                // address: params.guestData.address?.trim(),
                // subtotal: currentSubtotal,
                // timestamp: new Date().toISOString()
              // });
              calculateShippingAndMotivation(currentSubtotal);
            }
          }, 200); // Aumentado de 100ms a 200ms
          
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
        
        // Guardar coordenadas en el estado
        setLatlong({
          driver_lat: params.mapCoordinates.latitude,
          driver_long: params.mapCoordinates.longitude,
        });
        
        // Limpiar parámetros
        navigation.setParams({ mapCoordinates: null });
        
        // Proceder directamente al pago con coordenadas frescas
        setTimeout(() => {
          completeOrder();
        }, 300);
      }
      
      // NUEVO: Scroll automático al entrar al carrito para TODOS los usuarios
      if (cart.length > 0) {
        setTimeout(() => {
          if (deliveryInfo) {
            // Ya tiene horario seleccionado → scroll al botón "Pagar"
            flatListRef.current?.scrollToEnd({ animated: true });
          } else {
            // No tiene horario → scroll al botón "Seleccionar Horario"
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }, 800); // Delay para asegurar que todo esté renderizado
      }
    }, [user?.id, user?.usertype, navigation, cart.length, deliveryInfo])
  );


  // ✅ OPTIMIZACIÓN: Ya no pedimos ubicación al cargar Cart
  // La ubicación se obtiene justo antes del checkout en completeOrder()

  // TEMPORALMENTE COMENTADO - Efecto para limpiar timers cuando cambia el usuario
  /*
  useEffect(() => {
    const userId = user?.id || null;
    
    // Si hay un usuario previo diferente al actual, limpiar timers
    if (currentUserId !== null && currentUserId !== userId) {
      setTimers({});
    }
    
    // Actualizar el ID del usuario actual
    setCurrentUserId(userId);
  }, [user?.id, currentUserId]);
  */

  // 🚀 AUTO-PAGO GUEST: Solo cuando acaba de completar su dirección por primera vez
  useEffect(() => {
    // console.log('🚀 AUTO-PAGO EFFECT disparado:', {
      // userType: user?.usertype,
      // guestJustCompletedAddress,
      // hasDeliveryInfo: !!deliveryInfo,
      // hasEmail: !!email?.trim(),
      // hasAddress: !!address?.trim(),
      // hasCoordinates: !!(latlong?.driver_lat && latlong?.driver_long),
      // cartItems: cart.length,
      // currentShippingCost: shippingCost,
      // shippingCalculated: shippingCalculated,
      // loadingShipping: loadingShipping,
      // finalTotal: getFinalTotal()
    // });
    
    // Solo para Guest que ACABA DE COMPLETAR su dirección (viene del flujo inicial)
    if (user?.usertype === 'Guest' && 
        guestJustCompletedAddress && // 🆕 NUEVA CONDICIÓN: Solo si acaba de completar dirección
        deliveryInfo && 
        email?.trim() && 
        address?.trim() && 
        latlong?.driver_lat && 
        latlong?.driver_long &&
        cart.length > 0 &&
        shippingCalculated && // ⚡ CRÍTICO: Esperar a que se complete el cálculo del envío
        !loadingShipping) { // ⚡ Y que no esté cargando
      
      // console.log('🚀 EJECUTANDO AUTO-PAGO con valores:', {
        // subtotal: getSubtotal(),
        // shippingCost: shippingCost,
        // finalTotal: getFinalTotal(),
        // address: address?.trim(),
        // coordinates: `${latlong?.driver_lat}, ${latlong?.driver_long}`
      // });
      
      // ⏱️ DELAY AUMENTADO para dar tiempo al recálculo del envío
      const autoPayTimeout = setTimeout(() => {
        // console.log('⏰ EJECUTANDO AUTO-PAGO después del delay, valores finales:', {
          // subtotal: getSubtotal(),
          // shippingCost: shippingCost,
          // finalTotal: getFinalTotal()
        // });
        completeOrder();
        // Limpiar la bandera después del auto-pago
        setGuestJustCompletedAddress(false);
      }, 1000); // Aumentado de 300ms a 1000ms
      
      return () => clearTimeout(autoPayTimeout);
    }
  }, [user?.usertype, guestJustCompletedAddress, deliveryInfo, email, address, latlong?.driver_lat, latlong?.driver_long, cart.length, shippingCalculated, loadingShipping]); // ⚡ Agregado shippingCalculated y loadingShipping

  // Invocado desde el botón de checkout
  const decideCheckout = () => {
    completeOrder();
  };


  // 1) Flujo único y robusto de pago
  const completeOrder = async () => {
    
    if (loading) return;
    
    // console.log('💳 COMPLETE ORDER DEBUG:', {
      // userType: user?.usertype,
      // userId: user?.id,
      // userEmail: user?.email,
      // deliveryInfo: !!deliveryInfo,
      // totalPrice: totalPrice,
      // subtotal: getSubtotal(),
      // shippingCost: shippingCost,
      // finalTotal: getFinalTotal(),
      // hasEmail: !!email?.trim(),
      // hasAddress: !!address?.trim(),
      // hasCoordinates: !!(latlong?.driver_lat && latlong?.driver_long),
      // guestJustCompletedAddress,
      // timestamp: new Date().toISOString()
    // });
    
    // VALIDACIONES CRÍTICAS ANTES DE ABRIR PASARELA
    
    // 1. Validar carrito no vacío
    if (getFinalTotal() <= 0) {
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
        // Continuar con la orden usando el deliveryInfo restaurado
      } else if (user?.usertype === 'Guest') {
        // Guest: esperar un momento más para que se actualice el estado
        setTimeout(() => {
          if (deliveryInfo) {
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

      // ✅ VALIDAR ZONA DE ENTREGA para Guest
      const zoneValidation = validateDeliveryZone(address);
      if (!zoneValidation.isValid) {
        showAlert({
          type: 'error',
          title: 'Zona de entrega no disponible',
          message: `${zoneValidation.error}\n\n${zoneValidation.suggestion || 'Verifica tu dirección o contacta soporte.'}`,
          confirmText: 'Entendido',
        });
        return;
      }
      
      // Guest también necesita coordenadas del mapa
      if (!latlong?.driver_lat || !latlong?.driver_long) {
        setTimeout(() => {
          if (latlong?.driver_lat && latlong?.driver_long) {
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
      // Usuario registrado: requiere dirección del sistema nuevo
      // console.log('🔍 CHECKOUT DEBUG - Usuario Registrado:', {
        // address: address,
        // addressTrim: address?.trim(),
        // hasAddress: !!address?.trim(),
        // userAddressesLength: userAddresses?.length,
        // selectedAddress: selectedAddress,
        // latlong: latlong
      // });
      
      if (!address?.trim()) {
        // No tiene dirección del sistema nuevo - mostrar modal para seleccionar
        setShowAddressModal(true);
        return;
      }
      

      // ✅ VALIDAR ZONA DE ENTREGA para Usuario registrado
      const userAddress = address?.trim();
      if (userAddress) {
        const zoneValidation = validateDeliveryZone(userAddress);
        if (!zoneValidation.isValid) {
          showAlert({
            type: 'error',
            title: 'Zona de entrega no disponible',
            message: `${zoneValidation.error}\n\n${zoneValidation.suggestion || 'Actualiza tu dirección o contacta soporte.'}`,
            confirmText: 'Entendido',
          });
          return;
        }
      }
      
      // console.log('📍 VERIFICANDO COORDENADAS:', { latlong: latlong });
      
      if (!latlong?.driver_lat || !latlong?.driver_long) {
        
        // 🆕 PASO 1: Intentar restaurar coordenadas guardadas
        let restoredCoords = null;
        if (user?.id) {
          restoredCoords = await restoreCoordinates(user.id);
          if (restoredCoords && restoredCoords.driver_lat && restoredCoords.driver_long) {
            // Las coordenadas ya se establecieron en el estado por restoreCoordinates()
            // Continuar con el flujo de pago
          }
        }
        
        // 🆕 PASO 2: Si no hay coordenadas restauradas, aplicar geocoding inteligente
        if (!restoredCoords || !restoredCoords.driver_lat || !restoredCoords.driver_long) {
          const userAddress = savedAddress?.trim();
          if (userAddress && userAddress.length > 10) {
            
            try {
              const geocodedCoords = await handleUserAddressGeocoding(userAddress);
              if (geocodedCoords && geocodedCoords.driver_lat && geocodedCoords.driver_long) {
                // Las coordenadas ya se establecieron, continuar con el flujo
                // No hacer return aquí, dejar que continúe el flujo normal
              } else {
                showAlert({
                  type: 'info',
                  title: 'Confirmar ubicación',
                  message: 'Para mayor precisión en la entrega, ¿deseas confirmar tu ubicación en el mapa?',
                  confirmText: 'Confirmar en mapa',
                  cancelText: 'Continuar con dirección',
                  showCancel: true,
                  onConfirm: () => {
                    // Ir al mapa para confirmar ubicación manualmente
                    navigation.navigate('MapSelector', {
                      userAddress: userAddress,
                      title: 'Confirmar ubicación para entrega',
                    });
                  },
                  onCancel: () => {
                    // Continuar sin coordenadas precisas (usar coordenadas por defecto)
                    setLatlong({
                      driver_lat: '19.4326', // Coordenadas por defecto CDMX
                      driver_long: '-99.1332',
                    });
                    // Reintentar pago con coordenadas por defecto
                    setTimeout(() => completeOrder(), 100);
                  }
                });
                return;
              }
            } catch (error) {
              // Fallback: usar coordenadas por defecto
              setLatlong({
                driver_lat: '19.4326',
                driver_long: '-99.1332',
              });
            }
          } else {
            // Dirección muy corta o inválida - requiere confirmación manual
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
    }

    setLoading(true);
    setShowLoadingContent(true); // 🆕 Mostrar el cuadro al inicio
    
    // 🆕 Después de 2 segundos, ocultar el cuadro pero mantener el bloqueo
    setTimeout(() => {
      setShowLoadingContent(false);
    }, 2000);
    
    try {
      // Las coordenadas ya fueron confirmadas por el usuario en el mapa
      // No necesitamos pedir permisos de ubicación nuevamente
      // Si no se obtiene ubicación, continuar igual (es opcional para users/guests)
      
      // 🔧 PASO 1: CREAR ORDEN PRIMERO para obtener ID real
      // console.log('🚀 OXXO DEBUG - Starting order creation...');
      const orderData = await completeOrderFunc();
      const realOrderId = orderData?.order?.id;

      // 🔧 DEBUG OXXO: Log de la orden creada
      // console.log('🏪 OXXO DEBUG - Order Created:', {
      // orderData: orderData,
      // realOrderId: realOrderId,
      // orderStatus: orderData?.order?.status,
      // paymentMethod: orderData?.order?.payment_method,
      // orderTotal: orderData?.order?.total,
      // timestamp: new Date().toISOString()
      // });
      
      if (!realOrderId) {
        throw new Error('No se pudo crear la orden correctamente.');
      }
      
      // 1.1) Crear PaymentIntent con ID real de la orden
      const orderEmail = user?.usertype === 'Guest' ? (email?.trim() || user?.email || '') : (user?.email || '');
      
      // Usar el cálculo unificado de precio final (incluye envío)
      const finalPrice = getFinalTotal();
      
      // 🚨 DEBUG: Verificar qué se envía a Stripe
      // console.log('🚨 ENVIANDO A STRIPE:', {
        // userType: user?.usertype,
        // totalPrice: totalPrice,
        // appliedCoupon: appliedCoupon,
        // finalPrice: finalPrice,
        // shippingCost: shippingCost,
        // subtotal: getSubtotal(),
        // discountAmount: getDiscountAmount(),
        // centavos: parseFloat(finalPrice) * 100,
        // realOrderId: realOrderId
      // });
      
      const {data} = await axios.post(
        `${API_BASE_URL}/api/create-payment-intent`,
        {amount: parseFloat(finalPrice) * 100, currency: 'mxn', email: orderEmail, order_id: realOrderId},
      );
      const clientSecret = data.clientSecret;
      if (!clientSecret) {
        throw new Error('No se obtuvo clientSecret del servidor.');
      }

      // 1.2) Inicializar Stripe PaymentSheet
      // 🔧 DEBUG OXXO: Log de la configuración del payment sheet
      const paymentSheetConfig = {
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Sabores de Origen',
        allowsDelayedPaymentMethods: true, // CAMBIADO: true para OXXO y otros métodos delayed
        returnURL: 'occr-productos-app://stripe-redirect',
      };

      // console.log('🏪 OXXO DEBUG - Payment Sheet Config:', {
      // hasClientSecret: !!clientSecret,
      // clientSecretPreview: clientSecret ? `${clientSecret.substring(0, 30)}...` : null,
      // allowsDelayedPaymentMethods: paymentSheetConfig.allowsDelayedPaymentMethods,
      // merchantDisplayName: paymentSheetConfig.merchantDisplayName,
      // timestamp: new Date().toISOString()
      // });

      const {error: initError} = await initPaymentSheet({
        ...paymentSheetConfig,
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
        primaryButtonLabel: (() => {
          const finalTotal = getFinalTotal();
          // console.log('💰 BOTÓN PAGAR - Estado shipping:', {
            // userType: user?.usertype,
            // shippingCost: shippingCost,
            // finalTotal: finalTotal,
            // subtotal: getSubtotal(),
            // discountAmount: getDiscountAmount()
          // });
          return `Pagar ${formatPriceWithSymbol(finalTotal)}`;
        })(),
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
      // console.log('🏪 OXXO DEBUG - Presenting Payment Sheet...');
      const {error: paymentError} = await presentPaymentSheet();

      // 🔧 DEBUG OXXO: Log después de presentar el payment sheet
      // console.log('🏪 OXXO DEBUG - Payment Sheet Result:', {
      // hasError: !!paymentError,
      // errorCode: paymentError?.code,
      // errorMessage: paymentError?.message,
      // timestamp: new Date().toISOString()
      // });
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
      // 🏪 CAPTURAR INFORMACIÓN DE VOUCHER OXXO
      let oxxoInfo = null;
      try {
        const paymentIntentResult = await retrievePaymentIntent(clientSecret);
        const nextAction = paymentIntentResult?.paymentIntent?.nextAction;

        // 🔧 DEBUG OXXO: Logs detallados del payment intent
        // console.log('🏪 OXXO DEBUG - Payment Intent Result:', {
        // paymentIntentId: paymentIntentResult?.paymentIntent?.id,
        // status: paymentIntentResult?.paymentIntent?.status,
        // nextActionType: nextAction?.type,
        // paymentMethodType: paymentIntentResult?.paymentIntent?.paymentMethodTypes,
        // amount: paymentIntentResult?.paymentIntent?.amount,
        // currency: paymentIntentResult?.paymentIntent?.currency,
        // fullNextAction: nextAction
        // });

        if (nextAction?.type === 'oxxoVoucher') {
          oxxoInfo = {
            voucherNumber: nextAction.voucherNumber,
            voucherURL: nextAction.voucherURL,
            expiration: nextAction.expiration,
            amount: finalPrice
          };

          // console.log('🏪 OXXO VOUCHER DETECTED:', oxxoInfo);
        } else {
          // console.log('🏪 OXXO DEBUG - No voucher found, next action type:', nextAction?.type);
        }
      } catch (error) {
        // console.log('❌ OXXO DEBUG - Error retrieving payment intent:', error);
      }
      
      // 1.4) Pago exitoso: la orden ya fue creada, solo actualizar usuario
      // 🆕 GUEST FIX: Guardar email Y dirección de Guest para futuras compras
      if (user?.usertype === 'Guest') {
        const updateData = {};
        
        // Guardar email si no lo tenía o si cambió
        if ((!user?.email || user?.email?.trim() === '') && email?.trim()) {
          updateData.email = email.trim();
        }
        
        // 🆕 Guardar dirección para reutilizar en próximas compras
        if (address?.trim()) {
          updateData.address = address.trim();
        }
        
        // Solo actualizar si hay algo que guardar
        if (Object.keys(updateData).length > 0) {
          await updateUser(updateData);
        }
      }
      
      // Crear resumen del pedido
      const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
      const deliveryText = deliveryInfo ? 
        `📅 ${deliveryInfo.date.toLocaleDateString('es-ES')} - ${deliveryInfo.slot}` : 
        'Horario pendiente';
      
      // Obtener número de orden de la respuesta del backend
      const orderNumber = realOrderId || orderData?.order?.id;
      const isValidOrderId = orderNumber && orderNumber !== 'N/A' && orderNumber.toString().trim() !== '';

      // console.log('🔍 ORDER ID DEBUG:', {
      // orderData: orderData,
      // orderNumber: orderNumber,
      // realOrderId: realOrderId,
      // backendOrderId: orderData?.order?.id,
      // isValidOrderId: isValidOrderId,
      // userType: user?.usertype
      // });
      
      
      // Limpiar datos inmediatamente después del pedido exitoso
      clearCart();
      setDeliveryInfo(null);
      
      // 🆕 GUEST FIX: NUNCA limpiar coordenadas de Guest después del pago
      // Solo limpiar coordenadas para usuarios registrados
      if (user?.usertype !== 'Guest') {
        setLatlong(null);
      }
      
      // Limpiar deliveryInfo y coordenadas guardados en AsyncStorage
      if (user?.id) {
        clearSavedDeliveryInfo(user.id);
        clearSavedCoordinates(user.id);
      }
      
      // ✅ ACTUALIZACIÓN AGRESIVA: Badge siempre actualizado
      refreshOrders(); // Refresh inmediato

      // Refresh adicionales para asegurar sincronización
      setTimeout(() => refreshOrders(), 2000);  // 2s después
      setTimeout(() => refreshOrders(), 5000);  // 5s después

      // 🏪 FIX OXXO: Activar Guest orders si es un usuario Guest
      if (user?.usertype === 'Guest') {
        enableGuestOrders();
        // console.log('🏪 OXXO DEBUG - Guest orders enabled after payment');
      }
      
      // 🆕 GUEST FIX: Actualizar badge para Guest después del pago
      if (user?.usertype === 'Guest' && orderData?.order) {
        // Crear un array con la orden recién creada para actualizar el badge
        const newGuestOrder = {
          id: orderData.order.id,
          status: orderData.order.status || 'pending',
          payment_status: orderData.order.payment_status || 'paid',
          user_email: user.email,
          created_at: new Date().toISOString(),
          // Agregar otros campos necesarios para el badge
          total: totalPrice,
          delivery_address: address
        };

        // Actualizar OrderContext con la nueva orden para mostrar badge inmediatamente
        updateOrders([newGuestOrder]);
        // console.log('🎉 GUEST BADGE: Actualizado inmediatamente con nueva orden:', newGuestOrder.id);
      }
      
      // 🐛 DEBUG: Logs temporales para diagnóstico OXXO
      // console.log('🎉 PAGO EXITOSO - Analizando orderData completo:', {
        // userType: user?.usertype,
        // paymentMethod: 'OXXO_DETECTED',
        // orderDataRaw: orderData,
        // orderDataKeys: Object.keys(orderData || {}),
        // orderDataString: JSON.stringify(orderData, null, 2),
        // orderNumber: orderNumber,
        // orderDataOrderId: orderData?.order_id,
        // orderDataId: orderData?.id,
        // isValidOrderId: isValidOrderId,
        // totalPrice: totalPrice,
        // deliveryText: deliveryText
      // });

      // Construir datos del modal para debug
      const modalData = {
        orderNumber: formatOrderId(orderData?.created_at || orderData?.order?.created_at || new Date().toISOString()),
        totalPrice: totalPrice,
        itemCount: itemCount,
        deliveryText: deliveryText,
        needInvoice: needInvoice,
        orderId: orderNumber ? orderNumber.toString() : null,
        oxxoInfo: oxxoInfo // 🏪 Información del voucher OXXO si existe
      };

      // 🔧 DEBUG OXXO: Log del modal data completo
      // console.log('🏪 OXXO DEBUG - Success Modal Data:', {
      // modalData: modalData,
      // hasOxxoInfo: !!oxxoInfo,
      // oxxoVoucherNumber: oxxoInfo?.voucherNumber,
      // oxxoAmount: oxxoInfo?.amount,
      // orderIdForModal: modalData.orderId,
      // willShowOxxoVoucher: !!oxxoInfo,
      // timestamp: new Date().toISOString()
      // });
      
      
      // 🔧 NAVEGACIÓN DIRECTA SIMPLIFICADA - Evitar navegación anidada
      
      // Opción 1: Navegar directo sin estructura anidada (PUEDE FALLAR)
      // navigation.navigate('CategoriesList', {
      //   showSuccessModal: true,
      //   orderData: modalData
      // });
      
      // Opción 2: Usar reset para asegurar navegación limpia y que los parámetros lleguen
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            state: {
              routes: [
                {
                  name: 'Inicio',
                  state: {
                    routes: [
                      {
                        name: 'CategoriesList',
                        params: {
                          showSuccessModal: true,
                          orderData: modalData
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
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
      setShowLoadingContent(true); // 🆕 Resetear para próximo uso
    }
  };

  // Función para determinar coordenadas según tipo de usuario y configuración
  const getOrderCoordinates = () => {
    const userType = user?.usertype;
    
    if (userType === 'Guest') {
      // Guest: usa dirección manual que escribió + coordenadas del mapa (fallback)
      return {
        customer_lat: latlong.driver_lat || '', // Coordenadas del MapSelector
        customer_long: latlong.driver_long || '', // Coordenadas del MapSelector
        address_source: 'guest_manual_address',
        delivery_address: address?.trim() || ''
      };
    } 
    else {
      // 🔧 OPTIMIZADO: Usuario registrado usa NUEVO SISTEMA de direcciones
      // Priorizar dirección temporal si está seleccionada
      if (temporaryAddress?.latitude && temporaryAddress?.longitude) {
        // Usar coordenadas de la dirección temporal seleccionada
        return {
          customer_lat: temporaryAddress.latitude.toString(),
          customer_long: temporaryAddress.longitude.toString(), 
          address_source: 'temporary_address_selection',
          delivery_address: temporaryAddress.address || ''
        };
      } else if (selectedAddress?.latitude && selectedAddress?.longitude) {
        // Usar coordenadas de la dirección seleccionada del nuevo sistema
        return {
          customer_lat: selectedAddress.latitude.toString(),
          customer_long: selectedAddress.longitude.toString(), 
          address_source: 'new_address_system',
          delivery_address: selectedAddress.address || ''
        };
      } else {
        // Fallback: sistema anterior (MapSelector + perfil)
        const savedAddress = userProfile?.address || user?.address;
        return {
          customer_lat: latlong.driver_lat || '',
          customer_long: latlong.driver_long || '',
          address_source: 'legacy_system_fallback',
          delivery_address: savedAddress?.trim() || address?.trim() || ''
        };
      }
    }
  };

  // 2) Envía la orden al backend y maneja fallos
  const completeOrderFunc = async () => {
    try {
      // 🔑 CRÍTICO: Obtener FCM token para notificaciones (especialmente para Guest)
      let fcmToken = null;
      try {
        fcmToken = NotificationService.token || await NotificationService.getToken();
        // console.log('🔔 FCM TOKEN DEBUG - Orden:', {
          // userType: user?.usertype,
          // userId: user?.id,
          // userEmail: user?.email,
          // hasToken: !!fcmToken,
          // tokenLength: fcmToken ? fcmToken.length : 0,
          // tokenPreview: fcmToken ? `${fcmToken.substring(0, 30)}...` : 'NULL',
          // notificationService: {
            // hasInstance: !!NotificationService,
            // cachedToken: !!NotificationService.token
          // }
        // });
      } catch (error) {
        // console.log('⚠️ ERROR FCM TOKEN:', {
          // userType: user?.usertype,
          // error: error.message,
          // stack: error.stack
        // });
      }
      
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
      
      // Determinar el email correcto para enviar - MEJORADO PARA EVITAR ÓRDENES SIN EMAIL
      let userEmailForOrder = '';
      
      if (user?.usertype === 'Guest') {
        // Para Guests: priorizar email local, luego email del usuario
        userEmailForOrder = email?.trim() || user?.email?.trim() || '';
      } else {
        // Para usuarios registrados: usar email del usuario o obtener del perfil
        userEmailForOrder = user?.email?.trim() || '';
        
        // Si no hay email en el contexto, intentar obtenerlo del perfil
        if (!userEmailForOrder && user?.id) {
          try {
            const profileResponse = await axios.get(`${API_BASE_URL}/api/userdetails/${user.id}`);
            const profileData = profileResponse.data?.data?.[0];
            userEmailForOrder = profileData?.email?.trim() || '';
          } catch (profileError) {
          }
        }
      }
      
      // Validación final: asegurar que siempre tengamos un email válido
      if (!userEmailForOrder) {
        showAlert({
          type: 'error',
          title: 'Email requerido',
          message: 'No se pudo obtener tu email. Por favor verifica tu información en el perfil.',
          confirmText: 'Ir a Perfil',
          onConfirm: () => navigation.navigate('Profile')
        });
        return;
      }
      

      // Obtener coordenadas según la lógica de usuario
      const coordinates = getOrderCoordinates();
      
      // console.log('📍 DATOS DE ENVÍO OPTIMIZADOS:', {
        // coordinates: coordinates,
        // selectedAddress: selectedAddress ? {
          // id: selectedAddress.id,
          // address: selectedAddress.address,
          // lat: selectedAddress.latitude,
          // lng: selectedAddress.longitude,
          // isDefault: selectedAddress.is_default
        // } : null,
        // userType: user?.usertype,
        // addressSource: coordinates.address_source
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
        // 🚚 ARREGLAR: Incluir información de envío
        shipping_cost: shippingCost || 0,
        subtotal: getSubtotal(),
        total_amount: getFinalTotal(),
        // Campos de cupón (si existe y es válido)
        coupon_code: appliedCoupon && isCouponStillValid() ? appliedCoupon.code : null,
        coupon_discount: appliedCoupon && isCouponStillValid() ? appliedCoupon.discount : null,
        coupon_type: appliedCoupon && isCouponStillValid() ? appliedCoupon.type : null,
        discount_amount: appliedCoupon && isCouponStillValid() ? getDiscountAmount() : 0,
        // 🔑 CRÍTICO: Incluir FCM token para notificaciones push
        fcm_token: fcmToken || null,
      };

      // 🔧 DEBUG OXXO: Log completo del payload enviado al backend
      // console.log('🏪 OXXO DEBUG - Sending Payload to Backend:', {
      // endpoint: `${API_BASE_URL}/api/ordersubmit`,
      // payload: payload,
      // userType: user?.usertype,
      // paymentExpected: 'OXXO_OR_OTHER',
      // timestamp: new Date().toISOString()
      // });

      const response = await axios.post(`${API_BASE_URL}/api/ordersubmit`, payload);

      // 🔧 DEBUG OXXO: Log de la respuesta del backend
      // console.log('🏪 OXXO DEBUG - Backend Response:', {
      // status: response.status,
      // data: response.data,
      // orderId: response.data?.order?.id,
      // orderStatus: response.data?.order?.status,
      // paymentMethod: response.data?.order?.payment_method,
      // timestamp: new Date().toISOString()
      // });

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
      // Usuario registrado: verificar si tiene dirección del SISTEMA NUEVO
      // console.log('🔍 VERIFICANDO DIRECCIÓN SISTEMA NUEVO:', { address: address?.trim() });
      
      if (!address?.trim()) {
        // No tiene dirección del sistema nuevo: mostrar modal
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
    
    // 🎯 PASO 1: Aplicar geocoding inteligente para centrar mapa correctamente
    let mapCenter = { latitude: 19.4326, longitude: -99.1332 }; // Fallback CDMX
    
    if (userAddress && userAddress.trim().length > 10) {
      
      try {
        const geocodedCoords = await handleUserAddressGeocoding(userAddress);
        if (geocodedCoords && geocodedCoords.driver_lat && geocodedCoords.driver_long) {
          mapCenter = {
            latitude: parseFloat(geocodedCoords.driver_lat),
            longitude: parseFloat(geocodedCoords.driver_long)
          };
        } else {
        }
      } catch (error) {
      }
    } else {
    }
    
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
      selectedLocation: mapCenter, // ✅ USAR coordenadas geocodificadas o fallback CDMX
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
          `${API_BASE_URL}/api/products/sugerencias`,
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

  // TEMPORALMENTE COMENTADO - Sistema de temporizadores de productos
  /*
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
  */

  // Ya no necesitamos limpiar timeouts

  return (
    <View style={styles.container}>
      {/* Overlay de loading que bloquea toda la pantalla */}
      {loading && (
        <View style={styles.loadingOverlay}>
          {showLoadingContent && (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#33A744" />
              <Text style={styles.loadingText}>🔄 Cargando métodos de pago...</Text>
              <Text style={styles.loadingSubtext}>Por favor espera un momento</Text>
            </View>
          )}
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
            ¡Es el momento perfecto para descubrir nuestros sabores auténticos!
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
          {/* 📊 DESGLOSE DEL TOTAL - Sticky siempre visible */}
          <View style={styles.totalBreakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownAmount}>
                {formatPriceWithSymbol(totalPrice)}
              </Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Envío</Text>
              <Text style={[styles.breakdownAmount, shippingCost === 0 && styles.freeShippingText]}>
                {shippingCost === 0 ? 'Gratis' : `+${formatPriceWithSymbol(shippingCost)}`}
              </Text>
            </View>
            
            {appliedCoupon && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, styles.discountLabel]}>
                  Descuento ({appliedCoupon.code})
                </Text>
                <Text style={[styles.breakdownAmount, styles.discountAmount]}>
                  -{formatPriceWithSymbol(getDiscountAmount())}
                </Text>
              </View>
            )}
            
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>
                {formatPriceWithSymbol(getFinalTotal())}
              </Text>
            </View>
            
            {/* Info adicional compacta */}
            <View style={styles.compactInfoRow}>
              <Text style={styles.compactItemCount}>
                {cart.reduce((total, item) => total + item.quantity, 0)} {cart.reduce((total, item) => total + item.quantity, 0) === 1 ? 'producto' : 'productos'}
              </Text>
              {shippingMotivation && (
                <Text style={[
                  styles.compactShippingText,
                  shippingMotivation.type === 'success' 
                    ? styles.shippingMotivationSuccess 
                    : styles.shippingMotivationRegular
                ]}>
                  {shippingMotivation.message}
                </Text>
              )}
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
                      {/* TEMPORALMENTE COMENTADO - Temporizador visual de productos */}
                      {/* 
                      <Text style={styles.timer}>
                        {timers[item.id] > 0
                          ? `${Math.floor(timers[item.id] / 60)}:${
                              timers[item.id] % 60
                            }`
                          : 'Expirado'}
                      </Text>
                      */}
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
                          x {item.quantity || 0} {(item.quantity || 0) === 1 ? 'unidad' : 'unidades'} ({getTotalMeasure(item, item.quantity || 0)})
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.price}>
                        {formatPriceWithSymbol(item.price)} x {item.quantity || 0} {(item.quantity || 0) === 1 ? 'unidad' : 'unidades'} ({getTotalMeasure(item, item.quantity || 0)})
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
                handleCheckout={() => handleCheckout(getFinalTotal())}
                setPickerVisible={setPickerVisible}
                loadingUpsell={loadingUpsell}
                upsellItems={upsellItems}
                addToCart={addToCart}
                user={user}
                email={email}
                appliedCoupon={appliedCoupon}
                onCouponApply={handleCouponApply}
                onCouponRemove={handleCouponRemove}
                subtotal={getSubtotal()}
                discountAmount={getDiscountAmount()}
                finalTotal={getFinalTotal()}
                shippingCost={shippingCost}
                address={address}
                cart={cart}
                latlong={latlong}
                userProfile={userProfile}
                goToMapFromCart={goToMapFromCart} // ✅ NUEVA: Función para ir al mapa desde el carrito
                navigation={navigation} // ✅ NUEVA: Pasar navigation para Guest address editing
                temporaryAddress={temporaryAddress} // ✅ NUEVA: Dirección temporal para cambio
                setIsChangingAddress={setIsChangingAddress} // ✅ NUEVA: Función para cambiar dirección
                setShowAddressModal={setShowAddressModal} // ✅ NUEVA: Función para mostrar modal
                userAddresses={userAddresses} // ✅ NUEVA: Lista de direcciones para condicionar botón
                automaticPromotions={automaticPromotions} // ✅ FIX: Pasar automaticPromotions
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
                ) : isChangingAddress ? (
                  // Usuario quiere cambiar dirección temporal - Mostrar todas sus direcciones
                  <>
                    <Text style={styles.modalMessage}>
                      Selecciona una dirección diferente para este pedido:
                    </Text>
                    
                    <ScrollView style={styles.addressList} nestedScrollEnabled={true}>
                      {userAddresses.map((addr) => {
                        const isSelected = temporaryAddress?.id === addr.id;
                        const isDefault = addr.is_primary === "1" || addr.is_primary === 1 || addr.is_primary === true;
                        
                        return (
                          <TouchableOpacity
                            key={addr.id}
                            style={[
                              styles.addressOption,
                              isSelected && styles.selectedAddressOption,
                              isDefault && styles.defaultAddressOption
                            ]}
                            onPress={() => {
                              setTemporaryAddress(addr);
                              // Actualizar coordenadas para dirección temporal
                              if (addr.latitude && addr.longitude) {
                                setLatlong({
                                  driver_lat: addr.latitude.toString(),
                                  driver_long: addr.longitude.toString(),
                                });
                              }
                            }}>
                            <View style={styles.addressOptionHeader}>
                              <View style={styles.addressIconContainer}>
                                <Ionicons 
                                  name={isDefault ? "home" : "location-outline"} 
                                  size={18} 
                                  color={isSelected ? "#33A744" : isDefault ? "#D27F27" : "#8B5E3C"} 
                                />
                                {isDefault && (
                                  <Text style={styles.defaultBadgeSmall}>Principal</Text>
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
                          setIsChangingAddress(false);
                          setTemporaryAddress(null);
                        }}>
                        <Text style={styles.modalButtonSecondaryText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.modalButtonPrimary,
                          !temporaryAddress && styles.modalButtonDisabled
                        ]}
                        disabled={!temporaryAddress}
                        onPress={() => {
                          setShowAddressModal(false);
                          setIsChangingAddress(false);
                        }}>
                        <Text style={[
                          styles.modalButtonPrimaryText,
                          !temporaryAddress && styles.modalButtonDisabledText
                        ]}>
                          🔄 Usar Esta Dirección
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : userAddresses.length > 0 && !userAddresses.find(addr => addr.is_primary === "1" || addr.is_primary === 1 || addr.is_primary === true) ? (
                  // Usuario CON direcciones guardadas PERO SIN predeterminada - Mostrar selector
                  <>
                    <Text style={styles.modalMessage}>
                      Selecciona la dirección donde quieres recibir tu pedido:
                    </Text>
                    
                    <ScrollView style={styles.addressList} nestedScrollEnabled={true}>
                      {userAddresses.map((addr) => {
                        const isSelected = selectedAddress?.id === addr.id;
                        const isDefault = addr.is_primary === "1" || addr.is_primary === 1 || addr.is_primary === true;
                        
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
                              // 🔧 CRÍTICO: Establecer coordenadas cuando cambia la dirección
                              if (addr.latitude && addr.longitude) {
                                setLatlong({
                                  driver_lat: addr.latitude.toString(),
                                  driver_long: addr.longitude.toString(),
                                });
                              }
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
                          // 🔧 CRÍTICO: Establecer coordenadas
                          if (userAddresses[0].latitude && userAddresses[0].longitude) {
                            setLatlong({
                              driver_lat: userAddresses[0].latitude.toString(),
                              driver_long: userAddresses[0].longitude.toString(),
                            });
                          }
                          setShowAddressModal(false);
                          completeOrder(); // Usar la única dirección
                        }}>
                        <Text style={styles.modalButtonPrimaryText}>📋 Usar Esta Dirección</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  // Usuario SIN direcciones guardadas - Solo agregar dirección
                  <>
                    <Text style={styles.modalMessage}>
                      Necesitas agregar una dirección de entrega para completar tu pedido.
                    </Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalButtonPrimary}
                        onPress={() => {
                          setShowAddressModal(false);
                          navigateToCartNew(navigation);
                        }}>
                        <Text style={styles.modalButtonPrimaryText}>➕ Agregar Mi Dirección</Text>
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
  appliedCoupon,
  onCouponApply,
  onCouponRemove,
  subtotal,
  discountAmount,
  finalTotal,
  shippingCost,
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
  navigation, // ✅ NUEVA: Navigation para Guest address editing
  temporaryAddress, // ✅ NUEVA: Dirección temporal para cambio
  automaticPromotions, // ✅ FIX: Agregar automaticPromotions a las props
  setIsChangingAddress, // ✅ NUEVA: Función para cambiar dirección
  setShowAddressModal, // ✅ NUEVA: Función para mostrar modal
  userAddresses, // ✅ NUEVA: Lista de direcciones para condicionar botón
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
      
      // Email según tipo de usuario - MEJORADO PARA EVITAR ÓRDENES SIN EMAIL
      let userEmailForOrder = '';
      
      if (user?.usertype === 'Guest') {
        // Para Guests: priorizar email local, luego email del usuario
        userEmailForOrder = email?.trim() || user?.email?.trim() || '';
      } else {
        // Para usuarios registrados: usar email del usuario o obtener del perfil
        userEmailForOrder = user?.email?.trim() || '';
        
        // Si no hay email en el contexto, intentar obtenerlo del perfil
        if (!userEmailForOrder && user?.id) {
          try {
            const profileResponse = await axios.get(`${API_BASE_URL}/api/userdetails/${user.id}`);
            const profileData = profileResponse.data?.data?.[0];
            userEmailForOrder = profileData?.email?.trim() || '';
          } catch (profileError) {
            // console.error('⚠️ Error obteniendo email del perfil (completeOrder):', profileError);
          }
        }
      }
      
      // Validación final: asegurar que siempre tengamos un email válido
      if (!userEmailForOrder) {
        // console.error('❌ ERROR CRÍTICO: No se pudo obtener email para la orden (completeOrder)');
        showAlert({
          type: 'error',
          title: 'Email requerido',
          message: 'No se pudo obtener tu email. Por favor verifica tu información en el perfil.',
          confirmText: 'Entendido'
        });
        return;
      }
      
      
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
    {/* TEMPORALMENTE OCULTO - Upsell/Sugerencias para implementar más tarde */}
    {/* <Text style={styles.suggestionsTitle}>También te puede interesar</Text>
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
              {hasDiscount && (
                <View style={styles.upsellDiscountBadge}>
                  <Text style={styles.upsellDiscountText}>-${discountNum}</Text>
                </View>
              )}
              
              <Image source={{uri: item.photo}} style={styles.upsellImage} />
              <Text style={styles.upsellName}>{item.name}</Text>
              
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
    )} */}
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

    {/* Cupón de descuento */}
    <CouponInput
      onCouponApply={onCouponApply}
      onCouponRemove={onCouponRemove}
      appliedCoupon={appliedCoupon}
      subtotal={subtotal}
      shippingCost={shippingCost}
      isValid={!appliedCoupon || subtotal >= appliedCoupon.minAmount}
    />

    {/* Promociones Automáticas */}
    {automaticPromotions && automaticPromotions.length > 0 && (
      <View style={styles.automaticPromotionsContainer}>
        <View style={styles.automaticPromotionsHeader}>
          <Ionicons name="gift" size={20} color="#D27F27" style={{marginRight: 8}} />
          <Text style={styles.automaticPromotionsTitle}>
            ¡Promociones automáticas aplicadas!
          </Text>
        </View>

        {automaticPromotions.map((promotion, index) => (
          <View key={promotion.id || index} style={styles.automaticPromotionCard}>
            <View style={styles.automaticPromotionInfo}>
              <View style={styles.automaticPromotionHeader}>
                <Text style={styles.automaticPromotionName}>{promotion.name}</Text>
                <View style={[styles.automaticPromotionBadge,
                  promotion.type === 'Birthday' && {backgroundColor: '#FF6B6B'},
                  promotion.type === 'Global' && {backgroundColor: '#4ECDC4'},
                  promotion.type === 'Normal' && {backgroundColor: '#45B7D1'},
                  promotion.type === 'Google' && {backgroundColor: '#DB4437'},
                  promotion.type === 'Apple' && {backgroundColor: '#000000'},
                ]}>
                  <Text style={[styles.automaticPromotionBadgeText,
                    promotion.type === 'Apple' && {color: '#FFFFFF'}
                  ]}>
                    {promotion.type === 'Birthday' && '🎂 Cumpleaños'}
                    {promotion.type === 'Global' && '🌍 Global'}
                    {promotion.type === 'Normal' && '👤 Normal'}
                    {promotion.type === 'Google' && '🔍 Google'}
                    {promotion.type === 'Apple' && '🍎 Apple'}
                    {promotion.type === 'Guest' && '👥 Guest'}
                    {!['Birthday', 'Global', 'Normal', 'Google', 'Apple', 'Guest'].includes(promotion.type) && promotion.type}
                  </Text>
                </View>
              </View>
              <View style={styles.automaticPromotionDiscount}>
                <Text style={styles.automaticPromotionDiscountText}>
                  -{promotion.discount_type === 'percentage' ? `${promotion.discount}%` : `$${promotion.discount}`}
                </Text>
                <Text style={styles.automaticPromotionAmount}>
                  Ahorro: ${promotion.discountAmount.toFixed(2)}
                </Text>
              </View>
              {promotion.minAmount > 0 && (
                <Text style={styles.automaticPromotionMinimum}>
                  Mínimo: ${promotion.minAmount.toFixed(2)}
                </Text>
              )}
            </View>
            {promotion.type === 'Birthday' && (
              <Text style={styles.birthdayMessage}>
                ¡Feliz cumpleaños! 🎉
              </Text>
            )}
          </View>
        ))}
      </View>
    )}

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
            placeholder="RFC (ej: ABCD123456EF7)"
            placeholderTextColor="rgba(47,47,47,0.6)"
            value={taxDetails || ''}
            onChangeText={(text) => {
              // Convertir a mayúsculas y remover espacios
              const cleanText = text.replace(/\s/g, '').toUpperCase();
              // Limitar a 13 caracteres (longitud máxima del RFC)
              const limitedText = cleanText.slice(0, 13);
              // Validar solo letras y números
              const validText = limitedText.replace(/[^A-Z0-9]/g, '');
              setTaxDetails(validText);
            }}
            maxLength={13}
            autoCapitalize="characters"
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
                  <TouchableOpacity
                    style={styles.changeAddressButton}
                    onPress={() => {
                      // Reutilizar GuestCheckout para cambiar dirección
                      const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
                      navigation.navigate('GuestCheckout', {
                        totalPrice: totalPrice,
                        itemCount: itemCount,
                        returnToCart: true,
                        editingAddress: true, // 🆕 Flag para indicar que está editando
                        // Preservar datos actuales
                        preservedDeliveryInfo: deliveryInfo ? {
                          ...deliveryInfo,
                          date: deliveryInfo.date.toISOString(),
                        } : null,
                        preservedNeedInvoice: needInvoice,
                        preservedTaxDetails: taxDetails,
                        preservedCoordinates: latlong,
                        currentEmail: email,
                        currentAddress: address,
                      });
                    }}>
                    <Ionicons name="pencil" size={14} color="#8B5E3C" />
                    <Text style={styles.changeAddressButtonText}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ✅ MEJORADO: Ubicación con geocoding inteligente para usuarios registrados */}
        {user && user.usertype !== 'Guest' && deliveryInfo && address && (
          <View style={styles.registeredUserLocationSection}>
            <View style={styles.locationHeaderRow}>
              <Text style={styles.locationSectionTitle}>📍 Ubicación de entrega</Text>
              {/* Solo mostrar botón "Cambiar" si el usuario tiene 2 o más direcciones */}
              {userAddresses.length > 1 && (
                <TouchableOpacity
                  style={styles.changeAddressButton}
                  onPress={() => {
                    setIsChangingAddress(true);
                    setShowAddressModal(true);
                  }}>
                  <Ionicons name="refresh" size={16} color="#8B5E3C" />
                  <Text style={styles.changeAddressButtonText}>Cambiar</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.userAddressText}>
              {temporaryAddress?.address || address}
            </Text>
            
            {/* 🔧 COMENTADO: Ya no necesario - Las direcciones tienen coordenadas precisas automáticamente
            <View style={styles.locationStatusContainer}>
              <View style={styles.locationStatusRow}>
                <Ionicons name="location-outline" size={20} color="#D27F27" />
                <Text style={styles.locationStatusText}>
                  Para mayor precisión en la entrega, puedes ajustar tu ubicación exacta
                </Text>
                <TouchableOpacity
                  style={styles.selectLocationButton}
                  onPress={goToMapFromCart}>
                  <Ionicons name="map" size={16} color="#FFF" />
                  <Text style={styles.selectLocationButtonText}>Ajustar</Text>
                </TouchableOpacity>
              </View>
            </View>
            */}
          </View>
        )}

        <TouchableOpacity
          style={[styles.checkoutButton, (!deliveryInfo || isRestoringDeliveryInfo || loading) && {opacity: 0.5}]}
          onPress={handleCheckout}
          disabled={!deliveryInfo || isRestoringDeliveryInfo || loading}>
          <Text style={styles.checkoutText}>
            {loading ? '🔄 Procesando pago...' : 
             isRestoringDeliveryInfo ? '⏳ Cargando...' : 
             `💳 Pagar ${formatPriceWithSymbol(finalTotal)}`}
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