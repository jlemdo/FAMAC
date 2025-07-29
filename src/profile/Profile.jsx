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
  FlatList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { OrderContext } from '../context/OrderContext';
import { useAlert } from '../context/AlertContext';
import fonts from '../theme/fonts';
import RegisterPrompt from './RegisterPrompt';
import AddressPicker from '../components/AddressPicker';

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
  const formikRef = useRef(null);
  
  // Estados para secciones colapsables
  const [showProfileSection, setShowProfileSection] = useState(true);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
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
        address: data.address
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
      
      setProfile({
        first_name: data.first_name || '',
        last_name:  data.last_name  || '',
        email:      data.email      || '',
        phone:      data.phone      || '',
        address:    data.address    || '',
        birthDate:  birthDate,
      });
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

  const ProfileSchema = Yup.object().shape({
    first_name: Yup.string().required('Nombre es obligatorio'),
    last_name:  Yup.string().required('Apellido es obligatorio'),
    phone:      Yup.string()
      .matches(/^[0-9+]+$/, 'Teléfono inválido')
      .required('Teléfono es obligatorio'),
    address:    Yup.string(), // opcional
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
    
    // Construir texto display (sin caracteres especiales para el Picker)
    let displayText = `Orden #${orderId}`;
    if (formattedDate) displayText += ` - ${formattedDate}`;
    if (total && !isNaN(parseFloat(total))) {
      displayText += ` - $${parseFloat(total).toFixed(2)}`;
    }
    if (status) displayText += ` - ${status}`;
    
    console.log('📋 Texto formateado:', displayText);
    
    return {
      value: orderId.toString(),
      label: displayText.trim()
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
        contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Image
          source={{
            uri: profile.avatar || 'https://www.w3schools.com/howto/img_avatar.png'
          }}
          style={styles.avatar}
        />
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
          address:    profile.address,
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
              address:     values.address,
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
              showAlert({
                type: 'success',
                title: '¡Listo!',
                message: 'Perfil actualizado.',
                confirmText: 'OK',
              });
              setProfile(prev => ({ ...prev, ...values }));
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
            <TextInput
              style={[
                styles.input,
                submitCount > 0 && errors.first_name && styles.inputError
              ]}
              placeholder="Nombre"
              placeholderTextColor="rgba(47,47,47,0.6)"
              value={values.first_name}
              onChangeText={handleChange('first_name')}
            />
            {submitCount > 0 && errors.first_name && (
              <Text style={styles.errorText}>{errors.first_name}</Text>
            )}

            <TextInput
              style={[
                styles.input,
                submitCount > 0 && errors.last_name && styles.inputError
              ]}
              placeholder="Apellido"
              placeholderTextColor="rgba(47,47,47,0.6)"
              value={values.last_name}
              onChangeText={handleChange('last_name')}
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
                styles.input,
                submitCount > 0 && errors.phone && styles.inputError
              ]}
              placeholder="Teléfono"
              placeholderTextColor="rgba(47,47,47,0.6)"
              keyboardType="phone-pad"
              value={values.phone}
              onChangeText={handleChange('phone')}
            />
            {submitCount > 0 && errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}

            {/* Campo de dirección con AddressPicker */}
            <TouchableOpacity
              style={[styles.input, styles.dateInput]}
              onPress={() => setShowAddressPicker(true)}
              activeOpacity={0.7}>
              <Text
                style={values.address ? styles.dateText : styles.datePlaceholder}>
                {values.address || 'Dirección completa'}
              </Text>
              <Text style={styles.dateIcon}>📍</Text>
            </TouchableOpacity>

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
                // Solo permitir abrir el picker si no tiene fecha de cumpleaños
                if (!profile.birthDate || isNaN(profile.birthDate.getTime())) {
                  console.log('📅 Opening month/year picker...');
                  setShowMonthYearPicker(true);
                } else {
                  console.log('📅 Birth date picker disabled - user already has birth date');
                }
              }}
              activeOpacity={profile.birthDate && !isNaN(profile.birthDate.getTime()) ? 1 : 0.7}
              disabled={profile.birthDate && !isNaN(profile.birthDate.getTime())}>
              <Text
                style={values.birthDate && !isNaN(values.birthDate.getTime()) ? styles.dateText : styles.datePlaceholder}>
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
                            <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
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
                            <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
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

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Actualizar perfil</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        </Formik>
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
                styles.input,
                submitCount > 0 && errors.current_password && styles.inputError
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
                styles.input,
                submitCount > 0 && errors.password && styles.inputError
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
                styles.input,
                submitCount > 0 && errors.password_confirmation && styles.inputError
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
                          <View style={styles.selectorWrapper}>
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
                                <ScrollView style={styles.orderScrollView} nestedScrollEnabled>
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
                              styles.modalTextArea,
                              touched.message && errors.message && styles.modalInputError
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

      {/* AddressPicker Modal */}
      <AddressPicker
        visible={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        onConfirm={(addressData) => {
          console.log('📍 Address selected:', addressData);
          // Actualizar el campo de dirección en Formik
          if (formikRef.current) {
            formikRef.current.setFieldValue('address', addressData.fullAddress);
          }
          setShowAddressPicker(false);
        }}
        initialAddress={profile.address || ''}
        title="Dirección de Entrega"
      />
      </ScrollView>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: 'rgba(47,47,47,0.6)',
  },
  loading: {
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#E63946',
  },
  disabledInput: {
    backgroundColor: '#EEE',
  },
  errorText: {
    color: '#E63946',
    fontSize: fonts.size.small,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#33A744',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#D27F27',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  
  // Estilos del botón Atención al Cliente
  supportButton: {
    backgroundColor: '#33A744',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  supportButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // Estilos del botón Cerrar Sesión
  logoutButton: {
    backgroundColor: '#6B4226',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  logoutButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // Estilos de secciones colapsables
  sectionHeader: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#D27F27',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    flex: 1,
  },
  sectionHeaderIcon: {
    fontSize: fonts.size.small,
    color: '#8B5E3C',
    marginLeft: 8,
  },
  sectionHeaderSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: 'rgba(47,47,47,0.6)',
    marginTop: 2,
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

  // Estilos del modal
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 24,
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
  orderCount: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#8B5E3C',
    fontWeight: 'normal',
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
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
  modalErrorText: {
    color: '#E63946',
    fontSize: fonts.size.small,
    marginTop: 4,
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
  modalSendButton: {
    flex: 1,
    backgroundColor: '#33A744',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSendButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  
  // Estilos del selector personalizado
  selectorWrapper: {
    position: 'relative',
    zIndex: 99999,
  },
  customPicker: {
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderRadius: 8,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minHeight: 44,
    paddingVertical: 8,
  },
  customPickerText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    flex: 1,
  },
  customPickerPlaceholder: {
    color: 'rgba(47,47,47,0.6)',
  },
  customPickerArrow: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#8B5E3C',
    marginLeft: 8,
  },
  orderDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    borderTopWidth: 0,
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    backgroundColor: '#FFF',
    maxHeight: 150,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 15,
    marginTop: 1,
  },
  orderScrollView: {
    flex: 1,
  },
  orderOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
  },
  orderOptionSelected: {
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
  },
  orderOptionText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  orderOptionSelectedText: {
    fontFamily: fonts.bold,
    color: '#8B5E3C',
  },
  
  // Estilos para datos faltantes
  missingDataAlert: {
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  missingDataTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#D27F27',
    marginBottom: 8,
  },
  missingDataItem: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
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
});
