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
import { newAddressService } from '../services/newAddressService';
import axios from 'axios';

const AddressManager = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useContext(AuthContext);
  const { showAlert } = useAlert();
  
  // Estados - Sistema nuevo simplificado
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);


  // Cargar direcciones del usuario - Sistema nuevo
  const fetchAddresses = async (isRefresh = false) => {
    if (!user?.id) return;
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const userAddresses = await newAddressService.getUserAddresses(user.id);
      
      setAddresses(userAddresses);
      
    } catch (error) {
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
      
      await newAddressService.deleteUserAddress(addressId);
      
      showAlert({
        type: 'success',
        title: 'Dirección Eliminada',
        message: 'La dirección se eliminó correctamente.'
      });
      
      // Recargar lista
      fetchAddresses();
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo eliminar la dirección. Inténtalo de nuevo.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Establecer dirección como primaria - Sistema nuevo simplificado
  const setPrimaryAddress = async (address) => {
    try {
      setSettingPrimaryId(address.id);
      
      showAlert({
        type: 'info',
        title: 'Hacer Principal',
        message: `¿Quieres hacer esta dirección tu dirección principal para entregas?`,
        cancelText: 'Cancelar',
        confirmText: 'Sí, hacer principal',
        onConfirm: async () => {
          try {
            
            await newAddressService.setPrimaryUserAddress(address.id);
            
            showAlert({
              type: 'success',
              title: 'Dirección Principal Actualizada',
              message: 'Esta dirección es ahora tu dirección principal para entregas.'
            });

            // Recargar lista para mostrar cambios
            fetchAddresses();
          } catch (error) {
            showAlert({
              type: 'error',
              title: 'Error',
              message: error.message || 'No se pudo establecer como dirección principal. Inténtalo de nuevo.'
            });
          }
        }
      });
    } catch (error) {
    } finally {
      setSettingPrimaryId(null);
    }
  };


  // Navegar para editar dirección
  const handleEditAddress = (address) => {
    navigation.navigate('AddressFormUberStyle', {
      title: 'Editar Dirección',
      editMode: true,
      addressData: address,
      fromAddressManager: true,
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

    navigation.navigate('AddressFormUberStyle', {
      title: 'Agregar Nueva Dirección',
      editMode: false,
      fromAddressManager: true,
    });
  };

  // Renderizar item de dirección
  const renderAddressItem = ({ item, index }) => {
    const isPrimary = item.is_primary === true || item.is_primary === 1;
    const isDeleting = deletingId === item.id;
    const isSettingPrimary = settingPrimaryId === item.id;
    const addressTitle = isPrimary ? 'Dirección Principal' : `Dirección ${index + 1}`;
    
    return (
      <View style={[styles.addressCard, isPrimary && styles.primaryAddressCard]}>
        {/* Header con icono y estado */}
        <View style={styles.addressHeader}>
          <View style={styles.addressIconContainer}>
            <Ionicons 
              name={isPrimary ? "home" : "location-outline"} 
              size={20} 
              color={isPrimary ? "#33A744" : "#8B5E3C"} 
            />
            {isPrimary && (
              <Text style={styles.primaryBadge}>Principal</Text>
            )}
          </View>
          
          <View style={styles.addressActions}>
            {!isPrimary && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setPrimaryAddress(item)}
                disabled={isSettingPrimary}>
                {isSettingPrimary ? (
                  <ActivityIndicator size="small" color="#8B5E3C" />
                ) : (
                  <Ionicons name="home-outline" size={18} color="#8B5E3C" />
                )}
              </TouchableOpacity>
            )}
            
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
            {newAddressService.formatAddressForDisplay(item)}
          </Text>
          {item.phone && (
            <Text style={styles.phoneText}>
              📱 {item.phone}
            </Text>
          )}
          {item.label && (
            <Text style={styles.labelText}>
              🏷️ {item.label}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Cargar direcciones al montar componente
  useEffect(() => {
    if (user?.id) {
      fetchAddresses();
    }
  }, [user?.id]);

  // Refrescar cuando la pantalla gane foco (por ejemplo, al regresar del formulario)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchAddresses();
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
        ) : addresses.length === 0 ? (
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
                onRefresh={() => fetchAddresses(true)}
                colors={['#8B5E3C']}
                tintColor="#8B5E3C"
              />
            }
            contentContainerStyle={styles.listContainer}
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
  primaryAddressCard: {
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
  primaryBadge: {
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
    marginBottom: 4,
  },
  labelText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
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
});

export default AddressManager;