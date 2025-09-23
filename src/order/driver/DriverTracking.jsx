import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { OrderContext } from '../../context/OrderContext';
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
  Platform,
  Modal,
  Alert,
} from 'react-native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import {useNavigation, useRoute} from '@react-navigation/native';
import MapView, {Marker} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Config from 'react-native-config';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AuthContext} from '../../context/AuthContext';
import axios from 'axios';
import fonts from '../../theme/fonts';
import { getCurrentLocation as getCurrentLocationUtil, startLocationTracking, stopLocationTracking } from '../../utils/locationUtils';

const DriverTracking = ({order}) => {
  const navigation = useNavigation();
  const { orders } = useContext(OrderContext);
  const [latlong, setLatlong] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState({distance: 0, duration: 0});
  const mapRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);


  const showConfirmationModal = (action) => {
    setModalAction(action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    setShowConfirmModal(false);
    if (modalAction === 'accept') {
      await handleAcceptOrder();
    } else if (modalAction === 'deliver') {
      await handleDeliverOrder();
    }
  };

  const handleAcceptOrder = async () => {
    try {
      setLoading(true);

      // Verificar si el driver ya tiene órdenes activas
      const activeOrders = orders?.filter(o =>
        o.driver_id === order.driver_id &&
        ['On the Way', 'on the way', 'en camino', 'In Progress', 'in progress'].includes(o.status)
      );

      if (activeOrders && activeOrders.length > 0) {
        Alert.alert(
          '⚠️ Ya tienes un pedido activo',
          'Debes completar tu pedido actual antes de aceptar uno nuevo.',
          [{ text: 'Entendido', style: 'default' }]
        );
        setLoading(false);
        return;
      }

      // Obtener ubicación actual del driver
      await getCurrentLocation();

      // Enviar ubicación al servidor que actualiza el estado automáticamente
      await submitDriverLocation();

      // Actualizar estado local inmediatamente
      setCurrentStatus('On the Way');

      Alert.alert(
        '✅ Pedido Aceptado',
        'Has aceptado este pedido. Dirígete a recoger los productos.',
        [{ text: 'Entendido', style: 'default' }]
      );

    } catch (error) {
      console.error('Error aceptando pedido:', error);
      Alert.alert(
        '❌ Error',
        'No se pudo aceptar el pedido. Intenta nuevamente.',
        [{ text: 'Entendido', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverOrder = async () => {
    try {
      setLoading(true);

      await completeOrderFromDriver();

      // Actualizar estado local inmediatamente
      setCurrentStatus('Delivered');

      Alert.alert(
        '✅ Pedido Entregado',
        '¡Excelente! Has marcado el pedido como entregado exitosamente.',
        [{ text: 'Perfecto', style: 'default' }]
      );

    } catch (error) {
      console.error('Error entregando pedido:', error);
      Alert.alert(
        '❌ Error',
        'No se pudo marcar el pedido como entregado. Intenta nuevamente.',
        [{ text: 'Entendido', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getModalContent = () => {
    if (modalAction === 'accept') {
      return {
        title: '¿Aceptar pedido?',
        message: 'Confirma que estás listo para recoger y entregar este pedido.',
        confirmText: 'Aceptar pedido',
        cancelText: 'Cancelar'
      };
    } else if (modalAction === 'deliver') {
      return {
        title: '¿Marcar como entregado?',
        message: 'Confirma que has entregado el pedido al cliente.',
        confirmText: 'Confirmar entrega',
        cancelText: 'Cancelar'
      };
    }
    return {};
  };

  const submitDriverLocation = useCallback(async () => {
    if (!latlong?.driver_lat || !latlong?.driver_long) {
      console.log('⚠️ No hay coordenadas válidas para enviar');
      return;
    }

    const payload = {
      orderid: order.id,
      driver_lat: latlong.driver_lat,
      driver_long: latlong.driver_long,
    };

    console.log('📍 Enviando ubicación del driver:', payload);

    try {
      const response = await axios.post(
        'https://occr.pixelcrafters.digital/api/driverlocsubmit',
        payload,
      );

      console.log('📡 Respuesta del servidor:', response.status, response.data);

      if (response.status === 201 || response.status === 200) {
        console.log('✅ Ubicación enviada exitosamente');
        await fetchOrder();
      } else {
        console.log('⚠️ Respuesta inesperada del servidor:', response.status);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;

      if (errorMsg.includes('Too Many Attempts') || errorMsg.includes('throttle')) {
        console.warn('⚠️ Rate limiting activo - esperando antes del próximo envío');
        // No hacer nada más, el próximo interval lo intentará
      } else {
        console.error('❌ Error enviando ubicación:', errorMsg);
      }
    }
  }, [order.id, latlong, fetchOrder]);

  const fetchOrder = useCallback(async () => {
    try {
      console.log(`🔄 Actualizando estado de orden ${order.id}...`);

      const res = await axios.get(
        `https://occr.pixelcrafters.digital/api/orderdetails/${order.id}`,
      );

      const newStatus = res?.data?.order?.status;
      console.log(`📊 Estado actualizado: "${currentStatus}" → "${newStatus}"`);

      setCurrentStatus(newStatus);

      // Log temporal para identificar estados reales del backend
      console.log('🔍 ESTADO REAL del backend:', {
        id: order.id,
        status: newStatus,
        original_status: res?.data?.order?.status,
        payment_status: res?.data?.order?.payment_status,
        driver_id: res?.data?.order?.driver_id
      });

    } catch (err) {
      console.error('❌ Error obteniendo detalles de orden:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [order.id, currentStatus]);

  const completeOrderFromDriver = async () => {
    try {
      console.log(`📦 Marcando orden ${order.id} como entregada...`);

      const response = await axios.post(
        'https://occr.pixelcrafters.digital/api/orderdel',
        {
          orderid: order.id,
        },
      );

      console.log('📡 Respuesta de entrega:', response.status, response.data);

      if (response.status === 200 || response.status === 201) {
        console.log('✅ Orden marcada como entregada exitosamente');
        await fetchOrder();
      } else {
        throw new Error(`Respuesta inesperada del servidor: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Error marcando como entregado:', error.response?.data || error.message);
      throw error; // Re-lanzar para que handleDeliverOrder lo capture
    }
  };

  // const getCurrentLocation = async () => {
  //     try {
  //         if (Platform.OS === 'android') {
  //             const granted = await PermissionsAndroid.request(
  //                 PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  //             );
  //             if (granted === PermissionsAndroid.RESULTS.GRANTED) {
  //                 const location = await GetLocation.getCurrentPosition({
  //                     enableHighAccuracy: true,
  //                     timeout: 60000,
  //                 });

  //                 if (location != null) {
  //                     setLatlong({
  //                         driver_lat: location.latitude,
  //                         driver_long: location.longitude,
  //                     });
  //                 }
  //             } else {
  //             }
  //         }
  //     } catch (error) {
  //         const { code, message } = error;
  //     } finally {
  //     }
  // };

  const getCurrentLocation = async () => {
    try {
      // Usar ubicación real con solicitud de permisos
      await getCurrentLocationUtil(
        'driver',
        (coordinates) => {
          setLatlong({
            driver_lat: coordinates.latitude,
            driver_long: coordinates.longitude,
          });
        },
        (error) => {
          console.log('Error obteniendo ubicación:', error);
          // Fallback a ubicación de CDMX si falla
          setLatlong({
            driver_lat: 19.4326,
            driver_long: -99.1332,
          });
        }
      );
    } catch (error) {
    }
  };

  const getDriverLocaton = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://occr.pixelcrafters.digital/api/driverlocationsagainstorder/${order.id}`,
      );

      const locations = response.data.data;
      const lastLocation = locations[locations.length - 1];

      setLatlong({
        driver_lat: parseFloat(lastLocation.driver_lat),
        driver_long: parseFloat(lastLocation.driver_long),
      });
    } catch (error) {
    }
  }, [order.id]);

  // Define customer coords antes del return
  const customer = {
    latitude: parseFloat(order.customer_lat),
    longitude: parseFloat(order.customer_long),
  };

  // ✅ INICIALIZACIÓN CRÍTICA: Driver SIEMPRE necesita ubicación
  useEffect(() => {
    
    // CRÍTICO: Obtener ubicación inmediatamente para cualquier estado
    getCurrentLocation();
    
    if (currentStatus === 'On the Way') {
      // Para órdenes en proceso, también obtener ubicación guardada
      getDriverLocaton();

      // ARREGLADO: Intervalo más espaciado para evitar rate limiting
      const interval = setInterval(() => {
        getDriverLocaton();
        getCurrentLocation();

        // Enviar ubicación solo cada 2 iteraciones (cada 20 segundos)
        if (Math.random() > 0.5) {
          submitDriverLocation();
        }
      }, 10000); // Cambiar de 5s a 10s
      return () => clearInterval(interval);
    } else if (currentStatus === 'Delivered') {
      // Para órdenes entregadas, obtener ubicación final guardada
      getDriverLocaton();
    }
  }, [order.id]); // Dependencia simple para ejecutar solo al cargar

  return (
    <>


      {/* 🗺️ Mapa de Entrega */}
      {latlong && latlong.driver_lat && latlong.driver_long && (
        <View style={styles.mapCard}>
          <Text style={styles.sectionTitle}>📍 Ruta de Entrega</Text>
          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              style={styles.map}
              showsTraffic={true}
              initialRegion={{
                latitude: (latlong.driver_lat + customer.latitude) / 2,
                longitude: (latlong.driver_long + customer.longitude) / 2,
                latitudeDelta: Math.abs(latlong.driver_lat - customer.latitude) * 1.5 || 0.01,
                longitudeDelta: Math.abs(latlong.driver_long - customer.longitude) * 1.5 || 0.01,
              }}>
              
              {/* Ruta entre driver y cliente */}
              <MapViewDirections
                origin={{
                  latitude: latlong.driver_lat,
                  longitude: latlong.driver_long,
                }}
                destination={customer}
                apikey={Config.GOOGLE_DIRECTIONS_API_KEY}
                strokeWidth={4}
                strokeColor="#8B5E3C"
                onReady={result => {
                  setEta({distance: result.distance, duration: result.duration});
                  setRouteCoords(result.coordinates);
                  mapRef.current?.fitToCoordinates(result.coordinates, {
                    edgePadding: {top: 80, right: 40, bottom: 80, left: 40},
                    animated: true,
                  });
                }}
                onError={() => {
                  // Error en directions - continuar sin ruta
                }}
              />

              {/* Marcador del Driver */}
              <Marker
                coordinate={{
                  latitude: latlong.driver_lat,
                  longitude: latlong.driver_long,
                }}
                title="Mi Ubicación"
                description="Estás aquí"
                pinColor="#D27F27"
              />

              {/* Marcador del Cliente */}
              <Marker
                coordinate={customer}
                title="Cliente"
                description="Destino de entrega"
                pinColor="#33A744"
              />
            </MapView>
            
            {/* HUD con información de ETA */}
            {eta && eta.distance > 0 && (
              <View style={styles.hud}>
                <Text style={styles.hudText}>
                  🚗 {eta.distance.toFixed(1)} km • ⏱ {Math.ceil(eta.duration)} min
                </Text>
              </View>
            )}
            
            {/* Solo botón de navegación */}
            <TouchableOpacity
              style={styles.navigateMapBtn}
              onPress={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`;
                Linking.openURL(url);
              }}>
              <Ionicons name="navigate-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 🎯 Acciones del Driver */}
      <View style={styles.actionCard}>
        <Text style={styles.sectionTitle}>🚚 Acciones de Entrega</Text>
        
        {order?.payment_status === 'paid' ? (
          <>
            {/* 🎯 BOTÓN ACEPTAR - Estados que permiten aceptar pedido */}
            {(() => {
              const status = currentStatus?.toLowerCase()?.trim() || '';
              const acceptableStates = [
                'open', 'abierto',
                'pending', 'pendiente',
                'confirmed', 'confirmado',
                'preparing', 'preparando'
              ];

              const shouldShowAccept = acceptableStates.includes(status);

              // Log temporal para debugging
              console.log('🎯 BOTÓN ACEPTAR Debug:', {
                currentStatus,
                statusLower: status,
                shouldShowAccept,
                acceptableStates
              });

              return shouldShowAccept;
            })() && (
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton, loading && styles.buttonDisabled]}
                onPress={() => showConfirmationModal('accept')}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.actionButtonText}>✅ Aceptar Pedido</Text>
                )}
              </TouchableOpacity>
            )}

            {/* 🚚 BOTÓN ENTREGAR - Cuando ya está en camino */}
            {(() => {
              const status = currentStatus?.toLowerCase()?.trim() || '';
              const deliverableStates = [
                'on the way', 'en camino',
                'in progress', 'en progreso',
                'out for delivery', 'en reparto',
                'ready', 'listo'
              ];

              const shouldShowDeliver = deliverableStates.includes(status);

              // Log temporal para debugging
              console.log('🚚 BOTÓN ENTREGAR Debug:', {
                currentStatus,
                statusLower: status,
                shouldShowDeliver,
                deliverableStates
              });

              return shouldShowDeliver;
            })() && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deliverButton, loading && styles.buttonDisabled]}
                onPress={() => showConfirmationModal('deliver')}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.actionButtonText}>📦 Marcar como Entregado</Text>
                )}
              </TouchableOpacity>
            )}

            {/* 🏁 ESTADO ENTREGADO - Solo mostrar información */}
            {(() => {
              const status = currentStatus?.toLowerCase()?.trim() || '';
              const completedStates = [
                'delivered', 'entregado',
                'completed', 'completado',
                'finished', 'terminado'
              ];

              const isCompleted = completedStates.includes(status);

              // Log temporal para debugging
              console.log('🏁 ESTADO COMPLETADO Debug:', {
                currentStatus,
                statusLower: status,
                isCompleted,
                completedStates
              });

              return isCompleted;
            })() && (
              <View style={styles.completedContainer}>
                <Text style={styles.completedText}>✅ Pedido Entregado</Text>
                <Text style={styles.completedSubtext}>Este pedido ha sido completado exitosamente</Text>
              </View>
            )}

          </>
        ) : (
          <View style={styles.paymentPendingContainer}>
            <Text style={styles.paymentPendingText}>
              ⚠️ Esta orden no puede procesarse hasta que se confirme el pago
            </Text>
            <Text style={styles.paymentStatusInfo}>
              Estado del pago: {order?.payment_status === 'pending' ? 'Pendiente' : 
                                order?.payment_status === 'failed' ? 'Fallido' : 'Desconocido'}
            </Text>
          </View>
        )}
      </View>

      {/* Modal de Confirmación */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getModalContent().title}</Text>
            <Text style={styles.modalMessage}>{getModalContent().message}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.modalCancelText}>{getModalContent().cancelText}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmAction}>
                <Text style={styles.modalConfirmText}>{getModalContent().confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // backgroundColor: '#F2EFE4',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  deliveryInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 15,
  },
  infoText: {
    fontSize: fonts.size.medium,
    marginBottom: 5,
    color: '#444',
    fontFamily: fonts.regular,
  },
  itemsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    marginBottom: 10,
    color: '#333',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#222',
  },
  itemPrice: {
    fontSize: fonts.size.small,
    color: '#777',
    fontFamily: fonts.regular,
  },
  map: {
    width: '100%',
    height: 300,
  },
  mapCard: {
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
  mapWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    height: 300,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  actionCard: {
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
  actionButton: {
    backgroundColor: '#D27F27',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
  },
  hud: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 10,
  },
  hudText: {
    fontFamily: fonts.bold,
    color: '#FFF',
    fontSize: fonts.size.small,
  },
  navigateMapBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  
  // 🆕 Payment Validation Styles
  paymentPendingContainer: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  paymentPendingText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#F57C00',
    textAlign: 'center',
    marginBottom: 8,
  },
  paymentStatusInfo: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: '#E65100',
    textAlign: 'center',
  },
  
  // 🗺️ Map placeholder styles
  mapPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  
  // 🚚 DEBUG styles
  debugContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  debugTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  debugText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#666',
    marginBottom: 8,
  },
  debugSuccess: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#33A744',
    marginTop: 12,
    textAlign: 'center',
  },
  
  // 🎯 Modal Styles (Uber/DiDi style)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
  modalTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#D27F27',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // 🆕 Estilos para botones específicos
  acceptButton: {
    backgroundColor: '#33A744', // Verde para aceptar
  },
  deliverButton: {
    backgroundColor: '#2196F3', // Azul para entregar
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // 🆕 Estilos para estado completado
  completedContainer: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#33A744',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  completedText: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#1B5E20',
    textAlign: 'center',
    marginBottom: 4,
  },
  completedSubtext: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2E7D32',
    textAlign: 'center',
  },

});

export default DriverTracking;
