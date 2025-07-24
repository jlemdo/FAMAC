// src/authentication/Profile.jsx
import React, { useEffect, useState, useContext, useCallback, Fragment } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { OrderContext } from '../context/OrderContext';
import { useAlert } from '../context/AlertContext';
import fonts from '../theme/fonts';
import RegisterPrompt from './RegisterPrompt';

export default function Profile({ navigation }) {
  const { user } = useContext(AuthContext);
  const { orders } = useContext(OrderContext);
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);  
  const [supportLoading, setSupportLoading] = useState(false);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [formattedOrders, setFormattedOrders] = useState([]);
  const [selectedOrderLabel, setSelectedOrderLabel] = useState('');
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
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
      setProfile({
        first_name: data.first_name || '',
        last_name:  data.last_name  || '',
        email:      data.email      || '',
        phone:      data.phone      || '',
        address:    data.address    || '',
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

  const ProfileSchema = Yup.object().shape({
    first_name: Yup.string().required('Nombre es obligatorio'),
    last_name:  Yup.string().required('Apellido es obligatorio'),
    phone:      Yup.string()
      .matches(/^[0-9+]+$/, 'Teléfono inválido')
      .required('Teléfono es obligatorio'),
    address:    Yup.string(), // opcional
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

      {loading && <ActivityIndicator size="large" color="#33A744" style={styles.loading} />}

      {/* Botón Atención al Cliente */}
      <TouchableOpacity
        style={styles.supportButton}
        onPress={() => setShowSupportModal(true)}
        activeOpacity={0.8}>
        <Text style={styles.supportButtonText}>📞 Atención al Cliente</Text>
      </TouchableOpacity>

      {/* Perfil */}
      <Formik
        initialValues={{
          first_name: profile.first_name,
          last_name:  profile.last_name,
          phone:      profile.phone,
          address:    profile.address,
        }}
        enableReinitialize
        validationSchema={ProfileSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setLoading(true);
          try {
            const res = await axios.post(
              'https://food.siliconsoft.pk/api/updateuserprofile',
              {
                userid:      user.id,
                first_name:  values.first_name,
                last_name:   values.last_name,
                phone:       values.phone,
                address:     values.address,
              }
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

            <TextInput
              style={styles.input}
              placeholder="Dirección"
              placeholderTextColor="rgba(47,47,47,0.6)"
              value={values.address}
              onChangeText={handleChange('address')}
            />

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

      {/* Contraseña */}
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
            <Text style={styles.sectionTitle}>Cambiar contraseña</Text>

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

      {/* Modal de Atención al Cliente */}
      <Modal
        visible={showSupportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSupportModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            setShowOrderPicker(false);
          }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => setShowOrderPicker(false)}>
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
                            onPress={() => setShowSupportModal(false)}
                            disabled={isSubmitting || supportLoading}>
                            <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.modalSendButton}
                            onPress={handleSubmit}
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
    zIndex: 1000,
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
    zIndex: 1001,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
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
});
