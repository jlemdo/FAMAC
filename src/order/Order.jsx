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

const Order = () => {
  const navigation = useNavigation();
  const {user} = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {orders, orderCount, refreshOrders, lastFetch} = useContext(OrderContext);

  const handleInvoices = order => {
    const invoiceURL = `https://food.siliconsoft.pk/invoices/${order.invoice}`;
    Linking.openURL(invoiceURL).catch(err => {
      alert('Unable to open invoice. Please try again.');
    });
  };

  // Función simplificada para refresh manual (pull-to-refresh)
  const handleRefresh = () => {
    setRefreshing(true);
    refreshOrders();
    // Siminar pequeño delay para mostrar el spinner
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#33A744" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id.toString()}
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
                  // Guest que ya hizo pedidos (tiene email)
                  <>
                    <Text style={styles.userTitle}>📦 ¡Tienes pedidos esperándote!</Text>
                    <Text style={styles.userText}>
                      Hemos guardado tus pedidos con el email:{' '}
                      <Text style={styles.userEmail}>{String(user.email)}</Text>
                    </Text>
                    <Text style={styles.userHighlight}>
                      🎉 Regístrate ahora para ver todos tus pedidos y disfrutar de funciones exclusivas
                    </Text>
                    <Text style={styles.userSubtext}>
                      ✨ Al registrarte, todos tus pedidos aparecerán automáticamente aquí
                    </Text>
                  </>
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

            // Propiedades con valores por defecto
            const createdAt = item.created_at || new Date().toISOString();
            const totalPrice = typeof item.total_price === 'number' ? item.total_price : 0;
            const orderDetails = Array.isArray(item.order_details) ? item.order_details : [];
            const itemId = item.id || Math.random().toString();
            const itemStatus = item.status || 'Pendiente';
            
            // Generar ID de orden formateado
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
                      itemStatus === 'Entregado' && styles.disabledButton,
                    ]}
                    disabled={itemStatus === 'Entregado'}
                    onPress={() =>
                      navigation.navigate('OrderDetails', {orderId: itemId})
                    }>
                    <Text style={styles.detailsText}>
                      {itemStatus === 'Entregado' ? 'Entregado' : 'Ver detalles'}
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
    fontFamily: fonts.bold,
    color: '#D27F27',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
    marginBottom: 8,
  },
  total: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
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
    fontFamily: fonts.regular,
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
});

export default Order;
