import React, {useEffect, useState, useContext, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AuthContext} from '../context/AuthContext';
import axios from 'axios';
import {useNavigation} from '@react-navigation/native';
import {OrderContext} from '../context/OrderContext';
import fonts from '../theme/fonts';
import {formatPriceWithSymbol} from '../utils/priceFormatter';
import {formatOrderId} from '../utils/orderIdFormatter';
import {migrateGuestOrders} from '../utils/orderMigration';
import { API_BASE_URL } from '../config/environment';

// Import AsyncStorage para limpieza temporal
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorage = null;
}

const Order = () => {
  const navigation = useNavigation();
  const {user, loginAsGuest} = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [guestOrders, setGuestOrders] = useState([]);
  const [showingGuestOrders, setShowingGuestOrders] = useState(false);
  const [driverActiveTab, setDriverActiveTab] = useState('disponibles'); // 'disponibles', 'entregas' o 'canceladas'
  const [userActiveTab, setUserActiveTab] = useState('activas'); // 'activas', 'entregadas' o 'canceladas'
  const {orders, orderCount, refreshOrders, lastFetch, enableGuestOrders, disableGuestOrders, updateOrders} = useContext(OrderContext);

  // ✅ Backend ahora envía estados directamente en español - No necesitamos traducir

  // Helper function para obtener estilo de status badge (incluye payment_status)
  const getStatusStyle = (status, paymentStatus) => {
    const statusLower = status?.toLowerCase() || '';
    const paymentStatusLower = paymentStatus?.toLowerCase() || '';
    
    // 🔴 Pago pendiente o fallido tiene prioridad visual
    if (['pending', 'failed', 'rejected'].includes(paymentStatusLower)) {
      return { badge: styles.statusPaymentPending, text: styles.statusPaymentPendingText };
    }
    
    // ✅ Estados normales cuando pago está confirmado
    // Backend estados: Open, On the Way, Arriving, Delivered, Cancelled
    if (statusLower === 'delivered') {
      return { badge: styles.statusDelivered, text: styles.statusDeliveredText };
    } else if (statusLower === 'cancelled') {
      return { badge: styles.statusCancelled, text: styles.statusCancelledText };
    } else if (statusLower === 'on the way' || statusLower === 'arriving') {
      return { badge: styles.statusInTransit, text: styles.statusInTransitText };
    } else {
      // Open, Processing Payment, etc
      return { badge: styles.statusPending, text: styles.statusPendingText };
    }
  };

  const handleInvoices = order => {
    const invoiceURL = `${API_BASE_URL}/invoices/${order.invoice}`;
    Linking.openURL(invoiceURL).catch(err => {
      alert('Unable to open invoice. Please try again.');
    });
  };

  // Función simplificada para refresh manual (pull-to-refresh)
  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Si estamos mostrando Guest orders, refrescarlas también
    if (showingGuestOrders && user?.email) {
      await handleViewGuestOrders(user.email);
    } else {
      refreshOrders();
    }
    
    // Siminar pequeño delay para mostrar el spinner
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // 🆕 Función mejorada para ver pedidos Guest usando endpoint específico
  const handleViewGuestOrders = async (guestEmail) => {
    if (!guestEmail || !guestEmail.trim()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/guest/orders/${encodeURIComponent(guestEmail.trim())}`,
        { timeout: 10000 }
      );
      
      if (response.data?.status === 'success') {
        const orders = response.data.orders.data || [];
        
        if (orders.length > 0) {
          // Mostrar órdenes Guest directamente
          setGuestOrders(orders);
          setShowingGuestOrders(true);
          
          // Actualizar el contador de órdenes para el badge de navegación
          // Backend estados finalizados: Delivered, Cancelled
          const finishedStatuses = ['delivered', 'cancelled'];
          const activeOrders = orders.filter(order =>
            order.status && !finishedStatuses.includes(order.status.toLowerCase()) &&
            order.payment_status === 'paid'
          );
          updateOrders(orders); // Esto actualiza el badge de navegación
          
        } else {
          // No hay órdenes para este guest
          setGuestOrders([]);
          setShowingGuestOrders(false);
          updateOrders([]);
        }
        
      } else {
        // Error del servidor o email inválido
        setGuestOrders([]);
        setShowingGuestOrders(false);
        updateOrders([]);
      }
      
    } catch (error) {
      // Error de conexión o servidor
      setGuestOrders([]);
      setShowingGuestOrders(false);
      updateOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // 🧹 FUNCIÓN TEMPORAL para limpiar datos corruptos
  const handleCleanCorruptGuestData = async () => {
    try {
      
      if (AsyncStorage) {
        // Limpiar AsyncStorage completamente
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('persistSession');
      }
      
      // Reiniciar como Guest limpio (sin email)
      await loginAsGuest(null);
      
      // Desactivar Guest orders si estaba activado
      disableGuestOrders();
      
      
    } catch (error) {
    }
  };

  // ✅ Auto-carga de pedidos Guest cuando tiene email
  useEffect(() => {
    if (user && user.usertype === 'Guest' && 
        user.email && typeof user.email === 'string' && user.email.trim() &&
        !showingGuestOrders && !loading) {
      // Console log para debug
      handleViewGuestOrders(user.email);
    }
  }, [user?.email, user?.usertype, showingGuestOrders, loading]);

  // 🚚 FUNCIÓN: Filtrar órdenes para drivers según tab activa
  const getFilteredDriverOrders = () => {
    // Protección: si orders no es un array válido, devolver array vacío
    if (!Array.isArray(orders)) return [];

    if (user?.usertype !== 'driver') return orders || [];

    if (driverActiveTab === 'disponibles') {
      // Tab "Disponibles": Órdenes asignadas y en progreso
      // Backend estados disponibles: Open, On the Way, Arriving
      const disponiblesStatuses = ['open', 'on the way', 'arriving'];
      return orders.filter(order => disponiblesStatuses.includes(order.status?.toLowerCase()));
    } else if (driverActiveTab === 'entregas') {
      // Tab "Mis Entregas": Backend estado: Delivered
      return orders.filter(order => order.status?.toLowerCase() === 'delivered');
    } else if (driverActiveTab === 'canceladas') {
      // Tab "Canceladas": Backend estado: Cancelled
      return orders.filter(order => order.status?.toLowerCase() === 'cancelled');
    }
    return orders;
  };

  // 👤 FUNCIÓN: Filtrar órdenes para usuarios según tab activa
  // Funciones para contar órdenes por categoría (para los badges)
  const getUserOrdersCounts = () => {
    const ordersToFilter = showingGuestOrders ? guestOrders : orders;
    if (!Array.isArray(ordersToFilter)) return { activas: 0, entregadas: 0, canceladas: 0 };

    const activas = ordersToFilter.filter(order => {
      const status = order.status?.toLowerCase();
      const paymentStatus = order.payment_status?.toLowerCase();
      const hasValidPayment = paymentStatus === 'paid' || paymentStatus === 'pending';
      const finishedStatuses = ['delivered', 'cancelled'];
      return status && !finishedStatuses.includes(status) && hasValidPayment;
    }).length;

    const entregadas = ordersToFilter.filter(order => {
      const status = order.status?.toLowerCase();
      return status === 'delivered';
    }).length;

    const canceladas = ordersToFilter.filter(order => {
      const status = order.status?.toLowerCase();
      return status === 'cancelled';
    }).length;

    return { activas, entregadas, canceladas };
  };

  const orderCounts = getUserOrdersCounts();

  const getFilteredUserOrders = () => {
    const ordersToFilter = showingGuestOrders ? guestOrders : orders;

    // Protección: si ordersToFilter no es un array válido, devolver array vacío
    if (!Array.isArray(ordersToFilter)) return [];

    if (userActiveTab === 'activas') {
      // Tab "Activas": Órdenes que NO están entregadas ni canceladas
      // Backend estados activos: Open, Processing Payment, On the Way, Arriving
      return ordersToFilter.filter(order => {
        const status = order.status?.toLowerCase();
        const paymentStatus = order.payment_status?.toLowerCase();
        const hasValidPayment = paymentStatus === 'paid' || paymentStatus === 'pending';
        const finishedStatuses = ['delivered', 'cancelled'];
        return status && !finishedStatuses.includes(status) && hasValidPayment;
      });
    } else if (userActiveTab === 'entregadas') {
      // Tab "Entregadas": Backend estado: Delivered
      return ordersToFilter.filter(order => {
        const status = order.status?.toLowerCase();
        return status === 'delivered';
      });
    } else if (userActiveTab === 'canceladas') {
      // Tab "Canceladas": Backend estado: Cancelled
      return ordersToFilter.filter(order => {
        const status = order.status?.toLowerCase();
        return status === 'cancelled';
      });
    }
    return ordersToFilter;
  };

  // 🔍 DEBUG TEMPORAL - para ver qué está pasando
  // console.log('🔍 ORDER DEBUG:', {
    // user: user ? { usertype: user.usertype, email: user.email, id: user.id } : null,
    // ordersLength: orders?.length || 0,
    // guestOrdersLength: guestOrders?.length || 0,
    // showingGuestOrders,
    // orderCount,
    // loading,
    // driverActiveTab,
    // filteredDriverOrders: user?.usertype === 'driver' ? getFilteredDriverOrders().length : 'N/A'
  // });

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#33A744" />
      ) : (
        <>
          {/* 🚚 TABS ESPECÍFICOS PARA DRIVERS */}
          {user?.usertype === 'driver' && (
            <View style={styles.userTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.userTab,
                  driverActiveTab === 'disponibles' && styles.driverTabActive
                ]}
                onPress={() => setDriverActiveTab('disponibles')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={driverActiveTab === 'disponibles' ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={driverActiveTab === 'disponibles' ? "#FFF" : "#666"}
                  style={{marginRight: 6}}
                />
                <Text style={[
                  styles.userTabText,
                  driverActiveTab === 'disponibles' && styles.userTabTextActive
                ]}>
                  Disponibles
                </Text>
                <View style={[
                  styles.userTabBadge,
                  driverActiveTab !== 'disponibles' && styles.userTabBadgeInactive
                ]}>
                  <Text style={[
                    styles.userTabBadgeText,
                    driverActiveTab !== 'disponibles' && styles.userTabBadgeTextInactive
                  ]}>
                    {getFilteredDriverOrders().length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTab,
                  driverActiveTab === 'entregas' && styles.driverTabActive
                ]}
                onPress={() => setDriverActiveTab('entregas')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={driverActiveTab === 'entregas' ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={18}
                  color={driverActiveTab === 'entregas' ? "#FFF" : "#666"}
                  style={{marginRight: 6}}
                />
                <Text style={[
                  styles.userTabText,
                  driverActiveTab === 'entregas' && styles.userTabTextActive
                ]}>
                  Entregas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTab,
                  driverActiveTab === 'canceladas' && styles.driverTabActive
                ]}
                onPress={() => setDriverActiveTab('canceladas')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={driverActiveTab === 'canceladas' ? "close-circle" : "close-circle-outline"}
                  size={18}
                  color={driverActiveTab === 'canceladas' ? "#FFF" : "#666"}
                  style={{marginRight: 6}}
                />
                <Text style={[
                  styles.userTabText,
                  driverActiveTab === 'canceladas' && styles.userTabTextActive
                ]}>
                  Canceladas
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 👤 TABS ESPECÍFICOS PARA USUARIOS */}
          {user?.usertype !== 'driver' && (
            <View style={styles.userTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.userTab,
                  userActiveTab === 'activas' && styles.userTabActive
                ]}
                onPress={() => setUserActiveTab('activas')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={userActiveTab === 'activas' ? "time" : "time-outline"}
                  size={18}
                  color={userActiveTab === 'activas' ? "#FFF" : "#666"}
                  style={{marginRight: 6}}
                />
                <Text style={[
                  styles.userTabText,
                  userActiveTab === 'activas' && styles.userTabTextActive
                ]}>
                  Activas
                </Text>
                {orderCounts.activas > 0 && (
                  <View style={[
                    styles.userTabBadge,
                    userActiveTab !== 'activas' && styles.userTabBadgeInactive
                  ]}>
                    <Text style={[
                      styles.userTabBadgeText,
                      userActiveTab !== 'activas' && styles.userTabBadgeTextInactive
                    ]}>
                      {orderCounts.activas}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTab,
                  userActiveTab === 'entregadas' && styles.userTabActive
                ]}
                onPress={() => setUserActiveTab('entregadas')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={userActiveTab === 'entregadas' ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={18}
                  color={userActiveTab === 'entregadas' ? "#FFF" : "#666"}
                  style={{marginRight: 6}}
                />
                <Text style={[
                  styles.userTabText,
                  userActiveTab === 'entregadas' && styles.userTabTextActive
                ]}>
                  Entregadas
                </Text>
                {orderCounts.entregadas > 0 && (
                  <View style={[
                    styles.userTabBadge,
                    userActiveTab !== 'entregadas' && styles.userTabBadgeInactive
                  ]}>
                    <Text style={[
                      styles.userTabBadgeText,
                      userActiveTab !== 'entregadas' && styles.userTabBadgeTextInactive
                    ]}>
                      {orderCounts.entregadas}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTab,
                  userActiveTab === 'canceladas' && styles.userTabActive
                ]}
                onPress={() => setUserActiveTab('canceladas')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={userActiveTab === 'canceladas' ? "close-circle" : "close-circle-outline"}
                  size={18}
                  color={userActiveTab === 'canceladas' ? "#FFF" : "#666"}
                  style={{marginRight: 6}}
                />
                <Text style={[
                  styles.userTabText,
                  userActiveTab === 'canceladas' && styles.userTabTextActive
                ]}>
                  Canceladas
                </Text>
                {orderCounts.canceladas > 0 && (
                  <View style={[
                    styles.userTabBadge,
                    userActiveTab !== 'canceladas' && styles.userTabBadgeInactive
                  ]}>
                    <Text style={[
                      styles.userTabBadgeText,
                      userActiveTab !== 'canceladas' && styles.userTabBadgeTextInactive
                    ]}>
                      {orderCounts.canceladas}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={
              user?.usertype === 'driver'
                ? getFilteredDriverOrders()
                : getFilteredUserOrders()
            }
          keyExtractor={item => showingGuestOrders ? `guest-${item.id}` : item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          // Encabezado dinámico según tipo de usuario
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <Ionicons
                name={user?.usertype === 'driver' ? "bicycle" : "receipt"}
                size={24}
                color="#D27F27"
              />
              <Text style={styles.header}>
                {user?.usertype === 'driver' ? 'Órdenes Asignadas' : 'Mis Pedidos'}
              </Text>
            </View>
          }
          // Mensaje cuando no hay pedidos
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyCard}>
                {user && user.usertype === 'Guest' ? (
                  // Mensajes para Guest
                  (user.email && typeof user.email === 'string' && user.email.trim()) ? (
                    // Guest que ya hizo pedidos (tiene email)
                    showingGuestOrders && guestOrders.length === 0 ? (
                      <>
                        <View style={styles.emptyIconContainer}>
                          <Ionicons name="mail-unread-outline" size={60} color="#CCC" />
                        </View>
                        <Text style={styles.emptyTitle}>No se encontraron pedidos</Text>
                        <Text style={styles.emptyText}>
                          No encontramos pedidos para{'\n'}
                          <Text style={styles.emptyHighlight}>{String(user.email)}</Text>
                        </Text>
                        <Text style={styles.emptySubtext}>
                          Si acabas de hacer un pedido, puede tomar unos minutos en aparecer
                        </Text>
                      </>
                    ) : !showingGuestOrders ? (
                      <>
                        <View style={styles.emptyIconContainer}>
                          <ActivityIndicator size="large" color="#D27F27" />
                        </View>
                        <Text style={styles.emptyTitle}>Buscando tus pedidos...</Text>
                        <Text style={styles.emptyText}>
                          Cargando pedidos para{'\n'}
                          <Text style={styles.emptyHighlight}>{String(user.email)}</Text>
                        </Text>
                      </>
                    ) : null
                  ) : (
                    // Guest que no ha hecho pedidos aún
                    <>
                      <View style={styles.emptyIconContainer}>
                        <Ionicons name="person-outline" size={60} color="#CCC" />
                      </View>
                      <Text style={styles.emptyTitle}>¡Hola Invitado!</Text>
                      <Text style={styles.emptyText}>
                        Para ver tu historial de pedidos, primero haz una compra o regístrate.
                      </Text>
                      <Text style={styles.emptySubtext}>
                        Tus pedidos se guardarán automáticamente cuando te registres
                      </Text>
                    </>
                  )
                ) : user && user.usertype === 'driver' ? (
                  // Mensajes para Driver - diferenciados por tab
                  driverActiveTab === 'disponibles' ? (
                    <>
                      <View style={styles.emptyIconContainer}>
                        <Ionicons name="bicycle-outline" size={60} color="#CCC" />
                      </View>
                      <Text style={styles.emptyTitle}>Sin pedidos disponibles</Text>
                      <Text style={styles.emptyText}>
                        Aquí aparecerán los pedidos que tengamos para ti.
                      </Text>
                      <View style={styles.emptyInfoBox}>
                        <Ionicons name="notifications-outline" size={20} color="#D27F27" />
                        <Text style={styles.emptyInfoText}>Te avisaremos cuando llegue uno nuevo</Text>
                      </View>
                    </>
                  ) : driverActiveTab === 'entregas' ? (
                    <>
                      <View style={styles.emptyIconContainer}>
                        <Ionicons name="checkmark-done-outline" size={60} color="#CCC" />
                      </View>
                      <Text style={styles.emptyTitle}>Sin entregas aún</Text>
                      <Text style={styles.emptyText}>
                        Aquí aparecerán todas las órdenes que has entregado.
                      </Text>
                      <Text style={styles.emptySubtext}>
                        ¡Cada entrega exitosa suma a tu experiencia!
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.emptyIconContainer}>
                        <Ionicons name="checkmark-circle-outline" size={60} color="#33A744" />
                      </View>
                      <Text style={styles.emptyTitle}>¡Excelente!</Text>
                      <Text style={styles.emptyText}>
                        No tienes pedidos cancelados.
                      </Text>
                    </>
                  )
                ) : (
                  // Mensajes para Usuario normal registrado - diferenciados por tab
                  userActiveTab === 'activas' ? (
                    <>
                      <View style={styles.emptyIconContainer}>
                        <Ionicons name="cube-outline" size={60} color="#CCC" />
                      </View>
                      <Text style={styles.emptyTitle}>Sin pedidos activos</Text>
                      <Text style={styles.emptyText}>
                        No tienes pedidos en proceso en este momento.
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() => navigation.navigate('MainTabs', {
                          screen: 'Inicio',
                          params: { screen: 'CategoriesList' }
                        })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="storefront-outline" size={20} color="#FFF" style={{marginRight: 8}} />
                        <Text style={styles.emptyButtonText}>Explorar Productos</Text>
                      </TouchableOpacity>
                    </>
                  ) : userActiveTab === 'entregadas' ? (
                    <>
                      <View style={styles.emptyIconContainer}>
                        <Ionicons name="gift-outline" size={60} color="#CCC" />
                      </View>
                      <Text style={styles.emptyTitle}>Sin pedidos entregados</Text>
                      <Text style={styles.emptyText}>
                        Aún no tienes pedidos completados.
                      </Text>
                      <Text style={styles.emptySubtext}>
                        Tus pedidos entregados aparecerán aquí
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.emptyIconContainer}>
                        <Ionicons name="happy-outline" size={60} color="#33A744" />
                      </View>
                      <Text style={styles.emptyTitle}>¡Todo bien!</Text>
                      <Text style={styles.emptyText}>
                        No tienes pedidos cancelados.
                      </Text>
                    </>
                  )
                )}
              </View>
            </View>
          }
          renderItem={({item}) => {
            // Validar que el item existe y tiene las propiedades necesarias
            if (!item || typeof item !== 'object') {
              return null;
            }

            // Manejar tanto órdenes normales como Guest orders
            const isGuestOrder = showingGuestOrders;
            const isDriver = user?.usertype === 'driver';
            
            // Propiedades con valores por defecto adaptadas para Guest orders
            const createdAt = item.created_at || new Date().toISOString();
            const totalPrice = isGuestOrder ? 
              (item.total_amount || item.total_price || item.price || 0) :
              (item.total_amount || item.total_price || item.price || 0);
            const orderDetails = Array.isArray(item.order_details) ? item.order_details : [];
            const itemId = item.id || Math.random().toString();
            const itemStatus = item.status || 'Pendiente';
            const paymentStatus = item.payment_status || 'pending'; // 🆕 Nuevo campo
            
            // 🆕 DRIVER: Extraer coordenadas del cliente y dirección
            const customerLat = parseFloat(item.customer_lat);
            const customerLong = parseFloat(item.customer_long);
            const hasValidCoordinates = !isNaN(customerLat) && !isNaN(customerLong);
            const customerAddress = item.delivery_address || item.customer_address || 'Dirección no disponible';
            
            // Usar order_number del backend o fallback a formatOrderId
            const formattedOrderId = item.order_number || formatOrderId(createdAt);

            return (
              <View style={styles.orderCard}>
                {/* Header con ID y Status */}
                <View style={styles.orderHeader}>
                  <View style={styles.orderIdSection}>
                    <Ionicons name="receipt-outline" size={16} color="#D27F27" style={{marginRight: 6}} />
                    <Text style={styles.orderIdText}>{formattedOrderId}</Text>
                  </View>
                  <View style={[styles.statusBadge, getStatusStyle(itemStatus, paymentStatus).badge]}>
                    <Text style={[styles.statusText, getStatusStyle(itemStatus, paymentStatus).text]}>
                      {paymentStatus === 'paid' ? 'Pagado' :
                       paymentStatus === 'pending' ? 'Procesando' :
                       paymentStatus === 'failed' ? 'Pago fallido' :
                       item.status_spanish || itemStatus || 'Pendiente'}
                    </Text>
                  </View>
                </View>

                {/* Fecha y Total */}
                <View style={styles.orderInfoRow}>
                  <View style={styles.orderDateSection}>
                    <Ionicons name="calendar-outline" size={14} color="#888" style={{marginRight: 4}} />
                    <Text style={styles.orderDate}>
                      {new Date(createdAt).toLocaleString('es-MX', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.total}>
                    {formatPriceWithSymbol(totalPrice)}
                  </Text>
                </View>

                {/* Separador */}
                <View style={styles.orderDivider} />

                {/* 🚚 INFORMACIÓN ESPECÍFICA PARA DRIVERS */}
                {isDriver && (
                  <View style={styles.driverInfo}>
                    <View style={styles.driverRow}>
                      <Ionicons name="person-outline" size={16} color="#D27F27" style={{marginRight: 8}} />
                      <Text style={styles.driverValue} numberOfLines={1}>
                        {item.user_email || 'No disponible'}
                      </Text>
                    </View>
                    <View style={styles.driverRow}>
                      <Ionicons name="location-outline" size={16} color="#D27F27" style={{marginRight: 8}} />
                      <Text style={styles.driverValue} numberOfLines={2}>
                        {customerAddress}
                      </Text>
                    </View>
                    <View style={styles.driverRow}>
                      <Ionicons name="time-outline" size={16} color="#D27F27" style={{marginRight: 8}} />
                      <Text style={styles.driverValue}>
                        {item.delivery_date} • {item.delivery_slot || 'Horario flexible'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Productos */}
                <View style={styles.itemsSection}>
                  <Text style={styles.itemHeader}>
                    <Ionicons name="cube-outline" size={14} color="#2F2F2F" /> Artículos
                  </Text>
                  {orderDetails.length > 0 ? (
                    orderDetails.slice(0, 3).map((product, i) => {
                      if (!product || typeof product !== 'object') {
                        return null;
                      }

                      return (
                        <View key={i} style={styles.itemRow}>
                          <Image
                            source={{uri: product.item_image || ''}}
                            style={styles.itemImage}
                          />
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemText} numberOfLines={1}>
                              {product.item_name || 'Producto'}
                            </Text>
                            <View style={styles.itemDetails}>
                              <Text style={styles.itemQty}>×{product.item_qty || 0}</Text>
                              <Text style={styles.itemPrice}>
                                {formatPriceWithSymbol(parseFloat(product.item_price) || 0)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noItems}>
                      {isDriver ? 'Ver detalles para más información' : 'No hay artículos'}
                    </Text>
                  )}
                  {orderDetails.length > 3 && (
                    <Text style={styles.moreItems}>+{orderDetails.length - 3} artículos más</Text>
                  )}
                </View>

                {/* Botones */}
                {isDriver ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('OrderDetails', {orderId: itemId})}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye-outline" size={18} color="#FFF" style={{marginRight: 8}} />
                    <Text style={styles.primaryButtonText}>Ver detalles</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => navigation.navigate('OrderDetails', {orderId: itemId})}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={18} color="#FFF" style={{marginRight: 6}} />
                      <Text style={styles.primaryButtonText}>Detalles</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleInvoices(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#FFF" style={{marginRight: 6}} />
                      <Text style={styles.secondaryButtonText}>Ticket</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
    padding: 16,
  },
  listContent: {
    paddingBottom: 24,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  header: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginLeft: 10,
  },

  // Order Card - Nuevo diseño
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: fonts.size.small,
    fontFamily: fonts.numeric,
    color: '#888',
  },
  total: {
    fontSize: fonts.size.large,
    fontFamily: fonts.priceBold,
    color: '#2F2F2F',
  },
  orderDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 12,
  },

  // Items Section
  itemsSection: {
    marginBottom: 16,
  },
  itemHeader: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 10,
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
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQty: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#888',
    marginRight: 8,
  },
  itemPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.priceBold,
    color: '#D27F27',
  },
  noItems: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  moreItems: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    textAlign: 'center',
    marginTop: 4,
  },

  // Buttons - Nuevo diseño
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D27F27',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#D27F27',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#33A744',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#33A744',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  secondaryButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // Legacy buttons (compatibility)
  detailsButton: {
    flex: 1,
    backgroundColor: '#D27F27',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  detailsText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  invoiceButton: {
    flex: 1,
    backgroundColor: '#33A744',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  // Estados vacíos - Nuevo diseño profesional
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 24,
    paddingBottom: 40,
  },
  emptyCard: {
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
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(210, 127, 39, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emptyHighlight: {
    fontFamily: fonts.bold,
    color: '#D27F27',
  },
  emptySubtext: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyInfoText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginLeft: 10,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D27F27',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#D27F27',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // Estilos legacy (compatibilidad)
  emptyOrders: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
    textAlign: 'center',
    marginTop: 50,
  },
  userMessage: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 32,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  userTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 16,
    textAlign: 'center',
  },
  userText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  userSubtext: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  userEmail: {
    fontFamily: fonts.bold,
    color: '#D27F27',
  },
  userHighlight: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#33A744',
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  
  // Status Badge Styles - Nuevo diseño compacto
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
  },
  statusDelivered: {
    backgroundColor: 'rgba(51, 167, 68, 0.15)',
  },
  statusDeliveredText: {
    color: '#33A744',
  },
  statusCancelled: {
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
  },
  statusCancelledText: {
    color: '#E63946',
  },
  statusInTransit: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
  },
  statusInTransitText: {
    color: '#2196F3',
  },
  statusPending: {
    backgroundColor: 'rgba(210, 127, 39, 0.15)',
  },
  statusPendingText: {
    color: '#D27F27',
  },
  statusPaymentPending: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
  },
  statusPaymentPendingText: {
    color: '#FF9800',
  },
  
  // Estilos para botón Guest
  guestOrdersButton: {
    backgroundColor: '#33A744',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  guestOrdersButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },
  
  // 🚚 ESTILOS ESPECÍFICOS PARA DRIVERS
  driverInfo: {
    backgroundColor: 'rgba(210, 127, 39, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  driverLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#666',
    width: 90,
    flexShrink: 0,
  },
  driverValue: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  
  // Driver tab active (usa userTab base)
  driverTabActive: {
    backgroundColor: '#33A744',
    shadowColor: '#33A744',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },

  // 👤 ESTILOS PARA TABS DE USUARIO (estilo profesional)
  userTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  userTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  userTabActive: {
    backgroundColor: '#D27F27',
    shadowColor: '#D27F27',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  userTabText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#888',
  },
  userTabTextActive: {
    color: '#FFF',
  },
  userTabBadge: {
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  userTabBadgeInactive: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  userTabBadgeText: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  userTabBadgeTextInactive: {
    color: '#888',
  },

  // 🆕 Estilos para estado del pedido debajo del precio
  orderPriceSection: {
    alignItems: 'flex-end',
  },
  orderStatusText: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.numericBold,
    color: '#666',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  orderStatusDelivered: {
    color: '#33A744',
  },
  orderStatusCancelled: {
    color: '#E63946',
  },
  orderStatusInTransit: {
    color: '#2196F3',
  },

});

export default Order;
