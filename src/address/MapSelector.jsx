import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import Config from 'react-native-config';
import fonts from '../theme/fonts';
import { useAlert } from '../context/AlertContext';
import { 
  generateCallbackId, 
  registerNavigationCallback, 
  cleanupNavigationCallback 
} from '../utils/navigationCallbacks';
import { isSmallScreen } from '../utils/responsiveUtils';

const MapSelector = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { showAlert } = useAlert();
  
  // Parámetros recibidos
  const {
    userAddress = '', // Dirección en texto del usuario
    onConfirm, // Callback con las coordenadas seleccionadas
    title = 'Confirmar ubicación exacta'
  } = route.params || {};
  
  // Estado para coordenadas seleccionadas
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [callbackId] = useState(() => generateCallbackId()); // ID único para este componente
  
  // Función para obtener coordenadas de la dirección del usuario
  const geocodeUserAddress = async (address) => {
    if (!address || address.trim() === '') {
      return { latitude: 19.4326, longitude: -99.1332 };
    }

    try {

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address: address,
            key: Config.GOOGLE_DIRECTIONS_API_KEY,
            language: 'es',
            region: 'mx', // Priorizar resultados de México
            components: 'country:MX', // Limitar a México
          },
        }
      );

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        const coordinates = {
          latitude: location.lat,
          longitude: location.lng,
        };
        
        return coordinates;
      } else {
        return { latitude: 19.4326, longitude: -99.1332 };
      }
    } catch (error) {
      return { latitude: 19.4326, longitude: -99.1332 };
    }
  };
  
  // Función para ir al mapa
  const handleGoToMap = async () => {
    setIsGeocodingAddress(true);
    
    try {
      // Obtener coordenadas de la dirección del usuario
      const userCoordinates = await geocodeUserAddress(userAddress);
      
      // ✅ NUEVO: Registrar callback con ID único en lugar de pasar función
      const handleLocationReturn = (coordinates) => {
        setSelectedCoordinates(coordinates);
      };
      
      registerNavigationCallback(callbackId, handleLocationReturn);
      
      navigation.navigate('AddressMap', {
        addressForm: { address: userAddress },
        selectedLocation: userCoordinates, // Coordenadas basadas en la dirección del usuario
        userWrittenAddress: userAddress,
        fromMapSelector: true, // Flag para identificar que viene de MapSelector
        callbackId: callbackId, // ✅ SOLUCIONADO: Pasar ID en lugar de función
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudo preparar el mapa. Inténtalo de nuevo.'
      });
    } finally {
      setIsGeocodingAddress(false);
    }
  };
  
  // Función para confirmar coordenadas
  const handleConfirm = () => {
    if (!selectedCoordinates) {
      showAlert({
        type: 'warning',
        title: 'Ubicación Requerida',
        message: 'Por favor selecciona tu ubicación en el mapa.'
      });
      return;
    }
    
    // Si hay callback (uso directo), ejecutarlo
    if (onConfirm) {
      onConfirm(selectedCoordinates);
      navigation.goBack();
    } else {
      // Si no hay callback (viene de Cart), regresar con parámetros
      navigation.navigate('MainTabs', {
        screen: 'Carrito',
        params: {
          mapCoordinates: selectedCoordinates
        }
      });
    }
  };
  
  // Manejar coordenadas recibidas del mapa (fallback para navegación por parámetros)
  useEffect(() => {
    if (route.params?.selectedLocationFromMap) {
      setSelectedCoordinates(route.params.selectedLocationFromMap);
    }
  }, [route.params?.selectedLocationFromMap]);
  
  // ✅ CLEANUP: Limpiar callback al desmontar componente
  useEffect(() => {
    return () => {
      cleanupNavigationCallback(callbackId);
    };
  }, [callbackId]);
  
  // Detectar si es pantalla pequeña para decidir si usar ScrollView
  const needsScroll = isSmallScreen();

  // Función que renderiza el contenido principal
  const renderContent = () => (
    <>
      <Text style={styles.stepTitle}>Confirma tu ubicación exacta</Text>
      <Text style={styles.stepSubtitle}>
        Selecciona tu ubicación en el mapa para entregas precisas
      </Text>
      
      {/* Dirección del usuario */}
      <View style={styles.addressCard}>
        <Ionicons name="location" size={24} color="#D27F27" />
        <View style={styles.addressContent}>
          <Text style={styles.addressLabel}>Tu dirección:</Text>
          <Text style={styles.addressText} numberOfLines={3}>
            {userAddress}
          </Text>
        </View>
      </View>
      
      {/* Estado del mapa */}
      {selectedCoordinates ? (
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#D27F27" />
          <Text style={styles.statusText}>
            Ubicación confirmada en el mapa
          </Text>
        </View>
      ) : (
        <View style={styles.statusContainer}>
          <Ionicons name="location-outline" size={20} color="#D27F27" />
          <Text style={styles.statusText}>
            Selecciona tu ubicación en el mapa
          </Text>
        </View>
      )}
      
      {/* Botón ir al mapa */}
      <TouchableOpacity
        style={[styles.mapButton, isGeocodingAddress && styles.mapButtonDisabled]}
        onPress={handleGoToMap}
        disabled={isGeocodingAddress}>
        {isGeocodingAddress ? (
          <>
            <ActivityIndicator size="small" color="#FFF" />
            <Text style={styles.mapButtonText}>Localizando dirección...</Text>
          </>
        ) : (
          <>
            <Ionicons name="map" size={24} color="#FFF" />
            <Text style={styles.mapButtonText}>
              {selectedCoordinates ? 'Ajustar ubicación' : 'Ir al mapa'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      
      {/* Botón confirmar */}
      <TouchableOpacity
        style={[
          styles.confirmButton,
          !selectedCoordinates && styles.confirmButtonDisabled
        ]}
        onPress={handleConfirm}
        disabled={!selectedCoordinates}>
        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
        <Text style={styles.confirmButtonText}>Confirmar ubicación</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {/* Contenido - Con ScrollView en pantallas pequeñas */}
      {needsScroll ? (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      ) : (
        <View style={styles.content}>
          {renderContent()}
        </View>
      )}
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
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  stepTitle: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  stepSubtitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  addressContent: {
    flex: 1,
    marginLeft: 12,
  },
  addressLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 4,
  },
  addressText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 22,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusText: {
    marginLeft: 10,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5E3C',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  mapButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginLeft: 10,
  },
  mapButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#33A744',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 54,
    shadowColor: '#33A744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginLeft: 10,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
  },
  // ✅ ESTILO PARA SCROLLVIEW EN PANTALLAS PEQUEÑAS
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

export default MapSelector;