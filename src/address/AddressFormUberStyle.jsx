import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import axios from 'axios';
import fonts from '../theme/fonts';
import { getCurrentLocation } from '../utils/locationUtils';
import { getAddressPickerCallbacks, cleanupAddressPickerCallbacks } from '../components/AddressPicker';

const AddressFormUberStyle = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Parámetros de navegación
  const { 
    pickerId,
    initialAddress = '',
    title = 'Seleccionar Dirección',
    mapSelectedAddress = null,
    selectedLocationFromMap = null
  } = route.params || {};

  // Obtener callbacks
  const callbacks = pickerId ? getAddressPickerCallbacks(pickerId) : null;

  // Estados principales
  const [currentStep, setCurrentStep] = useState(1); // 1: Búsqueda, 2: Confirmación, 3: Referencias
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [references, setReferences] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Función para obtener ubicación actual usando locationUtils
  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      // Usar la función ya existente de locationUtils optimizada para guest
      const location = await getCurrentLocation('guest', 
        // onSuccess callback
        async (coordinates) => {
          const { latitude, longitude } = coordinates;

          // Hacer reverse geocoding para obtener la dirección
          try {
            const response = await axios.get(
              `https://maps.googleapis.com/maps/api/geocode/json`,
              {
                params: {
                  latlng: `${latitude},${longitude}`,
                  key: Config.GOOGLE_DIRECTIONS_API_KEY,
                  language: 'es',
                  region: 'mx',
                  bounds: '19.048,-99.365|19.761,-98.877', // Bounds para CDMX y Edomex
                },
              }
            );

            if (response.data.results[0]) {
              const address = {
                description: response.data.results[0].formatted_address,
                place_id: response.data.results[0].place_id,
                coordinates: { latitude, longitude },
              };
              
              setSelectedAddress(address);
              setCurrentStep(2); // Ir a confirmación
            }
          } catch (error) {
            Alert.alert('Error', 'No se pudo obtener la dirección de tu ubicación');
          }
        },
        // onError callback
        (error) => {
          console.warn('Error getting location:', error);
          Alert.alert('Error', 'No se pudo obtener tu ubicación actual');
        }
      );
      
      // Si no se obtuvo ubicación (permisos denegados, etc.)
      if (!location) {
        Alert.alert(
          'Ubicación no disponible', 
          'No se pudo acceder a tu ubicación. Puedes buscar manualmente tu dirección.'
        );
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Hubo un problema al obtener tu ubicación');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Función para buscar direcciones con Google Places Autocomplete
  const searchAddresses = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input: query,
            key: Config.GOOGLE_DIRECTIONS_API_KEY,
            language: 'es',
            components: 'country:mx', // Solo México
            types: 'address',
            location: '19.4326,-99.1332', // Centro de CDMX
            radius: 100000, // 100km radio (cubre CDMX y Edomex)
            strictbounds: true, // Forzar que esté dentro del radio
          },
        }
      );

      setSearchResults(response.data.predictions || []);
    } catch (error) {
      console.error('Error searching addresses:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Función para seleccionar una dirección de la búsqueda
  const selectAddress = async (prediction) => {
    setIsSearching(true);
    try {
      // Obtener detalles del lugar incluyendo coordenadas
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json`,
        {
          params: {
            place_id: prediction.place_id,
            key: Config.GOOGLE_DIRECTIONS_API_KEY,
            fields: 'geometry,formatted_address',
          },
        }
      );

      if (response.data.result) {
        const address = {
          description: response.data.result.formatted_address,
          place_id: prediction.place_id,
          coordinates: {
            latitude: response.data.result.geometry.location.lat,
            longitude: response.data.result.geometry.location.lng,
          },
        };

        setSelectedAddress(address);
        setSearchResults([]);
        setCurrentStep(2); // Ir a confirmación
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener los detalles de la dirección');
    } finally {
      setIsSearching(false);
    }
  };

  // Función para ir al mapa
  const goToMap = () => {
    console.log('=== NAVEGANDO AL MAPA ===');
    console.log('Preservando params para el mapa:', {
      preservedDeliveryInfo: route.params?.preservedDeliveryInfo,
      preservedNeedInvoice: route.params?.preservedNeedInvoice,
      preservedTaxDetails: route.params?.preservedTaxDetails,
    });
    
    navigation.navigate('AddressMap', {
      addressForm: {},
      selectedLocation: selectedAddress?.coordinates || { latitude: 19.4326, longitude: -99.1332 },
      pickerId,
      fromGuestCheckout: route.params?.fromGuestCheckout || false,
      preselectedAddress: selectedAddress,
      // CRITICAL: Preservar TODOS los parámetros para que no se pierdan en el mapa
      ...route.params, // Pasar todos los parámetros originales
    });
  };

  // Función para finalizar
  const handleConfirm = () => {
    const finalAddress = {
      fullAddress: selectedAddress?.description || '',
      coordinates: selectedAddress?.coordinates,
      references: references,
      verified: true,
    };

    // Ejecutar callback si existe (sistema antiguo)
    if (callbacks?.onConfirm) {
      callbacks.onConfirm(finalAddress);
      if (pickerId) {
        cleanupAddressPickerCallbacks(pickerId);
      }
      navigation.goBack();
    }
    // Si viene de GuestCheckout
    else if (route.params?.fromGuestCheckout) {
      // Asegurar que tenemos una dirección válida para enviar
      const addressToSend = finalAddress.fullAddress || selectedAddress?.description || 'Dirección seleccionada';
      
      console.log('=== ADDRESS FORM UBER STYLE NAVEGANDO DE VUELTA ===');
      console.log('route.params completos:', route.params);
      console.log('Preservando deliveryInfo:', route.params?.preservedDeliveryInfo);
      console.log('Preservando needInvoice:', route.params?.preservedNeedInvoice);
      console.log('Preservando taxDetails:', route.params?.preservedTaxDetails);
      
      // Preservar TODOS los parámetros originales de GuestCheckout explícitamente
      navigation.navigate('GuestCheckout', {
        // Parámetros básicos
        totalPrice: route.params?.totalPrice,
        itemCount: route.params?.itemCount,
        returnToCart: route.params?.returnToCart,
        // CRITICAL: Datos preservados del Cart - convertir Date a string si es necesario
        preservedDeliveryInfo: route.params?.preservedDeliveryInfo ? {
          ...route.params.preservedDeliveryInfo,
          date: typeof route.params.preservedDeliveryInfo.date === 'string' 
            ? route.params.preservedDeliveryInfo.date 
            : route.params.preservedDeliveryInfo.date.toISOString(),
        } : route.params?.preservedDeliveryInfo,
        preservedNeedInvoice: route.params?.preservedNeedInvoice,
        preservedTaxDetails: route.params?.preservedTaxDetails,
        // Email actuales
        currentEmail: route.params?.currentEmail,
        currentAddress: route.params?.currentAddress,
        // Parámetros específicos de regreso
        selectedAddress: addressToSend,
        shouldGoToStep2: true, // Indicar que debe ir al paso 2
        // Preservar el email del usuario
        preservedEmail: route.params?.currentEmail,
      });
    }
    // Fallback
    else {
      navigation.goBack();
    }
  };

  // Manejar dirección seleccionada del mapa
  useEffect(() => {
    if (mapSelectedAddress && selectedLocationFromMap) {
      setSelectedAddress({
        description: mapSelectedAddress,
        coordinates: selectedLocationFromMap,
        place_id: null,
      });
      setCurrentStep(2); // Ir a confirmación
    }
  }, [mapSelectedAddress, selectedLocationFromMap]);

  // Efecto para buscar cuando cambia la query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery && currentStep === 1) {
        searchAddresses(searchQuery);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentStep]);

  // Renderizar paso 1: Búsqueda
  const renderSearchStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>¿Dónde quieres recibir tu pedido?</Text>
      
      {/* Usar ubicación actual */}
      <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={handleGetCurrentLocation}
        disabled={isLoadingLocation}>
        {isLoadingLocation ? (
          <ActivityIndicator size="small" color="#D27F27" />
        ) : (
          <Ionicons name="location" size={24} color="#D27F27" />
        )}
        <Text style={styles.currentLocationText}>
          {isLoadingLocation ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      {/* Separador */}
      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>o busca tu dirección</Text>
        <View style={styles.separatorLine} />
      </View>

      {/* Campo de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Calle, colonia, código postal..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          autoFocus={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Resultados de búsqueda */}
      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#D27F27" />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      )}

      {searchResults.length > 0 && (
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {searchResults.map((result) => (
            <TouchableOpacity
              key={result.place_id}
              style={styles.resultItem}
              onPress={() => selectAddress(result)}>
              <Ionicons name="location-outline" size={20} color="#D27F27" />
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {result.structured_formatting?.main_text}
                </Text>
                <Text style={styles.resultSubtitle} numberOfLines={2}>
                  {result.structured_formatting?.secondary_text}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {searchQuery.length > 2 && searchResults.length === 0 && !isSearching && (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search" size={32} color="#999" />
          <Text style={styles.noResultsText}>No encontramos direcciones</Text>
          <Text style={styles.noResultsSubtext}>Intenta con una búsqueda diferente</Text>
        </View>
      )}
    </View>
  );

  // Renderizar paso 2: Confirmación
  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>¿Es correcta esta dirección?</Text>
      
      <View style={styles.selectedAddressCard}>
        <Ionicons name="location" size={24} color="#33A744" />
        <View style={styles.selectedAddressContent}>
          <Text style={styles.selectedAddressText} numberOfLines={3}>
            {selectedAddress?.description}
          </Text>
        </View>
      </View>

      {/* Botón para ver en mapa */}
      <TouchableOpacity
        style={styles.mapButton}
        onPress={goToMap}>
        <Ionicons name="map" size={24} color="#FFF" />
        <Text style={styles.mapButtonText}>Ver y ajustar en mapa</Text>
      </TouchableOpacity>

      {/* Botón confirmar */}
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={() => setCurrentStep(3)}>
        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
        <Text style={styles.confirmButtonText}>Sí, es correcta</Text>
      </TouchableOpacity>

      {/* Botón regresar */}
      <TouchableOpacity
        style={styles.backStepButton}
        onPress={() => setCurrentStep(1)}>
        <Text style={styles.backStepButtonText}>← Buscar otra dirección</Text>
      </TouchableOpacity>
    </View>
  );

  // Renderizar paso 3: Referencias
  const renderReferencesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>¿Alguna referencia adicional?</Text>
      <Text style={styles.stepSubtitle}>
        Ayúdanos a encontrar tu dirección más fácil (opcional)
      </Text>

      <TextInput
        style={styles.referencesInput}
        placeholder="Ej: Casa azul, junto al Oxxo, edificio Towers..."
        value={references}
        onChangeText={setReferences}
        multiline
        numberOfLines={3}
        placeholderTextColor="#999"
        maxLength={200}
      />

      <Text style={styles.characterCount}>
        {references.length}/200 caracteres
      </Text>

      {/* Botón finalizar */}
      <TouchableOpacity
        style={styles.finalButton}
        onPress={handleConfirm}>
        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
        <Text style={styles.finalButtonText}>Confirmar dirección</Text>
      </TouchableOpacity>

      {/* Botón omitir */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleConfirm}>
        <Text style={styles.skipButtonText}>Omitir referencias</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (currentStep === 1) {
              navigation.goBack();
            } else {
              setCurrentStep(currentStep - 1);
            }
          }}
          style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Indicador de pasos */}
      <View style={styles.stepsIndicator}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={styles.stepIndicatorContainer}>
            <View
              style={[
                styles.stepDot,
                step < currentStep ? styles.stepDotCompleted : 
                step === currentStep ? styles.stepDotActive : 
                styles.stepDotInactive
              ]}>
              {step < currentStep && (
                <Ionicons name="checkmark" size={12} color="#FFF" />
              )}
            </View>
            {step < 3 && <View style={styles.stepLine} />}
          </View>
        ))}
      </View>

      {/* Contenido del paso actual */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderSearchStep()}
        {currentStep === 2 && renderConfirmationStep()}
        {currentStep === 3 && renderReferencesStep()}
      </ScrollView>
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
  backIcon: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: fonts.size.large,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
  headerSpacer: {
    width: 40,
  },
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#D27F27',
  },
  stepDotCompleted: {
    backgroundColor: '#33A744',
  },
  stepDotInactive: {
    backgroundColor: '#E5E5E5',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
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
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#D27F27',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentLocationText: {
    flex: 1,
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginLeft: 12,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139, 94, 60, 0.3)',
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#D27F27',
  },
  resultsContainer: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultContent: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#999',
    marginTop: 16,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#999',
  },
  selectedAddressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#33A744',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedAddressContent: {
    flex: 1,
    marginLeft: 12,
  },
  selectedAddressText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 22,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5E3C',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  mapButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginLeft: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#33A744',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginLeft: 8,
  },
  backStepButton: {
    alignItems: 'center',
    padding: 16,
  },
  backStepButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
  },
  referencesInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B5E3C',
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    textAlignVertical: 'top',
    marginBottom: 8,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  characterCount: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.6)',
    textAlign: 'right',
    marginBottom: 24,
  },
  finalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D27F27',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  finalButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginLeft: 8,
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
  },
  skipButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
    textDecorationLine: 'underline',
  },
});

export default AddressFormUberStyle;