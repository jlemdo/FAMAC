import React, {useContext, useState, useEffect, useRef} from 'react';
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
  InteractionManager,
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
    subtotalAfterProductDiscounts, // 🆕 Subtotal ANTES de descuentos promocionales (para cupones)
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
  const [email, setEmail] = useState((user?.email && typeof user?.email === 'string') ? user?.email : '');
  const [address, setAddress] = useState((user?.address && typeof user?.address === 'string') ? user?.address : '');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [needInvoice, setNeedInvoice] = useState(false);
  const [taxDetails, setTaxDetails] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [upsellItems, setUpsellItems] = useState([]);
  const [loadingUpsell, setLoadingUpsell] = useState(true);
  const [showLoadingContent, setShowLoadingContent] = useState(true);
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

  // 🔧 REF para debounce de cálculo de envío - evita saturar el servidor con múltiples llamadas rápidas
  const shippingDebounceRef = useRef(null);
  const lastShippingSubtotalRef = useRef(null); // Para evitar llamadas redundantes con el mismo subtotal

  // Guardar deliveryInfo y coordenadas en AsyncStorage (solo usuarios registrados)
  useEffect(() => {
    if (user?.id && user?.usertype !== 'Guest' && cart.length > 0) {
      if (deliveryInfo) {
        saveDeliveryInfo(deliveryInfo, user.id);
      }
      if (latlong?.driver_lat && latlong?.driver_long) {
        saveCoordinates(latlong, user.id);
      }
    }
  }, [deliveryInfo, latlong, user?.id, cart.length]);

  // Cargar datos Guest desde BD al inicializar
  useEffect(() => {
    if (user?.usertype !== 'Guest' || !user?.email) return;
    if (latlong?.driver_lat && latlong?.driver_long) return; // Ya tiene coordenadas

    const loadGuestData = async () => {
      try {
        const guestData = await loadGuestDataFromDB(user.email);
        if (!guestData) return;

        setEmail(guestData.email);
        setAddress(guestData.address);
        if (guestData.coordinates) {
          setLatlong(guestData.coordinates);
        }

        const currentSubtotal = getSubtotal() - getDiscountAmount();
        if (currentSubtotal > 0 && guestData.address?.trim()) {
          setTimeout(() => calculateShippingAndMotivation(currentSubtotal), 300);
        }
      } catch (error) {
        // Silently fail
      }
    };

    loadGuestData();
  }, [user?.usertype, user?.email, latlong?.driver_lat, latlong?.driver_long]);

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

  // Recalcular envío con debounce (para todos los usuarios)
  useEffect(() => {
    const currentSubtotal = getSubtotal() - getDiscountAmount();

    // Cancelar timeout anterior
    if (shippingDebounceRef.current) {
      clearTimeout(shippingDebounceRef.current);
    }

    // Sin subtotal: resetear shipping
    if (currentSubtotal <= 0) {
      setShippingCost(0);
      setShippingMotivation(null);
      setShippingCalculated(false);
      lastShippingSubtotalRef.current = null;
      return;
    }

    // Para Guest: solo calcular si tiene datos completos
    const isGuest = user?.usertype === 'Guest';
    const guestReady = !isGuest || (email?.trim() && address?.trim() && latlong?.driver_lat && latlong?.driver_long);

    if (!guestReady) return;

    // Solo recalcular si subtotal cambió significativamente o no se ha calculado
    const lastSubtotal = lastShippingSubtotalRef.current || 0;
    const subtotalChanged = Math.abs(currentSubtotal - lastSubtotal) > 1;

    if (subtotalChanged || !shippingCalculated) {
      shippingDebounceRef.current = setTimeout(() => {
        lastShippingSubtotalRef.current = currentSubtotal;
        calculateShippingAndMotivation(currentSubtotal);
      }, 500);
    }

    return () => {
      if (shippingDebounceRef.current) {
        clearTimeout(shippingDebounceRef.current);
      }
    };
  }, [totalPrice, appliedCoupon, user?.usertype, email, address, latlong?.driver_lat, latlong?.driver_long, shippingCalculated]);
  
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

  // 🔧 BUG #10 FIX: Guardar cupón en AsyncStorage
  const saveCoupon = async (couponData, odUserId) => {
    try {
      const key = `appliedCoupon_${odUserId}`;
      await AsyncStorage.setItem(key, JSON.stringify(couponData));
    } catch (error) {
    }
  };

  // 🔧 BUG #10 FIX: Restaurar cupón desde AsyncStorage
  const restoreCoupon = async (odUserId, currentSubtotal) => {
    try {
      const key = `appliedCoupon_${odUserId}`;
      const savedData = await AsyncStorage.getItem(key);
      if (savedData) {
        const couponData = JSON.parse(savedData);
        // Validar que el cupón aún cumpla el mínimo
        if (currentSubtotal >= (couponData.minAmount || 0)) {
          setAppliedCoupon(couponData);
          return couponData;
        } else {
          // Ya no cumple mínimo, eliminar
          await clearSavedCoupon(odUserId);
        }
      }
    } catch (error) {
    }
    return null;
  };

  // 🔧 BUG #10 FIX: Limpiar cupón guardado
  const clearSavedCoupon = async (odUserId) => {
    try {
      const key = `appliedCoupon_${odUserId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
    }
  };

  const handleCouponApply = (couponData) => {
    setAppliedCoupon(couponData);
    // 🔧 BUG #10 FIX: Persistir cupón
    const odUserId = user?.id?.toString() || user?.email || 'anonymous';
    saveCoupon(couponData, odUserId);
    showAlert({
      type: 'success',
      title: 'Cupón aplicado',
      message: `${couponData.description} aplicado correctamente`
    });
  };

  const handleCouponRemove = () => {
    setAppliedCoupon(null);
    // 🔧 BUG #10 FIX: Limpiar cupón persistido
    const odUserId = user?.id?.toString() || user?.email || 'anonymous';
    clearSavedCoupon(odUserId);
    showAlert({
      type: 'info',
      title: 'Cupón removido',
      message: 'El descuento ha sido eliminado'
    });
  };

  // 🧮 CÁLCULOS DINÁMICOS DE CUPONES
  // 🔧 FIX BUG #3: Usar subtotalAfterProductDiscounts para cupones (ANTES de descuentos promocionales)
  // Esto asegura que los cupones se calculen sobre el precio correcto
  const getSubtotal = () => parseFloat(totalPrice); // Subtotal final (para mostrar al usuario)
  const getSubtotalForCoupons = () => parseFloat(subtotalAfterProductDiscounts); // Subtotal para validar cupones

  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;

    // 🔧 FIX: Usar subtotal ANTES de descuentos promocionales para calcular cupón
    const subtotalForCoupon = getSubtotalForCoupons();

    // Verificar si aún cumple el monto mínimo
    if (subtotalForCoupon < appliedCoupon.minAmount) {
      return 0; // No aplica descuento si no cumple mínimo
    }

    // Determinar sobre qué base aplicar el descuento
    const appliesTo = appliedCoupon.appliesTo || 'total';
    const baseAmount = appliesTo === 'shipping' ? shippingCost : subtotalForCoupon;

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
    const subtotal = getSubtotal(); // Subtotal final (con descuentos promocionales ya aplicados)
    const couponDiscount = getDiscountAmount();

    // Si el cupón aplica a envío, restar descuento del shipping
    if (appliedCoupon && appliedCoupon.appliesTo === 'shipping') {
      const discountedShipping = Math.max(0, shippingCost - couponDiscount);
      return Math.max(0, subtotal + discountedShipping);
    }

    // Si aplica a total, restar descuento del subtotal y luego agregar shipping
    return Math.max(0, subtotal - couponDiscount + shippingCost);
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

  // Calcular envío y mensaje motivacional
  const calculateShippingAndMotivation = async (subtotal) => {
    if (!subtotal || subtotal <= 0) {
      setShippingCost(0);
      setShippingMotivation(null);
      return;
    }

    setLoadingShipping(true);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/shipping-motivation/${subtotal}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (response.data.status === 'success') {
        const data = response.data.data;
        setShippingMotivation(data);
        setShippingCost(Number(data.shipping_cost) || 0);
        setShippingCalculated(true);
      }
    } catch (error) {
      setShippingCost(0);
      setShippingMotivation(null);
      setShippingCalculated(true);
    } finally {
      setLoadingShipping(false);
    }
  };
  
  const isCouponStillValid = () => {
    if (!appliedCoupon) return true;
    // 🔧 FIX BUG #5: Usar subtotal para cupones (antes de descuentos promocionales)
    return getSubtotalForCoupons() >= appliedCoupon.minAmount;
  };

  // 🔄 MONITOREO DINÁMICO DE CUPONES
  useEffect(() => {
    if (!appliedCoupon) return;

    // 🔧 FIX: Usar subtotal para cupones (antes de descuentos promocionales)
    const currentSubtotal = getSubtotalForCoupons();
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
        }
      }
    } catch (error) {
      setUserAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Limpiar cupón y deliveryInfo cuando el carrito se limpia (logout/cambio de usuario)
  useEffect(() => {
    const clearCartRelatedData = () => {
      setDeliveryInfo(null);
      setAppliedCoupon(null);
      // 🔧 BUG #10 FIX: También limpiar cupón de AsyncStorage
      const odUserId = user?.id?.toString() || user?.email || 'anonymous';
      clearSavedCoupon(odUserId);
    };

    if (setCartClearCallback) {
      setCartClearCallback(clearCartRelatedData);
    }
  }, [setCartClearCallback, user?.id, user?.email]);

  // Inicializar estados cuando cambia el usuario
  useEffect(() => {
    if (user?.usertype === 'Guest') {
      const hasEmail = user?.email && user?.email?.trim() !== '';
      const hasAddress = user?.address && user?.address?.trim() !== '';
      setEmail(hasEmail ? user.email : '');
      setAddress(hasAddress ? user.address : '');
    } else {
      // Usuario registrado
      setEmail(user?.email || '');
      setAddress(''); // Limpiar dirección temporal para usuarios registrados
      // Cargar direcciones del usuario con el nuevo sistema
      fetchUserAddresses();
    }
    
  }, [user]);

  // Actualizar datos cuando la pantalla gana foco
  useFocusEffect(
    React.useCallback(() => {
      const handleFocus = async () => {
        // 🔧 BUG #10 FIX: Restaurar cupón para cualquier usuario con carrito
        if (cart.length > 0 && !appliedCoupon) {
          const odUserId = user?.id?.toString() || user?.email || 'anonymous';
          const currentSubtotal = parseFloat(subtotalAfterProductDiscounts) || 0;
          await restoreCoupon(odUserId, currentSubtotal);
        }

        if (user?.usertype !== 'Guest' && user?.id) {
          fetchUserAddresses();
          // Solo restaurar datos si hay productos en el carrito
          if (cart.length > 0) {
            // Restaurar deliveryInfo para usuarios registrados
            if (!deliveryInfo) {
              await restoreDeliveryInfo(user.id);
            }
            // Restaurar coordenadas para usuarios registrados
            if (!latlong?.driver_lat || !latlong?.driver_long) {
              const restoredCoords = await restoreCoordinates(user.id);

              // Si no hay coordenadas guardadas, aplicar geocoding inteligente
              if (!restoredCoords || !restoredCoords.driver_lat || !restoredCoords.driver_long) {
                setTimeout(async () => {
                  const currentProfile = userProfile;
                  const userAddress = currentProfile?.address || user?.address;

                  if (userAddress && userAddress.trim().length > 10) {
                    await handleUserAddressGeocoding(userAddress);
                  }
                }, 1000);
              }
            }
          }
        }
      };

      handleFocus();

      // Revisar si hay datos de guest en los parámetros de navegación
      const navState = navigation.getState();
      const mainTabsRoute = navState?.routes?.find(route => route.name === 'MainTabs');
      const carritoRoute = mainTabsRoute?.state?.routes?.find(route => route.name === 'Carrito');

      const params = carritoRoute?.params || mainTabsRoute?.params || route?.params;

      // Leer datos de AsyncStorage si vienen de AddressForm simplificado
      if (params?.hasGuestDataInStorage && user?.usertype === 'Guest') {
        const handleGuestDataFromStorage = async () => {
          try {
            const tempGuestDataStr = await AsyncStorage.getItem('tempGuestData');
            if (tempGuestDataStr) {
              const tempGuestData = JSON.parse(tempGuestDataStr);

              setEmail(tempGuestData.email);
              setAddress(tempGuestData.address);

              // Guardar en BD automáticamente cuando se completa la dirección
              if (tempGuestData.email?.trim() && tempGuestData.address?.trim() && tempGuestData.mapCoordinates) {
                await saveGuestDataToDB(
                  tempGuestData.email,
                  { address: tempGuestData.address },
                  tempGuestData.mapCoordinates
                );
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
        // Guardar datos Guest en BD
        if (params.guestData.email?.trim() && params.guestData.address?.trim() && params.mapCoordinates) {
          saveGuestDataToDB(
            params.guestData.email,
            { address: params.guestData.address },
            params.mapCoordinates
          ).catch(() => {});
        }

        // Restaurar datos del formulario si existen
        if (params.guestData.preservedDeliveryInfo) {
          setDeliveryInfo({
            ...params.guestData.preservedDeliveryInfo,
            date: new Date(params.guestData.preservedDeliveryInfo.date),
          });
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

        // Si Guest tiene mapCoordinates, procesar auto-pago
        if (params?.mapCoordinates && user?.usertype === 'Guest') {
          setLatlong({
            driver_lat: params.mapCoordinates.latitude,
            driver_long: params.mapCoordinates.longitude,
          });
          setGuestJustCompletedAddress(true);

          // Forzar recálculo del envío
          setTimeout(() => {
            const currentSubtotal = getSubtotal() - getDiscountAmount();
            if (currentSubtotal > 0 && params.guestData.email?.trim() && params.guestData.address?.trim()) {
              calculateShippingAndMotivation(currentSubtotal);
            }
          }, 200);

          setTimeout(() => {
            navigation.setParams({ guestData: null, mapCoordinates: null });
          }, 100);

        } else {
          // Forzar recálculo del envío (flujo normal)
          setTimeout(() => {
            const currentSubtotal = getSubtotal() - getDiscountAmount();
            if (currentSubtotal > 0 && params.guestData.email?.trim() && params.guestData.address?.trim()) {
              calculateShippingAndMotivation(currentSubtotal);
            }
          }, 200);

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

  // Auto-pago Guest: Solo cuando acaba de completar su dirección por primera vez
  useEffect(() => {
    // Solo para Guest que acaba de completar su dirección
    if (user?.usertype === 'Guest' &&
        guestJustCompletedAddress &&
        deliveryInfo &&
        email?.trim() &&
        address?.trim() &&
        latlong?.driver_lat &&
        latlong?.driver_long &&
        cart.length > 0 &&
        shippingCalculated &&
        !loadingShipping) {

      const autoPayTimeout = setTimeout(() => {
        completeOrder();
        setGuestJustCompletedAddress(false);
      }, 1000);

      return () => clearTimeout(autoPayTimeout);
    }
  }, [user?.usertype, guestJustCompletedAddress, deliveryInfo, email, address, latlong?.driver_lat, latlong?.driver_long, cart.length, shippingCalculated, loadingShipping]);

  // Función auxiliar: Manejar éxito de orden (para Stripe y órdenes gratuitas)
  const handleOrderSuccess = async (orderData, oxxoInfo = null) => {
    const realOrderId = orderData?.order?.id;

    // Guardar datos de Guest para futuras compras
    if (user?.usertype === 'Guest') {
      const updateData = {};
      if ((!user?.email || user?.email?.trim() === '') && email?.trim()) {
        updateData.email = email.trim();
      }
      if (address?.trim()) {
        updateData.address = address.trim();
      }
      if (Object.keys(updateData).length > 0) {
        await updateUser(updateData);
      }
    }

    // Crear resumen del pedido
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const deliveryText = deliveryInfo
      ? `📅 ${deliveryInfo.date.toLocaleDateString('es-ES')} - ${deliveryInfo.slot}`
      : 'Horario pendiente';

    const orderNumber = realOrderId || orderData?.order?.id;

    // Limpiar datos - LIMPIEZA COMPLETA DESPUÉS DE PAGO
    clearCart();
    setDeliveryInfo(null);
    setAppliedCoupon(null);

    // 🔧 FIX: Limpiar TODO de AsyncStorage después de pago exitoso
    const odUserId = user?.id?.toString() || user?.email || 'anonymous';
    clearSavedCoupon(odUserId);

    if (user?.usertype !== 'Guest') {
      setLatlong(null);
    }

    if (user?.id) {
      clearSavedDeliveryInfo(user.id);
      clearSavedCoordinates(user.id);
    } else if (user?.email) {
      // 🔧 FIX: También limpiar para Guest usando email como key
      clearSavedDeliveryInfo(user.email);
      clearSavedCoordinates(user.email);
    }

    // Refrescar órdenes
    refreshOrders();
    setTimeout(() => refreshOrders(), 2000);
    setTimeout(() => refreshOrders(), 5000);

    if (user?.usertype === 'Guest') {
      enableGuestOrders();
      if (orderData?.order) {
        const newGuestOrder = {
          id: orderData.order.id,
          status: orderData.order.status || 'pending',
          payment_status: orderData.order.payment_status || 'paid',
          user_email: user.email,
          created_at: new Date().toISOString(),
          total: totalPrice,
          delivery_address: address,
        };
        updateOrders([newGuestOrder]);
      }
    }

    // Construir datos del modal
    const modalData = {
      orderNumber: formatOrderId(orderData?.created_at || orderData?.order?.created_at || new Date().toISOString()),
      totalPrice: getFinalTotal(),
      itemCount: itemCount,
      deliveryText: deliveryText,
      needInvoice: needInvoice,
      orderId: orderNumber ? orderNumber.toString() : null,
      oxxoInfo: oxxoInfo,
      isGratisOrder: getFinalTotal() < 10, // 🆕 Indicar si fue orden gratuita
    };

    // Navegar a pantalla de éxito
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
                        orderData: modalData,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  };

  // Helper: Mostrar error de validación
  const showValidationError = (title, message, confirmText = 'Cerrar') => {
    showAlert({ type: 'error', title, message, confirmText });
  };

  // Validar datos de Guest para checkout
  const validateGuestData = () => {
    if (!email?.trim()) {
      showValidationError('Información incompleta', 'Por favor proporciona tu email.');
      return false;
    }
    if (!address?.trim()) {
      showValidationError('Información incompleta', 'Por favor proporciona tu dirección.');
      return false;
    }
    const zoneValidation = validateDeliveryZone(address);
    if (!zoneValidation.isValid) {
      showValidationError(
        'Zona de entrega no disponible',
        `${zoneValidation.error}\n\n${zoneValidation.suggestion || 'Verifica tu dirección o contacta soporte.'}`,
        'Entendido'
      );
      return false;
    }
    if (!latlong?.driver_lat || !latlong?.driver_long) {
      setTimeout(() => {
        if (latlong?.driver_lat && latlong?.driver_long) {
          completeOrder();
        } else {
          showValidationError('Ubicación requerida', 'Por favor confirma tu ubicación exacta en el mapa.');
        }
      }, 200);
      return false;
    }
    return true;
  };

  // Validar datos de usuario registrado para checkout
  const validateRegisteredUserData = async () => {
    if (!address?.trim()) {
      setShowAddressModal(true);
      return false;
    }

    const zoneValidation = validateDeliveryZone(address);
    if (!zoneValidation.isValid) {
      showValidationError(
        'Zona de entrega no disponible',
        `${zoneValidation.error}\n\n${zoneValidation.suggestion || 'Actualiza tu dirección o contacta soporte.'}`,
        'Entendido'
      );
      return false;
    }

    if (!latlong?.driver_lat || !latlong?.driver_long) {
      // Intentar restaurar coordenadas guardadas
      let restoredCoords = user?.id ? await restoreCoordinates(user.id) : null;

      if (!restoredCoords?.driver_lat || !restoredCoords?.driver_long) {
        const currentAddress = address?.trim();
        if (currentAddress && currentAddress.length > 10) {
          try {
            const geocodedCoords = await handleUserAddressGeocoding(currentAddress);
            if (!geocodedCoords?.driver_lat || !geocodedCoords?.driver_long) {
              showAlert({
                type: 'info',
                title: 'Confirmar ubicación',
                message: 'Para mayor precisión en la entrega, ¿deseas confirmar tu ubicación en el mapa?',
                confirmText: 'Confirmar en mapa',
                cancelText: 'Continuar con dirección',
                showCancel: true,
                onConfirm: () => {
                  navigation.navigate('MapSelector', {
                    userAddress: currentAddress,
                    title: 'Confirmar ubicación para entrega',
                  });
                },
                onCancel: () => {
                  setLatlong({ driver_lat: '19.4326', driver_long: '-99.1332' });
                  setTimeout(() => completeOrder(), 100);
                }
              });
              return false;
            }
          } catch (error) {
            setLatlong({ driver_lat: '19.4326', driver_long: '-99.1332' });
          }
        } else {
          showValidationError('Ubicación requerida', 'Por favor confirma tu ubicación exacta en el mapa.');
          return false;
        }
      }
    }
    return true;
  };

  // Flujo único y robusto de pago
  const completeOrder = async () => {
    if (loading) return;

    // 1. Validar carrito
    if (cart.length === 0) {
      showValidationError('Carrito vacío', 'No hay productos en el carrito.');
      return;
    }

    // 2. Determinar si es orden gratuita
    const STRIPE_MINIMUM_MXN = 10;
    const finalTotal = getFinalTotal();
    const isGratisOrder = finalTotal < STRIPE_MINIMUM_MXN;

    // 3. Validar información de entrega
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
      if (user?.id && user?.usertype !== 'Guest') {
        const restored = await restoreDeliveryInfo(user.id);
        if (!restored) {
          showValidationError('Información incompleta', 'Por favor selecciona la fecha y hora de entrega.');
          return;
        }
      } else if (user?.usertype === 'Guest') {
        setTimeout(() => {
          if (deliveryInfo) {
            completeOrder();
          } else {
            showValidationError('Información incompleta', 'Por favor selecciona la fecha y hora de entrega.');
          }
        }, 200);
        return;
      } else {
        showValidationError('Información incompleta', 'Por favor selecciona la fecha y hora de entrega.');
        return;
      }
    }

    // 4. Validar según tipo de usuario
    if (user?.usertype === 'Guest') {
      if (!validateGuestData()) return;
    } else {
      const isValid = await validateRegisteredUserData();
      if (!isValid) return;
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
      const orderData = await completeOrderFunc();
      const realOrderId = orderData?.order?.id;

      if (!realOrderId) {
        throw new Error('No se pudo crear la orden correctamente.');
      }

      // 🆕 PASO 1.5: Si es orden gratuita, procesar sin Stripe
      if (isGratisOrder) {
        // Marcar la orden como pagada directamente en el backend
        try {
          const freeOrderResponse = await axios.post(`${API_BASE_URL}/api/orders/mark-as-free`, {
            order_id: realOrderId,
            reason: 'Cupón 100% descuento'
          });

          // Verificar que el backend confirmó el cambio
          if (!freeOrderResponse.data?.success) {
            throw new Error(freeOrderResponse.data?.message || 'No se pudo procesar la orden gratuita');
          }
        } catch (freeOrderError) {
          // Si falla, mostrar error y NO continuar
          showAlert({
            type: 'error',
            title: 'Error procesando pedido',
            message: 'No se pudo completar tu pedido gratuito. Por favor intenta de nuevo o contacta soporte.',
            confirmText: 'Entendido'
          });
          setLoading(false);
          return;
        }

        // Saltar directamente al flujo de éxito (sin Stripe)
        await handleOrderSuccess(orderData, null);
        return;
      }

      // 1.1) Crear PaymentIntent con ID real de la orden
      const orderEmail = user?.usertype === 'Guest' ? (email?.trim() || user?.email || '') : (user?.email || '');

      // Usar el cálculo unificado de precio final (incluye envío)
      const finalPrice = getFinalTotal();
      
      // 🚨 DEBUG: Verificar qué se envía a Stripe
      const {data} = await axios.post(
        `${API_BASE_URL}/api/create-payment-intent`,
        {amount: parseFloat(finalPrice) * 100, currency: 'mxn', email: orderEmail, order_id: realOrderId},
      );
      const clientSecret = data.clientSecret;
      if (!clientSecret) {
        throw new Error('No se obtuvo clientSecret del servidor.');
      }

      // Inicializar Stripe PaymentSheet
      const paymentSheetConfig = {
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Sabores de Origen',
        allowsDelayedPaymentMethods: true,
        returnURL: 'occr-productos-app://stripe-redirect',
      };

      const {error: initError} = await initPaymentSheet({
        ...paymentSheetConfig,
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
        primaryButtonLabel: `Pagar ${formatPriceWithSymbol(getFinalTotal())}`,
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

      // Presentar la UI de pago
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
      // Capturar información de voucher OXXO si aplica
      let oxxoInfo = null;
      try {
        const paymentIntentResult = await retrievePaymentIntent(clientSecret);
        const nextAction = paymentIntentResult?.paymentIntent?.nextAction;

        if (nextAction?.type === 'oxxoVoucher') {
          oxxoInfo = {
            voucherNumber: nextAction.voucherNumber,
            voucherURL: nextAction.voucherURL,
            expiration: nextAction.expiration,
            amount: finalPrice
          };
        }
      } catch (error) {
        // Error obteniendo payment intent - continuar sin info OXXO
      }

      // Pago exitoso - usar función centralizada
      await handleOrderSuccess(orderData, oxxoInfo);

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

  // Obtener email del usuario para la orden
  const getOrderEmail = async () => {
    if (user?.usertype === 'Guest') {
      return email?.trim() || user?.email?.trim() || '';
    }
    let userEmail = user?.email?.trim() || '';
    if (!userEmail && user?.id) {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/userdetails/${user.id}`);
        userEmail = response.data?.data?.[0]?.email?.trim() || '';
      } catch (error) {}
    }
    return userEmail;
  };

  // Envía la orden al backend
  const completeOrderFunc = async () => {
    try {
      // Obtener FCM token
      let fcmToken = null;
      try {
        fcmToken = NotificationService.token || await NotificationService.getToken();
      } catch (error) {}

      // Preparar items del carrito
      const cartItems = cart.map(it => {
        const itemDiscount = Number(it.discount) || 0;
        return {
          item_name: it.name,
          item_price: (it.price - itemDiscount).toString(),
          item_original_price: it.price.toString(),
          item_discount: itemDiscount.toString(),
          item_qty: it.quantity.toString(),
          item_image: it.photo,
        };
      });

      // Obtener email
      const orderEmail = await getOrderEmail();
      if (!orderEmail) {
        showAlert({
          type: 'error',
          title: 'Email requerido',
          message: 'No se pudo obtener tu email. Por favor verifica tu información en el perfil.',
          confirmText: 'Ir a Perfil',
          onConfirm: () => navigation.navigate('Profile')
        });
        return;
      }

      // Datos de cupón (validar una sola vez)
      const couponValid = appliedCoupon && isCouponStillValid();
      const coordinates = getOrderCoordinates();

      const payload = {
        userid: user?.id,
        orderno: '1',
        user_email: orderEmail,
        orderdetails: cartItems,
        customer_lat: coordinates.customer_lat,
        customer_long: coordinates.customer_long,
        address_source: coordinates.address_source,
        delivery_address: coordinates.delivery_address || address?.trim() || '',
        need_invoice: needInvoice ? "true" : "false",
        tax_details: needInvoice ? (taxDetails || '') : '',
        delivery_date: deliveryInfo?.date ? deliveryInfo.date.toISOString().split('T')[0] : '',
        delivery_slot: deliveryInfo?.slot || '',
        shipping_cost: shippingCost || 0,
        subtotal: getSubtotal(),
        total_amount: getFinalTotal(),
        coupon_code: couponValid ? appliedCoupon.code : null,
        coupon_discount: couponValid ? appliedCoupon.discount : null,
        coupon_type: couponValid ? appliedCoupon.type : null,
        discount_amount: couponValid ? getDiscountAmount() : 0,
        fcm_token: fcmToken,
      };

      const response = await axios.post(`${API_BASE_URL}/api/ordersubmit`, payload);
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
    const hasEmail = email?.trim();
    const hasAddress = address?.trim();
    const hasCoordinates = latlong?.driver_lat && latlong?.driver_long;

    if (user?.usertype === 'Guest') {
      if (hasEmail && hasAddress) {
        completeOrder();
      } else {
        // ✅ FLUJO CONSOLIDADO: Navegar directamente a AddressFormUberStyle con email integrado
        navigation.navigate('AddressFormUberStyle', {
          title: 'Datos de Entrega',
          fromGuestCheckout: true,
          returnToCart: true,
          totalPrice,
          itemCount: cart.reduce((total, item) => total + item.quantity, 0),
          preservedDeliveryInfo: deliveryInfo ? { ...deliveryInfo, date: deliveryInfo.date.toISOString() } : null,
          preservedNeedInvoice: needInvoice,
          preservedTaxDetails: taxDetails,
          preservedCoordinates: latlong,
          currentEmail: email,
          currentAddress: address,
        });
      }
    } else {
      if (!hasAddress) {
        setShowAddressModal(true);
      } else if (hasCoordinates) {
        completeOrder();
      } else {
        navigation.navigate('MapSelector', {
          userAddress: userProfile.address,
          title: 'Confirmar ubicación para entrega',
        });
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
      
      {/* Header del carrito */}
      <View style={styles.header}>
        <Ionicons name="cart" size={24} color="#D27F27" />
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        {cart.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{cart.reduce((t, i) => t + i.quantity, 0)}</Text>
          </View>
        )}
      </View>

      {cart.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 800);
          }}
          contentContainerStyle={styles.emptyCartScrollContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCartContainer}>
              <View style={styles.emptyCartIconContainer}>
                <Ionicons name="cart-outline" size={80} color="#DDD" />
              </View>
              <Text style={styles.emptyCartTitle}>Tu carrito está vacío</Text>
              <Text style={styles.emptyCartText}>
                Descubre nuestros productos artesanales y agrégalos aquí
              </Text>
              <TouchableOpacity
                style={styles.shopNowButton}
                onPress={() => navigation.navigate('MainTabs', {
                  screen: 'Inicio',
                  params: { screen: 'CategoriesList' }
                })}
                activeOpacity={0.8}>
                <Ionicons name="storefront-outline" size={20} color="#FFF" style={{marginRight: 8}} />
                <Text style={styles.shopNowButtonText}>Explorar Productos</Text>
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
                subtotalForCoupons={getSubtotalForCoupons()} // 🔧 FIX BUG #3: Subtotal para validar cupones
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
          // 🔧 FIX: Usar InteractionManager para evitar error "useInsertionEffect must not schedule updates"
          // Este bug ocurre en React 19 + RN 0.79 cuando hay muchos items animados en FlatList
          InteractionManager.runAfterInteractions(() => {
            setDeliveryInfo({date, slot});
            setPickerVisible(false);

            // Scroll automático al final donde está el botón de pagar
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 300);
          });
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
  subtotalForCoupons, // 🔧 FIX BUG #3: Subtotal para validar cupones (sin descuentos promocionales)
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
  userAddresses,
}) => {
  return (
  <View>
    {/* Selector de horario */}
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>📅 Horario de Entrega</Text>

      {deliveryInfo ? (
        <View style={styles.deliveryScheduledContainer}>
          <View style={styles.deliveryScheduledHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#33A744" />
            <Text style={styles.deliverySummaryTitle}>Entrega programada</Text>
          </View>
          <Text style={styles.deliveryTime}>
            {deliveryInfo.date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={styles.deliveryTimeSlot}>Horario: {deliveryInfo.slot}</Text>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            style={styles.changeAddressButton}>
            <Ionicons name="calendar-outline" size={14} color="#8B5E3C" />
            <Text style={styles.changeAddressButtonText}>Cambiar horario</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={styles.deliveryButton}>
          <Ionicons name="calendar-outline" size={20} color="#D27F27" />
          <Text style={styles.deliveryButtonText}>Seleccionar Horario</Text>
        </TouchableOpacity>
      )}
    </View>

    {/* Ubicación para guests */}
    {user && user.usertype === 'Guest' && (email || address) && (
      <View style={styles.sectionContainer}>
        <View style={styles.locationHeaderRow}>
          <Text style={styles.sectionTitle}>📍 Ubicación de entrega</Text>
          <TouchableOpacity
            style={styles.changeAddressButton}
            onPress={() => {
              const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
              navigation.navigate('AddressFormUberStyle', {
                title: 'Cambiar Dirección',
                fromGuestCheckout: true,
                returnToCart: true,
                totalPrice: totalPrice,
                itemCount: itemCount,
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

        {email && (
          <View style={styles.locationEmailRow}>
            <Ionicons name="mail" size={16} color="#D27F27" style={{marginRight: 8, marginTop: 2}} />
            <Text style={[styles.userAddressText, {marginBottom: 0, flex: 1, color: '#2F2F2F'}]}>
              {email}
            </Text>
          </View>
        )}

        {address && (
          <View style={[styles.locationAddressRow, {marginTop: email ? 10 : 0}]}>
            <Ionicons name="checkmark-circle" size={18} color="#33A744" style={{marginRight: 8, marginTop: 2}} />
            <Text style={[styles.userAddressText, {marginBottom: 0, flex: 1}]}>
              {address}
            </Text>
          </View>
        )}
      </View>
    )}

    {/* Ubicación para usuarios registrados */}
    {user && user.usertype !== 'Guest' && deliveryInfo && address && (
      <View style={styles.sectionContainer}>
        <View style={styles.locationHeaderRow}>
          <Text style={styles.sectionTitle}>📍 Ubicación de entrega</Text>
          {userAddresses.length > 1 && (
            <TouchableOpacity
              style={styles.changeAddressButton}
              onPress={() => {
                setIsChangingAddress(true);
                setShowAddressModal(true);
              }}>
              <Ionicons name="swap-horizontal" size={16} color="#8B5E3C" />
              <Text style={styles.changeAddressButtonText}>Cambiar</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.locationAddressRow}>
          <Ionicons name="checkmark-circle" size={18} color="#33A744" style={{marginRight: 8, marginTop: 2}} />
          <Text style={[styles.userAddressText, {marginBottom: 0, flex: 1}]}>
            {temporaryAddress?.address || address}
          </Text>
        </View>
      </View>
    )}

    {/* Cupón de descuento */}
    <CouponInput
      onCouponApply={onCouponApply}
      onCouponRemove={onCouponRemove}
      appliedCoupon={appliedCoupon}
      subtotal={subtotalForCoupons}
      shippingCost={shippingCost}
      isValid={!appliedCoupon || subtotalForCoupons >= appliedCoupon.minAmount}
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

    {/* Facturación y Pago - Solo si hay deliveryInfo */}
    {deliveryInfo && (
      <View style={styles.checkoutContainer}>
        {/* Facturación */}
        <View style={styles.invoiceRowContainer}>
          <View style={styles.invoiceLabelContainer}>
            <Ionicons name="document-text-outline" size={18} color="#666" style={{marginRight: 8}} />
            <Text style={styles.invoiceLabel}>¿Necesitas factura?</Text>
          </View>
          <Switch
            value={needInvoice}
            onValueChange={setNeedInvoice}
            trackColor={{false: '#ccc', true: '#D27F27'}}
            thumbColor={needInvoice ? '#FFF' : '#f4f3f4'}
          />
        </View>

        {needInvoice && (
          <TextInput
            style={[styles.input, {marginTop: 12, marginBottom: 0}]}
            placeholder="RFC (ej: ABCD123456EF7)"
            placeholderTextColor="rgba(47,47,47,0.6)"
            value={taxDetails || ''}
            onChangeText={(text) => {
              const cleanText = text.replace(/\s/g, '').toUpperCase();
              const limitedText = cleanText.slice(0, 13);
              const validText = limitedText.replace(/[^A-Z0-9]/g, '');
              setTaxDetails(validText);
            }}
            maxLength={13}
            autoCapitalize="characters"
          />
        )}

        {/* Separador */}
        <View style={{height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 16}} />

        {/* Total y Botón de Pagar */}
        <Text style={styles.totalText}>
          Total a pagar: {formatPriceWithSymbol(finalTotal)}
        </Text>
        <TouchableOpacity
          style={[styles.checkoutButton, (!deliveryInfo || isRestoringDeliveryInfo || loading) && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={!deliveryInfo || isRestoringDeliveryInfo || loading}
          activeOpacity={0.8}>
          <Ionicons
            name={loading ? "sync" : isRestoringDeliveryInfo ? "hourglass" : "card"}
            size={20}
            color="#FFF"
          />
          <Text style={styles.checkoutText}>
            {loading ? 'Procesando pago...' :
             isRestoringDeliveryInfo ? 'Cargando...' :
             'Proceder al Pago'}
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
  );
};