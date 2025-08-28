import React, {useContext, useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  PermissionsAndroid,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import MapView, {Marker} from 'react-native-maps';
import {AuthContext} from '../context/AuthContext';
import GetLocation from 'react-native-get-location';
import axios from 'axios';
import {OrderContext} from '../context/OrderContext';
import DriverTracking from './driver/DriverTracking';
import CustomerTracking from './driver/CustomerTracking';
import Chat from './Chat';
import fonts from '../theme/fonts';
import {Formik} from 'formik';
import * as Yup from 'yup';
import {useAlert} from '../context/AlertContext';
import {formatPriceWithSymbol} from '../utils/priceFormatter';
import {formatOrderId} from '../utils/orderIdFormatter';

// ✅ FUNCIÓN: Traducir estados de órdenes a español
const translateStatus = (status) => {
  if (!status) return 'Desconocido';
  
  const translations = {
    // Estados principales
    'open': 'Abierto',
    'pending': 'Pendiente', 
    'confirmed': 'Confirmado',
    'preparing': 'Preparando',
    'on the way': 'En camino',
    'delivered': 'Entregado',
    'completed': 'Completado',
    'cancelled': 'Cancelado',
    'rejected': 'Rechazado',
    'failed': 'Fallido',
    
    // Estados adicionales
    'processing': 'Procesando',
    'ready': 'Listo',
    'picked up': 'Recogido',
    'out for delivery': 'En reparto',
    'delayed': 'Retrasado',
    'returned': 'Devuelto'
  };
  
  return translations[status.toLowerCase()] || status;
};

// ✅ FUNCIÓN: Traducir estados de pago a español
const translatePaymentStatus = (paymentStatus) => {
  if (!paymentStatus) return 'Desconocido';
  
  const translations = {
    'pending': 'Pendiente',
    'completed': 'Completado', 
    'paid': 'Pagado',
    'failed': 'Fallido',
    'cancelled': 'Cancelado',
    'refunded': 'Reembolsado',
    'processing': 'Procesando'
  };
  
  return translations[paymentStatus.toLowerCase()] || paymentStatus;
};

const OrderDetails = () => {
  const {user} = useContext(AuthContext);
  const {showAlert} = useAlert();
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/orderdetails/${orderId}`,
      );
      setOrder(res.data.order); // adjust according to your response shape
    } catch (err) {
      // Order fetch error
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {fetchOrder();}
  }, [orderId, fetchOrder]);

  // Schema de validación para el formulario de soporte
  const SupportSchema = Yup.object().shape({
    message: Yup.string().required('El mensaje es obligatorio'),
  });

  // Función para manejar el envío del formulario de soporte
  const handleSupportSubmit = async (values, { setSubmitting, resetForm }) => {
    setSupportLoading(true);
    try {
      const response = await axios.post(
        'https://food.siliconsoft.pk/api/compsubmit',
        {
          orderno: order?.id?.toString() || '',
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

  if (loading || !order) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Return JSX
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del pedido</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.orderInfo}>
          <View style={styles.infoHeader}>
            <View style={styles.orderIdSection}>
              <Text style={styles.orderIdLabel}>Pedido:</Text>
              <Text style={styles.orderIdText}>{formatOrderId(order?.created_at)}</Text>
            </View>
            <View style={styles.statusSection}>
              <Text style={styles.statusText}>Estado: {translateStatus(order?.status)}</Text>
              {/* 🆕 Nuevo: Payment Status */}
              <Text style={[
                styles.paymentStatusText,
                order?.payment_status === 'pending' && styles.paymentStatusPending,
                order?.payment_status === 'completed' && styles.paymentStatusCompleted,
                order?.payment_status === 'failed' && styles.paymentStatusFailed
              ]}>
                Pago: {translatePaymentStatus(order?.payment_status)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.orderDate}>
            {new Date(order?.created_at).toLocaleString('es-MX', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Text>

          <Text style={styles.sectionTitle}>Artículos</Text>
          {order?.order_details?.length > 0 ? (
            order.order_details.map((product, i) => (
              <View key={i} style={styles.itemRow}>
                <Image
                  source={{uri: product.item_image}}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemText}>
                    {product.item_qty}× {product.item_name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    }).format(product.item_price)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noItems}>No hay artículos en este pedido</Text>
          )}

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Precio total</Text>
            <Text style={styles.totalValue}>
              {formatPriceWithSymbol(order?.total_price)}
            </Text>
          </View>
        </View>

        {user.usertype === 'driver' ? (
          // 2. Los drivers siempre ven todo
          <>
            <DriverTracking order={order} />
            <Chat orderId={orderId} />
          </>
        ) : order.driver ? (
          // 1. Clientes solo ven Tracking y Chat después de asignar driver
          <>
            <CustomerTracking order={order} />
            <Chat orderId={orderId} />
          </>
        ) : (
          // Mientras esté en “Open” (sin driver asignado)
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              Este pedido aún no tiene repartidor. Vuelve a verificar más tarde.
            </Text>
          </View>
        )}

        {/* Botón de Atención al Cliente */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => setShowSupportModal(true)}
          activeOpacity={0.8}>
          <Text style={styles.supportButtonText}>📞 Atención al Cliente</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Atención al Cliente */}
      <Modal
        visible={showSupportModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowSupportModal(false);
        }}>
        <TouchableWithoutFeedback 
          onPress={() => {
            Keyboard.dismiss();
            setShowSupportModal(false);
          }}>
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
                  <Text style={styles.modalTitle}>Atención al Cliente</Text>
                  
                  <Formik
                    initialValues={{
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
                        {/* Mostrar información de la orden */}
                        <View style={styles.modalInputGroup}>
                          <Text style={styles.modalLabel}>Orden seleccionada</Text>
                          <View style={styles.orderInfoBox}>
                            <Text style={styles.orderInfoText}>
                              Pedido {formatOrderId(order?.created_at)} - {new Date(order?.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </Text>
                            <Text style={styles.orderInfoPrice}>
                              {formatPriceWithSymbol(order?.total_price || 0)}
                            </Text>
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
                            placeholder="Describe tu consulta o problema sobre esta orden..."
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
                </ScrollView>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fonts.size.XL, // Reducido desde XLLL (48px) a XL (30px) para mejor compatibilidad
    color: '#2F2F2F',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  orderInfo: {
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
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    marginRight: 6,
  },
  orderIdText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.numeric, // ✅ Fuente optimizada para IDs de orden
    color: '#D27F27',
    letterSpacing: 0.5,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  
  // 🆕 Nuevo: Payment Status Styles
  paymentStatusText: {
    fontFamily: fonts.numericBold,
    fontSize: fonts.size.small,
    marginTop: 4,
  },
  paymentStatusPending: {
    color: '#FF9800', // Naranja
  },
  paymentStatusCompleted: {
    color: '#33A744', // Verde
  },
  paymentStatusFailed: {
    color: '#E63946', // Rojo
  },
  orderDate: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 12,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  itemPrice: {
    fontFamily: fonts.priceBold, // ✅ Fuente optimizada para precios
    fontSize: fonts.size.small,
    color: '#D27F27',
  },
  noItems: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: 'rgba(47,47,47,0.6)',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  totalLabel: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  totalValue: {
    fontFamily: fonts.priceBold, // ✅ Fuente optimizada para precio total
    fontSize: fonts.size.medium,
    color: '#33A744',
  },
  messageContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  messageText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  
  // Estilos del botón de Atención al Cliente
  supportButton: {
    backgroundColor: '#33A744',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingView: {
    width: '90%',
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    flexGrow: 1,
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
  orderInfoBox: {
    backgroundColor: '#F2EFE4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  orderInfoText: {
    fontFamily: fonts.numeric, // ✅ Fuente optimizada para números (fechas, IDs)
    fontSize: fonts.size.medium, // ✅ Mantiene autoscaling
    color: '#2F2F2F',
    marginBottom: 4,
  },
  orderInfoPrice: {
    fontFamily: fonts.priceBold, // ✅ Fuente optimizada para precios
    fontSize: fonts.size.medium, // ✅ Mantiene autoscaling
    color: '#33A744',
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
});


export default OrderDetails;
