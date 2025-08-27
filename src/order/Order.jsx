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
  const {orders, orderCount, refreshOrders, lastFetch, enableGuestOrders, disableGuestOrders, updateOrders} = useContext(OrderContext);

  // Función para traducir estados de órdenes de inglés a español
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
    const invoiceURL = `https://food.siliconsoft.pk/invoices/${order.invoice}`;
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

  // ✅ Función para ver pedidos Guest sin registrarse (búsqueda directa)
  const handleViewGuestOrders = async (guestEmail) => {
    if (!guestEmail || !guestEmail.trim()) {
      // console.log('❌ No hay email de Guest para buscar pedidos');
      return;
    }
    
    setLoading(true);
    try {
      // console.log('🔍 Buscando pedidos para Guest:', guestEmail);
      
      const foundOrders = [];
      
      // Búsqueda reducida: IDs desde 220 hasta 190 para Guest orders
      const searchIds = [];
      // Generar IDs desde 220 hasta 190 (31 IDs total)
      for (let i = 220; i >= 190; i--) {
        searchIds.push(i);
      }
      const allSearchIds = searchIds;
      
      let requestCount = 0;
      const maxRequests = 31; // Limitamos a los 31 IDs del rango 190-220
      
      for (const id of allSearchIds) {
        if (requestCount >= maxRequests) break; // ✅ Removido límite de 3 pedidos
        
        try {
          requestCount++;
          // console.log(`🎯 Probando ID ${id}...`); // Debug opcional
          
          const response = await axios.get(
            `https://food.siliconsoft.pk/api/orderdetails/${id}`,
            { timeout: 5000 }
          );
          
          if (response.data?.order && 
              response.data.order.userid === null && 
              response.data.order.user_email === guestEmail.trim()) {
            
            foundOrders.push(response.data.order);
            // console.log(`✅ Orden ${id} encontrada para ${guestEmail}`);
          }
          
          // Rate limiting optimizado: pausa más corta pero más frecuente
          if (requestCount % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
        } catch (error) {
          if (!error.message.includes('404')) {
            // console.log(`⚠️ Error en ID ${id}:`, error.message);
          }
        }
      }
      
      if (foundOrders.length > 0) {
        // console.log(`🎉 ${foundOrders.length} pedidos encontrados`);
        // Mostrar órdenes Guest directamente sin usar OrderContext
        setGuestOrders(foundOrders);
        setShowingGuestOrders(true);
        
        // Actualizar el contador de órdenes para el badge de navegación
        // 🆕 Ahora también filtra por payment_status
        const completedStatuses = ['delivered', 'entregado', 'completed', 'finalizado', 'cancelled', 'cancelado'];
        const activeOrders = foundOrders.filter(order => 
          order.status && !completedStatuses.includes(order.status.toLowerCase()) &&
          order.payment_status === 'completed' // Solo contar órdenes con pago completado
        );
        updateOrders(foundOrders); // Esto actualiza el badge de navegación
        
      } else {
        // console.log('ℹ️ No se encontraron pedidos para este email');
        setGuestOrders([]);
        setShowingGuestOrders(false);
        // Limpiar contador cuando no hay órdenes
        updateOrders([]);
      }
      
    } catch (error) {
      // console.log('❌ Error consultando pedidos Guest:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🧹 FUNCIÓN TEMPORAL para limpiar datos corruptos
  const handleCleanCorruptGuestData = async () => {
    try {
      // console.log('🧹 Limpiando datos corruptos de Guest...');
      
      if (AsyncStorage) {
        // Limpiar AsyncStorage completamente
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('persistSession');
        // console.log('✅ AsyncStorage limpiado');
      }
      
      // Reiniciar como Guest limpio (sin email)
      await loginAsGuest(null);
      
      // Desactivar Guest orders si estaba activado
      disableGuestOrders();
      
      // console.log('✅ Datos de Guest limpiados - reiniciado como Guest sin email');
      
    } catch (error) {
      // console.log('❌ Error limpiando datos:', error);
    }
  };

  // ✅ Auto-carga de pedidos Guest cuando tiene email
  useEffect(() => {
    if (user && user.usertype === 'Guest' && 
        user.email && typeof user.email === 'string' && user.email.trim() &&
        !showingGuestOrders && !loading) {
      // Console log para debug
      console.log('🔄 Auto-cargando pedidos para Guest:', user.email);
      handleViewGuestOrders(user.email);
    }
  }, [user?.email, user?.usertype, showingGuestOrders, loading]);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#33A744" />
      ) : (
        <FlatList
          data={showingGuestOrders ? guestOrders : orders}
          keyExtractor={item => showingGuestOrders ? `guest-${item.id}` : item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          // Encabezado siempre arriba
          ListHeaderComponent={
            <Text style={styles.header}>Historial de Pedidos</Text>
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
                // Mensajes para Driver
                <>
                  <Text style={styles.userTitle}>🚚 ¡Hola Conductor!</Text>
                  <Text style={styles.userText}>
                    Aquí aparecerán todas las órdenes que has entregado.
                  </Text>
                  <Text style={styles.userHighlight}>
                    📊 Tu historial de entregas te ayudará a llevar un control de tu trabajo
                  </Text>
                  <Text style={styles.userSubtext}>
                    🎯 ¡Cada entrega exitosa suma a tu experiencia como conductor!
                  </Text>
                </>
              ) : (
                // Mensajes para Usuario normal registrado
                <>
                  <Text style={styles.userTitle}>🛒 ¡Hola {user?.first_name || 'Usuario'}!</Text>
                  <Text style={styles.userText}>
                    Aún no has realizado ningún pedido. ¡Es hora de explorar nuestros deliciosos productos!
                  </Text>
                  <Text style={styles.userHighlight}>
                    🥛 Descubre nuestros lácteos frescos y productos artesanales
                  </Text>
                  <Text style={styles.userSubtext}>
                    📱 Tus pedidos aparecerán aquí automáticamente después de cada compra
                  </Text>
                </>
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
            
            // Propiedades con valores por defecto adaptadas para Guest orders
            const createdAt = item.created_at || new Date().toISOString();
            const totalPrice = isGuestOrder ? 
              (typeof item.total_price === 'number' ? item.total_price : 0) :
              (typeof item.total_price === 'number' ? item.total_price : 0);
            const orderDetails = isGuestOrder ? 
              (Array.isArray(item.order_details) ? item.order_details : []) :
              (Array.isArray(item.order_details) ? item.order_details : []);
            const itemId = item.id || Math.random().toString();
            const itemStatus = item.status || 'Pendiente';
            const paymentStatus = item.payment_status || 'pending'; // 🆕 Nuevo campo
            
            // Generar ID de orden formateado (siempre usar fecha/hora)
            const formattedOrderId = formatOrderId(createdAt);

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

                {/* Status Badge - Ahora incluye payment_status */}
                <View style={[styles.statusBadge, getStatusStyle(itemStatus, paymentStatus).badge]}>
                  <Text style={[styles.statusText, getStatusStyle(itemStatus, paymentStatus).text]}>
                    {paymentStatus === 'pending' ? `${translateStatus(itemStatus) || 'Pendiente'} • Pago Pendiente` : (translateStatus(itemStatus) || 'Pendiente')}
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
                    No hay artículos en este pedido
                  </Text>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.detailsButton,
                      (itemStatus?.toLowerCase() === 'delivered' || itemStatus?.toLowerCase() === 'entregado') && styles.disabledButton,
                    ]}
                    disabled={itemStatus?.toLowerCase() === 'delivered' || itemStatus?.toLowerCase() === 'entregado'}
                    onPress={() =>
                      navigation.navigate('OrderDetails', {orderId: itemId})
                    }>
                    <Text style={styles.detailsText}>
                      {(itemStatus?.toLowerCase() === 'delivered' || itemStatus?.toLowerCase() === 'entregado') ? 'Entregado' : 'Ver detalles'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.invoiceButton}
                    onPress={() => handleInvoices(item)}>
                    <Text style={styles.invoiceText}>Ver ticket</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
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
  disabledButton: {
    backgroundColor: '#ccc',
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
  
  // Estilos para botón crear guest test
  createTestGuestButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 12,
    opacity: 0.9,
  },
  createTestGuestButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#FFF',
    textAlign: 'center',
  },
  
  // Estilos para botón de limpieza temporal
  debugCleanButton: {
    backgroundColor: '#FF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 12,
    opacity: 0.8,
  },
  debugCleanButtonText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#FFF',
    textAlign: 'center',
  },
});

export default Order;
