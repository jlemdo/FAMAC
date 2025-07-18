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

const OrderDetails = () => {
  const {user} = useContext(AuthContext);
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/orderdetails/${orderId}`,
      );
      console.log('res 😁', res);
      setOrder(res.data.order); // adjust according to your response shape
    } catch (err) {
      console.log('Order fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {fetchOrder();}
  }, [orderId, fetchOrder]);

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
            <Text style={styles.infoText}>Numero de pedido: #{order?.id}</Text>
            <Text style={styles.infoText}>Estado: {order?.status}</Text>
          </View>

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
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
              }).format(order?.total_price)}
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
      </ScrollView>
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
    fontFamily: fonts.original,
    fontSize: fonts.size.XLLL,
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
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
});


export default OrderDetails;
