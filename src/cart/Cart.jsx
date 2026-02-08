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
    };

    if (setCartClearCallback) {
      setCartClearCallback(clearCartRelatedData);
    }
  }, [setCartClearCallback]);

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

    // Limpiar datos
    clearCart();
    setDeliveryInfo(null);
    setAppliedCoupon(null); // 🆕 Limpiar cupón aplicado

    if (user?.usertype !== 'Guest') {
      setLatlong(null);
    }

    if (user?.id) {
      clearSavedDeliveryInfo(user.id);
      clearSavedCoordinates(user.id);
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

  // Flujo único y robusto de pago
  const completeOrder = async () => {
    if (loading) return;

    // VALIDACIONES CRÍTICAS ANTES DE ABRIR PASARELA

    // 1. Validar que el carrito tenga productos (NO validar monto aquí)
    if (cart.length === 0) {
      showAlert({
        type: 'error',
        title: 'Carrito vacío',
        message: 'No hay productos en el carrito.',
        confirmText: 'Cerrar',
      });
      return;
    }

    // 1.1 Validar monto mínimo para Stripe (10 MXN)
    // Si el total es menor, se procesará como orden gratuita más adelante
    const STRIPE_MINIMUM_MXN = 10;
    const finalTotal = getFinalTotal();
    const isGratisOrder = finalTotal < STRIPE_MINIMUM_MXN;
    
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

      if (!latlong?.driver_lat || !latlong?.driver_long) {
        // PASO 1: Intentar restaurar coordenadas guardadas
        let restoredCoords = null;
        if (user?.id) {
          restoredCoords = await restoreCoordinates(user.id);
          if (restoredCoords && restoredCoords.driver_lat && restoredCoords.driver_long) {
            // Las coordenadas ya se establecieron en el estado por restoreCoordinates()
            // Continuar con el flujo de pago
          }
        }
        
        // PASO 2: Si no hay coordenadas restauradas, aplicar geocoding inteligente
        if (!restoredCoords || !restoredCoords.driver_lat || !restoredCoords.driver_long) {
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
                    setLatlong({
                      driver_lat: '19.4326',
                      driver_long: '-99.1332',
                    });
                    setTimeout(() => completeOrder(), 100);
                  }
                });
                return;
              }
            } catch (error) {
              setLatlong({
                driver_lat: '19.4326',
                driver_long: '-99.1332',
              });
            }
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
          await axios.post(`${API_BASE_URL}/api/orders/mark-as-free`, {
            order_id: realOrderId,
            reason: 'Cupón 100% descuento'
          });
        } catch (freeOrderError) {
          // Si falla el endpoint, intentar continuar de todas formas
          console.log('⚠️ Error marcando orden gratuita:', freeOrderError.message);
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

  // Envía la orden al backend y maneja fallos
  const completeOrderFunc = async () => {
    try {
      // Obtener FCM token para notificaciones
      let fcmToken = null;
      try {
        fcmToken = NotificationService.token || await NotificationService.getToken();
      } catch (error) {
        // Error obteniendo FCM token - continuar sin él
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

      const payload = {
        userid: user?.id,
        orderno: '1',
        user_email: userEmailForOrder,
        orderdetails: cartUpdateArr,
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
        coupon_code: appliedCoupon && isCouponStillValid() ? appliedCoupon.code : null,
        coupon_discount: appliedCoupon && isCouponStillValid() ? appliedCoupon.discount : null,
        coupon_type: appliedCoupon && isCouponStillValid() ? appliedCoupon.type : null,
        discount_amount: appliedCoupon && isCouponStillValid() ? getDiscountAmount() : 0,
        fcm_token: fcmToken || null,
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
      // Usuario registrado: verificar si tiene dirección del sistema nuevo
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
    {/* 🔧 FIX BUG #3: Usar subtotalForCoupons para validar cupones correctamente */}
    <CouponInput
      onCouponApply={onCouponApply}
      onCouponRemove={onCouponRemove}
      appliedCoupon={appliedCoupon}
      subtotal={subtotalForCoupons} // Subtotal SIN descuentos promocionales
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
  </View>
  );
};