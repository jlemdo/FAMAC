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
    'paid': 'Pagado', 
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
        `https://occr.pixelcrafters.digital/api/orderdetails/${orderId}`,
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
        'https://occr.pixelcrafters.digital/api/compsubmit',
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
              <Text style={styles.orderIdText}>{order?.order_number || formatOrderId(order?.created_at)}</Text>
            </View>
            <View style={styles.statusSection}>
              <Text style={styles.statusText}>Estado: {translateStatus(order?.status)}</Text>
              {/* 🆕 Nuevo: Payment Status */}
              <Text style={[
                styles.paymentStatusText,
                order?.payment_status === 'pending' && styles.paymentStatusPending,
                order?.payment_status === 'paid' && styles.paymentStatusCompleted,
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

          {/* 🚚 Desglose de precios */}
          <View style={styles.priceBreakdown}>
            {/* Subtotal de productos */}
            {order?.subtotal && order.subtotal > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal productos</Text>
                <Text style={styles.priceValue}>
                  {formatPriceWithSymbol(order.subtotal)}
                </Text>
              </View>
            )}
            
            {/* Costo de envío */}
            {order?.shipping_cost && order.shipping_cost > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Costo de envío</Text>
                <Text style={styles.priceValue}>
                  {formatPriceWithSymbol(order.shipping_cost)}
                </Text>
              </View>
            )}
            
            {/* Descuento */}
            {order?.discount_amount && order.discount_amount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.discountLabel]}>Descuento</Text>
                <Text style={[styles.priceValue, styles.discountValue]}>
                  -{formatPriceWithSymbol(order.discount_amount)}
                </Text>
              </View>
            )}
            
            {/* Total */}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Precio total</Text>
              <Text style={styles.totalValue}>
                {formatPriceWithSymbol(order?.total_amount || order?.total_price)}
              </Text>
            </View>
          </View>
        </View>

         {/* 🆕 Sección de información de entrega */}
          <View style={styles.deliveryInfoSection}>
            <Text style={styles.sectionTitle}>📦 Información de Entrega</Text>
            
            <View style={styles.deliveryBreakdown}>
              {/* Nombre del cliente (para drivers) */}
              {user?.usertype === 'driver' && (order?.customer?.first_name || order?.customer?.email) && (
                <View style={styles.deliveryRow}>
                  <View style={styles.deliveryLabelContainer}>
                    <Ionicons name="person-outline" size={16} color="#2196F3" />
                    <Text style={styles.deliveryLabel}>Cliente</Text>
                  </View>
                  <Text style={styles.deliveryValue}>
                    {order.customer?.first_name 
                      ? `${order.customer.first_name} ${order.customer.last_name || ''}`.trim()
                      : order.customer?.email || 'Cliente'}
                  </Text>
                </View>
              )}
              
              {/* Información del conductor (para usuarios) */}
              {user?.usertype !== 'driver' && order?.driver && (
                <View style={styles.deliveryRow}>
                  <View style={styles.deliveryLabelContainer}>
                    <Ionicons name="car-outline" size={16} color="#D27F27" />
                    <Text style={styles.deliveryLabel}>Conductor</Text>
                  </View>
                  <Text style={styles.deliveryValue}>
                    {order.driver?.first_name 
                      ? `${order.driver.first_name} ${order.driver.last_name || ''}`.trim()
                      : order.driver?.name || 'Tu repartidor'}
                  </Text>
                </View>
              )}
              
              {/* Fecha programada */}
              {order?.delivery_date && (
                <View style={styles.deliveryRow}>
                  <View style={styles.deliveryLabelContainer}>
                    <Ionicons name="calendar-outline" size={16} color="#33A744" />
                    <Text style={styles.deliveryLabel}>Fecha programada</Text>
                  </View>
                  <Text style={styles.deliveryValue}>
                    {new Date(order.delivery_date).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              )}

              {/* Horario programado */}
              {order?.delivery_slot && (
                <View style={styles.deliveryRow}>
                  <View style={styles.deliveryLabelContainer}>
                    <Ionicons name="time-outline" size={16} color="#D27F27" />
                    <Text style={styles.deliveryLabel}>Horario</Text>
                  </View>
                  <Text style={styles.deliveryValue}>
                    {order.delivery_slot}
                  </Text>
                </View>
              )}

              {/* Dirección de entrega */}
              {order?.delivery_address && (
                <View style={[styles.deliveryRow, styles.addressRow]}>
                  <View style={styles.deliveryLabelContainer}>
                    <Ionicons name="location-outline" size={16} color="#8B5E3C" />
                    <Text style={styles.deliveryLabel}>Dirección</Text>
                  </View>
                  <Text style={[styles.deliveryValue, styles.addressValue]}>
                    {order.delivery_address}
                  </Text>
                </View>
              )}
            </View>

            {/* Estado del repartidor y mensaje informativo */}
            {/* <View style={styles.driverStatusContainer}>
              {order.driver ? (
                <View style={styles.driverAssignedInfo}>
                  <Ionicons name="person-circle" size={20} color="#33A744" />
                  <Text style={styles.driverAssignedText}>
                    Repartidor asignado: {order.driver.name || 'Conductor'}
                  </Text>
                </View>
              ) : (
                <View style={styles.driverPendingInfo}>
                  <Ionicons name="hourglass-outline" size={20} color="#D27F27" />
                  <View style={styles.driverPendingTextContainer}>
                    <Text style={styles.driverPendingTitle}>Buscando repartidor</Text>
                    <Text style={styles.driverPendingMessage}>
                      {(order?.delivery_date || order?.delivery_slot) 
                        ? `Tu pedido será enviado ${order?.delivery_date ? 'el ' + new Date(order.delivery_date).toLocaleDateString('es-MX') : ''} ${order?.delivery_slot ? 'en el horario ' + order.delivery_slot : ''}. Te avisaremos en cuanto te asignemos un repartidor.`
                        : 'Te avisaremos en cuanto te asignemos un repartidor y confirmemos la hora de entrega.'
                      }
                    </Text>
                  </View>
                </View>
              )}
            </View> */}
          </View>

        {/* Lógica de visualización según estado real del pedido */}
        {(() => {
          const status = order?.status?.toLowerCase();
          const hasDriver = order?.driver;
          const isDriver = user?.usertype === 'driver';

          // ESTADOS DE ENTREGA COMPLETADA
          const isDelivered = status === 'delivered' || status === 'entregado' ||
                             status === 'completed' || status === 'completado';

          // ESTADOS DE PAGO PENDIENTE (excluyendo OXXO)
          const isPendingPayment = (status === 'processing payment' || status === 'pending payment' ||
                                  status === 'processing' || status === 'pending') &&
                                  !(order?.payment_status === 'requires_action' ||
                                    order?.payment_status === 'pending' ||
                                    order?.payment_status === 'requires_payment_method');

          // ESTADOS ESPECÍFICOS PARA OXXO PENDIENTE
          const isOxxoPending = (status === 'open' || status === 'processing payment' || status === 'processing') &&
                               (order?.payment_status === 'requires_action' ||
                                order?.payment_status === 'pending' ||
                                order?.payment_status === 'requires_payment_method');

          // 🔍 DEBUG: Ver valores reales
          console.log('🔍 OXXO DEBUG:', {
            status: order?.status,
            payment_status: order?.payment_status,
            isOxxoPending,
            statusLower: status
          });

          // ESTADOS ACTIVOS (driver aceptó y está en camino)
          const isActive = status === 'in progress' || status === 'on the way' ||
                          status === 'en camino' || status === 'preparing' || status === 'preparando';

          // 1. OXXO PENDIENTE - Específico para pagos OXXO
          if (isOxxoPending) {
            return (
              <View style={styles.oxxoPendingContainer}>
                <View style={styles.oxxoPendingIconContainer}>
                  <Ionicons name="receipt-outline" size={50} color="#FF9800" />
                </View>
                <Text style={styles.oxxoPendingTitle}>Pago Pendiente en OXXO</Text>
                <Text style={styles.oxxoPendingMessage}>
                  Tu pedido ha sido confirmado. Para completar el proceso,
                  realiza el pago en cualquier tienda OXXO con el voucher
                  que recibiste. Tu pedido se preparará una vez confirmado el pago.
                </Text>
              </View>
            );
          }

          // 2. PAGO PENDIENTE - Sin validar (otros métodos)
          if (isPendingPayment) {
            return (
              <View style={styles.pendingContainer}>
                <View style={styles.pendingIconContainer}>
                  <Ionicons name="card-outline" size={50} color="#2196F3" />
                </View>
                <Text style={styles.pendingTitle}>Validando Pago</Text>
                <Text style={styles.pendingMessage}>
                  Tu pago aún no ha sido validado. En cuanto se confirme,
                  procederemos con la preparación de tu pedido.
                </Text>
              </View>
            );
          }

          // 3. PEDIDO ENTREGADO - Sin mapa
          if (isDelivered) {
            return (
              <View style={styles.deliveredContainer}>
                <View style={styles.deliveredIconContainer}>
                  <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                </View>
                <Text style={styles.deliveredTitle}>
                  {isDriver ? '¡Entrega Completada!' : '¡Pedido Entregado!'}
                </Text>
                <Text style={styles.deliveredMessage}>
                  {isDriver
                    ? 'Has completado exitosamente la entrega de este pedido. ¡Excelente trabajo!'
                    : 'Tu pedido ha sido entregado correctamente. ¡Esperamos que lo disfrutes!'
                  }
                </Text>
              </View>
            );
          }

          // 4. DRIVER - Ve mapa solo cuando acepta
          if (isDriver && isActive) {
            return (
              <>
                <DriverTracking order={order} />
                <Chat orderId={orderId} order={order} />
              </>
            );
          }

          // 5. USUARIO - Ve mapa solo cuando driver acepta
          if (!isDriver && isActive && hasDriver) {
            return (
              <>
                <CustomerTracking order={order} />
                <Chat orderId={orderId} order={order} />
              </>
            );
          }

          // 6. DRIVER ASIGNADO PERO NO HA ACEPTADO
          if (hasDriver && !isActive) {
            return (
              <View style={styles.assignedContainer}>
                <View style={styles.assignedIconContainer}>
                  <Ionicons name="person-outline" size={50} color="#FF9800" />
                </View>
                <Text style={styles.assignedTitle}>Repartidor Asignado</Text>
                <Text style={styles.assignedMessage}>
                  {isDriver
                    ? 'Se te ha asignado este pedido. Por favor confirma si puedes tomarlo.'
                    : `Hemos asignado a ${order?.driver?.first_name
                        ? `${order.driver.first_name} ${order.driver.last_name || ''}`.trim()
                        : order?.driver?.name || 'un repartidor'} a tu pedido. Esperando confirmación para iniciar la entrega.`
                  }
                </Text>
              </View>
            );
          }

          // 7. PEDIDO CONFIRMADO SIN REPARTIDOR ASIGNADO
          return (
            <View style={styles.confirmedContainer}>
              <View style={styles.confirmedIconContainer}>
                <Ionicons name="checkmark-outline" size={50} color="#4CAF50" />
              </View>
              <Text style={styles.confirmedTitle}>Pedido Confirmado</Text>
              <Text style={styles.confirmedMessage}>
                Tu pedido ha sido confirmado y pagado. Nuestro equipo está
                coordinando la asignación de un repartidor.
              </Text>
            </View>
          );
        })()}

        {/* Botón de Atención al Cliente - Solo para usuarios después de entrega */}
        {user?.usertype !== 'driver' &&
         (order?.status?.toLowerCase() === 'delivered' ||
          order?.status?.toLowerCase() === 'entregado' ||
          order?.status?.toLowerCase() === 'completed' ||
          order?.status?.toLowerCase() === 'completado') && (
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => setShowSupportModal(true)}
            activeOpacity={0.8}>
            <Text style={styles.supportButtonText}>📞 Atención al Cliente</Text>
          </TouchableOpacity>
        )}
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
                              Pedido {order?.order_number || formatOrderId(order?.created_at)} - {new Date(order?.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </Text>
                            <Text style={styles.orderInfoPrice}>
                              {formatPriceWithSymbol(order?.total_amount || order?.total_price || 0)}
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
  // 🚚 Estilos para desglose de precios
  priceBreakdown: {
    marginTop: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  priceLabel: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#6C757D',
  },
  priceValue: {
    fontFamily: fonts.priceBold,
    fontSize: fonts.size.small,
    color: '#495057',
  },
  discountLabel: {
    color: '#28A745',
  },
  discountValue: {
    color: '#28A745',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#DEE2E6',
    marginTop: 8,
    paddingTop: 12,
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

  // 🆕 Estilos para sección de información de entrega
  deliveryInfoSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deliveryBreakdown: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  addressRow: {
    borderBottomWidth: 0,
  },
  deliveryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  deliveryLabel: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#6C757D',
    marginLeft: 6,
  },
  deliveryValue: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#495057',
    flex: 2,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
  addressValue: {
    textAlign: 'right',
    textTransform: 'none',
    lineHeight: 18,
  },
  driverStatusContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
  },
  driverAssignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAssignedText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#33A744',
    marginLeft: 8,
  },
  driverPendingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  driverPendingTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  driverPendingTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#D27F27',
    marginBottom: 4,
  },
  driverPendingMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    lineHeight: 20,
  },
  
  // 🧭 Estilos para botón de navegar
  navigateButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  navigateButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
    marginLeft: 8,
  },

  // Estilos para pedido entregado
  deliveredContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  deliveredIconContainer: {
    marginBottom: 20,
  },
  deliveredTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.xlarge,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 12,
  },
  deliveredMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Estilos para pago pendiente
  pendingContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pendingIconContainer: {
    marginBottom: 20,
  },
  pendingTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 12,
  },
  pendingMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Estilos para pedido confirmado sin repartidor
  confirmedContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  confirmedIconContainer: {
    marginBottom: 20,
  },
  confirmedTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmedMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Estilos para repartidor asignado esperando confirmación
  assignedContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  assignedIconContainer: {
    marginBottom: 20,
  },
  assignedTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 12,
  },
  assignedMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Estilos para OXXO pendiente
  oxxoPendingContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  oxxoPendingIconContainer: {
    marginBottom: 20,
  },
  oxxoPendingTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 12,
  },
  oxxoPendingMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});


export default OrderDetails;
