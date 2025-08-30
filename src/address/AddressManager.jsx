import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import fonts from '../theme/fonts';
import { addressService } from '../services/addressService';
import { navigateToAddressManagerNew, navigateToAddressManagerEdit, navigateToProfileEdit } from '../utils/addressNavigation';
import axios from 'axios';

const AddressManager = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useContext(AuthContext);
  const { showAlert } = useAlert();
  
  // Estados
  const [addresses, setAddresses] = useState([]);
  const [profileAddress, setProfileAddress] = useState(null); // Dirección del perfil (legacy)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  // Limpiar direcciones que incorrectamente están marcadas como predeterminadas
  const cleanupIncorrectDefaults = async (addresses) => {
    try {
      for (const address of addresses) {
        if (address.is_default === "1" || address.is_default === 1) {
          console.log('🧹 Limpiando dirección incorrectamente marcada como predeterminada:', address.id);
          
          // Actualizar para que NO sea predeterminada
          await addressService.updateAddress({
            addressId: address.id,
            userId: user.id,
            address: address.address,
            phone: address.phone || '',
            isDefault: false
          });
          
          // Actualizar el objeto local también
          address.is_default = "0";
        }
      }
    } catch (error) {
      console.error('⚠️ Error limpiando direcciones predeterminadas:', error);
      // No fallar completamente si hay error en limpieza
    }
  };

  // Cargar direcciones del usuario
  const fetchAddresses = async (isRefresh = false) => {
    if (!user?.id) return;
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      console.log('🔍 AddressManager - Llamando addressService.getAllAddresses para usuario:', user.id);
      const addresses = await addressService.getAllAddresses(user.id);
      console.log('📦 AddressManager - Direcciones recibidas del servicio:', addresses.length, 'direcciones');
      console.log('📋 AddressManager - Detalle de direcciones:', addresses);
      
      // LIMPIEZA: Asegurar que ninguna dirección adicional tenga is_default = 1
      // Solo la dirección del perfil debe ser predeterminada
      await cleanupIncorrectDefaults(addresses);
      
      setAddresses(addresses);
      
    } catch (error) {
      console.error('❌ Error obteniendo direcciones:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudieron cargar tus direcciones. Inténtalo de nuevo.'
      });
      setAddresses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar dirección del perfil (legacy)
  const fetchProfileAddress = async () => {
    if (!user?.id) return;
    
    try {
      const response = await axios.get(`https://food.siliconsoft.pk/api/userdetails/${user.id}`);
      const userData = response.data?.data?.[0];
      
      if (userData?.address && userData.address.trim() !== '') {
        setProfileAddress({
          address: userData.address,
          phone: userData.phone || '',
          isLegacy: true
        });
      } else {
        setProfileAddress(null);
      }
    } catch (error) {
      console.error('❌ Error obteniendo dirección del perfil:', error);
      setProfileAddress(null);
    }
  };

  // Cargar ambos: direcciones múltiples y dirección del perfil
  const loadAllAddresses = async (isRefresh = false) => {
    if (!user?.id) return;
    
    console.log('📍 AddressManager - Cargando todas las direcciones para usuario:', user.id);
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Cargar en paralelo
      await Promise.all([
        fetchAddresses(false), // No pasar isRefresh aquí para evitar doble loading
        fetchProfileAddress()
      ]);
      console.log('✅ AddressManager - Direcciones cargadas exitosamente');
    } catch (error) {
      console.error('❌ AddressManager - Error cargando direcciones:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Eliminar dirección
  const handleDeleteAddress = (addressId, addressText) => {
    showAlert({
      type: 'warning',
      title: 'Eliminar Dirección',
      message: `¿Estás seguro de que quieres eliminar esta dirección?\n\n${addressText}`,
      cancelText: 'Cancelar',
      confirmText: 'Eliminar',
      onConfirm: () => deleteAddress(addressId)
    });
  };

  const deleteAddress = async (addressId) => {
    try {
      setDeletingId(addressId);
      
      await addressService.deleteAddress(addressId);
      
      showAlert({
        type: 'success',
        title: 'Dirección Eliminada',
        message: 'La dirección se eliminó correctamente.'
      });
      
      // Recargar lista
      fetchAddresses();
    } catch (error) {
      console.error('❌ Error eliminando dirección:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo eliminar la dirección. Inténtalo de nuevo.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Sistema de intercambio: hacer predeterminada una dirección intercambiándola con la del perfil
  const setDefaultAddress = async (address) => {
    try {
      setSettingDefaultId(address.id);
      
      showAlert({
        type: 'info',
        title: '🏠 Cambiar Dirección Principal',
        message: `¿Quieres hacer esta dirección tu dirección principal para entregas?`,
        cancelText: 'Cancelar',
        confirmText: 'Sí, cambiar',
        onConfirm: async () => {
          try {
            // ✅ LÓGICA SIMPLIFICADA: Solo cambiar cual dirección es predeterminada
            console.log('🏠 Cambiando dirección predeterminada a:', address.address);

            // PASO 1: Desmarcar TODAS las direcciones como predeterminadas
            // Esto evita duplicaciones y conflictos
            const allAddresses = addresses || [];
            for (const addr of allAddresses) {
              if (addr.is_default === "1" || addr.is_default === 1) {
                await addressService.updateAddress({
                  addressId: addr.id,
                  userId: user.id,
                  address: addr.address,
                  phone: addr.phone || '',
                  isDefault: false // ❌ Ya no es predeterminada
                });
              }
            }

            // PASO 2: Actualizar el perfil del usuario con la nueva dirección predeterminada  
            await updateUser({
              address: address.address,
              phone: address.phone || user.phone
            });

            // PASO 3: Marcar SOLO la dirección seleccionada como predeterminada
            await addressService.updateAddress({
              addressId: address.id,
              userId: user.id,
              address: address.address,
              phone: address.phone || '',
              isDefault: true // ✅ Esta es ahora la ÚNICA predeterminada
            });

            // PASO 3: Actualizar el estado local
            setProfileAddress({
              address: address.address,
              phone: address.phone || user.phone || ''
            });

            showAlert({
              type: 'success',
              title: '🏠 Dirección Principal Actualizada',
              message: 'Esta dirección es ahora tu dirección principal para entregas.'
            });

            // PASO 4: Recargar lista para mostrar cambios
            fetchAddresses();
          } catch (error) {
            console.error('❌ Error intercambiando direcciones:', error);
            showAlert({
              type: 'error',
              title: 'Error en Intercambio',
              message: 'No se pudo intercambiar las direcciones. Inténtalo de nuevo.'
            });
          }
        }
      });
    } catch (error) {
      console.error('❌ Error en setDefaultAddress:', error);
    } finally {
      setSettingDefaultId(null);
    }
  };


  // Navegar para editar dirección usando helper unificado
  const handleEditAddress = (address) => {
    navigateToAddressManagerEdit(navigation, {
      addressData: address,
    });
  };

  // Navegar para editar dirección legacy (del perfil) usando helper
  const handleEditLegacyAddress = (profileAddr) => {
    navigateToProfileEdit(navigation, {
      userId: user.id,
      initialAddress: profileAddr.address, // Dirección completa para parsear
      fromAddressManager: true, // Para saber que debe regresar aquí
      isLegacyEdit: true, // Flag para indicar que es edición de dirección legacy
    });
  };

  // Navegar para agregar nueva dirección
  const handleAddNewAddress = () => {
    // Verificar límite máximo de 3 direcciones
    if (addresses.length >= 3) {
      showAlert({
        type: 'warning',
        title: 'Límite de Direcciones',
        message: 'Solo puedes tener un máximo de 3 direcciones guardadas. Elimina alguna dirección existente para agregar una nueva.'
      });
      return;
    }

    navigateToAddressManagerNew(navigation);
  };

  // Renderizar item de dirección
  const renderAddressItem = ({ item, index }) => {
    // IMPORTANTE: Las direcciones adicionales NUNCA son predeterminadas en el nuevo sistema
    // Solo la dirección del perfil puede ser predeterminada
    const isDefault = false; // Forzar a false siempre
    const isDeleting = deletingId === item.id;
    const isSettingDefault = settingDefaultId === item.id;
    const addressTitle = `Dirección ${index + 1}`;
    
    return (
      <View style={[styles.addressCard]}>
        {/* Header con icono y estado */}
        <View style={styles.addressHeader}>
          <View style={styles.addressIconContainer}>
            <Ionicons 
              name="location-outline" 
              size={20} 
              color="#8B5E3C" 
            />
          </View>
          
          <View style={styles.addressActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setDefaultAddress(item)}
              disabled={isSettingDefault}>
              {isSettingDefault ? (
                <ActivityIndicator size="small" color="#8B5E3C" />
              ) : (
                <Ionicons name="home-outline" size={18} color="#8B5E3C" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditAddress(item)}>
              <Ionicons name="create-outline" size={18} color="#D27F27" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteAddress(item.id, item.address)}
              disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#E74C3C" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenido de la dirección */}
        <View style={styles.addressContent}>
          <Text style={styles.addressTitle}>{addressTitle}</Text>
          <Text style={styles.addressText} numberOfLines={3}>
            {item.address}
          </Text>
          {item.phone && (
            <Text style={styles.phoneText}>
              📱 {item.phone}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Cargar direcciones al montar componente
  useEffect(() => {
    loadAllAddresses();
  }, [user?.id]);

  // Refrescar cuando la pantalla gane foco (por ejemplo, al regresar del formulario)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 AddressManager - Pantalla ganó foco, recargando direcciones...');
      if (user?.id) {
        loadAllAddresses();
      }
    }, [user?.id])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Direcciones</Text>
        <TouchableOpacity
          onPress={handleAddNewAddress}
          style={styles.addButton}>
          <Ionicons name="add" size={24} color="#33A744" />
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5E3C" />
            <Text style={styles.loadingText}>Cargando direcciones...</Text>
          </View>
        ) : addresses.length === 0 && !profileAddress ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No tienes direcciones guardadas</Text>
            <Text style={styles.emptySubtitle}>
              Agrega tu primera dirección para acelerar tus pedidos
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={handleAddNewAddress}>
              <Ionicons name="add-circle" size={24} color="#FFF" />
              <Text style={styles.addFirstButtonText}>Agregar Primera Dirección</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderAddressItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadAllAddresses(true)}
                colors={['#8B5E3C']}
                tintColor="#8B5E3C"
              />
            }
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={profileAddress ? () => (
              <View style={[styles.addressCard, styles.legacyAddressCard]}>
                {/* Header con indicador legacy */}
                <View style={styles.addressHeader}>
                  <View style={styles.addressIconContainer}>
                    <Ionicons name="home" size={20} color="#33A744" />
                    <Text style={styles.defaultBadge}>Predeterminada</Text>
                  </View>
                  
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditLegacyAddress(profileAddress)}>
                      <Ionicons name="create-outline" size={18} color="#D27F27" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Contenido de la dirección */}
                <View style={styles.addressContent}>
                  <Text style={styles.addressText} numberOfLines={3}>
                    {profileAddress.address}
                  </Text>
                  {profileAddress.phone && (
                    <Text style={styles.phoneText}>
                      📱 {profileAddress.phone}
                    </Text>
                  )}
                  <Text style={styles.legacyNote}>
                    🏠 Esta es tu dirección predeterminada. Para cambiarla, haz una dirección de abajo como predeterminada.
                  </Text>
                </View>
              </View>
            ) : null}
            ListFooterComponent={() => (
              <TouchableOpacity
                style={styles.addAnotherButton}
                onPress={handleAddNewAddress}>
                <Ionicons name="add-circle-outline" size={24} color="#8B5E3C" />
                <Text style={styles.addAnotherButtonText}>Agregar Nueva Dirección</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  addButton: {
    padding: 8,
    marginRight: -8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#33A744',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addFirstButtonText: {
    marginLeft: 8,
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  listContainer: {
    paddingBottom: 16,
  },
  addressCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  defaultAddressCard: {
    borderColor: '#33A744',
    borderWidth: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  defaultBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#33A744',
    color: '#FFF',
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    borderRadius: 4,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  addressContent: {
    marginTop: 4,
  },
  addressTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  addressText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 22,
    marginBottom: 6,
  },
  phoneText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#666',
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#8B5E3C',
    borderStyle: 'dashed',
    paddingVertical: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  addAnotherButtonText: {
    marginLeft: 8,
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#8B5E3C',
  },
  
  // ✅ ESTILOS PARA DIRECCIÓN LEGACY (PERFIL)
  legacyAddressCard: {
    borderColor: '#D27F27',
    borderWidth: 2,
    backgroundColor: 'rgba(210, 127, 39, 0.05)',
    marginBottom: 16,
  },
  legacyBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#D27F27',
    color: '#FFF',
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    borderRadius: 4,
  },
  legacyNote: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
});

export default AddressManager;