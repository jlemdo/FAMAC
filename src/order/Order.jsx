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

const Order = () => {
  const navigation = useNavigation();
  const {user} = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {updateOrders, orderCount} = useContext(OrderContext);

  const handleInvoices = order => {
    const invoiceURL = `https://food.siliconsoft.pk/invoices/${order.invoice}`;
    Linking.openURL(invoiceURL).catch(err => {
      console.error('Failed to open URL:', err);
      alert('Unable to open invoice. Please try again.');
    });
  };

  // 1. No hace falta useCallback aquí, basta con una función normal:
  const fetchOrders = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const url =
        user.usertype === 'driver'
          ? `https://food.siliconsoft.pk/api/orderhistorydriver/${user.id}`
          : `https://food.siliconsoft.pk/api/orderhistory/${user.id}`;

      const {data} = await axios.get(url);

      // Ordenar los pedidos por fecha descendente (más reciente primero)
      const sortedOrders = data.orders.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      setOrders(sortedOrders);
      updateOrders(sortedOrders); // actualizar también el contexto ordenado
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // 2. Disparamos solo cuando cambie el usuario:
  useEffect(() => {
    fetchOrders();
  }, [user.id]);

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
          onRefresh={fetchOrders}
          // Encabezado siempre arriba
          ListHeaderComponent={
            <Text style={styles.header}>Historial de Pedidos</Text>
          }
          // Mensaje cuando no hay pedidos
          ListEmptyComponent={
            <Text style={styles.emptyOrders}>No tienes pedidos aúns.</Text>
          }
          renderItem={({item}) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderDate}>
                  {new Date(item.created_at).toLocaleString('es-MX', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Text>
                <Text style={styles.total}>
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  }).format(item.total_price)}
                </Text>
              </View>

              <Text style={styles.itemHeader}>Artículos:</Text>
              {item.order_details.length > 0 ? (
                item.order_details.map((product, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Image
                      source={{uri: product.item_image}}
                      style={styles.itemImage}
                    />
                    <View>
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
                <Text style={styles.noItems}>
                  No hay artículos en este pedido
                </Text>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.detailsButton,
                    item.status === 'Entregado' && styles.disabledButton,
                  ]}
                  disabled={item.status === 'Entregado'}
                  onPress={() =>
                    navigation.navigate('OrderDetails', {orderId: item.id})
                  }>
                  <Text style={styles.detailsText}>
                    {item.status === 'Entregado' ? 'Entregado' : 'Ver detalles'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.invoiceButton}
                  onPress={() => handleInvoices(item)}>
                  <Text style={styles.invoiceText}>Ver factura</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    fontSize: fonts.size.XLLL,
    fontFamily: fonts.original,
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
    marginBottom: 12,
  },
  orderDate: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
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
});

export default Order;
