import React, {useContext, useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
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
import {AuthContext} from '../context/AuthContext';
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
import { API_BASE_URL } from '../config/environment';

// ✅ FUNCIÓN: Traducir estados de órdenes a español
// Backend estados: Processing Payment, Open, On the Way, Arriving, Delivered, Cancelled
const translateStatus = (status) => {
  if (!status) return 'Desconocido';

  const translations = {
    'processing payment': 'Procesando pago',
    'open': 'Abierto',
    'on the way': 'En camino',
    'arriving': 'Llegando',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado',
  };

  return translations[status.toLowerCase()] || status;
};

// ✅ FUNCIÓN: Traducir estados de pago a español
const translatePaymentStatus = (paymentStatus) => {
  if (!paymentStatus) return 'Desconocido';
  
  const translations = {
    'pending': 'Pendiente',
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
  // Estados para problema con pedido
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemLoading, setProblemLoading] = useState(false);
  // Estados para cancelación de pedido
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  // ✅ Ref para el intervalo de auto-refresh
  const refreshIntervalRef = useRef(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/orderdetails/${orderId}`,
      );
      setOrder(res.data.order); // adjust according to your response shape
    } catch (err) {
      // Order fetch error
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // ✅ Auto-refresh: Actualizar estado del pedido cada 5 segundos
  useEffect(() => {
    if (!orderId) return;

    // Fetch inicial
    fetchOrder();

    // Configurar intervalo de auto-refresh (5 segundos)
    refreshIntervalRef.current = setInterval(() => {
      fetchOrder();
    }, 5000);

    // Cleanup: Limpiar intervalo al desmontar
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [orderId, fetchOrder]);

  // Schema de validación para el formulario de soporte
  const SupportSchema = Yup.object().shape({
    message: Yup.string().required('El mensaje es obligatorio'),
  });

  // Función para manejar el envío del formulario de soporte
  const handleSupportSubmit = async (values, { setSubmitting, resetForm }) => {
    setSupportLoading(true);
    try {
      // ✅ MEJORADO: Enviar información completa del remitente al backend
      const payload = {
        orderno: order?.id?.toString() || '',
        message: values.message,
        // Información del remitente (cliente)
        sender_type: 'customer',
        sender_id: user?.id || null,
        sender_name: user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`
          : null,
        sender_email: user?.email || null,
        sender_phone: user?.phone || null,
        category: 'consulta',
        priority: 'media',
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

  // ✅ PUNTO 21 + 22: Función para detectar si mostrar botón de problema
  const shouldShowProblemButton = () => {
    if (!order) return false;

    // 1. Solo para pedidos en tránsito/camino
    // Backend estados activos: On the Way, Arriving
    const inTransitStatuses = ['on the way', 'arriving'];
    const orderStatus = order.status?.toLowerCase();

    if (!inTransitStatuses.includes(orderStatus)) return false;

    // 2. ✅ PUNTO 22: Verificar si ha pasado más del 15% del tiempo estimado
    const deliveryTime = order.delivery_time; // Tiempo estimado en minutos
    const assignedTime = order.assigned_at || order.updated_at; // Cuando se asignó el driver

    if (!deliveryTime || !assignedTime) return false;

    // Calcular tiempo transcurrido desde asignación
    const now = new Date();
    const assignedDate = new Date(assignedTime);
    const elapsedMinutes = (now - assignedDate) / (1000 * 60);

    // Calcular 15% del tiempo estimado
    const timeThreshold = deliveryTime * 0.15;

    // Mostrar botón si ha pasado más del 15% del tiempo estimado
    return elapsedMinutes > timeThreshold;
  };

  // ✅ PUNTO 21: Función para manejar problema con pedido
  const handleProblemSubmit = async () => {
    setProblemLoading(true);
    try {
      // ✅ MEJORADO: Enviar información completa del remitente al backend
      const payload = {
        orderno: order?.id?.toString() || '',
        message: 'Tengo un problema con mi pedido',
        // Información del remitente (cliente)
        sender_type: 'customer',
        sender_id: user?.id || null,
        sender_name: user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`
          : null,
        sender_email: user?.email || null,
        sender_phone: user?.phone || null,
        category: 'problema',  // Esta es una categoría de problema
        priority: 'alta',       // Los problemas tienen prioridad alta
      };

      const response = await axios.post(`${API_BASE_URL}/api/compsubmit`, payload);

      if (response.status === 200) {
        showAlert({
          type: 'success',
          title: '⚠️ Problema Reportado',
          message: 'Hemos recibido tu reporte. Nuestro equipo se comunicará contigo pronto.',
          confirmText: 'OK',
        });
        setShowProblemModal(false);
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo enviar tu reporte. Inténtalo de nuevo',
        confirmText: 'Cerrar',
      });
    } finally {
      setProblemLoading(false);
    }
  };

  // Función para detectar si mostrar botón de cancelar (USUARIOS)
  const shouldShowCancelButton = () => {
    if (!order) return false;

    // Solo para usuarios normales (no drivers)
    if (user?.usertype === 'driver') return false;

    const status = order.status?.toLowerCase();

    // No mostrar si ya está cancelado o entregado
    // Backend estados finalizados: Delivered, Cancelled
    const finishedStatuses = ['cancelled', 'delivered'];
    if (finishedStatuses.includes(status)) return false;

    return true;
  };

  // ✅ Función para detectar si mostrar botón de cancelar (DRIVERS)
  const shouldShowDriverCancelButton = () => {
    if (!order) return false;

    // Solo para drivers
    if (user?.usertype !== 'driver') return false;

    const status = order.status?.toLowerCase();

    // Solo mostrar en estados activos (cuando el driver ya aceptó la orden)
    // Backend estados activos: On the Way, Arriving
    const activeStatuses = ['on the way', 'arriving'];
    if (!activeStatuses.includes(status)) return false;

    return true;
  };

  // ✅ Función para manejar cancelación de pedido (USUARIO)
  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      showAlert({
        type: 'error',
        title: 'Campo requerido',
        message: 'Por favor ingresa un motivo de cancelación',
        confirmText: 'OK',
      });
      return;
    }

    setCancelLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/orders/cancel`,
        {
          order_id: order?.id,
          cancellation_reason: cancelReason.trim(),
          cancelled_by: 'customer'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        showAlert({
          type: 'success',
          title: '✅ Pedido Cancelado',
          message: 'Tu pedido ha sido cancelado exitosamente.',
          confirmText: 'OK',
        });

        setShowCancelModal(false);
        setCancelReason('');

        // Recargar datos de la orden
        fetchOrder();
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: response.data.message || 'No se pudo cancelar el pedido',
          confirmText: 'Cerrar',
        });
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'No se pudo cancelar el pedido. Inténtalo de nuevo',
        confirmText: 'Cerrar',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  // ✅ Función para manejar cancelación de pedido (DRIVER)
  const handleDriverCancelOrder = async () => {
    if (!cancelReason.trim()) {
      showAlert({
        type: 'error',
        title: 'Campo requerido',
        message: 'Por favor ingresa un motivo por el cual no puedes entregar',
        confirmText: 'OK',
      });
      return;
    }

    setCancelLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/orders/cancel`,
        {
          order_id: order?.id,
          cancellation_reason: cancelReason.trim(),
          cancelled_by: 'driver'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        showAlert({
          type: 'success',
          title: '✅ Pedido Cancelado',
          message: 'Tu pedido ha sido cancelado exitosamente.',
          confirmText: 'OK',
        });

        setShowCancelModal(false);
        setCancelReason('');

        // Recargar datos de la orden
        fetchOrder();
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: response.data.message || 'No se pudo cancelar el pedido',
          confirmText: 'Cerrar',
        });
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'No se pudo cancelar el pedido. Inténtalo de nuevo',
        confirmText: 'Cerrar',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#D27F27" />
          <Text style={styles.loadingText}>Cargando detalles...</Text>
        </View>
      </View>
    );
  }

  // Return JSX
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="document-text" size={20} color="#D27F27" />
          </View>
          <Text style={styles.headerTitle}>Detalles del pedido</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        keyboardDismissMode="interactive"
      >
        {/* 🚚 VISTA PARA DRIVERS - Card unificada sin precios */}
        {user?.usertype === 'driver' ? (
          <View style={styles.driverOrderCard}>
            {/* Header con ID y Status */}
            <View style={styles.orderHeader}>
              <View style={styles.orderIdSection}>
                <Ionicons name="receipt-outline" size={16} color="#D27F27" />
                <Text style={styles.orderIdText}>{order?.order_number || formatOrderId(order?.created_at)}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                order?.status?.toLowerCase() === 'delivered' && styles.statusBadgeDelivered,
                order?.status?.toLowerCase() === 'cancelled' && styles.statusBadgeCancelled,
                (order?.status?.toLowerCase() === 'on the way' || order?.status?.toLowerCase() === 'arriving') && styles.statusBadgeActive,
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  order?.status?.toLowerCase() === 'delivered' && styles.statusTextDelivered,
                  order?.status?.toLowerCase() === 'cancelled' && styles.statusTextCancelled,
                  (order?.status?.toLowerCase() === 'on the way' || order?.status?.toLowerCase() === 'arriving') && styles.statusTextActive,
                ]}>{translateStatus(order?.status)}</Text>
              </View>
            </View>

            {/* Fecha del pedido */}
            <View style={styles.orderInfoRow}>
              <View style={styles.orderInfoItem}>
                <Text style={styles.orderInfoLabel}>Fecha del pedido</Text>
                <Text style={styles.orderInfoValue}>
                  {new Date(order?.created_at).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })} - {new Date(order?.created_at).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Artículos sin precios */}
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={18} color="#8B5E3C" />
              <Text style={styles.sectionTitle}>Artículos del pedido</Text>
            </View>
            {order?.order_details?.length > 0 ? (
              order.order_details.map((product, i) => (
                <View key={i} style={styles.driverItemRow}>
                  <Image
                    source={{uri: product.item_image}}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemText}>
                      {product.item_qty}× {product.item_name}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noItems}>No hay artículos en este pedido</Text>
            )}

            {/* Información del cliente */}
            <View style={styles.driverCustomerSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-circle-outline" size={18} color="#8B5E3C" />
                <Text style={styles.sectionTitle}>Información del Cliente</Text>
              </View>

              {/* Nombre del cliente */}
              {(order?.customer?.first_name || order?.customer?.email) && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="person-outline" size={16} color="#2196F3" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Cliente</Text>
                    <Text style={styles.infoValue}>
                      {order.customer?.first_name
                        ? order.customer.first_name
                        : order.customer?.email || 'Cliente'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Fecha programada */}
              {order?.delivery_date && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="calendar-outline" size={16} color="#33A744" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Fecha programada</Text>
                    <Text style={styles.infoValue}>
                      {new Date(order.delivery_date).toLocaleDateString('es-MX', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Horario programado */}
              {order?.delivery_slot && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="time-outline" size={16} color="#D27F27" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Horario</Text>
                    <Text style={styles.infoValue}>
                      {order.delivery_slot}
                    </Text>
                  </View>
                </View>
              )}

              {/* Dirección de entrega */}
              {order?.delivery_address && (
                <View style={[styles.infoRow, styles.infoRowLast]}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="location-outline" size={16} color="#8B5E3C" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Dirección</Text>
                    <Text style={styles.infoValueAddress}>
                      {order.delivery_address}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* 👤 VISTA PARA CLIENTES - Cards separadas con precios */
          <>
            <View style={styles.orderInfo}>
              {/* Header con ID y Status - Diseño limpio en fila */}
              <View style={styles.orderHeader}>
                <View style={styles.orderIdSection}>
                  <Ionicons name="receipt-outline" size={16} color="#D27F27" />
                  <Text style={styles.orderIdText}>{order?.order_number || formatOrderId(order?.created_at)}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  order?.status?.toLowerCase() === 'delivered' && styles.statusBadgeDelivered,
                  order?.status?.toLowerCase() === 'cancelled' && styles.statusBadgeCancelled,
                  (order?.status?.toLowerCase() === 'on the way' || order?.status?.toLowerCase() === 'arriving') && styles.statusBadgeActive,
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    order?.status?.toLowerCase() === 'delivered' && styles.statusTextDelivered,
                    order?.status?.toLowerCase() === 'cancelled' && styles.statusTextCancelled,
                    (order?.status?.toLowerCase() === 'on the way' || order?.status?.toLowerCase() === 'arriving') && styles.statusTextActive,
                  ]}>{translateStatus(order?.status)}</Text>
                </View>
              </View>

              {/* Fila de Fecha y Pago - Alineados */}
              <View style={styles.orderInfoRow}>
                <View style={styles.orderInfoItem}>
                  <Text style={styles.orderInfoLabel}>Fecha del pedido</Text>
                  <Text style={styles.orderInfoValue}>
                    {new Date(order?.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.orderInfoItem}>
                  <Text style={styles.orderInfoLabel}>Estado de pago</Text>
                  <View style={styles.paymentStatusRow}>
                    <View style={[
                      styles.paymentDot,
                      order?.payment_status === 'paid' && styles.paymentDotPaid,
                      order?.payment_status === 'pending' && styles.paymentDotPending,
                      order?.payment_status === 'failed' && styles.paymentDotFailed,
                    ]} />
                    <Text style={[
                      styles.orderInfoValue,
                      order?.payment_status === 'paid' && styles.paymentValuePaid,
                      order?.payment_status === 'pending' && styles.paymentValuePending,
                      order?.payment_status === 'failed' && styles.paymentValueFailed,
                    ]}>
                      {translatePaymentStatus(order?.payment_status)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.sectionHeader}>
                <Ionicons name="cube-outline" size={18} color="#8B5E3C" />
                <Text style={styles.sectionTitle}>Artículos</Text>
              </View>
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
              <View style={styles.sectionHeader}>
                <Ionicons name="bicycle-outline" size={18} color="#8B5E3C" />
                <Text style={styles.sectionTitle}>Información de Entrega</Text>
              </View>

              <View style={styles.deliveryBreakdown}>
                {/* Información del repartidor (para usuarios) */}
                {order?.driver && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="car-outline" size={16} color="#D27F27" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Repartidor</Text>
                      <Text style={styles.infoValue}>
                        {order.driver?.first_name
                          ? `${order.driver.first_name} ${order.driver.last_name || ''}`.trim()
                          : order.driver?.name || 'Tu repartidor'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Fecha programada */}
                {order?.delivery_date && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="calendar-outline" size={16} color="#33A744" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Fecha programada</Text>
                      <Text style={styles.infoValue}>
                        {new Date(order.delivery_date).toLocaleDateString('es-MX', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Horario programado */}
                {order?.delivery_slot && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="time-outline" size={16} color="#D27F27" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Horario</Text>
                      <Text style={styles.infoValue}>
                        {order.delivery_slot}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Dirección de entrega */}
                {order?.delivery_address && (
                  <View style={[styles.infoRow, styles.infoRowLast]}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="location-outline" size={16} color="#8B5E3C" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Dirección</Text>
                      <Text style={styles.infoValueAddress}>
                        {order.delivery_address}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {/* Lógica de visualización según estado real del pedido */}
        {(() => {
          const status = order?.status?.toLowerCase();
          const hasDriver = order?.driver;
          const isDriver = user?.usertype === 'driver';

          // Backend estados: Processing Payment, Open, On the Way, Arriving, Delivered, Cancelled

          // ESTADOS DE CANCELACIÓN
          const isCancelled = status === 'cancelled';

          // ESTADOS DE ENTREGA COMPLETADA
          const isDelivered = status === 'delivered';

          // ESTADOS DE PAGO PENDIENTE (excluyendo OXXO)
          const isPendingPayment = status === 'processing payment' &&
                                  !(order?.payment_status === 'requires_action' ||
                                    order?.payment_status === 'pending' ||
                                    order?.payment_status === 'requires_payment_method');

          // ESTADOS ESPECÍFICOS PARA OXXO PENDIENTE
          const isOxxoPending = (status === 'open' || status === 'processing payment') &&
                               (order?.payment_status === 'requires_action' ||
                                order?.payment_status === 'pending' ||
                                order?.payment_status === 'requires_payment_method');

          // ESTADOS ACTIVOS (driver aceptó y está en camino)
          // Backend estados activos: On the Way, Arriving
          const isActive = status === 'on the way' || status === 'arriving';

          // 1. PEDIDO CANCELADO - Prioridad máxima
          if (isCancelled) {
            return (
              <View style={styles.statusCard}>
                <View style={styles.statusCardBorder} />
                <View style={[styles.statusIconCircle, styles.statusIconCircleCancelled]}>
                  <Ionicons name="close-circle" size={50} color="#E63946" />
                </View>
                <Text style={[styles.statusCardTitle, styles.statusCardTitleCancelled]}>Pedido Cancelado</Text>
                <Text style={styles.statusCardMessage}>
                  {isDriver
                    ? 'Este pedido ha sido cancelado. No es necesario realizar ninguna acción.'
                    : 'Tu pedido ha sido cancelado. Si tienes alguna duda, contáctanos.'
                  }
                </Text>
              </View>
            );
          }

          // 2. OXXO PENDIENTE - Específico para pagos OXXO
          if (isOxxoPending) {
            // console.log('🏪 ENTRANDO A: OXXO PENDIENTE');
            return (
              <View style={styles.statusCard}>
                <View style={[styles.statusCardBorder, styles.statusCardBorderOxxo]} />
                <View style={[styles.statusIconCircle, styles.statusIconCircleOxxo]}>
                  <Ionicons name="receipt-outline" size={50} color="#FF9800" />
                </View>
                <Text style={[styles.statusCardTitle, styles.statusCardTitleOxxo]}>Pago Pendiente en OXXO</Text>
                <Text style={styles.statusCardMessage}>
                  Tu pedido ha sido confirmado. Para completar el proceso,
                  realiza el pago en cualquier tienda OXXO con el voucher
                  que recibiste. Tu pedido se preparará una vez confirmado el pago.
                </Text>
              </View>
            );
          }

          // 3. PAGO PENDIENTE - Sin validar (otros métodos)
          if (isPendingPayment) {
            // console.log('💳 ENTRANDO A: PAGO PENDIENTE');
            return (
              <View style={styles.statusCard}>
                <View style={[styles.statusCardBorder, styles.statusCardBorderPending]} />
                <View style={[styles.statusIconCircle, styles.statusIconCirclePending]}>
                  <Ionicons name="card-outline" size={50} color="#2196F3" />
                </View>
                <Text style={[styles.statusCardTitle, styles.statusCardTitlePending]}>Validando Pago</Text>
                <Text style={styles.statusCardMessage}>
                  Tu pago aún no ha sido validado. En cuanto se confirme,
                  procederemos con la preparación de tu pedido.
                </Text>
              </View>
            );
          }

          // 3. PEDIDO ENTREGADO - Sin mapa
          if (isDelivered) {
            // console.log('📦 ENTRANDO A: PEDIDO ENTREGADO');
            return (
              <View style={styles.statusCard}>
                <View style={[styles.statusCardBorder, styles.statusCardBorderDelivered]} />
                <View style={[styles.statusIconCircle, styles.statusIconCircleDelivered]}>
                  <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
                </View>
                <Text style={[styles.statusCardTitle, styles.statusCardTitleDelivered]}>
                  {isDriver ? '¡Entrega Completada!' : '¡Pedido Entregado!'}
                </Text>
                <Text style={styles.statusCardMessage}>
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
            // console.log('🚚 ENTRANDO A: DRIVER ACTIVO');
            return (
              <>
                <DriverTracking order={order} />
                <Chat orderId={orderId} order={order} />
              </>
            );
          }

          // 5. USUARIO - Ve mapa solo cuando driver acepta
          if (!isDriver && isActive && hasDriver) {
            // console.log('👤 ENTRANDO A: USUARIO CON DRIVER ACTIVO');
            return (
              <>
                <CustomerTracking order={order} />
                <Chat orderId={orderId} order={order} />
              </>
            );
          }

          // 6A. DRIVER ASIGNADO - Vista para DRIVER (mapa + botón + card)
          if (isDriver && hasDriver && !isActive) {
            return (
              <>
                {/* Mapa y botón para driver asignado */}
                <DriverTracking order={order} />

                {/* Card informativo */}
                <View style={styles.statusCard}>
                  <View style={[styles.statusCardBorder, styles.statusCardBorderAssigned]} />
                  <View style={[styles.statusIconCircle, styles.statusIconCircleAssigned]}>
                    <Ionicons name="person-outline" size={50} color="#FF9800" />
                  </View>
                  <Text style={[styles.statusCardTitle, styles.statusCardTitleAssigned]}>Pedido Asignado</Text>
                  <Text style={styles.statusCardMessage}>
                    Se te ha asignado este pedido. Revisa la ubicación del cliente en el mapa y confirma si puedes tomarlo.
                  </Text>
                </View>
              </>
            );
          }

          // 6B. DRIVER ASIGNADO - Vista para USUARIO (solo card como está)
          if (!isDriver && hasDriver && !isActive) {
            return (
              <View style={styles.statusCard}>
                <View style={[styles.statusCardBorder, styles.statusCardBorderAssigned]} />
                <View style={[styles.statusIconCircle, styles.statusIconCircleAssigned]}>
                  <Ionicons name="person-outline" size={50} color="#FF9800" />
                </View>
                <Text style={[styles.statusCardTitle, styles.statusCardTitleAssigned]}>Repartidor Asignado</Text>
                <Text style={styles.statusCardMessage}>
                  Hemos asignado a {order?.driver?.first_name
                    ? `${order.driver.first_name} ${order.driver.last_name || ''}`.trim()
                    : order?.driver?.name || 'un repartidor'} a tu pedido. Prepárate para el día de tu entrega{order?.delivery_date ? ` el ${new Date(order.delivery_date).toLocaleDateString('es-MX')}` : ''}{order?.delivery_slot ? ` a las ${order.delivery_slot}` : ''}. Da seguimiento a tu fecha de entrega.
                </Text>
              </View>
            );
          }

          // 7. PEDIDO CONFIRMADO SIN REPARTIDOR ASIGNADO
          return (
            <View style={styles.statusCard}>
              <View style={[styles.statusCardBorder, styles.statusCardBorderConfirmed]} />
              <View style={[styles.statusIconCircle, styles.statusIconCircleConfirmed]}>
                <Ionicons name="checkmark-outline" size={50} color="#4CAF50" />
              </View>
              <Text style={[styles.statusCardTitle, styles.statusCardTitleConfirmed]}>Pedido Confirmado</Text>
              <Text style={styles.statusCardMessage}>
                Tu pedido ha sido confirmado y pagado. Nuestro equipo está
                coordinando la asignación de un repartidor.
              </Text>
            </View>
          );
        })()}

        {/* Botón de Atención al Cliente - Solo para usuarios después de entrega */}
        {/* Backend estado: Delivered */}
        {user?.usertype !== 'driver' &&
         order?.status?.toLowerCase() === 'delivered' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowSupportModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="headset-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Atención al Cliente</Text>
          </TouchableOpacity>
        )}

        {/* ✅ PUNTO 21: Botón de Problema con Pedido - Solo para pedidos en tránsito */}
        {user?.usertype !== 'driver' && shouldShowProblemButton() && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonWarning]}
            onPress={() => setShowProblemModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="alert-circle-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Tengo un problema con mi pedido</Text>
          </TouchableOpacity>
        )}

        {/* ✅ Botón de Cancelar Pedido - Para usuarios */}
        {shouldShowCancelButton() && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={() => setShowCancelModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Cancelar Pedido</Text>
          </TouchableOpacity>
        )}

        {/* ✅ Botón de Cancelar Pedido - Para drivers */}
        {shouldShowDriverCancelButton() && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonWarning]}
            onPress={() => setShowCancelModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>No puedo entregar</Text>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{flex: 1}}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
            }}>
            <View style={styles.modalContainer}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
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
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ✅ PUNTO 21: Modal de Problema con Pedido */}
      <Modal
        visible={showProblemModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowProblemModal(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{flex: 1}}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
            }}>
            <View style={styles.modalContainer}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalKeyboardContainer}>
                  <Text style={styles.modalTitle}>⚠️ Problema con Pedido</Text>

                  <View style={styles.problemInfoContainer}>
                    <Text style={styles.problemInfoText}>
                      📦 Pedido: #{order?.order_number || formatOrderId(order?.created_at)}
                    </Text>
                    <Text style={styles.problemMessageText}>
                      Se enviará automáticamente el siguiente mensaje:
                    </Text>
                    <View style={styles.problemMessageContainer}>
                      <Text style={styles.problemMessagePreview}>
                        "Tengo un problema con mi pedido"
                      </Text>
                    </View>
                    <Text style={styles.problemWarningText}>
                      Nuestro equipo se comunicará contigo lo antes posible.
                    </Text>
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => setShowProblemModal(false)}
                      disabled={problemLoading}>
                      <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.problemSendButton}
                      onPress={handleProblemSubmit}
                      disabled={problemLoading}>
                      {problemLoading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.problemSendButtonText}>⚠️ Reportar Problema</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ✅ Modal de Cancelar Pedido */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowCancelModal(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{flex: 1}}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
            }}>
            <View style={styles.modalContainer}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.cancelModalHeader}>
                    <Ionicons name="close-circle" size={50} color="#E63946" />
                    <Text style={styles.cancelModalTitle}>
                      {user?.usertype === 'driver' ? 'No puedo entregar' : 'Cancelar Pedido'}
                    </Text>
                  </View>

                  <View style={styles.cancelWarningBox}>
                    <Text style={styles.cancelWarningText}>
                      ⚠️ Esta acción no se puede deshacer.
                      {user?.usertype === 'driver'
                        ? ' El pedido será cancelado y el cliente será notificado.'
                        : ' Tu pedido será cancelado de inmediato.'}
                    </Text>
                  </View>

                  {/* Información de la orden */}
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>
                      {user?.usertype === 'driver' ? 'Orden que no puedes entregar' : 'Orden a cancelar'}
                    </Text>
                    <View style={styles.orderInfoBox}>
                      <Text style={styles.orderInfoText}>
                        Pedido {order?.order_number || formatOrderId(order?.created_at)} - {new Date(order?.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </Text>
                      {user?.usertype !== 'driver' && (
                        <Text style={styles.orderInfoPrice}>
                          {formatPriceWithSymbol(order?.total_amount || order?.total_price || 0)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Motivo de cancelación */}
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>
                      {user?.usertype === 'driver' ? 'Motivo por el cual no puedes entregar *' : 'Motivo de cancelación *'}
                    </Text>
                    <TextInput
                      style={[
                        styles.modalTextArea,
                        !cancelReason.trim() && cancelLoading && styles.modalInputError
                      ]}
                      placeholder={
                        user?.usertype === 'driver'
                          ? "Por favor cuéntanos por qué no puedes entregar este pedido..."
                          : "Por favor cuéntanos por qué deseas cancelar tu pedido..."
                      }
                      placeholderTextColor="rgba(47,47,47,0.6)"
                      value={cancelReason}
                      onChangeText={setCancelReason}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      returnKeyType="done"
                    />
                  </View>

                  {/* Botones */}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowCancelModal(false);
                        setCancelReason('');
                      }}
                      disabled={cancelLoading}>
                      <Text style={styles.modalCancelButtonText}>
                        Mantener pedido
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmCancelButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        user?.usertype === 'driver' ? handleDriverCancelOrder() : handleCancelOrder();
                      }}
                      disabled={cancelLoading}>
                      {cancelLoading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.confirmCancelButtonText}>
                          Cancelar pedido
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderRadius: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(210, 127, 39, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  orderInfo: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // Order Header - Mismo patrón que Order.jsx
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIdSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.numericBold,
    color: '#D27F27',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  statusBadgeDelivered: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  statusBadgeText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#FF9800',
  },
  statusTextDelivered: {
    color: '#4CAF50',
  },
  statusTextCancelled: {
    color: '#E63946',
  },
  statusTextActive: {
    color: '#2196F3',
  },
  // Order Info Row - Para fecha y pago alineados
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderInfoItem: {
    flex: 1,
  },
  orderInfoLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  orderInfoValue: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
  },
  // Payment Status Row
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
    marginRight: 6,
  },
  paymentDotPaid: {
    backgroundColor: '#33A744',
  },
  paymentDotPending: {
    backgroundColor: '#FF9800',
  },
  paymentDotFailed: {
    backgroundColor: '#E63946',
  },
  paymentValuePaid: {
    color: '#33A744',
  },
  paymentValuePending: {
    color: '#FF9800',
  },
  paymentValueFailed: {
    color: '#E63946',
  },
  // Card Divider
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
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
    fontFamily: fonts.priceBold,
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
  
  // Estilos de botones de acción - Mismo patrón que Order.jsx
  actionButton: {
    backgroundColor: '#33A744',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#33A744',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  actionButtonWarning: {
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
  },
  actionButtonDanger: {
    backgroundColor: '#E63946',
    shadowColor: '#E63946',
  },
  actionButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
    marginLeft: 8,
  },

  // ✅ Estilos del modal de problema
  problemInfoContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  problemInfoText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#E65100',
    marginBottom: 8,
  },
  problemMessageText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#666',
    marginBottom: 8,
  },
  problemMessageContainer: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  problemMessagePreview: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#333',
    fontStyle: 'italic',
  },
  problemWarningText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#E65100',
    textAlign: 'center',
  },
  problemSendButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  problemSendButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // ========== ESTILOS DE MODALES ==========
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  keyboardAvoidingView: {
    width: '100%',
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.small,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderInfoBox: {
    backgroundColor: 'rgba(210, 127, 39, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.2)',
  },
  orderInfoText: {
    fontFamily: fonts.numeric,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  orderInfoPrice: {
    fontFamily: fonts.priceBold,
    fontSize: fonts.size.medium,
    color: '#33A744',
  },
  modalTextArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    backgroundColor: '#FAFAFA',
  },
  modalInputError: {
    borderColor: '#E63946',
    backgroundColor: 'rgba(230, 57, 70, 0.05)',
  },
  modalErrorText: {
    color: '#E63946',
    fontSize: fonts.size.small,
    marginTop: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#666',
  },
  modalSendButton: {
    flex: 1,
    backgroundColor: '#33A744',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSendButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // 🚚 Estilos para vista de drivers - Mismo patrón que Order.jsx
  driverOrderCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  driverItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  driverCustomerSection: {
    marginTop: 16,
    backgroundColor: 'rgba(210, 127, 39, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.15)',
  },

  // 🆕 Estilos para sección de información de entrega - Mismo patrón
  deliveryInfoSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  deliveryBreakdown: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
  },
  // Info Row Styles (nuevo sistema de filas de información)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 94, 60, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
    textTransform: 'capitalize',
  },
  infoValueAddress: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#2F2F2F',
    lineHeight: 20,
  },
  // Legacy delivery styles (para compatibilidad)
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

  // ========== STATUS CARDS - Mismo patrón que emptyCard de Order.jsx ==========
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statusCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E63946',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  statusCardBorderDelivered: {
    backgroundColor: '#4CAF50',
  },
  statusCardBorderPending: {
    backgroundColor: '#2196F3',
  },
  statusCardBorderConfirmed: {
    backgroundColor: '#4CAF50',
  },
  statusCardBorderAssigned: {
    backgroundColor: '#FF9800',
  },
  statusCardBorderOxxo: {
    backgroundColor: '#FF9800',
  },
  statusIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusIconCircleCancelled: {
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
  },
  statusIconCircleDelivered: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  statusIconCirclePending: {
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
  },
  statusIconCircleConfirmed: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  statusIconCircleAssigned: {
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
  },
  statusIconCircleOxxo: {
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
  },
  statusCardTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.XL,
    textAlign: 'center',
    marginBottom: 12,
    color: '#E63946',
  },
  statusCardTitleCancelled: {
    color: '#E63946',
  },
  statusCardTitleDelivered: {
    color: '#4CAF50',
  },
  statusCardTitlePending: {
    color: '#2196F3',
  },
  statusCardTitleConfirmed: {
    color: '#4CAF50',
  },
  statusCardTitleAssigned: {
    color: '#FF9800',
  },
  statusCardTitleOxxo: {
    color: '#FF9800',
  },
  statusCardMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Legacy status containers (mantener para compatibilidad)
  cancelledContainer: {
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
    borderWidth: 2,
    borderColor: '#E63946',
  },
  cancelledIconContainer: {
    marginBottom: 20,
  },
  cancelledTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.xlarge,
    color: '#E63946',
    textAlign: 'center',
    marginBottom: 12,
  },
  cancelledMessage: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

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

  // ✅ Estilos para modal de cancelación
  cancelModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelModalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#E63946',
    textAlign: 'center',
    marginTop: 12,
  },
  cancelWarningBox: {
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#E63946',
  },
  cancelWarningText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#C1121F',
    lineHeight: 20,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#E63946',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // ✅ Contenedores adicionales para modales
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalKeyboardContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  // ========== ESTILOS DE LOADING - Mismo patrón que Order.jsx ==========
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFE4',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#888',
    marginTop: 16,
  },
});


export default OrderDetails;
