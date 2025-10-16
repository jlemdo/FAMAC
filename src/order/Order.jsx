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
    if (['delivered', 'entregado', 'completed', 'finalizado'].includes(statusLower)) {
      return { badge: styles.statusDelivered, text: styles.statusDeliveredText };
    } else if (['cancelled', 'cancelado'].includes(statusLower)) {
      return { badge: styles.statusCancelled, text: styles.statusCancelledText };
    } else if (['on the way', 'en camino'].includes(statusLower)) {
      return { badge: styles.statusInTransit, text: styles.statusInTransitText };
    } else {
      return { badge: styles.statusPending, text: styles.statusPendingText };
    }
  };

  const handleInvoices = order => {
    const invoiceURL = `https://awsoccr.pixelcrafters.digital/invoices/${order.invoice}`;
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
        `https://awsoccr.pixelcrafters.digital/api/guest/orders/${encodeURIComponent(guestEmail.trim())}`,
        { timeout: 10000 }
      );
      
      if (response.data?.status === 'success') {
        const orders = response.data.orders.data || [];
        
        if (orders.length > 0) {
          // Mostrar órdenes Guest directamente
          setGuestOrders(orders);
          setShowingGuestOrders(true);
          
          // Actualizar el contador de órdenes para el badge de navegación
          const completedStatuses = ['delivered', 'entregado', 'completed', 'finalizado', 'cancelled', 'cancelado'];
          const activeOrders = orders.filter(order => 
            order.status && !completedStatuses.includes(order.status.toLowerCase()) &&
            order.payment_status === 'paid' // Solo contar órdenes con pago completado
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
    if (user?.usertype !== 'driver') return orders;

    if (driverActiveTab === 'disponibles') {
      // Tab "Disponibles": Órdenes asignadas y en progreso (incluyendo estados posibles de asignación)
      return orders.filter(order => ['Open', 'Abierto', 'On the Way', 'Assigned', 'Pending', 'assigned', 'pending'].includes(order.status));
    } else if (driverActiveTab === 'entregas') {
      // Tab "Mis Entregas": SOLO órdenes ya entregadas
      return orders.filter(order => ['Delivered', 'delivered', 'entregado'].includes(order.status));
    } else if (driverActiveTab === 'canceladas') {
      // Tab "Canceladas": SOLO órdenes canceladas
      return orders.filter(order => ['Cancelled', 'cancelled', 'cancelado'].includes(order.status));
    }
    return orders;
  };

  // 👤 FUNCIÓN: Filtrar órdenes para usuarios según tab activa
  const getFilteredUserOrders = () => {
    const ordersToFilter = showingGuestOrders ? guestOrders : orders;

    if (userActiveTab === 'activas') {
      // Tab "Activas": Órdenes que NO están entregadas ni canceladas
      return ordersToFilter.filter(order => {
        const status = order.status?.toLowerCase();
        return status &&
               !['delivered', 'entregado', 'completed', 'completado', 'cancelled', 'cancelado'].includes(status) &&
               order.payment_status === 'paid'; // Solo órdenes pagadas
      });
    } else if (userActiveTab === 'entregadas') {
      // Tab "Entregadas": SOLO órdenes completadas/entregadas
      return ordersToFilter.filter(order => {
        const status = order.status?.toLowerCase();
        return ['delivered', 'entregado', 'completed', 'completado'].includes(status);
      });
    } else if (userActiveTab === 'canceladas') {
      // Tab "Canceladas": SOLO órdenes canceladas
      return ordersToFilter.filter(order => {
        const status = order.status?.toLowerCase();
        return ['cancelled', 'cancelado'].includes(status);
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
            <View style={styles.driverTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.driverTab,
                  driverActiveTab === 'disponibles' && styles.driverTabActive
                ]}
                onPress={() => setDriverActiveTab('disponibles')}
              >
                <Text style={[
                  styles.driverTabText,
                  driverActiveTab === 'disponibles' && styles.driverTabTextActive
                ]}>
                  🟢 Disponibles
                </Text>
                {driverActiveTab === 'disponibles' && (
                  <View style={styles.driverTabBadge}>
                    <Text style={styles.driverTabBadgeText}>
                      {getFilteredDriverOrders().length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.driverTab,
                  driverActiveTab === 'entregas' && styles.driverTabActive
                ]}
                onPress={() => setDriverActiveTab('entregas')}
              >
                <Text style={[
                  styles.driverTabText,
                  driverActiveTab === 'entregas' && styles.driverTabTextActive
                ]}>
                  ✅ Entregas
                </Text>
                {driverActiveTab === 'entregas' && (
                  <View style={styles.driverTabBadge}>
                    <Text style={styles.driverTabBadgeText}>
                      {getFilteredDriverOrders().length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.driverTab,
                  driverActiveTab === 'canceladas' && styles.driverTabActive
                ]}
                onPress={() => setDriverActiveTab('canceladas')}
              >
                <Text style={[
                  styles.driverTabText,
                  driverActiveTab === 'canceladas' && styles.driverTabTextActive
                ]}>
                  ❌ Canceladas
                </Text>
                {driverActiveTab === 'canceladas' && (
                  <View style={styles.driverTabBadge}>
                    <Text style={styles.driverTabBadgeText}>
                      {getFilteredDriverOrders().length}
                    </Text>
                  </View>
                )}
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
              >
                <Text style={[
                  styles.userTabText,
                  userActiveTab === 'activas' && styles.userTabTextActive
                ]}>
                  🔄 Activas
                </Text>
                {userActiveTab === 'activas' && (
                  <View style={styles.userTabBadge}>
                    <Text style={styles.userTabBadgeText}>
                      {getFilteredUserOrders().length}
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
              >
                <Text style={[
                  styles.userTabText,
                  userActiveTab === 'entregadas' && styles.userTabTextActive
                ]}>
                  ✅ Entregadas
                </Text>
                {userActiveTab === 'entregadas' && (
                  <View style={styles.userTabBadge}>
                    <Text style={styles.userTabBadgeText}>
                      {getFilteredUserOrders().length}
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
              >
                <Text style={[
                  styles.userTabText,
                  userActiveTab === 'canceladas' && styles.userTabTextActive
                ]}>
                  ❌ Canceladas
                </Text>
                {userActiveTab === 'canceladas' && (
                  <View style={styles.userTabBadge}>
                    <Text style={styles.userTabBadgeText}>
                      {getFilteredUserOrders().length}
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
            <Text style={styles.header}>
              {user?.usertype === 'driver' ? 'Órdenes Asignadas' : 'Historial de Pedidos'}
            </Text>
          }
          // Mensaje cuando no hay pedidos
          ListEmptyComponent={
            <View style={styles.userMessage}>
              {user && user.usertype === 'Guest' ? (
                // Mensajes para Guest
                (user.email && typeof user.email === 'string' && user.email.trim()) ? (
                  // Guest que ya hizo pedidos (tiene email) - Solo mostrar si NO hay pedidos después de la búsqueda
                  showingGuestOrders && guestOrders.length === 0 ? (
                    <>
                      <Text style={styles.userTitle}>📭 No se encontraron pedidos</Text>
                      <Text style={styles.userText}>
                        No encontramos pedidos para el email:{' '}
                        <Text style={styles.userEmail}>{String(user.email)}</Text>
                      </Text>
                      <Text style={styles.userSubtext}>
                        Si acabas de hacer un pedido, puede tomar unos minutos en aparecer aquí
                      </Text>
                    </>
                  ) : !showingGuestOrders ? (
                    <>
                      <Text style={styles.userTitle}>🔍 Buscando tus pedidos...</Text>
                      <Text style={styles.userText}>
                        Estamos cargando tus pedidos para{' '}
                        <Text style={styles.userEmail}>{String(user.email)}</Text>
                      </Text>
                    </>
                  ) : null
                ) : (
                  // Guest que no ha hecho pedidos aún
                  <>
                    <Text style={styles.userTitle}>👋 ¡Hola Invitado!</Text>
                    <Text style={styles.userText}>
                      Para ver tu historial de pedidos, primero haz una compra o regístrate.
                    </Text>
                    <Text style={styles.userSubtext}>
                      📦 Tus pedidos se guardarán automáticamente cuando te registres
                    </Text>
                    
                  </>
                )
              ) : user && user.usertype === 'driver' ? (
                // Mensajes para Driver - diferenciados por tab
                driverActiveTab === 'disponibles' ? (
                  <>
                    <Text style={styles.userTitle}>📍 ¡Hola Repartidor!</Text>
                    <Text style={styles.userText}>
                      Aquí aparecerán los pedidos que tengamos para ti.
                    </Text>
                    <Text style={styles.userHighlight}>
                      🔔 Te avisaremos en cuanto llegue uno nuevo
                    </Text>
                    <Text style={styles.userSubtext}>
                      Mantén la app abierta para recibir notificaciones
                    </Text>
                  </>
                ) : driverActiveTab === 'entregas' ? (
                  <>
                    <Text style={styles.userTitle}>🚚 Mis Entregas</Text>
                    <Text style={styles.userText}>
                      Aquí aparecerán todas las órdenes que has entregado.
                    </Text>
                    <Text style={styles.userHighlight}>
                      📊 Tu historial de entregas te ayudará a llevar un control de tu trabajo
                    </Text>
                    <Text style={styles.userSubtext}>
                      🎯 ¡Cada entrega exitosa suma a tu experiencia como repartidor!
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.userTitle}>❌ Pedidos Cancelados</Text>
                    <Text style={styles.userText}>
                      No tienes pedidos cancelados.
                    </Text>
                    <Text style={styles.userHighlight}>
                      Los pedidos que no pudiste entregar aparecerán aquí
                    </Text>
                  </>
                )
              ) : (
                // Mensajes para Usuario normal registrado - diferenciados por tab
                userActiveTab === 'activas' ? (
                  <>
                    <Text style={styles.userTitle}>🔄 Sin Pedidos Activos</Text>
                    <Text style={styles.userText}>
                      No tienes pedidos en proceso en este momento.
                    </Text>
                    <Text style={styles.userHighlight}>
                      🌟 ¡Explora nuestros productos y haz un nuevo pedido!
                    </Text>
                    <Text style={styles.userSubtext}>
                      Tus pedidos activos aparecerán aquí
                    </Text>
                  </>
                ) : userActiveTab === 'entregadas' ? (
                  <>
                    <Text style={styles.userTitle}>✅ Sin Pedidos Entregados</Text>
                    <Text style={styles.userText}>
                      Aún no tienes pedidos completados.
                    </Text>
                    <Text style={styles.userHighlight}>
                      📦 Tus pedidos entregados aparecerán aquí
                    </Text>
                    <Text style={styles.userSubtext}>
                      Podrás ver todo tu historial de compras
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.userTitle}>❌ Sin Pedidos Cancelados</Text>
                    <Text style={styles.userText}>
                      No tienes pedidos cancelados.
                    </Text>
                    <Text style={styles.userHighlight}>
                      Los pedidos que canceles aparecerán aquí
                    </Text>
                  </>
                )
              )}
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
                <View style={styles.orderHeader}>
                  <View style={styles.orderIdSection}>
                    <Text style={styles.orderIdLabel}>Pedido:</Text>
                    <Text style={styles.orderIdText}>{formattedOrderId}</Text>
                  </View>
                  <Text style={styles.total}>
                    {formatPriceWithSymbol(totalPrice)}
                  </Text>
                </View>
                
                <Text style={styles.orderDate}>
                  {new Date(createdAt).toLocaleString('es-MX', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Text>

                {/* 🚚 INFORMACIÓN ESPECÍFICA PARA DRIVERS */}
                {isDriver && (
                  <View style={styles.driverInfo}>
                    <View style={styles.driverRow}>
                      <Text style={styles.driverLabel}>📍 Cliente:</Text>
                      <Text style={styles.driverValue} numberOfLines={1}>
                        {item.user_email || 'No disponible'}
                      </Text>
                    </View>
                    <View style={styles.driverRow}>
                      <Text style={styles.driverLabel}>🗺️ Dirección:</Text>
                      <Text style={styles.driverValue} numberOfLines={2}>
                        {customerAddress}
                      </Text>
                    </View>
                    <View style={styles.driverRow}>
                      <Text style={styles.driverLabel}>📅 Entrega:</Text>
                      <Text style={styles.driverValue}>
                        {item.delivery_date} • {item.delivery_slot || 'Horario flexible'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Status Badge - Ahora incluye payment_status */}
                <View style={[styles.statusBadge, getStatusStyle(itemStatus, paymentStatus).badge]}>
                  <Text style={[styles.statusText, getStatusStyle(itemStatus, paymentStatus).text]}>
                    {/* Mostrar estado de pago cuando sea relevante, sino estado del pedido */}
                    {paymentStatus === 'paid' ? 'Pagado' : 
                     paymentStatus === 'pending' ? 'Procesando pago' :
                     paymentStatus === 'failed' ? 'Pago fallido' :
                     item.status_spanish || itemStatus || 'Pendiente'}
                  </Text>
                </View>

                <Text style={styles.itemHeader}>Artículos:</Text>
                {orderDetails.length > 0 ? (
                  orderDetails.map((product, i) => {
                    // Validar cada producto
                    if (!product || typeof product !== 'object') {
                      return null;
                    }

                    return (
                      <View key={i} style={styles.itemRow}>
                        <Image
                          source={{uri: product.item_image || ''}}
                          style={styles.itemImage}
                        />
                        <View>
                          <Text style={styles.itemText}>
                            {product.item_qty || 0}× {product.item_name || 'Producto'}
                          </Text>
                          <Text style={styles.itemPrice}>
                            {new Intl.NumberFormat('es-MX', {
                              style: 'currency',
                              currency: 'MXN',
                            }).format(parseFloat(product.item_price) || 0)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noItems}>
                    {isDriver ? 'Ver detalles para más información' : 'No hay artículos en este pedido'}
                  </Text>
                )}

                {/* 🚚 BOTÓN ÚNICO PARA DRIVERS */}
                {isDriver ? (
                  <View style={styles.driverButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.driverButton, styles.detailsButton]}
                      onPress={() => navigation.navigate('OrderDetails', {orderId: itemId})}
                    >
                      <Text style={styles.driverButtonText}>📋 Ver detalles</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Botones originales para usuarios normales
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() =>
                        navigation.navigate('OrderDetails', {orderId: itemId})
                      }>
                      <Text style={styles.detailsText}>Ver detalles</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.invoiceButton}
                      onPress={() => handleInvoices(item)}>
                      <Text style={styles.invoiceText}>Ver ticket</Text>
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
    backgroundColor: '#F2EFE4', // Crema Suave
    padding: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    fontSize: fonts.size.XL, // Reducido desde XLLL (48px) a XL (30px) para mejor compatibilidad
    fontFamily: fonts.bold,
    color: '#2F2F2F', // Gris Carbón
    textAlign: 'center',
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  orderHeader: {
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
    fontFamily: fonts.numericBold, // ✅ Fuente optimizada para IDs de órdenes
    color: '#D27F27',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: fonts.size.small,
    fontFamily: fonts.numeric, // ✅ Fuente optimizada para fechas
    color: '#666',
    marginBottom: 8,
  },
  total: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.priceBold, // ✅ Fuente optimizada para precios totales
    color: '#8B5E3C', // Marrón Tierra
  },
  itemHeader: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  itemPrice: {
    fontSize: fonts.size.small,
    fontFamily: fonts.price, // ✅ Fuente optimizada para precios de items
    color: '#D27F27', // Dorado Campo
  },
  noItems: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    color: 'rgba(47,47,47,0.6)',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#D27F27', // Dorado Campo
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
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
    backgroundColor: '#33A744', // Verde Bosque
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  emptyOrders: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)', // Gris Carbón @60%
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
  
  // Status Badge Styles
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 8,
  },
  statusText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.numericBold, // ✅ Fuente optimizada para estados
    textTransform: 'capitalize',
  },
  statusDelivered: {
    backgroundColor: '#E8F5E8',
    borderColor: '#33A744',
    borderWidth: 1,
  },
  statusDeliveredText: {
    color: '#33A744',
  },
  statusCancelled: {
    backgroundColor: '#FDE8E8',
    borderColor: '#E63946',
    borderWidth: 1,
  },
  statusCancelledText: {
    color: '#E63946',
  },
  statusInTransit: {
    backgroundColor: '#E8F4FD',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  statusInTransitText: {
    color: '#2196F3',
  },
  statusPending: {
    backgroundColor: '#FFF4E6',
    borderColor: '#D27F27',
    borderWidth: 1,
  },
  statusPendingText: {
    color: '#D27F27',
  },
  
  // 🆕 Nuevo: Payment Status Styles
  statusPaymentPending: {
    backgroundColor: '#FFF3E0', // Naranja muy claro
    borderColor: '#FF9800',     // Naranja
    borderWidth: 1,
  },
  statusPaymentPendingText: {
    color: '#FF9800',           // Naranja
    fontWeight: 'bold',
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
    backgroundColor: '#F8F9FA', // Gris muy claro
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#D27F27', // Color tema
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  driverLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#666',
    width: 90, // Ancho fijo para alineación
    flexShrink: 0,
  },
  driverValue: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
  },
  
  // 🚚 ESTILOS PARA TABS DE DRIVER
  driverTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  driverTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    position: 'relative',
  },
  driverTabActive: {
    backgroundColor: '#D27F27',
  },
  driverTabText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#666',
    textAlign: 'center',
  },
  driverTabTextActive: {
    color: '#FFF',
  },
  driverTabBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: '#33A744',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  driverTabBadgeText: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  
  // 🚚 ESTILOS PARA BOTONES ESPECÍFICOS DE DRIVER
  driverButtonsContainer: {
    marginTop: 12,
  },
  driverButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  driverButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },

  // 👤 ESTILOS PARA TABS DE USUARIO (estilo más user-friendly)
  userTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 3,
  },
  userTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    position: 'relative',
  },
  userTabActive: {
    backgroundColor: '#33A744', // Verde más amigable para usuarios
  },
  userTabText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#666',
    textAlign: 'center',
  },
  userTabTextActive: {
    color: '#FFF',
  },
  userTabBadge: {
    position: 'absolute',
    top: 8,
    right: 6,
    backgroundColor: '#D27F27',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  userTabBadgeText: {
    fontSize: fonts.size.XS,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

});

export default Order;
