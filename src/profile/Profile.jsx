// src/authentication/Profile.jsx
import React, { useEffect, useState, useContext, useCallback, Fragment, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { OrderContext } from '../context/OrderContext';
import { useAlert } from '../context/AlertContext';
import { useProfile } from '../context/ProfileContext';
import fonts from '../theme/fonts';
import { useAutoUpdate } from '../hooks/useAutoUpdate';
import packageJson from '../../package.json';
import RegisterPrompt from './RegisterPrompt';
import NotificationService from '../services/NotificationService';
import {formatOrderId} from '../utils/orderIdFormatter';
import { newAddressService } from '../services/newAddressService';
// Importar sistema de estilos global
import { 
  colors,
  containers, 
  buttons, 
  buttonText, 
  inputs, 
  inputLabels, 
  inputContainers,
  customPickers,
  dropdowns,
  typography,
  shadows 
} from '../theme/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';
import SMSVerification from '../components/SMSVerification';
import { useFocusEffect } from '@react-navigation/native';
import { useOtpStatus } from '../hooks/useOtpStatus';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { API_BASE_URL } from '../config/environment';

// Helper function para parsear fechas en múltiples formatos
const parseFlexibleDate = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    let parsedDate = null;
    
    if (typeof dateValue === 'string') {
      // Formato 1: ISO date (YYYY-MM-DD)
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        parsedDate = new Date(dateValue);
      }
      // Formato 2: "Month YYYY" como "June 1993" o "diciembre de 1976"
      else if (dateValue.match(/^[A-Za-zñáéíóú]+ (de )?\d{4}$/)) {
        // Remover "de" si existe y dividir
        const cleanDate = dateValue.replace(' de ', ' ');
        const [monthName, year] = cleanDate.split(' ');
        
        // Meses en inglés
        const monthNamesEn = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Meses en español
        const monthNamesEs = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        
        // Buscar en inglés primero
        let monthIndex = monthNamesEn.indexOf(monthName);
        
        // Si no se encuentra en inglés, buscar en español (case insensitive)
        if (monthIndex === -1) {
          monthIndex = monthNamesEs.indexOf(monthName.toLowerCase());
        }
        
        if (monthIndex !== -1) {
          parsedDate = new Date(parseInt(year), monthIndex, 1);
        }
      }
      // Formato 3: Intentar parsing directo
      else {
        parsedDate = new Date(dateValue);
      }
    } else {
      parsedDate = new Date(dateValue);
    }
    
    // Verificar que la fecha sea válida y normalizar al día 1
    if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900) {
      // Siempre normalizar al día 1 del mes
      return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
    }
  } catch (error) {
    // Error parsing date
  }
  
  return null;
};

// Helper function para formatear teléfono mexicano visualmente
const formatMexicanPhone = (phone) => {
  if (!phone) return '';
  
  // Remover todo lo que no sean números
  const numbers = phone.replace(/\D/g, '');
  
  // Formatear según longitud
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)} ${numbers.slice(6)}`;
  } else {
    // Para números con lada (11+ dígitos)
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)} ${numbers.slice(6, 10)}`;
  }
};

// Helper function para obtener solo números (para backend)
const getPlainPhone = (phone) => {
  return phone ? phone.replace(/\D/g, '') : '';
};

