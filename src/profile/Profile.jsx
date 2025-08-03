// src/authentication/Profile.jsx
import React, { useEffect, useState, useContext, useCallback, Fragment, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  FlatList,
  Animated
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { OrderContext } from '../context/OrderContext';
import { useAlert } from '../context/AlertContext';
import { useProfile } from '../context/ProfileContext';
import fonts from '../theme/fonts';
import RegisterPrompt from './RegisterPrompt';
import AddressPicker from '../components/AddressPicker';
import {formatOrderId} from '../utils/orderIdFormatter';
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
    console.warn('Error parsing date:', error);
  }
  
  return null;
};

export default function Profile({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { orders } = useContext(OrderContext);
  const { showAlert } = useAlert();
  const { updateProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);  
  const [supportLoading, setSupportLoading] = useState(false);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [formattedOrders, setFormattedOrders] = useState([]);
  const [selectedOrderLabel, setSelectedOrderLabel] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showFounderTooltip, setShowFounderTooltip] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const formikRef = useRef(null);
  
  // Referencias para animaciones de toast
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-50)).current;
  
  // Estados para secciones colapsables
  const [showProfileSection, setShowProfileSection] = useState(false); // Colapsada por defecto
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showAddressSection, setShowAddressSection] = useState(false); // Nueva sección de direcciones
  
  // Estado para modo edición
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: null,
  });

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

  const fetchUserDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/userdetails/${user.id}`
      );
      const data = res.data?.data?.[0] || {};
      console.log('🎂 API data received:', {
        birthDate: data.birthDate,
        birth_date: data.birth_date,
        dob: data.dob,
        phone: data.phone,
        address: data.address,
        promotion_id: data.promotion_id,
        promotional_discount: data.promotional_discount
      });
      
      const dateValue = data.birthDate || data.birth_date || data.dob;
      const birthDate = parseFlexibleDate(dateValue);
      
      console.log('🎂 Parsing date:', dateValue, 'Result:', birthDate, 'Valid:', !!birthDate);
      
      if (!birthDate && dateValue) {
        console.warn('Failed to parse birth date:', dateValue);
      } else if (!dateValue) {
        console.log('🎂 No birth date found in API response');
      } else {
        console.log('🎂 Valid birth date set:', birthDate);
      }
      
      const profileData = {
        first_name: data.first_name || '',
        last_name:  data.last_name  || '',
        email:      data.email      || '',
        phone:      data.phone      || '',
        address:    data.address    || '',
        birthDate:  birthDate,
        promotion_id: data.promotion_id, // Agregar promotion_id
        promotional_discount: data.promotional_discount // Agregar promotional_discount
      };
      setProfile(profileData);
      updateProfile(profileData); // Notificar al contexto
    } catch {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar tu perfil.',
        confirmText: 'Cerrar',
      });
    } finally {
      setLoading(false);
    }
  }, [user.id, showAlert]);

  useEffect(() => {
    if (user?.id) fetchUserDetails();
  }, [user?.id, fetchUserDetails]);

  // Función para verificar datos faltantes
  const getMissingData = useCallback(() => {
    const missing = [];
    
    console.log('🔍 Checking missing data for profile:', {
      phone: profile.phone,
      address: profile.address,
      birthDate: profile.birthDate,
      birthDateType: typeof profile.birthDate,
      birthDateValid: profile.birthDate instanceof Date ? !isNaN(profile.birthDate.getTime()) : false
    });
    
    if (!profile.phone || profile.phone.trim() === '') {
      missing.push({ field: 'phone', label: 'Teléfono', reason: 'para recibir notificaciones de tu pedido' });
    }
    if (!profile.address || profile.address.trim() === '') {
      missing.push({ field: 'address', label: 'Dirección', reason: 'para poder hacer pedidos a domicilio' });
    }
    
    // Verificar fecha de cumpleaños (debe existir y ser una fecha válida)
    if (!profile.birthDate || 
        !(profile.birthDate instanceof Date) || 
        isNaN(profile.birthDate.getTime()) ||
        profile.birthDate.getFullYear() < 1900) {
      missing.push({ field: 'birthDate', label: 'Fecha de cumpleaños', reason: 'para beneficios especiales en tu día' });
    }
    
    console.log('📝 Missing data detected:', missing.map(m => m.field));
    return missing;
  }, [profile]);

  const missingData = getMissingData();

  // Función para mostrar toast de éxito (similar a ProductDetails)
  const showSuccessMessage = (message) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    
    // Animación de entrada
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Auto-ocultar después de 2.5 segundos
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessToast(false);
      });
    }, 2500);
  };

  const ProfileSchema = Yup.object().shape({
    first_name: Yup.string().required('Nombre es obligatorio'),
    last_name:  Yup.string().required('Apellido es obligatorio'),
    phone:      Yup.string()
      .matches(/^[0-9+]+$/, 'Teléfono inválido')
      .required('Teléfono es obligatorio'),
    birthDate:  Yup.date().nullable(), // opcional
  });

  const PasswordSchema = Yup.object().shape({
    current_password:      Yup.string().required('Requerido'),
    password:              Yup.string().min(6, 'Mínimo 6 caracteres').required('Obligatorio'),
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
      // Debug: ver estructura de las órdenes (remover después)
      console.log('📦 Órdenes del contexto:', orders[0]);
      
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
    
    // Debug: ver qué propiedades tiene cada orden (remover después)
    console.log('🔍 Orden individual:', {
      id: order?.id,
      created_at: order?.created_at,
      total_price: order?.total_price,
      status: order?.status,
      allKeys: Object.keys(order || {})
    });
    
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
        console.warn('Error formateando fecha:', e);
      }
    }
    
    // Obtener total con múltiples fallbacks
    const total = order.total_price || order.total || order.amount || order.totalPrice;
    
    // Estado
    const status = order.status || order.state || '';
    
    // Generar ID formateado visual usando la nueva función
    const formattedOrderId = formatOrderId(date);
    
    // Construir texto display con el nuevo formato
    let displayText = `Pedido ${formattedOrderId}`;
    if (formattedDate) displayText += ` - ${formattedDate}`;
    if (total && !isNaN(parseFloat(total))) {
      displayText += ` - $${parseFloat(total).toFixed(2)}`;
    }
    if (status) displayText += ` - ${status}`;
    
    console.log('📋 Texto formateado:', displayText);
    console.log('📋 ID real (value):', orderId, 'ID formateado (display):', formattedOrderId);
    
    return {
      value: orderId.toString(), // ✅ IMPORTANTE: Seguimos enviando el ID real (162) a la API
      label: displayText.trim()   // ✅ Solo mostramos el formato bonito (250731-100830)
    };
  }, []);

  const handleSupportSubmit = async (values, { setSubmitting, resetForm }) => {
    setSupportLoading(true);
    try {
      const response = await axios.post(
        'https://food.siliconsoft.pk/api/compsubmit',
        {
          orderno: values.orderno || '',
          message: values.message,
        },
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

  // Check if user is Guest - return RegisterPrompt with unique key
  if (user?.usertype === 'Guest') {
    return (
      <Fragment key={`guest-wrapper-${Date.now()}`}>
        <RegisterPrompt />
      </Fragment>
    );
  }

  return (
    <Fragment key={`profile-wrapper-${user?.id || 'registered'}`}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: profile.avatar || 'https://www.w3schools.com/howto/img_avatar.png'
            }}
            style={styles.avatar}
          />
          {/* Banderín Usuario Fundador - overlay en esquina del avatar */}
          {(profile?.promotion_id === "3" || profile?.promotion_id === 3) && (
            <TouchableOpacity 
              style={styles.founderBadge}
              onPress={() => setShowFounderTooltip(true)}
              activeOpacity={0.8}>
              <Text style={styles.founderBadgeIcon}>👑</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.name}>
          {profile.first_name} {profile.last_name}
        </Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      {/* Alerta sutil para datos faltantes */}
      {missingData.length > 0 && (
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

      {/* Botones de Acción Rápida */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => setShowSupportModal(true)}
          activeOpacity={0.8}>
          <Text style={styles.supportButtonText}>📞 Atención al Cliente</Text>
        </TouchableOpacity>
      </View>

      {/* Información del Perfil */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => setShowProfileSection(!showProfileSection)}
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
          phone:      profile.phone,
          birthDate:  profile.birthDate,
        }}
        enableReinitialize
        validationSchema={ProfileSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setLoading(true);
          try {
            // Preparar la fecha para envío - formato "Month YYYY"
            // Solo enviar fecha si el usuario no tenía fecha previamente establecida
            let dobFormatted = null;
            const shouldUpdateBirthDate = !profile.birthDate || isNaN(profile.birthDate.getTime());
            
            if (shouldUpdateBirthDate && values.birthDate && values.birthDate instanceof Date && !isNaN(values.birthDate.getTime())) {
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              const monthName = monthNames[values.birthDate.getMonth()];
              const year = values.birthDate.getFullYear();
              dobFormatted = `${monthName} ${year}`;
            }
            
            console.log('💾 Submitting profile update:', {
              ...values,
              birthDate: values.birthDate,
              dobFormatted
            });
            
            // Preparar payload - solo incluir dob si debe actualizarse
            const payload = {
              userid:      user.id,
              first_name:  values.first_name,
              last_name:   values.last_name,
              phone:       values.phone,
            };
            
            // Solo agregar dob si debe actualizarse
            if (shouldUpdateBirthDate && dobFormatted) {
              payload.dob = dobFormatted;
            }
            
            const res = await axios.post(
              'https://food.siliconsoft.pk/api/updateuserprofile',
              payload
            );
            if (res.status === 200) {
              // Solo actualizar los campos del formulario, manteniendo address intacto
              const updatedProfile = { 
                ...profile, 
                ...values,
                address: profile.address // Preservar la dirección existente
              };
              setProfile(updatedProfile);
              updateProfile(updatedProfile); // Notificar al contexto
              showAlert({
                type: 'success',
                title: '✅ ¡Datos personales actualizados!',
                message: 'Tu información personal se guardó correctamente.',
                confirmText: 'Perfecto',
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
              editable={isEditingProfile}
            />
            {submitCount > 0 && errors.first_name && (
              <Text style={styles.errorText}>{errors.first_name}</Text>
            )}

            <TextInput
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
              editable={isEditingProfile}
            />
            {submitCount > 0 && errors.last_name && (
              <Text style={styles.errorText}>{errors.last_name}</Text>
            )}

            <TextInput
              style={[styles.input, styles.disabledInput]}
              editable={false}
              placeholder="Correo electrónico"
              value={profile.email}
            />

            <TextInput
              style={[
                // Use inputNoMargin base if there's an error to avoid double spacing
                (submitCount > 0 && errors.phone) ? styles.inputNoMargin : styles.input,
                submitCount > 0 && errors.phone && styles.inputErrorNoMargin,
                !isEditingProfile && styles.disabledInput
              ]}
              placeholder="Teléfono"
              placeholderTextColor="rgba(47,47,47,0.6)"
              keyboardType="phone-pad"
              value={values.phone}
              onChangeText={handleChange('phone')}
              editable={isEditingProfile}
            />
            {submitCount > 0 && errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}


            {/* Fecha de cumpleaños */}
            <TouchableOpacity
              style={[
                styles.input,
                styles.dateInput,
                submitCount > 0 && errors.birthDate && styles.inputError,
                // Bloquear si ya tiene fecha de cumpleaños (solo permitir cambio si no tiene fecha)
                profile.birthDate && !isNaN(profile.birthDate.getTime()) && styles.disabledInput,
              ]}
              onPress={() => {
                // Solo permitir abrir el picker si está en modo edición Y no tiene fecha de cumpleaños
                if (isEditingProfile && (!profile.birthDate || isNaN(profile.birthDate.getTime()))) {
                  console.log('📅 Opening month/year picker...');
                  setShowMonthYearPicker(true);
                } else {
                  console.log('📅 Birth date picker disabled - not editing or user already has birth date');
                }
              }}
              activeOpacity={(profile.birthDate && !isNaN(profile.birthDate.getTime())) || !isEditingProfile ? 1 : 0.7}
              disabled={(profile.birthDate && !isNaN(profile.birthDate.getTime())) || !isEditingProfile}>
              <Text
                style={[
                  values.birthDate && !isNaN(values.birthDate.getTime()) ? styles.dateText : styles.datePlaceholder,
                  // Si no es editable o ya tiene fecha, usar estilo deshabilitado
                  ((profile.birthDate && !isNaN(profile.birthDate.getTime())) || !isEditingProfile) && styles.dateTextDisabled
                ]}>
                {values.birthDate && !isNaN(values.birthDate.getTime())
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
            
            {/* Selector personalizado de mes y año - solo si no tiene fecha bloqueada */}
            {showMonthYearPicker && (!profile.birthDate || isNaN(profile.birthDate.getTime())) && (
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
                              style={styles.pickerScrollView} 
                              showsVerticalScrollIndicator={false}
                              nestedScrollEnabled={true}
                              keyboardShouldPersistTaps="handled">
                              {[
                                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                              ].map((month, index) => {
                                const currentMonth = values.birthDate ? values.birthDate.getMonth() : -1;
                                const isSelected = currentMonth === index;
                                
                                return (
                                  <TouchableOpacity
                                    key={month}
                                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                    onPress={() => {
                                      const currentYear = values.birthDate ? values.birthDate.getFullYear() : new Date().getFullYear() - 25;
                                      const newDate = new Date(currentYear, index, 1);
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
                              style={styles.pickerScrollView} 
                              showsVerticalScrollIndicator={false}
                              nestedScrollEnabled={true}
                              keyboardShouldPersistTaps="handled">
                              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => {
                                const currentYear = values.birthDate ? values.birthDate.getFullYear() : -1;
                                const isSelected = currentYear === year;
                                
                                return (
                                  <TouchableOpacity
                                    key={year}
                                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                                    onPress={() => {
                                      const currentMonth = values.birthDate ? values.birthDate.getMonth() : 0;
                                      const newDate = new Date(year, currentMonth, 1);
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
                            style={styles.pickerConfirmButton}
                            onPress={() => {
                              console.log('📅 Month/Year selected:', values.birthDate);
                              setShowMonthYearPicker(false);
                            }}>
                            <Text style={styles.pickerConfirmButtonText}>Confirmar</Text>
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
                  setIsEditingProfile(false); // Salir de modo edición después de guardar
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

      {/* Sección de Direcciones */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => setShowAddressSection(!showAddressSection)}
        activeOpacity={0.8}>
        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionHeaderTitle}>📍 Direcciones</Text>
          <Text style={styles.sectionHeaderIcon}>
            {showAddressSection ? '▲' : '▼'}
          </Text>
        </View>
        <Text style={styles.sectionHeaderSubtitle}>
          Gestiona tus direcciones de entrega
        </Text>
      </TouchableOpacity>

      {showAddressSection && (
        <View style={styles.section}>
          {/* Información de la dirección actual */}
          <View style={styles.addressInfoContainer}>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>📍 Dirección actual:</Text>
              {profile.address ? (
                <Text style={[styles.addressText, !isEditingAddress && styles.addressTextDisabled]}>
                  {profile.address}
                </Text>
              ) : (
                <Text style={styles.addressPlaceholder}>
                  No tienes una dirección registrada
                </Text>
              )}
            </View>
            
            {/* Botón Editar/Cancelar dirección */}
            <View style={styles.editButtonContainer}>
              {!isEditingAddress ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditingAddress(true)}
                  activeOpacity={0.8}>
                  <Text style={styles.editButtonText}>✏️ {profile.address ? 'Cambiar dirección' : 'Agregar dirección'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => setIsEditingAddress(false)}
                  activeOpacity={0.8}>
                  <Text style={styles.cancelEditButtonText}>❌ Cancelar edición</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Formulario de edición de dirección */}
          {isEditingAddress && (
            <Formik
              initialValues={{
                address: profile.address || '',
              }}
              enableReinitialize
              onSubmit={async (values, { setSubmitting }) => {
                setLoading(true);
                try {
                  const payload = {
                    userid: user.id,
                    address: values.address,
                  };
                  
                  const res = await axios.post(
                    'https://food.siliconsoft.pk/api/updateuserprofile',
                    payload
                  );
                  
                  if (res.status === 200) {
                    const updatedProfile = { ...profile, address: values.address };
                    setProfile(updatedProfile);
                    updateProfile(updatedProfile); // Notificar al contexto
                    
                    // Salir del modo edición
                    setIsEditingAddress(false);
                    
                    // Mostrar toast de éxito (tipo carrito)
                    showSuccessMessage('¡Dirección de entrega actualizada!');
                  }
                } catch {
                  showAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'No se pudo actualizar la dirección. Inténtalo de nuevo.',
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
                handleSubmit,
                values,
                isSubmitting,
                setFieldValue,
              }) => (
                <View style={styles.editSection}>
                  {/* Campo de dirección con AddressPicker */}
                  <TouchableOpacity
                    style={[styles.input, styles.dateInput]}
                    onPress={() => setShowAddressPicker(true)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        values.address ? styles.dateText : styles.datePlaceholder
                      ]}>
                      {values.address || 'Seleccionar dirección de entrega'}
                    </Text>
                    <Text style={styles.dateIcon}>📍</Text>
                  </TouchableOpacity>

                  {/* Botón para guardar cambios de dirección */}
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleSubmit}
                    disabled={isSubmitting || loading || !values.address}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>💾 Guardar dirección</Text>
                    )}
                  </TouchableOpacity>
                  
                  {/* AddressPicker Modal para esta sección */}
                  <AddressPicker
                    visible={showAddressPicker}
                    onClose={() => setShowAddressPicker(false)}
                    onConfirm={(addressData) => {
                      console.log('📍 Address selected:', addressData);
                      // Actualizar el campo de dirección
                      setFieldValue('address', addressData.fullAddress);
                      setShowAddressPicker(false);
                    }}
                    initialAddress={values.address || ''}
                    title="Dirección de Entrega"
                  />
                </View>
              )}
            </Formik>
          )}
        </View>
      )}

      {/* Sección de Contraseña */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => setShowPasswordSection(!showPasswordSection)}
        activeOpacity={0.8}>
        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionHeaderTitle}>🔒 Seguridad</Text>
          <Text style={styles.sectionHeaderIcon}>
            {showPasswordSection ? '▲' : '▼'}
          </Text>
        </View>
        <Text style={styles.sectionHeaderSubtitle}>
          Cambiar contraseña de acceso
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
              'https://food.siliconsoft.pk/api/updateusepassword',
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
          </View>
        )}
      </Formik>
      )}

      {/* Zona de Acciones de Cuenta */}
      <View style={styles.accountActions}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutConfirm(true)}
          activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Atención al Cliente */}
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
                  <Text style={styles.tooltipBenefitItem}>🎯 Acceso prioritario a nuevas funciones</Text>
                  <Text style={styles.tooltipBenefitItem}>💎 Estatus premium vitalicio</Text>
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

      {/* Toast de éxito para direcciones (tipo carrito) */}
      {showSuccessToast && (
        <Animated.View
          style={[
            styles.successToast,
            {
              opacity: toastOpacity,
              transform: [{translateY: toastTranslateY}],
            },
          ]}>
          <View style={styles.successToastContent}>
            <Ionicons name="checkmark-circle" size={20} color="#33A744" />
            <View style={styles.successToastTextContainer}>
              <Text style={styles.successToastText}>
                {toastMessage}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
      
      </ScrollView>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  // === CONTENEDORES MIGRADOS AL TEMA ===
  container: containers.screen,
  scrollContent: containers.scrollContent,
  // === HEADER - ESTILOS ESPECÍFICOS (se mantienen) ===
  header: containers.avatarContainer,
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    fontSize: 16,
    textAlign: 'center',
  },
  // === TIPOGRAFÍA MIGRADA AL TEMA ===
  name: {
    ...typography.highlight,
    marginBottom: 4, // Mantener espaciado original
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
    marginBottom: 24, // Mantener espaciado original
  },
  supportButtonText: buttonText.secondary,
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
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    flex: 1,
  },
  dateTextDisabled: {
    color: 'rgba(47,47,47,0.5)', // Gris para fechas no editables
    fontFamily: fonts.regular, // Quitar bold
  },
  datePlaceholder: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: 'rgba(47,47,47,0.6)',
    flex: 1,
  },
  dateIcon: {
    fontSize: fonts.size.medium,
    marginLeft: 8,
  },
  iosDatePicker: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginTop: 8,
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
    fontSize: 28,
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
  addressInfoContainer: {
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.15)',
  },
  addressInfo: {
    marginBottom: 12,
  },
  addressLabel: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#8B5E3C',
    marginBottom: 8,
  },
  addressText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    lineHeight: 20,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
  },
  addressTextDisabled: {
    color: 'rgba(47,47,47,0.7)',
    backgroundColor: '#F9F9F9',
  },
  addressPlaceholder: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: 'rgba(47,47,47,0.5)',
    fontStyle: 'italic',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.1)',
    borderStyle: 'dashed',
  },
  editSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.1)',
  },
  
  // === ESTILOS DEL TOAST DE ÉXITO (tipo carrito) ===
  successToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80, // Misma altura que ProductDetails
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  successToastContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#33A744',
  },
  successToastTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  successToastText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#33A744',
    textAlign: 'left',
    lineHeight: 18,
  },
});
