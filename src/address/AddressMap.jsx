import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import axios from 'axios';
import fonts from '../theme/fonts';
import { useResponsive } from '../hooks/useResponsive';
import { scaleSpacing, scaleFontSize, getButtonDimensions } from '../utils/responsiveUtils';
import { executeNavigationCallback } from '../utils/navigationCallbacks';

const AddressMap = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const responsive = useResponsive();
  
  // Parámetros de navegación
  const { 
    addressForm = {},
    selectedLocation = { latitude: 19.4326, longitude: -99.1332 },
    pickerId,
    callbackId, // ✅ NUEVO: ID del callback en lugar de función
    onLocationReturn, // ⚠️ DEPRECATED: Mantener por compatibilidad
    fromGuestCheckout = false,
    userWrittenAddress = '', // NUEVO: Dirección escrita por usuario para mostrar contexto
    fromMapSelector = false // NUEVO: Flag para identificar que viene de MapSelector
  } = route.params || {};

  const [currentLocation, setCurrentLocation] = useState(selectedLocation);
  const mapRef = useRef(null);
  

  // Opciones de Alcaldías para el mapeo
  const alcaldiasCDMX = [
    'Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán',
    'Cuajimalpa', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa',
    'Magdalena Contreras', 'Miguel Hidalgo', 'Milpa Alta', 'Tláhuac',
    'Tlalpan', 'Venustiano Carranza', 'Xochimilco', 'Cuauhtémoc'
  ];

  const municipiosEdomex = [
    'Naucalpan', 'Tlalnepantla', 'Ecatepec', 'Nezahualcóyotl', 
    'Chimalhuacán', 'Atizapán', 'Tultitlán', 'Coacalco',
    'Cuautitlán Izcalli', 'Huixquilucan', 'Nicolás Romero', 
    'Tecámac', 'La Paz', 'Chalco', 'Ixtapaluca'
  ];

  // Validar Código Postal
  const validatePostalCode = (cp, city) => {
    if (city === 'CDMX') {
      return cp >= '01000' && cp <= '16999';
    } else {
      return cp >= '50000' && cp <= '56999';
    }
  };

  // Parsear componentes de dirección de Google para auto-rellenado
  const parseAddressComponents = (components, fullAddress, location) => {
    const addressData = {
      ...addressForm, // Mantener datos existentes
      fullAddress: fullAddress,
    };

    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        addressData.exteriorNumber = component.long_name;
      } else if (types.includes('route')) {
        addressData.street = component.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1') || 
                 types.includes('political') || types.includes('locality') || 
                 types.includes('administrative_area_level_2') || types.includes('administrative_area_level_1')) {
        // Intentar mapear a alcaldía conocida con múltiples estrategias
        const componentName = component.long_name.toLowerCase();
        
        // Estrategia 1: Coincidencia exacta
        let foundAlcaldia = [...alcaldiasCDMX, ...municipiosEdomex].find(a => 
          a.toLowerCase() === componentName
        );
        
        // Estrategia 2: Coincidencia parcial
        if (!foundAlcaldia) {
          foundAlcaldia = [...alcaldiasCDMX, ...municipiosEdomex].find(a => 
            a.toLowerCase().includes(componentName) ||
            componentName.includes(a.toLowerCase())
          );
        }
        
        // Estrategia 3: Coincidencias especiales para nombres comunes
        if (!foundAlcaldia) {
          const specialMappings = {
            'benito juarez': 'Benito Juárez',
            'gustavo a madero': 'Gustavo A. Madero',
            'cuauhtemoc': 'Cuauhtémoc',
            'miguel hidalgo': 'Miguel Hidalgo',
            'venustiano carranza': 'Venustiano Carranza',
            'neza': 'Nezahualcóyotl',
            'nezahualcoyotl': 'Nezahualcóyotl',
            'atizapan': 'Atizapán',
            'cuautitlan': 'Cuautitlán Izcalli'
          };
          foundAlcaldia = specialMappings[componentName];
        }
        
        if (foundAlcaldia) {
          addressData.alcaldia = foundAlcaldia;
          addressData.city = alcaldiasCDMX.includes(foundAlcaldia) ? 'CDMX' : 'Estado de México';
        }
      } else if (types.includes('postal_code')) {
        addressData.postalCode = component.long_name;
        // Auto-detectar ciudad por CP
        if (validatePostalCode(component.long_name, 'CDMX')) {
          addressData.city = 'CDMX';
        } else if (validatePostalCode(component.long_name, 'Estado de México')) {
          addressData.city = 'Estado de México';
        }
      }
    });

    return addressData;
  };

  // Manejar pin en mapa
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setCurrentLocation({ latitude, longitude });
    
    try {
      // Geocoding inverso para obtener dirección
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            latlng: `${latitude},${longitude}`,
            key: Config.GOOGLE_DIRECTIONS_API_KEY,
            language: 'es',
          },
        }
      );

      if (response.data.results[0]) {
        const result = response.data.results[0];
        const updatedForm = parseAddressComponents(
          result.address_components, 
          result.formatted_address, 
          { latitude, longitude }
        );
        
        // ✅ SOLUCIONADO: Usar callback por ID o fallback a función directa
        if (callbackId) {
          executeNavigationCallback(callbackId, { latitude, longitude }, updatedForm);
        } else if (onLocationReturn) {
          onLocationReturn({ latitude, longitude }, updatedForm);
        }
      }
    } catch (error) {
      // ✅ SOLUCIONADO: Error with reverse geocoding, mantener solo coordenadas
      if (callbackId) {
        executeNavigationCallback(callbackId, { latitude, longitude }, addressForm);
      } else if (onLocationReturn) {
        onLocationReturn({ latitude, longitude }, addressForm);
      }
    }
  };

  // Confirmar ubicación y regresar
  const handleConfirm = async () => {
    // Asegurarse de que hay una ubicación seleccionada
    if (!currentLocation) {
      Alert.alert(
        'Ubicación requerida',
        'Por favor toca en el mapa para seleccionar tu ubicación exacta',
        [{ text: 'Entendido', style: 'default' }]
      );
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

    // ✅ CORREGIDO: Si viene de GuestCheckout (flujo legacy)
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
        console.warn('Reverse geocoding failed:', error);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Ubicar en mapa</Text>
      </View>

      {/* Instrucciones */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          📍 Toca en el mapa para seleccionar tu ubicación exacta
        </Text>
        {userWrittenAddress && (
          <View style={styles.addressContextContainer}>
            <Text style={styles.addressContextLabel}>Tu dirección:</Text>
            <Text style={styles.addressContextText} numberOfLines={2}>
              {userWrittenAddress}
            </Text>
            <Text style={styles.addressContextNote}>
              ℹ️ Esta dirección NO cambiará, solo selecciona la ubicación en el mapa
            </Text>
          </View>
        )}
      </View>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress}>
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Ubicación seleccionada"
              pinColor="#D27F27"
            />
          )}
        </MapView>
      </View>

      {/* Botones */}
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
    paddingHorizontal: scaleSpacing(15),
    paddingVertical: scaleSpacing(10),
    backgroundColor: '#F2EFE4',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
  },
  backButton: {
    marginRight: scaleSpacing(10),
  },
  title: {
    fontSize: scaleFontSize(fonts.size.XL),
    fontFamily: fonts.bold,
    textAlign: 'center',
    flex: 1,
    color: '#333',
  },
  instructionsContainer: {
    paddingHorizontal: scaleSpacing(20),
    paddingVertical: scaleSpacing(15),
  },
  instructionsText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#2F2F2F',
    textAlign: 'center',
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    padding: scaleSpacing(12),
    borderRadius: scaleSpacing(8),
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.3)',
  },
  mapContainer: {
    flex: 1,
    margin: scaleSpacing(20),
    borderRadius: scaleSpacing(12),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#8B5E3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: scaleSpacing(20),
    paddingVertical: scaleSpacing(15),
    gap: scaleSpacing(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.1)',
    backgroundColor: '#F2EFE4',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...getButtonDimensions('medium'),
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#666',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#33A744',
    ...getButtonDimensions('medium'),
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#FFF',
  },
  
  // NUEVOS ESTILOS PARA CONTEXTO DE DIRECCIÓN
  addressContextContainer: {
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    padding: scaleSpacing(12),
    borderRadius: scaleSpacing(8),
    marginTop: scaleSpacing(12),
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.3)',
  },
  addressContextLabel: {
    fontFamily: fonts.bold,
    fontSize: scaleFontSize(fonts.size.small),
    color: '#33A744',
    marginBottom: scaleSpacing(4),
  },
  addressContextText: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.medium),
    color: '#2F2F2F',
    marginBottom: scaleSpacing(8),
    lineHeight: 20,
  },
  addressContextNote: {
    fontFamily: fonts.regular,
    fontSize: scaleFontSize(fonts.size.small),
    color: 'rgba(47,47,47,0.7)',
    fontStyle: 'italic',
  },
});

export default AddressMap;