export default function Profile({ navigation, route }) {
  const { user, logout, updateUser } = useContext(AuthContext);
  const { orders } = useContext(OrderContext);
  const { showAlert } = useAlert();
  const { updateProfile, refreshAddresses } = useProfile();
  const [loading, setLoading] = useState(false);
  
  // 🔧 Hook para manejo profesional del teclado (pantalla principal)
  const { 
    scrollViewRef: mainScrollRef, 
    registerInput: registerMainInput, 
    createFocusHandler: createMainFocusHandler 
  } = useKeyboardBehavior();
  
  // 🔧 Hook separado para el modal de soporte
  const { 
    scrollViewRef: modalScrollRef, 
    registerInput: registerModalInput, 
    createFocusHandler: createModalFocusHandler 
  } = useKeyboardBehavior();
  const [showSupportModal, setShowSupportModal] = useState(false);  
  const [supportLoading, setSupportLoading] = useState(false);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [formattedOrders, setFormattedOrders] = useState([]);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showOAuthDeleteConfirm, setShowOAuthDeleteConfirm] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showFounderTooltip, setShowFounderTooltip] = useState(false);
  const formikRef = useRef(null);

  // Hook para actualizaciones automáticas
  const { hasUpdate, isCriticalUpdate, manualCheck, isChecking } = useAutoUpdate({
    checkOnMount: false,
    showModalAutomatically: true
  });

  // Referencias para long press timer (más estable que animaciones)
  const longPressTimer = useRef(null);
  
  // Estados para secciones colapsables
  const [showProfileSection, setShowProfileSection] = useState(false); // Colapsada por defecto
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // ✅ Cerrar todos los acordeones cuando la pantalla no esté en foco
  useFocusEffect(
    useCallback(() => {
      // Función que se ejecuta cuando la pantalla pierde el foco
      return () => {
        setShowProfileSection(false);
        setShowPasswordSection(false);
        // Limpiar timer si existe
        if (longPressTimer.current) {
          clearInterval(longPressTimer.current);
          setIsLongPressing(false);
          setLongPressProgress(0);
        }
      };
    }, [])
  );

  // ✅ FUNCIÓN: Detectar si es usuario registrado VÍA OAuth (Google/Apple)
  const isOAuthUser = () => {
    return profile.provider === 'google' || profile.provider === 'apple';
  };

  // ✅ FUNCIÓN: Obtener nombre del proveedor OAuth
  const getProviderName = () => {
    if (profile.provider === 'google') return 'Google';
    if (profile.provider === 'apple') return 'Apple ID';
    return 'Local';
  };

  // ✅ FUNCIÓN: Comportamiento tipo acordeón - solo una sección abierta a la vez
  const toggleSection = (sectionName) => {
    // Bloquear sección de contraseña para usuarios OAuth
    if (sectionName === 'password' && isOAuthUser()) {
      showAlert({
        type: 'info',
        title: `Cuenta de ${getProviderName()}`,
        message: `Tu cuenta está vinculada con ${getProviderName()}. La contraseña se gestiona directamente en tu cuenta de ${getProviderName()}.`,
        confirmText: 'Entendido'
      });
      return;
    }
    switch (sectionName) {
      case 'profile':
        if (showProfileSection) {
          // Si ya está abierta, cerrarla
          setShowProfileSection(false);
        } else {
          // Cerrar todas las demás y abrir esta
          setShowPasswordSection(false);
          setShowProfileSection(true);
        }
        break;
      case 'password':
        if (showPasswordSection) {
          setShowPasswordSection(false);
        } else {
          setShowProfileSection(false);
          setShowPasswordSection(true);
        }
        break;
      default:
        break;
    }
  };
  
  // Estado para modo edición
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: null,
    provider: 'local', // default to local
  });
  
  // Estado para el teléfono formateado visualmente
  const [formattedPhone, setFormattedPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [lastVerifiedPhone, setLastVerifiedPhone] = useState(''); // Track último teléfono verificado

  // 🔐 Hook para verificar si OTP/SMS está habilitado
  const { otpEnabled } = useOtpStatus();

  // Estado para direcciones del usuario (para validación)
  const [userAddresses, setUserAddresses] = useState([]);

  // Función para obtener el label de la orden seleccionada
  const getSelectedOrderLabel = useCallback((orderno) => {
    if (!orderno) return formattedOrders.length === 0 ? 'Aún no tienes órdenes' : 'Seleccionar orden...';
    const found = formattedOrders.find(order => order.value === orderno);
    return found ? found.label : 'Orden seleccionada';
  }, [formattedOrders]);

  // Formatear órdenes cuando cambien
  useEffect(() => {
    const sortedOrders = getSortedOrders();
    const formatted = sortedOrders.map(order => formatOrderDisplay(order));
    setFormattedOrders(formatted);
  }, [orders, getSortedOrders, formatOrderDisplay]);

  // Función para cargar direcciones del usuario
  const fetchUserAddresses = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const addresses = await newAddressService.getUserAddresses(user.id);
      setUserAddresses(addresses || []);
    } catch (error) {
      setUserAddresses([]);
    }
  }, [user?.id]);

  const fetchUserDetails = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Cargar datos del perfil
      const res = await axios.get(
        `${API_BASE_URL}/api/userdetails/${user.id}`
      );
      const data = res.data?.data?.[0] || {};
      
      const dateValue = data.birthDate || data.birth_date || data.dob;
      const birthDate = parseFlexibleDate(dateValue);
      
      const profileData = {
        first_name: data.first_name || '',
        last_name:  data.last_name  || '',
        email:      data.email      || user.email || '',
        phone:      data.phone      || '',
        address:    data.address    || '',
        birthDate:  birthDate,
        promotion_id: data.promotion_id,
        promotional_discount: data.promotional_discount,
        provider: data.provider || 'local',
      };
      
      setProfile(profileData);
      setFormattedPhone(formatMexicanPhone(profileData.phone));
      
      // También cargar direcciones para la validación
      await fetchUserAddresses();
      
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchUserAddresses]);

  useEffect(() => {
    if (user?.id) fetchUserDetails();
  }, [user?.id, fetchUserDetails]);
  
  // Refrescar datos cuando la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchUserDetails();
        refreshAddresses();
      }
    }, [user?.id, fetchUserDetails, refreshAddresses])
  );

  // Inicializar teléfono verificado cuando profile.phone cambia
  useEffect(() => {
    if (profile.phone) {
      setLastVerifiedPhone(getPlainPhone(profile.phone));
    }
  }, [profile.phone]);
  
  // 🔧 ELIMINADO: Legacy address handling - ahora usamos newAddressService + AddressManager
  // Este useEffect causaba interferencias con datos del perfil (DOB corruption)

  // Función para verificar datos faltantes
  const getMissingData = useCallback(() => {
    const missing = [];

    if (!profile.phone || profile.phone.trim() === '') {
      // ✅ PUNTO 15: Mensaje personalizado para Apple sin correo
      const isAppleWithoutEmail = profile.provider === 'apple' &&
        profile.email && profile.email.includes('@interno.app');

      const phoneReason = isAppleWithoutEmail
        ? 'si quieres recibir notificaciones, compártenos tu celular'
        : 'para recibir notificaciones de tu pedido';

      missing.push({ field: 'phone', label: 'Teléfono', reason: phoneReason });
    }
    
    // Validar direcciones usando el nuevo sistema
    if (!userAddresses || userAddresses.length === 0) {
      missing.push({ field: 'address', label: 'Dirección de entrega', reason: 'para recibir tus pedidos' });
    }
    
    // Verificar fecha de cumpleaños (debe existir y ser una fecha válida)
    if (!profile.birthDate || 
        !(profile.birthDate instanceof Date) || 
        isNaN(profile.birthDate.getTime()) ||
        profile.birthDate.getFullYear() < 1900) {
      missing.push({ field: 'birthDate', label: 'Fecha de cumpleaños', reason: 'para beneficios especiales en tu día' });
    }
    
    return missing;
  }, [profile, userAddresses]);

  const missingData = getMissingData();

  // Función para mostrar toast de éxito (similar a ProductDetails)
  // ✅ FUNCIÓN: Manejar eliminación de cuenta
  const handleDeleteAccount = async (password) => {
    try {
      setLoading(true);

      let response;

      // Usar el endpoint API recién creado
      response = await axios.post(
        `${API_BASE_URL}/api/deleteuser`,
        {
          userid: user.id,
          password: password
        }
      );

      if (response.status === 200 || response.status === 201) {
        showAlert({
          type: 'success',
          title: 'Cuenta eliminada',
          message: 'Tu cuenta ha sido eliminada exitosamente. Lamentamos verte partir.',
          confirmText: 'Entendido',
          onConfirm: () => {
            logout();
          }
        });
      }
    } catch (error) {
      const errorData = error.response?.data;

      if (error.response?.status === 401) {
        showAlert({
          type: 'error',
          title: 'Contraseña incorrecta',
          message: errorData?.message || 'La contraseña ingresada no es correcta.',
          confirmText: 'Cerrar'
        });
      } else if (error.response?.status === 404) {
        showAlert({
          type: 'error',
          title: 'Usuario no encontrado',
          message: errorData?.message || 'No se encontró la cuenta de usuario.',
          confirmText: 'Cerrar'
        });
      } else if (error.response?.status === 422) {
        showAlert({
          type: 'error',
          title: 'Datos inválidos',
          message: errorData?.message || 'Los datos proporcionados no son válidos.',
          confirmText: 'Cerrar'
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: errorData?.message || 'No se pudo eliminar la cuenta. Intenta de nuevo más tarde.',
          confirmText: 'Cerrar'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN: Manejo de long press MEJORADO (iOS estable)
  const handleLongPressStart = () => {
    setIsLongPressing(true);
    setLongPressProgress(0);

    // Sistema de timer simple (más estable que animaciones)
    const totalDuration = 3000; // 3 segundos
    const updateInterval = 50; // Actualizar cada 50ms
    const increment = (updateInterval / totalDuration) * 100;

    longPressTimer.current = setInterval(() => {
      setLongPressProgress(prevProgress => {
        const newProgress = prevProgress + increment;

        if (newProgress >= 100) {
          clearInterval(longPressTimer.current);
          handleLongPressComplete();
          return 100;
        }

        return newProgress;
      });
    }, updateInterval);
  };

  const handleLongPressEnd = () => {
    if (isLongPressing && longPressTimer.current) {
      // Cancelar timer y resetear
      clearInterval(longPressTimer.current);
      longPressTimer.current = null;
      setIsLongPressing(false);
      setLongPressProgress(0);
    }
  };

  const handleLongPressComplete = () => {
    setIsLongPressing(false);
    setLongPressProgress(0);

    // Cerrar modal OAuth primero para evitar conflictos
    setShowOAuthDeleteConfirm(false);

    // Delay más largo para iOS + limpiar cualquier timer restante
    if (longPressTimer.current) {
      clearInterval(longPressTimer.current);
      longPressTimer.current = null;
    }

    setTimeout(() => {
      showAlert({
        type: 'warning',
        title: '⚠️ Confirmación Final',
        message: `Para eliminar tu cuenta de ${getProviderName()}, necesitas volver a autenticarte por seguridad.`,
        showCancel: true,
        confirmText: 'Re-autenticar',
        onConfirm: handleReAuthentication
      });
    }, 300); // Delay más largo para iOS
  };

  // ✅ FUNCIÓN: Re-autenticación OAuth REAL
  const handleReAuthentication = async () => {
    try {
      setLoading(true);

      let reAuthSuccess = false;

      // Re-autenticar según el proveedor
      if (profile.provider === 'google') {
        reAuthSuccess = await handleGoogleReAuth();
      } else if (profile.provider === 'apple') {
        reAuthSuccess = await handleAppleReAuth();
      }

      if (reAuthSuccess) {
        showAlert({
          type: 'success',
          title: 'Identidad verificada',
          message: 'Re-autenticación exitosa. Procediendo con la eliminación de cuenta...',
          confirmText: 'Continuar',
          onConfirm: handleOAuthDeleteAccount
        });
      } else {
        // FALLBACK: Ofercer confirmación alternativa
        showAlert({
          type: 'warning',
          title: 'Re-autenticación no disponible',
          message: `No se pudo verificar con ${getProviderName()}. ¿Confirmas que quieres eliminar tu cuenta? Esta acción no se puede deshacer.`,
          showCancel: true,
          confirmText: 'Sí, eliminar cuenta',
          cancelText: 'Cancelar',
          onConfirm: handleOAuthDeleteAccount,
          onCancel: () => {
            // Usuario decidió cancelar
          }
        });
      }

    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error de autenticación',
        message: 'Ocurrió un error durante la verificación. La cuenta no fue eliminada.',
        confirmText: 'Cerrar'
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN: Re-autenticación Google SEGURA
  const handleGoogleReAuth = async () => {
    try {
      const hasPlayServices = await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
      if (!hasPlayServices) return false;

      let currentUser = null;
      try {
        currentUser = await GoogleSignin.getCurrentUser();
      } catch (getUserError) {
        // No hay usuario actual
      }

      if (currentUser && currentUser.user?.email === profile.email) {
        return true;
      }

      try {
        if (currentUser) {
          await GoogleSignin.signOut();
        }
      } catch (signOutError) {
        // Ignorar error de logout
      }

      const result = await GoogleSignin.signIn();
      return result?.user?.email === profile.email;

    } catch (error) {
      return false;
    }
  };

  // Re-autenticación Apple
  const handleAppleReAuth = async () => {
    try {
      if (Platform.OS !== 'ios' || !appleAuth.isSupported) {
        return false;
      }

      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!appleAuthRequestResponse || !appleAuthRequestResponse.user) {
        return false;
      }

      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user
      );

      return credentialState === appleAuth.State.AUTHORIZED;

    } catch (error) {
      return false;
    }
  };

  // ✅ FUNCIÓN: Eliminar cuenta OAuth (después de re-auth)
  const handleOAuthDeleteAccount = async () => {
    try {
      setLoading(true);

      // Usar el mismo endpoint pero diferente payload para OAuth
      const response = await axios.post(
        `${API_BASE_URL}/api/deleteuser`,
        {
          userid: user.id,
          provider: profile.provider, // Indicar que es OAuth (google/apple)
          // NO enviar password para usuarios OAuth
        }
      );

      if (response.status === 200 || response.status === 201) {
        showAlert({
          type: 'success',
          title: 'Cuenta eliminada',
          message: `Tu cuenta de ${getProviderName()} ha sido eliminada exitosamente.`,
          confirmText: 'Entendido',
          onConfirm: () => {
            logout();
          }
        });
      }
    } catch (error) {
      const errorData = error.response?.data;
      showAlert({
        type: 'error',
        title: 'Error',
        message: errorData?.message || 'No se pudo eliminar la cuenta. Intenta de nuevo más tarde.',
        confirmText: 'Cerrar'
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN: Manejar "Olvidé mi contraseña"
  const handleForgotPassword = async () => {
    try {
      // Validar que el email esté presente y sea válido
      if (!profile.email || !profile.email.trim()) {
        showAlert({
          type: 'error',
          title: 'Email requerido',
          message: 'No se puede enviar el enlace de restablecimiento porque no tienes un email registrado.',
          confirmText: 'Entendido'
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.email.trim())) {
        showAlert({
          type: 'error',
          title: 'Email inválido',
          message: 'El formato del email no es válido.',
          confirmText: 'Entendido'
        });
        return;
      }

      setLoading(true);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/forgetpasswordlink`,
        { email: profile.email.trim() }
      );

      if (response.status === 200) {
        showAlert({
          type: 'success',
          title: 'Enlace enviado',
          message: `Hemos enviado un enlace de restablecimiento de contraseña a ${profile.email}. Revisa tu bandeja de entrada y correo no deseado.`,
          confirmText: 'Perfecto'
        });
      }
    } catch (error) {
      if (error.response?.status === 404) {
        showAlert({
          type: 'error',
          title: 'Email no encontrado',
          message: 'No se encontró una cuenta con este email.',
          confirmText: 'Cerrar'
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'No se pudo enviar el enlace. Intenta de nuevo más tarde.',
          confirmText: 'Cerrar'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const ProfileSchema = Yup.object().shape({
    first_name: Yup.string().required('Nombre es obligatorio'),
    last_name:  Yup.string().required('Apellido es obligatorio'),
    phone:      Yup.string()
      .matches(/^[0-9+\s()-]+$/, 'Teléfono inválido (solo números, espacios, + y paréntesis)')
      .required('Teléfono es obligatorio'),
    birthDate:  Yup.date().nullable(), // opcional
  });

  const PasswordSchema = Yup.object().shape({
    current_password:      Yup.string().required('Requerido'),
    password:              Yup.string()
                            .min(6, 'Mínimo 6 caracteres')
                            .required('Obligatorio'),
    password_confirmation: Yup.string()
      .oneOf([Yup.ref('password')], 'No coincide')
      .required('Obligatorio'),
  });

  const SupportSchema = Yup.object().shape({
    orderno: Yup.string(), // opcional
    message: Yup.string().required('El mensaje es obligatorio'),
  });

  // Función para получить las órdenes ordenadas
  const getSortedOrders = useCallback(() => {
    if (orders && orders.length > 0) {
      
      // Ordenar por fecha de creación (más reciente primero)
      return [...orders].sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0);
        const dateB = new Date(b.created_at || b.date || 0);
        return dateB - dateA;
      });
    }
    return [];
  }, [orders]);

  // Función para formatear la orden para mostrar
  const formatOrderDisplay = useCallback((order) => {
    if (!order) return { value: '', label: 'Orden no válida' };
    
    // Obtener ID con múltiples fallbacks
    const orderId = order.id || order.order_id || order.orderId || 'N/A';
    
    // Formatear fecha con fallbacks
    const date = order.created_at || order.date || order.createdAt;
    let formattedDate = '';
    if (date) {
      try {
        formattedDate = new Date(date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (e) {
        // Error formateando fecha
      }
    }
    
    // Obtener total con múltiples fallbacks
    const total = order.total_price || order.total || order.amount || order.totalPrice;
    
    // Estado
    const status = order.status || order.state || '';
    
    // Usar order_number del backend o generar con fecha
    const formattedOrderId = order.order_number || formatOrderId(date);
    
    // Construir texto display con el nuevo formato
    let displayText = `Pedido ${formattedOrderId}`;
    if (formattedDate) displayText += ` - ${formattedDate}`;
    if (total && !isNaN(parseFloat(total))) {
      displayText += ` - $${parseFloat(total).toFixed(2)}`;
    }
    if (status) displayText += ` - ${status}`;
    
    
    return {
      value: orderId.toString(), // ✅ IMPORTANTE: Seguimos enviando el ID real (162) a la API
      label: displayText.trim()   // ✅ Solo mostramos el formato bonito (250731-100830)
    };
  }, []);

  const handleSupportSubmit = async (values, { setSubmitting, resetForm }) => {
    setSupportLoading(true);
    try {
      // ✅ MEJORADO: Enviar información completa del remitente al backend
      const payload = {
        orderno: values.orderno || '',
        message: values.message,
        // Información del remitente (cliente)
        sender_type: 'customer',
        sender_id: user?.id || null,
        sender_name: user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`
          : null,
        sender_email: user?.email || null,
        sender_phone: user?.phone || null,
        category: 'consulta', // Por defecto es consulta
        priority: 'media',    // Por defecto prioridad media
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/compsubmit`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.status === 201) {
        showAlert({
          type: 'success',
          title: '¡Enviado!',
          message: 'Tu mensaje fue enviado con éxito',
          confirmText: 'OK',
        });
        resetForm();
        setShowSupportModal(false);
        setShowOrderPicker(false);
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo enviar tu mensaje. Inténtalo de nuevo',
        confirmText: 'Cerrar',
      });
    } finally {
      setSupportLoading(false);
      setSubmitting(false);
    }
  };

  // Efecto para reiniciar el dropdown cuando se abra/cierre el modal
  useEffect(() => {
    if (!showSupportModal) {
      setShowOrderPicker(false);
    }
  }, [showSupportModal]);

  // Early return checks after all hooks
  if (!user) {
    return null;
  }

  // Check if user is Guest - return RegisterPrompt with stable key
  if (user?.usertype === 'Guest') {
    return (
      <Fragment key="guest-wrapper">
        <RegisterPrompt />
      </Fragment>
    );
  }

  return (
    <Fragment key={`profile-wrapper-${user?.id || 'registered'}`}>
      <ScrollView 
        ref={mainScrollRef}
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.userProfileContainer}>
          {/* Círculo con iniciales */}
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText}>
              {`${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()}
            </Text>
          </View>
          
          {/* Banderín Usuario Fundador */}
          {(profile?.promotion_id === "5" || profile?.promotion_id === 5) && (
            <TouchableOpacity 
              style={styles.founderBadge}
              onPress={() => setShowFounderTooltip(true)}
              activeOpacity={0.8}>
              <Text style={styles.founderBadgeIcon}>👑</Text>
            </TouchableOpacity>
          )}
          
          {/* Información del usuario */}
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>
                {profile.first_name} {profile.last_name}
              </Text>
              {/* ✅ DRIVER FIX: Badge de Driver */}
              {user?.usertype === 'driver' && (
                <View style={styles.driverBadge}>
                  <Text style={styles.driverBadgeText}>Driver</Text>
                </View>
              )}
            </View>
            <Text style={styles.email}>{profile.email}</Text>
            
            {/* Indicador de estado */}
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Activo</Text>
            </View>

            {/* Botón de Actualizaciones - Solo Android y cuando hay updates */}
            {Platform.OS === 'android' && hasUpdate && (
              <TouchableOpacity
                style={[
                  styles.updateButtonSubtle,
                  isCriticalUpdate && styles.updateButtonCritical
                ]}
                onPress={manualCheck}
                disabled={isChecking}
                activeOpacity={0.7}>
                <View style={styles.updateButtonContent}>
                  <Text style={styles.updateButtonIcon}>
                    {isCriticalUpdate ? '⚠️' : '🆕'}
                  </Text>
                  <Text style={[
                    styles.updateButtonTextSubtle,
                    isCriticalUpdate && styles.updateButtonTextCritical
                  ]}>
                    {isChecking ? 'Verificando...' :
                     isCriticalUpdate ? 'Actualización importante' : 'Actualización disponible'}
                  </Text>
                  {!isChecking && (
                    <View style={[
                      styles.updatePulse,
                      isCriticalUpdate && styles.updatePulseCritical
                    ]} />
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Alerta sutil para datos faltantes */}
      {/* ✅ DRIVER FIX: Ocultar alerta 'completa tu perfil' para drivers */}
      {user?.usertype !== 'driver' && missingData.length > 0 && (
        <View style={styles.missingDataAlert}>
          <Text style={styles.missingDataTitle}>
            📝 Completa tu perfil ({missingData.length} campo{missingData.length !== 1 ? 's' : ''} pendiente{missingData.length !== 1 ? 's' : ''})
          </Text>
          {missingData.map((item, index) => (
            <Text key={item.field} style={styles.missingDataItem}>
              • {item.label} - {item.reason}
            </Text>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#33A744" style={styles.loading} />}

      {/* Acciones Rápidas */}
      <View style={styles.quickActions}>
        {/* ✅ DRIVER FIX: Ocultar Atención al Cliente para drivers */}
        {user?.usertype !== 'driver' && (
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => setShowSupportModal(true)}
            activeOpacity={0.8}>
            <Text style={styles.supportButtonText}>📞 Atención al Cliente</Text>
          </TouchableOpacity>
        )}

      </View>

      {/* Información del Perfil */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('profile')}
        activeOpacity={0.8}>
        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionHeaderTitle}>👤 Mi Información</Text>
          <Text style={styles.sectionHeaderIcon}>
            {showProfileSection ? '▲' : '▼'}
          </Text>
        </View>
        <Text style={styles.sectionHeaderSubtitle}>
          Actualiza tus datos personales
        </Text>
      </TouchableOpacity>

      {showProfileSection && (
        <Formik
        innerRef={formikRef}
        initialValues={{
          first_name: profile.first_name,
          last_name:  profile.last_name,
          phone:      formattedPhone, // Usar teléfono formateado para mostrar
          birthDate:  profile.birthDate || null, // Sin fecha inicial - mostrar placeholder
        }}
        enableReinitialize
        validationSchema={ProfileSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setLoading(true);
          try {
            // 🔒 VALIDACIÓN SMS: Verificar OTP si el teléfono cambió
            const currentPhonePlain = getPlainPhone(profile.phone || '');
            const newPhonePlain = getPlainPhone(values.phone || '');
            const phoneChanged = currentPhonePlain !== newPhonePlain;

            // 🔒 Solo requerir verificación si OTP está habilitado
            if (otpEnabled && phoneChanged && !phoneVerified) {
              setLoading(false);
              setSubmitting(false);
              showAlert({
                type: 'error',
                title: 'Verificación requerida',
                message: '❌ Debes verificar tu número de teléfono con el código SMS antes de guardarlo.',
                confirmText: 'Entendido',
              });
              return;
            }

            // DOB Logic: Solo establecer UNA VEZ, nunca actualizar
            // Verificar si el usuario YA tiene DOB establecido desde el backend
            let dobFormatted = null;
            const hasExistingBirthDate = profile.birthDate && !isNaN(profile.birthDate.getTime());
            const isUserTryingToChangeBirthDate = values.birthDate && (!profile.birthDate || values.birthDate.getTime() !== profile.birthDate.getTime());

            // Solo bloquear si el usuario TIENE fecha y está INTENTANDO cambiarla
            if (hasExistingBirthDate && isUserTryingToChangeBirthDate) {
              showAlert({
                type: 'info',
                title: 'Fecha de nacimiento',
                message: 'Tu fecha de nacimiento ya está establecida y no puede modificarse por seguridad.',
                confirmText: 'Entendido',
              });
              return; // Solo salir si está intentando cambiar la fecha existente
            }
            
            // Si el usuario está estableciendo una fecha por primera vez
            if (!hasExistingBirthDate && values.birthDate) {
              const opts = {month: 'long', year: 'numeric'};
              dobFormatted = values.birthDate.toLocaleDateString('es-ES', opts);
            }
            
            
            // 🔧 CRÍTICO: Obtener datos actuales del servidor ANTES de actualizar
            // para preservar campos que no estamos editando (como address)
            let currentServerData = {};
            try {
              const currentRes = await axios.get(
                `${API_BASE_URL}/api/userdetails/${user.id}`
              );
              currentServerData = currentRes.data?.data?.[0] || {};
            } catch (error) {
            }
            
            // SIEMPRE enviar todos los campos para evitar que el backend borre datos
            const payload = {
              userid:      user.id,
              first_name:  values.first_name,
              last_name:   values.last_name,
              phone:       getPlainPhone(values.phone), // Enviar solo números al backend
              email:       currentServerData.email || profile.email,        // Preservar email del servidor
              // 🔧 ELIMINADO: address legacy - ahora usamos newAddressService para direcciones múltiples
            };
            
            // 🔧 ARREGLADO: Lógica simplificada y no conflictiva para DOB
            if (dobFormatted) {
              // Usuario seleccionó nueva fecha
              payload.dob = dobFormatted;
            } else if (hasExistingBirthDate && profile.birthDate instanceof Date) {
              // 🔧 ARREGLADO: Preservar formato español como lo escribió el usuario
              const monthNamesSpanish = [
                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
              ];
              const monthName = monthNamesSpanish[profile.birthDate.getMonth()];
              const year = profile.birthDate.getFullYear();
              payload.dob = `${monthName} de ${year}`;
            } else if (currentServerData.dob && typeof currentServerData.dob === 'string') {
              // Solo preservar si es string válido (evitar corrupción)
              payload.dob = currentServerData.dob;
            }
            // Si no hay DOB válido, no enviamos el campo (backend mantendrá el existente)
            
            // 🔧 ELIMINADO: Endpoint duplicado /updatedob - causaba conflictos
            // Ahora enviamos DOB junto con otros datos en un solo request
            
            const res = await axios.post(
              `${API_BASE_URL}/api/updateuserprofile`,
              payload
            );
            if (res.status === 200) {
              // 🔧 SOLUCIÓN AL BUG: Actualizar estados en orden correcto
              const updatedProfile = { 
                ...profile, 
                first_name: values.first_name,
                last_name: values.last_name,
                phone: getPlainPhone(values.phone),
                birthDate: values.birthDate
              };
              
              // 1. Actualizar ProfileContext primero (evita conflicto con fetchUserDetails)
              await updateProfile(updatedProfile);
              
              // 2. Actualizar estado local
              setProfile(updatedProfile);
              setFormattedPhone(formatMexicanPhone(getPlainPhone(values.phone)));
              
              // 3. Actualizar AuthContext al final (sin disparar re-fetch)
              await updateUser({
                first_name: values.first_name,
                last_name: values.last_name,
                phone: getPlainPhone(values.phone),
              });
              
              // Resetear estado de verificación tras guardado exitoso
              setPhoneVerified(false);
              setLastVerifiedPhone(getPlainPhone(values.phone));

              showAlert({
                type: 'success',
                title: '✅ ¡Datos personales actualizados!',
                message: 'Tu información personal se guardó correctamente.',
                confirmText: 'Perfecto',
                onConfirm: () => {
                  setIsEditingProfile(false);
                }
              });
            }
          } catch {
            showAlert({
              type: 'error',
              title: 'Error',
              message: 'No se pudo actualizar tu perfil.',
              confirmText: 'Cerrar',
            });
          } finally {
            setLoading(false);
            setSubmitting(false);
          }
        }}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          isSubmitting,
          submitCount,
          setFieldValue,
          setFieldTouched,
        }) => (
          <View style={styles.section}>
            {/* Botón Editar/Cancelar */}
            <View style={styles.editButtonContainer}>
              {!isEditingProfile ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditingProfile(true)}
                  activeOpacity={0.8}>
                  <Text style={styles.editButtonText}>✏️ Editar información</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => setIsEditingProfile(false)}
                  activeOpacity={0.8}>
                  <Text style={styles.cancelEditButtonText}>❌ Cancelar edición</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              ref={(ref) => registerMainInput('first_name', ref)}
              style={[
                // Use inputNoMargin base if there's an error to avoid double spacing
                (submitCount > 0 && errors.first_name) ? styles.inputNoMargin : styles.input,
                submitCount > 0 && errors.first_name && styles.inputErrorNoMargin,
                !isEditingProfile && styles.disabledInput
              ]}
              placeholder="Nombre"
              placeholderTextColor="rgba(47,47,47,0.6)"
              value={values.first_name}
              onChangeText={handleChange('first_name')}
              onFocus={isEditingProfile ? createMainFocusHandler('first_name') : undefined}
              editable={isEditingProfile}
              returnKeyType="next"
            />
            {submitCount > 0 && errors.first_name && (
              <Text style={styles.errorText}>{errors.first_name}</Text>
            )}

            <TextInput
              ref={(ref) => registerMainInput('last_name', ref)}
              style={[
                // Use inputNoMargin base if there's an error to avoid double spacing
                (submitCount > 0 && errors.last_name) ? styles.inputNoMargin : styles.input,
                submitCount > 0 && errors.last_name && styles.inputErrorNoMargin,
                !isEditingProfile && styles.disabledInput
              ]}
              placeholder="Apellido"
              placeholderTextColor="rgba(47,47,47,0.6)"
              value={values.last_name}
              onChangeText={handleChange('last_name')}
              onFocus={isEditingProfile ? createMainFocusHandler('last_name') : undefined}
              editable={isEditingProfile}
              returnKeyType="next"
            />
            {submitCount > 0 && errors.last_name && (
              <Text style={styles.errorText}>{errors.last_name}</Text>
            )}

            {/* ✅ PUNTO 16: Para usuarios Apple que no compartieron email, mostrar solo "Apple ID" */}
            {profile.provider === 'apple' && profile.email && profile.email.includes('@interno.app') ? (
              <View style={[styles.input, styles.disabledInput, { justifyContent: 'center' }]}>
                <Text style={[styles.inputText, { color: '#666', fontStyle: 'italic' }]}>
                  Apple ID
                </Text>
              </View>
            ) : (
              <TextInput
                style={[styles.input, styles.disabledInput]}
                editable={false}
                placeholder="Correo electrónico"
                value={profile.email}
              />
            )}

            {/* ✅ DRIVER FIX: Ocultar teléfono para drivers */}
            {user?.usertype !== 'driver' && (
              <>
                <TextInput
                  ref={(ref) => registerMainInput('phone', ref)}
                  style={[
                    // Use inputNoMargin base if there's an error to avoid double spacing
                    (submitCount > 0 && errors.phone) ? styles.inputNoMargin : styles.input,
                    submitCount > 0 && errors.phone && styles.inputErrorNoMargin,
                    !isEditingProfile && styles.disabledInput,
                    phoneVerified && styles.inputVerified,
                    fonts.numericStyles.tabular // ✅ Aplicar estilo para números
                  ]}
                  placeholder="Teléfono (ej: 55 1234 5678)"
                  placeholderTextColor="rgba(47,47,47,0.6)"
                  keyboardType="phone-pad"
                  value={values.phone}
                  onChangeText={(text) => {
                    const formatted = formatMexicanPhone(text);
                    handleChange('phone')(formatted);
                    setPhoneVerified(false); // Reset verificación si cambia el teléfono
                  }}
                  onFocus={isEditingProfile ? createMainFocusHandler('phone', 20) : undefined}
                  editable={isEditingProfile}
                  returnKeyType="done"
                />
                {phoneVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#33A744" />
                    <Text style={styles.verifiedText}>✅ Verificado (puedes cambiarlo si deseas)</Text>
                  </View>
                )}
                {submitCount > 0 && errors.phone && (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                )}

                {/* Verificación SMS en modo edición */}
                {isEditingProfile && values.phone && values.phone.length >= 10 && !(submitCount > 0 && errors.phone) && !phoneVerified && (
                  <SMSVerification
                    phone={values.phone}
                    type="profile_update"
                    onVerified={() => {
                      setPhoneVerified(true);
                      setLastVerifiedPhone(getPlainPhone(values.phone)); // Guardar teléfono verificado
                      showAlert({
                        type: 'success',
                        title: 'Verificado',
                        message: '✅ ¡Teléfono verificado correctamente! Ahora puedes guardar tus cambios.',
                        confirmText: 'Continuar',
                      });
                    }}
                    onError={(error) => {
                      showAlert({
                        type: 'error',
                        title: 'Error',
                        message: error,
                        confirmText: 'OK',
                      });
                    }}
                  />
                )}
              </>
            )}


            {/* ✅ DRIVER FIX: Ocultar fecha de cumpleaños para drivers */}
            {user?.usertype !== 'driver' && (
              <>
                {/* Fecha de cumpleaños */}
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.dateInput,
                    submitCount > 0 && errors.birthDate && styles.inputError,
                    // Bloquear si ya tiene fecha de cumpleaños O si no está en modo edición
                    (profile.birthDate && !isNaN(profile.birthDate.getTime())) || !isEditingProfile ? styles.disabledInput : null,
                  ]}
                  onPress={() => {
                    // Solo permitir abrir el picker si está en modo edición Y no tiene fecha de cumpleaños
                    const canOpenPicker = isEditingProfile && (!profile.birthDate || isNaN(profile.birthDate.getTime()));
                    if (canOpenPicker) {
                      setShowMonthYearPicker(true);
                    }
                  }}
                  activeOpacity={(profile.birthDate && !isNaN(profile.birthDate.getTime())) || !isEditingProfile ? 1 : 0.7}
                  disabled={(profile.birthDate && !isNaN(profile.birthDate.getTime())) || !isEditingProfile}>
                  <Text
                    style={[
                      values.birthDate ? styles.dateText : styles.datePlaceholder,
                      // Si no es editable (no en modo edición O ya tiene fecha), usar estilo deshabilitado
                      !isEditingProfile || (profile.birthDate && !isNaN(profile.birthDate.getTime())) ? styles.dateTextDisabled : null
                    ]}>
                    {values.birthDate
                      ? values.birthDate.toLocaleDateString('es-ES', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Mes y año de cumpleaños'}
                  </Text>
                  <Text style={styles.dateIcon}>📅</Text>
                </TouchableOpacity>
                {submitCount > 0 && errors.birthDate && (
                  <Text style={styles.errorText}>{errors.birthDate}</Text>
                )}
              </>
            )}
            
            {/* ✅ DRIVER FIX: Ocultar modal picker para drivers */}
            {user?.usertype !== 'driver' && showMonthYearPicker && (!profile.birthDate || isNaN(profile.birthDate.getTime())) && (
              <Modal
                transparent
                animationType="fade"
                visible={showMonthYearPicker}
                onRequestClose={() => setShowMonthYearPicker(false)}>
                <TouchableWithoutFeedback onPress={() => setShowMonthYearPicker(false)}>
                  <View style={styles.pickerModalOverlay}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                      <View style={styles.pickerModalContent}>
                        <Text style={styles.pickerModalTitle}>Seleccionar mes y año de nacimiento</Text>
                        
                        <View style={styles.pickerContainer}>
                          {/* Selector de Mes */}
                          <View style={styles.pickerColumn}>
                            <Text style={styles.pickerColumnTitle}>Mes</Text>
                            <ScrollView 
                              ref={(ref) => {
                                // Auto-scroll para centrar el mes actual cuando se abre el modal
                                if (ref && !values.birthDate) {
                                  setTimeout(() => {
                                    const monthIndex = 3; // Posición fija para que se vea paralelo al año (ambos índice 3)
                                    const itemHeight = 44; // paddingVertical(24px) + texto(~20px) = ~44px
                                    const containerHeight = 160; // Altura visible del ScrollView
                                    // Fórmula para centrar: posición del item - mitad del container + mitad del item
                                    const scrollToY = Math.max(0, (monthIndex * itemHeight) - (containerHeight / 2) + (itemHeight / 2));
                                    ref.scrollTo({ y: scrollToY, animated: true });
                                  }, 100);
                                }
                              }}
                              style={styles.pickerScrollView} 
                              showsVerticalScrollIndicator={false}
                              nestedScrollEnabled={true}
                              keyboardShouldPersistTaps="handled">
                              {[
                                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                              ].map((month, index) => {
                                // Si values.birthDate existe, usar su mes. Si no, usar índice 3 (abril) como referencia visual
                                const monthToShow = values.birthDate ? values.birthDate.getMonth() : 3;
                                const isSelected = monthToShow === index;
                                
                                return (
                                  <TouchableOpacity
                                    key={month}
                                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                    onPress={() => {
                                      // Si values.birthDate existe, usar su año. Si no, usar año actual menos 25 como sugerencia
                                      const currentYear = values.birthDate ? values.birthDate.getFullYear() : new Date().getFullYear() - 25;
                                      const newDate = new Date(currentYear, index, 1);
                                      // console.log('🐛 PICKER DEBUG - Estableciendo mes:', {month, index, newDate});
                                      setFieldValue('birthDate', newDate);
                                    }}>
                                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionSelectedText]}>
                                      {month}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>

                          {/* Selector de Año */}
                          <View style={styles.pickerColumn}>
                            <Text style={styles.pickerColumnTitle}>Año</Text>
                            <ScrollView 
                              ref={(ref) => {
                                // Auto-scroll para centrar el año sugerido cuando se abre el modal
                                if (ref && !values.birthDate) {
                                  setTimeout(() => {
                                    const yearIndex = 3; // Posición fija para que se vea paralelo al mes (ambos índice 3)
                                    const itemHeight = 44; // paddingVertical(24px) + texto(~20px) = ~44px
                                    const containerHeight = 160; // Altura visible del ScrollView
                                    // Fórmula para centrar: posición del item - mitad del container + mitad del item
                                    const scrollToY = Math.max(0, (yearIndex * itemHeight) - (containerHeight / 2) + (itemHeight / 2));
                                    ref.scrollTo({ y: scrollToY, animated: true });
                                  }, 100);
                                }
                              }}
                              style={styles.pickerScrollView} 
                              showsVerticalScrollIndicator={false}
                              nestedScrollEnabled={true}
                              keyboardShouldPersistTaps="handled">
                              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => {
                                // Si values.birthDate existe, usar su año. Si no, usar año en posición 3 como referencia visual
                                const yearToShow = values.birthDate ? values.birthDate.getFullYear() : new Date().getFullYear() - 3;
                                const isSelected = yearToShow === year;
                                
                                return (
                                  <TouchableOpacity
                                    key={year}
                                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                    onPress={() => {
                                      // Si values.birthDate existe, usar su mes. Si no, usar índice 3 (Abril) - coherente con visual
                                      const currentMonth = values.birthDate ? values.birthDate.getMonth() : 3;
                                      const newDate = new Date(year, currentMonth, 1);
                                      // console.log('🐛 PICKER DEBUG - Estableciendo año:', {year, currentMonth, newDate});
                                      setFieldValue('birthDate', newDate);
                                    }}>
                                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionSelectedText]}>
                                      {year}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        </View>

                        <View style={styles.pickerModalButtons}>
                          <TouchableOpacity
                            style={styles.pickerCancelButton}
                            onPress={() => setShowMonthYearPicker(false)}>
                            <Text style={styles.pickerCancelButtonText}>Cancelar</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[
                              styles.pickerConfirmButton,
                              !values.birthDate && styles.pickerConfirmButtonDisabled
                            ]}
                            disabled={!values.birthDate}
                            onPress={() => {
                              if (values.birthDate) {
                                setShowMonthYearPicker(false);
                                setFieldTouched('birthDate', true);
                              } else {
                                showAlert({
                                  type: 'info',
                                  title: 'Selección incompleta',
                                  message: 'Por favor selecciona tanto el mes como el año de tu cumpleaños.',
                                  confirmText: 'OK',
                                });
                              }
                            }}>
                            <Text style={[
                              styles.pickerConfirmButtonText,
                              !values.birthDate && styles.pickerConfirmButtonTextDisabled
                            ]}>
                              {values.birthDate ? '✓ Confirmar' : 'Selecciona fecha'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            )}

            {/* Solo mostrar botón guardar si está editando */}
            {isEditingProfile && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  handleSubmit();
                  // NO cerrar inmediatamente - esperar a que termine el submit exitoso
                }}
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>💾 Guardar cambios</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        </Formik>
      )}

      {/* ✅ DRIVER FIX: Ocultar sección de direcciones para drivers */}
      {user?.usertype !== 'driver' && (
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => navigation.navigate('AddressManager')}
          activeOpacity={0.8}>
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionHeaderTitle}>📍 Direcciones</Text>
          </View>
          <Text style={styles.sectionHeaderSubtitle}>
            Gestiona tu dirección de entrega
          </Text>
        </TouchableOpacity>
      )}

      {/* Sección de Contraseña */}
      <TouchableOpacity 
        style={[
          styles.sectionHeader,
          isOAuthUser() && styles.sectionHeaderDisabled
        ]}
        onPress={() => toggleSection('password')}
        activeOpacity={isOAuthUser() ? 0.5 : 0.8}>
        <View style={styles.sectionHeaderContent}>
          <Text style={[
            styles.sectionHeaderTitle,
            isOAuthUser() && styles.sectionHeaderTitleDisabled
          ]}>
            🔒 Seguridad {isOAuthUser() && `(${getProviderName()})`}
          </Text>
          {!isOAuthUser() && (
            <Text style={styles.sectionHeaderIcon}>
              {showPasswordSection ? '▲' : '▼'}
            </Text>
          )}
          {isOAuthUser() && (
            <Text style={styles.sectionHeaderIconDisabled}>🔒</Text>
          )}
        </View>
        <Text style={[
          styles.sectionHeaderSubtitle,
          isOAuthUser() && styles.sectionHeaderSubtitleDisabled
        ]}>
          {isOAuthUser() 
            ? `Contraseña gestionada por ${getProviderName()}` 
            : 'Cambiar contraseña de acceso'
          }
        </Text>
      </TouchableOpacity>

      {showPasswordSection && (
      <Formik
        initialValues={{
          current_password: '',
          password: '',
          password_confirmation: '',
        }}
        validationSchema={PasswordSchema}
        onSubmit={async (values, { resetForm, setSubmitting }) => {
          setLoading(true);
          try {
            const res = await axios.post(
              `${API_BASE_URL}/api/updateusepassword`,
              {
                userid:                user.id,
                current_password:      values.current_password,
                password:              values.password,
                password_confirmation: values.password_confirmation,
              }
            );
            if (res.status === 200) {
              showAlert({
                type: 'success',
                title: '¡Listo!',
                message: 'Contraseña actualizada.',
                confirmText: 'OK',
              });
              resetForm();
            }
          } catch {
            showAlert({
              type: 'error',
              title: 'Error',
              message: 'No se pudo cambiar contraseña.',
              confirmText: 'Cerrar',
            });
          } finally {
            setLoading(false);
            setSubmitting(false);
          }
        }}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          isSubmitting,
          submitCount,
        }) => (
          <View style={styles.section}>
            <TextInput
              style={[
                // Use inputNoMargin base if there's an error to avoid double spacing
                (submitCount > 0 && errors.current_password) ? styles.inputNoMargin : styles.input,
                submitCount > 0 && errors.current_password && styles.inputErrorNoMargin
              ]}
              placeholder="Contraseña actual"
              placeholderTextColor="rgba(47,47,47,0.6)"
              secureTextEntry
              value={values.current_password}
              onChangeText={handleChange('current_password')}
            />
            {submitCount > 0 && errors.current_password && (
              <Text style={styles.errorText}>{errors.current_password}</Text>
            )}

            <TextInput
              style={[
                // Use inputNoMargin base if there's an error to avoid double spacing
                (submitCount > 0 && errors.password) ? styles.inputNoMargin : styles.input,
                submitCount > 0 && errors.password && styles.inputErrorNoMargin
              ]}
              placeholder="Nueva contraseña"
              placeholderTextColor="rgba(47,47,47,0.6)"
              secureTextEntry
              value={values.password}
              onChangeText={handleChange('password')}
            />
            {submitCount > 0 && errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            <TextInput
              style={[
                // Use inputNoMargin base if there's an error to avoid double spacing
                (submitCount > 0 && errors.password_confirmation) ? styles.inputNoMargin : styles.input,
                submitCount > 0 && errors.password_confirmation && styles.inputErrorNoMargin
              ]}
              placeholder="Confirmar contraseña"
              placeholderTextColor="rgba(47,47,47,0.6)"
              secureTextEntry
              value={values.password_confirmation}
              onChangeText={handleChange('password_confirmation')}
            />
            {submitCount > 0 && errors.password_confirmation && (
              <Text style={styles.errorText}>{errors.password_confirmation}</Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Cambiar contraseña</Text>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.forgotPasswordSeparator}>
              <Text style={styles.forgotPasswordSeparatorText}>o</Text>
            </View>

            {/* Botón Olvidé mi contraseña */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              disabled={loading}
              activeOpacity={0.8}>
              <Text style={styles.forgotPasswordButtonText}>
                📧 Olvidé mi contraseña
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Formik>
      )}

      {/* Zona de Acciones de Cuenta */}
      <View style={styles.accountActions}>
        {/* Mostrar eliminar cuenta para TODOS los usuarios (local y OAuth) */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => {
            if (isOAuthUser()) {
              setShowOAuthDeleteConfirm(true);
            } else {
              setShowDeleteAccountConfirm(true);
            }
          }}
          activeOpacity={0.8}>
          <Text style={styles.deleteAccountButtonText}>🗑️ Eliminar Cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutConfirm(true)}
          activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ DRIVER FIX: Ocultar modal de Atención al Cliente para drivers */}
      {user?.usertype !== 'driver' && (
        <Modal
          visible={showSupportModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowSupportModal(false);
        }}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback 
            onPress={() => {
              Keyboard.dismiss();
              setShowSupportModal(false);
              setShowOrderPicker(false);
            }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Atención al Cliente</Text>
                  
                  <Formik
                    initialValues={{
                      orderno: '', // Siempre empieza vacío para que el usuario elija
                      message: '',
                    }}
                    validationSchema={SupportSchema}
                    onSubmit={handleSupportSubmit}
                    enableReinitialize={true}>
                    {({
                      handleChange,
                      handleBlur,
                      handleSubmit,
                      values,
                      errors,
                      touched,
                      isSubmitting,
                    }) => (
                      <>
                        {/* Selector de Orden */}
                        <View style={styles.modalInputGroup}>
                          <Text style={styles.modalLabel}>
                            Seleccionar Orden (opcional)
                            {formattedOrders.length > 0 && (
                              <Text style={styles.orderCount}> • {formattedOrders.length} orden{formattedOrders.length !== 1 ? 'es' : ''} disponible{formattedOrders.length !== 1 ? 's' : ''}</Text>
                            )}
                          </Text>
                          
                          {/* Selector personalizado con posición relativa */}
                          <View style={[
                            styles.selectorWrapper,
                            showOrderPicker && styles.selectorWrapperExpanded
                          ]}>
                            <TouchableOpacity
                              style={styles.customPicker}
                              onPress={() => setShowOrderPicker(!showOrderPicker)}
                              disabled={formattedOrders.length === 0}>
                              <Text style={[
                                styles.customPickerText,
                                !values.orderno && formattedOrders.length === 0 && styles.customPickerPlaceholder
                              ]}>
                                {getSelectedOrderLabel(values.orderno)}
                              </Text>
                              <Text style={styles.customPickerArrow}>
                                {showOrderPicker ? '▲' : '▼'}
                              </Text>
                            </TouchableOpacity>

                            {/* Dropdown de opciones */}
                            {showOrderPicker && formattedOrders.length > 0 && (
                              <View style={styles.orderDropdown}>
                                <ScrollView 
                                  style={styles.orderScrollView} 
                                  nestedScrollEnabled={true}
                                  keyboardShouldPersistTaps="handled"
                                  showsVerticalScrollIndicator={false}>
                                  {/* Opción por defecto */}
                                  <TouchableOpacity
                                    style={[styles.orderOption, !values.orderno && styles.orderOptionSelected]}
                                    onPress={() => {
                                      handleChange('orderno')('');
                                      setShowOrderPicker(false);
                                    }}>
                                    <Text style={[styles.orderOptionText, !values.orderno && styles.orderOptionSelectedText]}>
                                      Seleccionar orden...
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Órdenes disponibles */}
                                  {formattedOrders.map((orderData, index) => (
                                    <TouchableOpacity
                                      key={`order-${orderData.value}-${index}`}
                                      style={[
                                        styles.orderOption,
                                        values.orderno === orderData.value && styles.orderOptionSelected
                                      ]}
                                      onPress={() => {
                                        handleChange('orderno')(orderData.value);
                                        setShowOrderPicker(false);
                                      }}>
                                      <Text style={[
                                        styles.orderOptionText,
                                        values.orderno === orderData.value && styles.orderOptionSelectedText
                                      ]}>
                                        {orderData.label}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Mensaje */}
                        <View style={styles.modalInputGroup}>
                          <Text style={styles.modalLabel}>Mensaje *</Text>
                          <TextInput
                            ref={(ref) => registerModalInput('message', ref)}
                            style={[
                              // Use textAreaNoMargin if there's an error to avoid double spacing
                              (touched.message && errors.message) ? styles.modalTextAreaNoMargin : styles.modalTextArea,
                              touched.message && errors.message && styles.modalInputErrorNoMargin
                            ]}
                            placeholder="Describe tu consulta o problema..."
                            placeholderTextColor="rgba(47,47,47,0.6)"
                            value={values.message}
                            onChangeText={handleChange('message')}
                            onBlur={handleBlur('message')}
                            onFocus={createModalFocusHandler('message', 50)}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            returnKeyType="done"
                          />
                          {touched.message && errors.message && (
                            <Text style={styles.modalErrorText}>{errors.message}</Text>
                          )}
                        </View>

                        {/* Botones */}
                        <View style={styles.modalButtons}>
                          <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={() => {
                              Keyboard.dismiss();
                              setShowSupportModal(false);
                            }}
                            disabled={isSubmitting || supportLoading}>
                            <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.modalSendButton}
                            onPress={() => {
                              Keyboard.dismiss();
                              handleSubmit();
                            }}
                            disabled={isSubmitting || supportLoading}>
                            {isSubmitting || supportLoading ? (
                              <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                              <Text style={styles.modalSendButtonText}>Enviar</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </Formik>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* Modal de confirmación de cierre de sesión */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}>
        <TouchableWithoutFeedback onPress={() => setShowLogoutConfirm(false)}>
          <View style={styles.logoutModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.logoutModalContent}>
                <Text style={styles.logoutModalTitle}>¿Cerrar sesión?</Text>
                <Text style={styles.logoutModalMessage}>
                  ¿Estás seguro que quieres cerrar tu sesión?
                </Text>
                
                <View style={styles.logoutModalButtons}>
                  <TouchableOpacity
                    style={styles.logoutCancelButton}
                    onPress={() => setShowLogoutConfirm(false)}
                    activeOpacity={0.8}>
                    <Text style={styles.logoutCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.logoutConfirmButton}
                    onPress={() => {
                      setShowLogoutConfirm(false);
                      logout();
                    }}
                    activeOpacity={0.8}>
                    <Text style={styles.logoutConfirmButtonText}>Sí, cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de confirmación de eliminación de cuenta - Solo para usuarios locales */}
      {!isOAuthUser() && (
        <Modal
          visible={showDeleteAccountConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteAccountConfirm(false)}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            setShowDeleteAccountConfirm(false);
          }}>
            <View style={styles.deleteModalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.deleteModalContent}>
                  <Text style={styles.deleteModalTitle}>⚠️ Eliminar Cuenta</Text>
                  <Text style={styles.deleteModalMessage}>
                    Esta acción no se puede deshacer. Se eliminarán todos tus datos, pedidos y preferencias.
                  </Text>

                  <Formik
                    initialValues={{ password: '' }}
                    validationSchema={Yup.object().shape({
                      password: Yup.string().required('Contraseña requerida para confirmar')
                    })}
                    onSubmit={async (values, { setSubmitting }) => {
                      await handleDeleteAccount(values.password);
                      setSubmitting(false);
                      setShowDeleteAccountConfirm(false);
                    }}
                    validateOnChange={false}
                    validateOnBlur={false}>
                    {({
                      handleChange,
                      handleSubmit,
                      values,
                      errors,
                      isSubmitting,
                      submitCount,
                    }) => (
                      <>
                        <Text style={styles.deletePasswordLabel}>
                          Ingresa tu contraseña para confirmar:
                        </Text>
                        <TextInput
                          style={[
                            styles.deletePasswordInput,
                            submitCount > 0 && errors.password && styles.deletePasswordInputError
                          ]}
                          placeholder="Tu contraseña actual"
                          placeholderTextColor="rgba(47,47,47,0.6)"
                          secureTextEntry
                          value={values.password}
                          onChangeText={handleChange('password')}
                          autoFocus={true}
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            if (values.password.trim()) {
                              handleSubmit();
                            }
                          }}
                        />
                        {submitCount > 0 && errors.password && (
                          <Text style={styles.deletePasswordError}>{errors.password}</Text>
                        )}

                        <View style={styles.deleteModalButtons}>
                          <TouchableOpacity
                            style={styles.deleteCancelButton}
                            onPress={() => {
                              Keyboard.dismiss();
                              setShowDeleteAccountConfirm(false);
                            }}
                            activeOpacity={0.8}>
                            <Text style={styles.deleteCancelButtonText}>Cancelar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.deleteConfirmButton,
                              (!values.password.trim() || isSubmitting || loading) && styles.deleteConfirmButtonDisabled
                            ]}
                            onPress={() => {
                              Keyboard.dismiss();
                              handleSubmit();
                            }}
                            disabled={!values.password.trim() || isSubmitting || loading}
                            activeOpacity={0.8}>
                            {isSubmitting || loading ? (
                              <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                              <Text style={styles.deleteConfirmButtonText}>Eliminar Cuenta</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </Formik>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* Modal de eliminación de cuenta OAuth - Para usuarios Google/Apple */}
      {isOAuthUser() && (
        <Modal
          visible={showOAuthDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => {
            handleLongPressEnd(); // Limpiar timer
            setShowOAuthDeleteConfirm(false);
          }}>
          <TouchableWithoutFeedback onPress={() => {
            handleLongPressEnd(); // Limpiar timer
            setShowOAuthDeleteConfirm(false);
          }}>
            <View style={styles.oauthDeleteModalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.oauthDeleteModalContent}>
                  <Text style={styles.oauthDeleteModalTitle}>⚠️ Eliminar Cuenta {getProviderName()}</Text>

                  <Text style={styles.oauthDeleteModalMessage}>
                    Esta acción no se puede deshacer. Se eliminarán todos tus datos, pedidos y preferencias de tu cuenta de {getProviderName()}.
                  </Text>

                  <Text style={styles.oauthDeleteInstructions}>
                    Para confirmar, mantén presionado el botón durante 3 segundos:
                  </Text>

                  <View style={styles.longPressButtonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.longPressButton,
                        isLongPressing && styles.longPressButtonActive
                      ]}
                      onPressIn={handleLongPressStart}
                      onPressOut={handleLongPressEnd}
                      activeOpacity={1}>

                      {/* Barra de progreso SIMPLE */}
                      <View
                        style={[
                          styles.longPressProgress,
                          {
                            width: `${longPressProgress}%`
                          }
                        ]}
                      />

                      <Text style={[
                        styles.longPressButtonText,
                        isLongPressing && styles.longPressButtonTextActive
                      ]}>
                        {isLongPressing
                          ? '🗑️ Manténlo presionado...'
                          : '🗑️ Mantener para eliminar'
                        }
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.oauthCancelButton}
                    onPress={() => {
                      handleLongPressEnd(); // Cancelar timer si está activo
                      setShowOAuthDeleteConfirm(false);
                    }}
                    activeOpacity={0.8}>
                    <Text style={styles.oauthCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Modal de Tooltip Usuario Fundador */}
      <Modal
        visible={showFounderTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFounderTooltip(false)}>
        <TouchableWithoutFeedback onPress={() => setShowFounderTooltip(false)}>
          <View style={styles.tooltipModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.tooltipModalContent}>
                <View style={styles.tooltipHeader}>
                  <Text style={styles.tooltipIcon}>👑</Text>
                  <Text style={styles.tooltipTitle}>Usuario Fundador</Text>
                </View>
                <Text style={styles.tooltipMessage}>
                  ¡Felicidades! Eres parte de nuestros usuarios fundadores. 
                  Tienes acceso a descuentos exclusivos y beneficios especiales.
                </Text>
                <View style={styles.tooltipBenefits}>
                  <Text style={styles.tooltipBenefitItem}>✨ Descuento promocional del {profile?.promotional_discount || 10}%</Text>
                  {/* <Text style={styles.tooltipBenefitItem}>🎯 Acceso prioritario a nuevas funciones</Text>
                  <Text style={styles.tooltipBenefitItem}>💎 Estatus premium vitalicio</Text> */}
                </View>
                <TouchableOpacity
                  style={styles.tooltipCloseButton}
                  onPress={() => setShowFounderTooltip(false)}
                  activeOpacity={0.8}>
                  <Text style={styles.tooltipCloseButtonText}>¡Genial!</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Versión de la app */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>
          Sabores de Origen v{packageJson.version}
        </Text>
      </View>

      </ScrollView>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  // === CONTENEDORES MIGRADOS AL TEMA ===
  container: containers.screen,
  scrollContent: containers.scrollContent,
  // === HEADER - NUEVO DISEÑO SIN FOTOGRAFÍA ===
  header: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...shadows.small,
  },
  userProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  initialsCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#D27F27',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...shadows.small,
  },
  initialsText: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  userInfo: {
    flex: 1,
  },
  founderBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFD700', // Dorado
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  founderBadgeIcon: {
    fontSize: fonts.size.medium,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#33A744',
    marginRight: 6,
  },
  statusText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.medium,
    color: '#33A744',
  },
  // === TIPOGRAFÍA MIGRADA AL TEMA ===
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    ...typography.highlight,
    marginRight: 8,
  },
  // ✅ DRIVER FIX: Estilos para badge Driver
  driverBadge: {
    backgroundColor: '#D27F27',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  driverBadgeText: {
    color: '#FFF',
    fontSize: fonts.size.tiny,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  email: typography.subtitle,
  loading: {
    marginBottom: 16,
  },
  // === CARDS/SECCIONES MIGRADAS AL TEMA ===
  section: containers.card,
  
  // === INPUTS MIGRADOS AL TEMA ===
  input: inputs.standard,
  inputNoMargin: inputs.standardNoMargin, // Para inputs con error
  inputError: inputs.error,
  inputErrorNoMargin: inputs.errorNoMargin, // Para inputs con error sin margin
  disabledInput: inputs.disabled,
  errorText: inputLabels.error, // Usar el error text del tema
  inputText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#333',
  },
  
  // === TÍTULOS MIGRADOS AL TEMA ===
  sectionTitle: {
    ...typography.sectionTitle,
    marginBottom: 12, // Mantener espaciado original
  },
  
  // === BOTONES MIGRADOS AL TEMA ===
  button: buttons.primary,
  buttonText: buttonText.primary,
  
  // === BOTONES DE EDICIÓN MIGRADOS AL TEMA ===
  editButtonContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  editButton: buttons.edit,
  editButtonText: buttonText.edit,
  cancelEditButton: buttons.cancelEdit,
  cancelEditButtonText: buttonText.cancelEdit,
  
  // === BOTONES ESPECÍFICOS MIGRADOS AL TEMA ===
  supportButton: {
    ...buttons.support,
    marginBottom: 12, // Reducir espacio para nuevo botón
  },
  supportButtonText: buttonText.secondary,

  // Estilos para botón de actualizaciones
  updateButton: {
    backgroundColor: '#F2EFE4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  updateButtonHighlight: {
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    borderColor: '#33A744',
  },
  updateButtonChecking: {
    opacity: 0.7,
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
  },
  updateButtonText: {
    color: '#8B5E3C',
    fontSize: 14,
    fontFamily: 'Raleway-Medium',
    flex: 1,
  },
  updateButtonTextHighlight: {
    color: '#33A744',
    fontFamily: 'Raleway-Bold',
  },
  updateBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#33A744',
    marginLeft: 8,
  },
  updateBadgeCritical: {
    backgroundColor: '#E63946',
  },
  updateBadgeText: {
    fontSize: 8,
    color: 'transparent',
  },

  // Nuevos estilos para botón sutil dentro del card del usuario
  updateButtonSubtle: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.3)',
    alignSelf: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
  },
  updateButtonCritical: {
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    borderColor: 'rgba(230, 57, 70, 0.3)',
  },
  updateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateButtonIcon: {
    fontSize: 12,
  },
  updateButtonTextSubtle: {
    fontSize: 11,
    fontFamily: 'Raleway-Medium',
    color: '#33A744',
  },
  updateButtonTextCritical: {
    color: '#E63946',
    fontFamily: 'Raleway-Bold',
  },
  updatePulse: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#33A744',
    opacity: 0.8,
  },
  updatePulseCritical: {
    backgroundColor: '#E63946',
  },

  logoutButton: {
    ...buttons.logout,
    marginBottom: 24, // Mantener espaciado original
  },
  logoutButtonText: buttonText.secondary,

  // === SECCIONES COLAPSABLES MIGRADAS AL TEMA ===
  sectionHeader: containers.sectionHeader,
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeaderTitle: typography.body,
  sectionHeaderIcon: {
    fontSize: fonts.size.small,
    color: colors.secondary,
    marginLeft: 8,
  },
  sectionHeaderSubtitle: typography.subtitle,
  
  // ✅ ESTILOS PARA SECCIÓN DESHABILITADA (USUARIOS DE GOOGLE)
  sectionHeaderDisabled: {
    opacity: 0.6,
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
  },
  sectionHeaderTitleDisabled: {
    color: colors.textSecondary,
  },
  sectionHeaderIconDisabled: {
    fontSize: fonts.size.small,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  sectionHeaderSubtitleDisabled: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  
  quickActions: {
    marginBottom: 16,
  },
  accountActions: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.1)',
  },

  // === MODALES MIGRADOS AL TEMA ===
  modalContainer: containers.modalContainer,
  modalOverlay: containers.modalOverlay,
  modalContent: containers.modalContent,
  modalTitle: {
    ...typography.cardTitle,
    marginBottom: 24, // Mantener espaciado original
  },
  modalInputGroup: inputContainers.modal,
  modalLabel: {
    ...inputLabels.modal,
    marginBottom: 8, // Mantener espaciado original
  },
  orderCount: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: colors.secondary,
    fontWeight: 'normal',
  },
  modalInput: inputs.modal,
  modalTextArea: inputs.textArea,
  modalTextAreaNoMargin: inputs.textAreaNoMargin, // TextArea sin margin para errores
  modalInputError: inputs.error,
  modalInputErrorNoMargin: inputs.errorNoMargin, // Error input sin margin
  modalErrorText: inputLabels.error, // Error text del tema
  // === BOTONES DE MODAL MIGRADOS AL TEMA ===
  modalButtons: containers.modalButtonRow,
  modalCancelButton: buttons.modalCancel,
  modalCancelButtonText: buttonText.outline,
  modalSendButton: buttons.modalSend,
  modalSendButtonText: buttonText.secondary,
  
  // === SELECTOR/PICKER MIGRADO AL TEMA ===
  selectorWrapper: customPickers.wrapper,
  selectorWrapperExpanded: customPickers.wrapperExpanded,
  customPicker: customPickers.standard,
  customPickerText: customPickers.text,
  customPickerPlaceholder: customPickers.placeholder,
  customPickerArrow: customPickers.arrow,
  // === DROPDOWN MIGRADO AL TEMA ===
  orderDropdown: dropdowns.standard,
  orderScrollView: {
    flex: 1,
  },
  orderOption: dropdowns.option,
  orderOptionSelected: dropdowns.optionSelected,
  orderOptionText: dropdowns.optionText,
  orderOptionSelectedText: dropdowns.optionTextSelected,
  
  // === ESTILOS ESPECÍFICOS OPTIMIZADOS CON TEMA ===
  missingDataAlert: {
    backgroundColor: colors.theme.primaryLight,
    borderWidth: 1,
    borderColor: colors.theme.primaryMedium,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  missingDataTitle: {
    ...typography.highlight,
    marginBottom: 8,
  },
  missingDataItem: {
    ...typography.small,
    marginBottom: 4,
    lineHeight: 18,
  },
  
  // Estilos para fecha de cumpleaños
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    fontFamily: fonts.numeric, // ✅ Fuente optimizada para fechas
    fontSize: fonts.size.medium, // ✅ Mantiene autoscaling
    color: '#2F2F2F',
    flex: 1,
  },
  dateTextDisabled: {
    color: 'rgba(47,47,47,0.5)', // Gris para fechas no editables
    fontFamily: fonts.numeric, // ✅ Fuente optimizada para fechas
  },
  datePlaceholder: {
    fontFamily: fonts.numeric, // ✅ Fuente optimizada para fechas
    fontSize: fonts.size.medium, // ✅ Mantiene autoscaling
    color: 'rgba(47,47,47,0.6)',
    flex: 1,
  },
  dateIcon: {
    fontSize: fonts.size.medium,
    marginLeft: 8,
  },

  // Estilos del selector personalizado de mes/año
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pickerModalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  pickerColumnTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#8B5E3C',
    textAlign: 'center',
    marginBottom: 12,
  },
  pickerScrollView: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(139, 94, 60, 0.15)',
  },
  pickerOptionText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  pickerOptionSelectedText: {
    fontFamily: fonts.bold,
    color: '#8B5E3C',
  },
  pickerModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickerCancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },
  pickerConfirmButton: {
    flex: 1,
    backgroundColor: '#D27F27',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerConfirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  
  // Estilos del modal de confirmación de logout
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoutModalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  logoutModalMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: 'rgba(47,47,47,0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  logoutCancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },
  logoutConfirmButton: {
    flex: 1,
    backgroundColor: '#6B4226',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutConfirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  
  // === ESTILOS DEL TOOLTIP USUARIO FUNDADOR ===
  tooltipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tooltipIcon: {
    fontSize: fonts.size.XL,
    marginRight: 8,
  },
  tooltipTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#8B5E3C',
    textAlign: 'center',
  },
  tooltipMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  tooltipBenefits: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tooltipBenefitItem: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
    marginBottom: 8,
    lineHeight: 18,
  },
  tooltipCloseButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipCloseButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },
  
  // === ESTILOS PARA SECCIÓN DE DIRECCIONES ===
  // ✅ ESTILOS PARA GESTIÓN DE DIRECCIONES SIMPLIFICADA
  addressManagerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addressManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressManagerText: {
    marginLeft: 12,
    flex: 1,
  },
  addressManagerTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    marginBottom: 2,
  },
  addressManagerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    lineHeight: 18,
  },
  addressManagerButton: {
    backgroundColor: '#8B5E3C',
    borderRadius: 8,
    padding: 12,
  },
  addressManagerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressManagerButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressManagerButtonText: {
    marginLeft: 8,
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // 🎂 Estilos para botón deshabilitado del selector de fecha
  pickerConfirmButtonDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#CCCCCC',
  },
  pickerConfirmButtonTextDisabled: {
    color: '#999999',
  },

  // === ESTILOS PARA OLVIDÉ MI CONTRASEÑA ===
  forgotPasswordSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  forgotPasswordSeparatorText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  forgotPasswordButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  forgotPasswordButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
    textAlign: 'center',
  },

  // === ESTILOS PARA ELIMINAR CUENTA ===
  deleteAccountButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#DC3545',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  deleteAccountButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#DC3545',
    textAlign: 'center',
  },

  // === ESTILOS DEL MODAL DE ELIMINACIÓN DE CUENTA ===
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 2,
    borderColor: '#DC3545',
  },
  deleteModalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  deletePasswordLabel: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  deletePasswordInput: {
    borderWidth: 1.5,
    borderColor: '#DC3545',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
    marginBottom: 16,
  },
  deletePasswordInputError: {
    borderColor: '#DC3545',
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
  },
  deletePasswordError: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#DC3545',
    marginTop: -12,
    marginBottom: 16,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#CCCCCC',
  },
  deleteConfirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // === ESTILOS DEL MODAL OAUTH DELETE ===
  oauthDeleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  oauthDeleteModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FF6B35', // Naranja para OAuth
  },
  oauthDeleteModalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 12,
  },
  oauthDeleteModalMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  oauthDeleteInstructions: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 20,
  },
  longPressButtonContainer: {
    marginBottom: 20,
  },
  longPressButton: {
    backgroundColor: '#FFE5DE',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 56,
  },
  longPressButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF5722',
  },
  longPressProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FF6B35',
    opacity: 0.3,
  },
  longPressButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FF6B35',
    textAlign: 'center',
    zIndex: 1,
  },
  longPressButtonTextActive: {
    color: '#FFF',
  },
  oauthCancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  oauthCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },

  // ✅ Estilos para verificación SMS
  inputVerified: {
    borderColor: '#33A744',
    borderWidth: 2,
    backgroundColor: 'rgba(51, 167, 68, 0.05)',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.medium,
    color: '#33A744',
    marginLeft: 6,
  },

  // ✅ Estilos para versión de la app
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textAlign: 'center',
  },

});
