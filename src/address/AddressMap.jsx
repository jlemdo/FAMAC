import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import axios from 'axios';
import fonts from '../theme/fonts';
import { useAlert } from '../context/AlertContext';
import { useResponsive } from '../hooks/useResponsive';
import { scaleSpacing, scaleFontSize, getButtonDimensions, isSmallScreen } from '../utils/responsiveUtils';
import { executeNavigationCallback } from '../utils/navigationCallbacks';
import { 
  ALCALDIAS_CDMX, 
  MUNICIPIOS_EDOMEX, 
  validatePostalCode,
  parseAddressComponents 
} from '../utils/addressValidators';

const AddressMap = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { showAlert } = useAlert();
  const responsive = useResponsive();

  // Parámetros de navegación
  const {
    addressForm = {},
    selectedLocation: rawSelectedLocation = { latitude: 19.4326, longitude: -99.1332 },
    pickerId,
    callbackId,
    onLocationReturn,
    fromGuestCheckout = false,
    userWrittenAddress = '',
    fromMapSelector = false
  } = route.params || {};

  // CRÍTICO: Convertir coordenadas a números (pueden venir como strings de la BD)
  const selectedLocation = {
    latitude: parseFloat(rawSelectedLocation?.latitude) || 19.4326,
    longitude: parseFloat(rawSelectedLocation?.longitude) || -99.1332,
  };

  const [currentLocation, setCurrentLocation] = useState(selectedLocation);
  const mapRef = useRef(null);
  


  // 🎯 NUEVO: Manejar movimiento del mapa (pin fijo central como Uber/DiDi)
  const handleRegionChangeComplete = async (region) => {
    const { latitude, longitude } = region;
    setCurrentLocation({ latitude, longitude });
    
    // Opcional: Geocoding inverso para obtener dirección (solo para debug/info)
    // No ejecutar callbacks automáticamente, solo al confirmar
  };

  // Confirmar ubicación y regresar
  const handleConfirm = async () => {
    // Asegurarse de que hay una ubicación seleccionada (ya sea por geocoding o selección manual)
    if (!currentLocation || (currentLocation.latitude === 19.4326 && currentLocation.longitude === -99.1332)) {
      showAlert({
        type: 'warning',
        title: 'Ubicación requerida',
        message: 'Por favor ajusta tu ubicación en el mapa o verifica tu dirección'
      });
      return;
    }

    // ✅ CORREGIDO: Primero verificar MapSelector (tiene prioridad)
    if (fromMapSelector) {
      // Usar callback por ID o fallback a función directa
      if (callbackId) {
        executeNavigationCallback(callbackId, currentLocation);
        navigation.goBack();
        return;
      } else if (onLocationReturn) {
        onLocationReturn(currentLocation);
        navigation.goBack();
        return;
      }
      
      // Fallback: usar parámetros de navegación
      navigation.replace('MapSelector', {
        ...route.params,
        selectedLocationFromMap: currentLocation,
      });
      return;
    }

    // ✅ CORREGIDO: Luego verificar si viene del nuevo flujo consolidado (AddressFormUberStyle)
    if (callbackId) {
      executeNavigationCallback(callbackId, currentLocation, addressForm);
      navigation.goBack();
      return;
    } else if (onLocationReturn) {
      onLocationReturn(currentLocation, addressForm);
      navigation.goBack();
      return;
    }

    // Si viene del flujo Guest Checkout
    if (fromGuestCheckout) {
      // Intentar obtener dirección legible con reverse geocoding
      let formattedAddress = 'Ubicación seleccionada en el mapa';
      
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json`,
          {
            params: {
              latlng: `${currentLocation.latitude},${currentLocation.longitude}`,
              key: Config.GOOGLE_DIRECTIONS_API_KEY,
              language: 'es',
              region: 'mx',
            },
          }
        );

        if (response.data.results && response.data.results.length > 0) {
          // Buscar una dirección que tenga sentido (evitar códigos raros)
          for (const result of response.data.results) {
            const address = result.formatted_address;
            // Verificar que la dirección contenga elementos normales de una dirección
            if (address && 
                address.length > 15 && 
                !address.includes('+') && // Evitar plus codes
                (address.includes('Calle') || address.includes('Av') || address.includes('Boulevard') || 
                 address.includes('Calz') || address.includes(',') || address.includes('México'))) {
              formattedAddress = address;
              break;
            }
          }
        }
      } catch (error) {
      }
      
      // CRITICAL: Solo devolver coordenadas y preservar dirección + referencias del usuario
      navigation.navigate('AddressFormUberStyle', {
        selectedLocationFromMap: currentLocation, // SOLO coordenadas
        // PRESERVAR dirección y referencias originales del usuario
        preservedUserAddress: route.params?.userWrittenAddress,
        preservedReferences: route.params?.references,
        fromGuestCheckout: true,
        // CRITICAL: Preservar TODOS los parámetros originales que llegaron al mapa
        ...route.params, // Devolver todos los parámetros preservados
      });
      return;
    }
    
    // ✅ Fallback: navegación simple de vuelta
    navigation.goBack();
  };

  // Obtener dimensiones de pantalla para calcular altura del mapa
  const { height: screenHeight } = Dimensions.get('window');
  // Altura del mapa: pantalla - header(~90) - card instrucciones(~120) - botones(~90) - padding
  const mapHeight = Math.max(screenHeight * 0.45, 280); // Mínimo 280px, ~45% de pantalla

  // Función que renderiza el contenido scrolleable
  const renderContent = () => (
    <>
      {/* Card unificado de instrucciones y dirección */}
      <View style={styles.instructionsContainer}>
        <View style={styles.unifiedCard}>
          <Text style={styles.instructionsText}>
            🗺️ Arrastra el mapa para posicionar el pin en tu ubicación exacta
          </Text>
          {userWrittenAddress && (
            <View style={styles.addressContextInline}>
              <Text style={styles.addressContextLabel} numberOfLines={2}>📍 {userWrittenAddress}</Text>
              <Text style={styles.addressContextNote}>
                ℹ️ Esta dirección NO cambiará, solo selecciona la ubicación en el mapa
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Mapa con pin fijo central - altura dinámica */}
      <View style={[styles.mapContainer, { height: mapHeight }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={false}
          showsMyLocationButton={false}>
          {/* Sin Markers - el pin es fijo en el centro */}
        </MapView>

        {/* 🎯 PIN FIJO EN EL CENTRO (como Uber/DiDi) */}
        <View style={styles.centerMarker}>
          <View style={styles.markerFixed}>
            <View style={styles.markerShadow} />
            <Ionicons name="location" size={40} color="#D27F27" />
          </View>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Header fijo */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Ubicar en mapa</Text>
      </View>

      {/* Contenido con ScrollView para dispositivos pequeños */}
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {renderContent()}
      </ScrollView>

      {/* Botones fijos abajo */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>
            {currentLocation ? 'Confirmar ubicación' : 'Seleccionar ubicación'}
          </Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    flex: 1,
  },
  instructionsContainer: {
    paddingHorizontal: scaleSpacing(16),
    paddingTop: scaleSpacing(12),
    paddingBottom: scaleSpacing(8),
  },
  unifiedCard: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  instructionsText: {
    fontFamily: fonts.medium,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  addressContextInline: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.15)',
  },
  addressContextNote: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.tiny,
    color: 'rgba(47,47,47,0.6)',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // 🎯 ESTILOS PARA PIN FIJO CENTRAL
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20, // Mitad del ancho del marcador (40px/2)
    marginTop: -40,  // Altura completa del marcador para que la punta esté en el centro
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerFixed: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerShadow: {
    position: 'absolute',
    bottom: -5,
    width: 20,
    height: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderWidth: 1.5,
    borderColor: '#8B5E3C',
    ...getButtonDimensions('medium'),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#33A744',
    ...getButtonDimensions('medium'),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#33A744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#FFF',
  },
  
  contentContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 80, // Espacio para que el contenido pase por debajo de los botones fijos
  },
  
  // Estilo para dirección en card unificado
  addressContextLabel: {
    fontFamily: fonts.medium,
    fontSize: fonts.size.small,
    color: '#8B5E3C',
    textAlign: 'center',
  },
});

export default AddressMap;