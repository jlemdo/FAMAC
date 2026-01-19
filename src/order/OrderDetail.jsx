import React, {useContext, useState, useEffect, useCallback, useRef} from 'react';
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
import { API_BASE_URL } from '../config/environment';

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
  // ✅ PUNTO 21: Estados para problema con pedido
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemLoading, setProblemLoading] = useState(false);
  // ✅ PUNTO 23: Estados para entrega del driver
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [distanceToCustomer, setDistanceToCustomer] = useState(null);
  // ✅ Estados para cancelación de pedido
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
    const inTransitStatuses = ['en camino', 'on the way', 'on_the_way', 'assigned', 'asignado'];
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
    const shouldShow = elapsedMinutes > timeThreshold;

    // DEBUG: Log para testing (remover en producción)
    if (shouldShow) {
      console.log('🚨 PROBLEMA CON PEDIDO:', {
        orderId: order.id,
        deliveryTime: deliveryTime + ' min',
        elapsedMinutes: Math.round(elapsedMinutes) + ' min',
        threshold: Math.round(timeThreshold) + ' min',
        shouldShow
      });
    }

    return shouldShow;
    // TODO: Agregar lógica de proximidad del driver cuando esté disponible
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

  // ✅ PUNTO 23: Función para calcular distancia entre dos coordenadas (fórmula de Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c * 1000; // Convertir a metros
    return distance;
  };

  // ✅ PUNTO 23: Función para obtener ubicación del driver y calcular distancia
  const checkDriverProximity = useCallback(async () => {
    if (user?.usertype !== 'driver' || !order?.delivery_lat || !order?.delivery_long) return;

    try {
      // Obtener ubicación actual del driver
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ lat: latitude, lng: longitude });

          // Calcular distancia al cliente
          const distance = calculateDistance(
            latitude,
            longitude,
            parseFloat(order.delivery_lat),
            parseFloat(order.delivery_long)
          );

          setDistanceToCustomer(distance);

          // DEBUG: Log para testing
          console.log('📍 DRIVER PROXIMITY:', {
            driverLat: latitude,
            driverLng: longitude,
            customerLat: order.delivery_lat,
            customerLng: order.delivery_long,
            distance: Math.round(distance) + ' metros',
            within500m: distance <= 500
          });
        },
        (error) => {
          console.log('❌ Error obteniendo ubicación del driver:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    } catch (error) {
      console.log('❌ Error en checkDriverProximity:', error);
    }
  }, [user?.usertype, order?.delivery_lat, order?.delivery_long]);

  // ✅ PUNTO 23: Función para detectar si mostrar botón de entrega
  const shouldShowDeliveryButton = () => {
    if (user?.usertype !== 'driver') return false;
    if (!order) return false;

    // Solo para pedidos en tránsito/asignados
    const inTransitStatuses = ['en camino', 'on the way', 'on_the_way', 'assigned', 'asignado'];
    const orderStatus = order.status?.toLowerCase();

    if (!inTransitStatuses.includes(orderStatus)) return false;

    // Verificar si está dentro de 500 metros
    return distanceToCustomer !== null && distanceToCustomer <= 500;
  };

  // ✅ PUNTO 23: Función para manejar entrega del pedido
  const handleDeliverySubmit = async () => {
    setDeliveryLoading(true);
    try {
      // TODO: Implementar endpoint del backend para marcar como entregado
      const response = await axios.post(`${API_BASE_URL}/api/orders/${order.id}/deliver`, {
        driver_lat: driverLocation?.lat,
        driver_lng: driverLocation?.lng,
        delivery_time: new Date().toISOString()
      });

      if (response.status === 200) {
        showAlert({
          type: 'success',
          title: '✅ Pedido Entregado',
          message: 'El pedido ha sido marcado como entregado exitosamente.',
          confirmText: 'OK',
        });

        // Recargar datos de la orden
        fetchOrder();
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo marcar el pedido como entregado. Inténtalo de nuevo',
        confirmText: 'Cerrar',
      });
    } finally {
      setDeliveryLoading(false);
    }
  };

  // ✅ Función para detectar si mostrar botón de cancelar (USUARIOS)
  const shouldShowCancelButton = () => {
    if (!order) return false;

    // Solo para usuarios normales (no drivers)
    if (user?.usertype === 'driver') return false;

    const status = order.status?.toLowerCase();

    // No mostrar si ya está cancelado, entregado o completado
    const finishedStatuses = ['cancelled', 'cancelado', 'delivered', 'entregado', 'completed', 'completado'];
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
    const activeStatuses = ['assigned', 'asignado', 'on the way', 'en camino', 'on_the_way', 'preparing', 'preparando'];
    if (!activeStatuses.includes(status)) return false;

    // No mostrar si ya está cancelado, entregado o completado
    const finishedStatuses = ['cancelled', 'cancelado', 'delivered', 'entregado', 'completed', 'completado'];
    if (finishedStatuses.includes(status)) return false;

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

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* 🚚 VISTA PARA DRIVERS - Card unificada sin precios */}
        {user?.usertype === 'driver' ? (
          <View style={styles.driverOrderCard}>
            {/* Header con ID y estado */}
            <View style={styles.driverHeader}>
              <View style={styles.orderIdSection}>
                <Text style={styles.orderIdLabel}>Pedido:</Text>
                <Text style={styles.orderIdText}>{order?.order_number || formatOrderId(order?.created_at)}</Text>
              </View>
              <View style={styles.statusSection}>
                <Text style={styles.statusText}>Estado: {translateStatus(order?.status)}</Text>
              </View>
            </View>

            <Text style={styles.orderDate}>
              {new Date(order?.created_at).toLocaleString('es-MX', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>

            {/* Artículos sin precios */}
            <Text style={styles.sectionTitle}>Artículos del pedido</Text>
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
              <Text style={styles.sectionTitle}>📦 Información del Cliente</Text>

              {/* Nombre del cliente */}
              {(order?.customer?.first_name || order?.customer?.email) && (
                <View style={styles.deliveryRow}>
                  <View style={styles.deliveryLabelContainer}>
                    <Ionicons name="person-outline" size={16} color="#2196F3" />
                    <Text style={styles.deliveryLabel}>Cliente</Text>
                  </View>
                  <Text style={styles.deliveryValue}>
                    {order.customer?.first_name
                      ? order.customer.first_name
                      : order.customer?.email || 'Cliente'}
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
          </View>
        ) : (
          /* 👤 VISTA PARA CLIENTES - Cards separadas con precios */
          <>
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
                {/* Información del repartidor (para usuarios) */}
                {order?.driver && (
                  <View style={styles.deliveryRow}>
                    <View style={styles.deliveryLabelContainer}>
                      <Ionicons name="car-outline" size={16} color="#D27F27" />
                      <Text style={styles.deliveryLabel}>Repartidor</Text>
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
            </View>
          </>
        )}

        {/* Lógica de visualización según estado real del pedido */}
        {(() => {
          const status = order?.status?.toLowerCase();
          const hasDriver = order?.driver;
          const isDriver = user?.usertype === 'driver';

          // ESTADOS DE CANCELACIÓN
          const isCancelled = status === 'cancelled' || status === 'cancelado';

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

          // 🔍 LOG: Estados del sistema para análisis
          // console.log('📊 ANÁLISIS DE ESTADOS:', {
          // order_id: order?.id,
          // status_original: order?.status,
          // status_lower: status,
          // payment_status: order?.payment_status,
          // has_driver: !!hasDriver,
          // driver_id: order?.driver_id,
          // is_driver: isDriver,
          // states_detected: {
          // isOxxoPending,
          // isPendingPayment,
          // isDelivered,
          // isActive
          // },
          // conditions_check: {
          // 'driver_asignado_no_activo': isDriver && hasDriver && !isActive,
          // 'usuario_driver_asignado': !isDriver && hasDriver && !isActive,
          // 'driver_activo': isDriver && isActive,
          // 'usuario_driver_activo': !isDriver && isActive && hasDriver
          // }
          // });

          // ESTADOS ACTIVOS (driver aceptó y está en camino)
          const isActive = status === 'in progress' || status === 'on the way' ||
                          status === 'en camino' || status === 'preparing' || status === 'preparando';

          // 1. PEDIDO CANCELADO - Prioridad máxima
          if (isCancelled) {
            return (
              <View style={styles.cancelledContainer}>
                <View style={styles.cancelledIconContainer}>
                  <Ionicons name="close-circle" size={60} color="#E63946" />
                </View>
                <Text style={styles.cancelledTitle}>Pedido Cancelado</Text>
                <Text style={styles.cancelledMessage}>
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

          // 3. PAGO PENDIENTE - Sin validar (otros métodos)
          if (isPendingPayment) {
            // console.log('💳 ENTRANDO A: PAGO PENDIENTE');
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
            // console.log('📦 ENTRANDO A: PEDIDO ENTREGADO');
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
            // console.log('🎯 ENTRANDO A VISTA DRIVER ASIGNADO:', {
            // isDriver,
            // hasDriver,
            // isActive,
            // condition: 'isDriver && hasDriver && !isActive',
            // result: true
            // });

            return (
              <>
                {/* Mapa y botón para driver asignado */}
                <DriverTracking order={order} />

                {/* Card informativo */}
                <View style={styles.assignedContainer}>
                  <View style={styles.assignedIconContainer}>
                    <Ionicons name="person-outline" size={50} color="#FF9800" />
                  </View>
                  <Text style={styles.assignedTitle}>Pedido Asignado</Text>
                  <Text style={styles.assignedMessage}>
                    Se te ha asignado este pedido. Revisa la ubicación del cliente en el mapa y confirma si puedes tomarlo.
                  </Text>
                </View>
              </>
            );
          }

          // 6B. DRIVER ASIGNADO - Vista para USUARIO (solo card como está)
          if (!isDriver && hasDriver && !isActive) {
            return (
              <View style={styles.assignedContainer}>
                <View style={styles.assignedIconContainer}>
                  <Ionicons name="person-outline" size={50} color="#FF9800" />
                </View>
                <Text style={styles.assignedTitle}>Repartidor Asignado</Text>
                <Text style={styles.assignedMessage}>
                  Hemos asignado a {order?.driver?.first_name
                    ? `${order.driver.first_name} ${order.driver.last_name || ''}`.trim()
                    : order?.driver?.name || 'un repartidor'} a tu pedido. Prepárate para el día de tu entrega{order?.delivery_date ? ` el ${new Date(order.delivery_date).toLocaleDateString('es-MX')}` : ''}{order?.delivery_slot ? ` a las ${order.delivery_slot}` : ''}. Da seguimiento a tu fecha de entrega.
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

        {/* ✅ PUNTO 21: Botón de Problema con Pedido - Solo para pedidos en tránsito */}
        {user?.usertype !== 'driver' && shouldShowProblemButton() && (
          <TouchableOpacity
            style={styles.problemButton}
            onPress={() => setShowProblemModal(true)}
            activeOpacity={0.8}>
            <Text style={styles.problemButtonText}>⚠️ Tengo un problema con mi pedido</Text>
          </TouchableOpacity>
        )}

        {/* ✅ Botón de Cancelar Pedido - Para usuarios */}
        {shouldShowCancelButton() && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color="#FFF" />
            <Text style={styles.cancelButtonText}>Cancelar Pedido</Text>
          </TouchableOpacity>
        )}

        {/* ✅ Botón de Cancelar Pedido - Para drivers */}
        {shouldShowDriverCancelButton() && (
          <TouchableOpacity
            style={styles.driverCancelButton}
            onPress={() => setShowCancelModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color="#FFF" />
            <Text style={styles.driverCancelButtonText}>No puedo entregar</Text>
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

  // ✅ PUNTO 21: Estilos del botón de Problema con Pedido
  problemButton: {
    backgroundColor: '#FF6B35', // Color naranja/rojo para alerta
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  problemButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // ✅ PUNTO 21: Estilos del modal de problema
  problemInfoContainer: {
    backgroundColor: '#FFF8E1', // Fondo amarillo claro
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800', // Borde naranja
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
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  problemMessagePreview: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#333',
    fontStyle: 'italic',
  },
  problemWarningText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#E65100',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  problemSendButton: {
    backgroundColor: '#FF5722', // Rojo más intenso para el botón de envío
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  problemSendButtonText: {
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

  // 🚚 Estilos para vista de drivers
  driverOrderCard: {
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
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  driverCustomerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#8B5E3C',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
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

  // Estilos para pedido cancelado
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

  // ✅ Estilos para botón de cancelar pedido (USUARIOS)
  cancelButton: {
    backgroundColor: '#E63946',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 8,
  },
  cancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // ✅ Estilos para botón de cancelar pedido (DRIVERS)
  driverCancelButton: {
    backgroundColor: '#FF6B35', // Naranja más suave para drivers
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 8,
  },
  driverCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
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
    backgroundColor: '#FFE5E7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#E63946',
  },
  cancelWarningText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#C1121F',
    textAlign: 'center',
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#E63946',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },

  // ✅ Falta modalOverlay para el modal de problema (usado en problema modal)
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalKeyboardContainer: {
    width: '90%',
    maxWidth: 500,
  },
});


export default OrderDetails;
