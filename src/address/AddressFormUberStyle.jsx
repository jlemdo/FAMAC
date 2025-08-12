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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import axios from 'axios';
import fonts from '../theme/fonts';
import { getCurrentLocation } from '../utils/locationUtils';
import { getAddressPickerCallbacks, cleanupAddressPickerCallbacks } from '../components/AddressPicker';
import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';

const AddressFormUberStyle = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // 🔧 Hook para manejo profesional del teclado
  const { 
    scrollViewRef, 
    registerInput, 
    createFocusHandler, 
    keyboardAvoidingViewProps, 
    scrollViewProps 
  } = useKeyboardBehavior();
  
  // Parámetros de navegación
  const { 
    pickerId,
    initialAddress = '',
    title = 'Seleccionar Dirección',
    mapSelectedAddress = null,
    selectedLocationFromMap = null,
    fromProfile = false, // NUEVO: Flag para identificar Profile
    userId = null, // NUEVO: ID del usuario para actualización directa
    skipMapStep = false // NUEVO: Flag para saltar paso 4 (mapa) en Profile
  } = route.params || {};

  // Obtener callbacks
  const callbacks = pickerId ? getAddressPickerCallbacks(pickerId) : null;

  // Estados principales
  const [currentStep, setCurrentStep] = useState(1); // 1: Búsqueda, 2: Dirección Manual, 3: Referencias, 4: Mapa
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [userWrittenAddress, setUserWrittenAddress] = useState(''); // NUEVA: Dirección escrita por el usuario
  
  // NUEVO: Estados para campos estructurados de dirección
  const [streetName, setStreetName] = useState('');
  const [exteriorNumber, setExteriorNumber] = useState('');
  const [interiorNumber, setInteriorNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [state, setState] = useState('CDMX'); // Default CDMX
  
  const [references, setReferences] = useState('');
  const [mapCoordinates, setMapCoordinates] = useState(null); // NUEVA: Coordenadas del mapa
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Función para parsear dirección de Google y auto-rellenar campos
  const parseGoogleAddress = (googleAddress) => {
    if (!googleAddress || !googleAddress.description) return;
    
    console.log('=== PARSEANDO DIRECCIÓN DE GOOGLE ===');
    console.log('Dirección completa:', googleAddress.description);
    
    // Limpiar campos primero
    setStreetName('');
    setExteriorNumber('');
    setInteriorNumber('');
    setNeighborhood('');
    setPostalCode('');
    setMunicipality('');
    setState('CDMX');
    
    // Parsear usando regex y patrones comunes en México
    const addressStr = googleAddress.description;
    
    try {
      // 1. Detectar número exterior (primer número encontrado)
      const numberMatch = addressStr.match(/(\d+)/);
      if (numberMatch) {
        setExteriorNumber(numberMatch[1]);
      }
      
      // 2. Detectar calle (parte antes del primer número o coma)
      let streetMatch = addressStr.match(/^([^,\d]+?)(?:\s*\d|,)/);
      if (streetMatch) {
        const street = streetMatch[1].trim()
          .replace(/^(Calle|Av\.|Avenida|Blvd\.|Boulevard|Calz\.|Calzada)\s*/i, '');
        setStreetName(street);
      }
      
      // 3. Detectar colonia/neighborhood (buscar después de "Col." o similar)
      const neighborhoodPatterns = [
        /(?:Col\.|Colonia|Fracc\.|Fraccionamiento)\s+([^,]+)/i,
        /,\s*([^,]+?)(?:,|\s*\d{5})/  // Fallback: segundo elemento antes del CP
      ];
      
      for (const pattern of neighborhoodPatterns) {
        const neighMatch = addressStr.match(pattern);
        if (neighMatch) {
          setNeighborhood(neighMatch[1].trim());
          break;
        }
      }
      
      // 4. Detectar código postal (5 dígitos)
      const postalMatch = addressStr.match(/(\d{5})/);
      if (postalMatch) {
        setPostalCode(postalMatch[1]);
        
        // Auto-detectar estado por CP
        const cp = parseInt(postalMatch[1]);
        if (cp >= 1000 && cp <= 16999) {
          setState('CDMX');
        } else if (cp >= 50000 && cp <= 56999) {
          setState('Estado de México');
        }
      }
      
      // 5. Detectar alcaldía/municipio (patrones conocidos)
      const municipalityPatterns = [
        // Alcaldías CDMX
        /(Álvaro Obregón|Azcapotzalco|Benito Juárez|Coyoacán|Cuajimalpa|Gustavo A\. Madero|Iztacalco|Iztapalapa|Magdalena Contreras|Miguel Hidalgo|Milpa Alta|Tláhuac|Tlalpan|Venustiano Carranza|Xochimilco|Cuauhtémoc)/i,
        // Municipios Estado de México
        /(Naucalpan|Tlalnepantla|Ecatepec|Nezahualcóyotl|Chimalhuacán|Atizapán|Tultitlán|Coacalco|Cuautitlán Izcalli|Huixquilucan|Nicolás Romero|Tecámac|La Paz|Chalco|Ixtapaluca)/i
      ];
      
      for (const pattern of municipalityPatterns) {
        const munMatch = addressStr.match(pattern);
        if (munMatch) {
          setMunicipality(munMatch[1]);
          break;
        }
      }
      
      console.log('✅ Campos auto-rellenados:');
      console.log('- Calle:', streetMatch?.[1]?.trim() || 'No detectada');
      console.log('- No. Ext:', numberMatch?.[1] || 'No detectado');
      console.log('- Colonia:', neighborhood || 'No detectada');
      console.log('- CP:', postalMatch?.[1] || 'No detectado');
      console.log('- Alcaldía/Mun:', municipality || 'No detectada');
      console.log('- Estado:', state);
      
    } catch (error) {
      console.log('❌ Error parseando dirección:', error);
    }
  };

  // Función para construir dirección final desde los campos
  const buildFinalAddress = () => {
    const parts = [];
    
    if (streetName.trim()) {
      let fullStreet = streetName.trim();
      if (exteriorNumber.trim()) {
        fullStreet += ` ${exteriorNumber.trim()}`;
      }
      if (interiorNumber.trim()) {
        fullStreet += `-${interiorNumber.trim()}`;
      }
      parts.push(fullStreet);
    }
    
    if (neighborhood.trim()) {
      parts.push(`Col. ${neighborhood.trim()}`);
    }
    
    if (postalCode.trim()) {
      parts.push(`CP ${postalCode.trim()}`);
    }
    
    if (municipality.trim()) {
      parts.push(municipality.trim());
    }
    
    if (state.trim()) {
      parts.push(state.trim());
    }
    
    return parts.join(', ');
  };

  // Función para obtener ubicación actual usando locationUtils - CON DEBUG MEJORADO
  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      console.log('🚀 INICIANDO PRUEBA DE UBICACIÓN');
      console.log('Platform:', Platform.OS);
      console.log('Llamando a getCurrentLocation con userType: guest');
      
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

            if (response.data.results && response.data.results[0]) {
              const address = {
                description: response.data.results[0].formatted_address,
                place_id: response.data.results[0].place_id,
                coordinates: { latitude, longitude },
              };
              
              setSelectedAddress(address);
              setMapCoordinates({ latitude, longitude }); // Guardar coordenadas para el mapa
              // Pre-llenar dirección manual con ubicación actual
              setUserWrittenAddress(address.description);
              // NUEVO: También parsear campos estructurados automáticamente
              parseGoogleAddress(address);
              setCurrentStep(2); // Ir a dirección manual
            } else {
              // Si no hay resultados de geocoding, usar coordenadas básicas
              const basicAddress = {
                description: `Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
                place_id: null,
                coordinates: { latitude, longitude },
              };
              
              setSelectedAddress(basicAddress);
              setMapCoordinates({ latitude, longitude });
              setUserWrittenAddress(basicAddress.description);
              setCurrentStep(2);
            }
          } catch (geocodingError) {
            console.warn('Geocoding error:', geocodingError);
            // Continuar con coordenadas básicas si falla el geocoding
            const basicAddress = {
              description: `Ubicación actual (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              place_id: null,
              coordinates: { latitude, longitude },
            };
            
            setSelectedAddress(basicAddress);
            setMapCoordinates({ latitude, longitude });
            setUserWrittenAddress('Mi ubicación actual');
            setCurrentStep(2);
            
            Alert.alert(
              'Ubicación obtenida',
              'Se obtuvo tu ubicación. Por favor confirma o edita la dirección en el siguiente paso.'
            );
          }
        },
        // onError callback mejorado para iOS y Android
        (error) => {
          console.error('❌ Location error details:', {
            code: error.code,
            message: error.message,
            platform: Platform.OS
          });
          
          let errorTitle = 'Ubicación no disponible';
          let errorMessage = '';
          let buttons = [];
          
          // Manejo específico por código de error de geolocation
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorTitle = 'Permisos de ubicación necesarios';
              if (Platform.OS === 'ios') {
                errorMessage = 'Para obtener tu ubicación actual:\n\n' +
                              '📱 Ve a Configuración de iOS\n' +
                              '🔒 Toca "Privacidad y seguridad"\n' +
                              '📍 Toca "Servicio de ubicación"\n' +
                              '📲 Busca la app "FAMAC"\n' +
                              '✅ Selecciona "Al usar la App"';
                buttons = [
                  { text: 'Buscar dirección', style: 'cancel' },
                  { text: 'Cómo configurar', onPress: () => {
                    Alert.alert(
                      'Configuración de ubicación',
                      'Configuración > Privacidad y seguridad > Servicio de ubicación > FAMAC > "Al usar la App"',
                      [{ text: 'Entendido' }]
                    );
                  }}
                ];
              } else {
                errorMessage = 'Activa los permisos de ubicación para esta app en Configuración > Apps > FAMAC > Permisos.';
                buttons = [{ text: 'Buscar dirección', style: 'cancel' }];
              }
              break;
              
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'No se pudo determinar tu ubicación.\n\n' +
                           '📶 Verifica tu conexión a internet\n' +
                           '📍 Asegúrate que la ubicación esté activa\n' +
                           '🏠 Si estás en interiores, intenta acercarte a una ventana';
              buttons = [
                { text: 'Buscar dirección', style: 'cancel' },
                { text: 'Reintentar', onPress: () => handleGetCurrentLocation() }
              ];
              break;
              
            case 3: // TIMEOUT
              errorMessage = 'La búsqueda de ubicación tardó demasiado tiempo.\n\n' +
                           'Esto puede suceder en lugares cerrados o con señal GPS débil.';
              buttons = [
                { text: 'Buscar dirección', style: 'cancel' },
                { text: 'Reintentar', onPress: () => handleGetCurrentLocation() }
              ];
              break;
              
            default:
              // Verificar errores comunes por mensaje
              if (error.message?.toLowerCase().includes('permission')) {
                errorMessage = 'Los permisos de ubicación están desactivados. Ve a Configuración para activarlos.';
              } else if (error.message?.toLowerCase().includes('network')) {
                errorMessage = 'Problema de conexión. Verifica tu internet e inténtalo de nuevo.';
              } else {
                errorMessage = 'Error técnico al acceder a la ubicación.\n\nPuedes continuar buscando tu dirección manualmente.';
              }
              buttons = [{ text: 'Buscar dirección', style: 'default' }];
          }
          
          Alert.alert(errorTitle, errorMessage, buttons);
        }
      );
      
      // Si no se obtuvo ubicación (permisos denegados, etc.)
      if (!location) {
        Alert.alert(
          'Ubicación no disponible', 
          'No se pudo acceder a tu ubicación. Puedes buscar manualmente tu dirección abajo.',
          [{ text: 'Entendido', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Error', 
        'Hubo un problema al obtener tu ubicación. Puedes buscar manualmente tu dirección.',
        [{ text: 'Entendido', style: 'default' }]
      );
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
        // Pre-llenar dirección manual con lo seleccionado
        setUserWrittenAddress(address.description);
        // NUEVO: Parsear automáticamente los campos estructurados
        parseGoogleAddress(address);
        setCurrentStep(2); // Ir a dirección manual
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
    
    // Usar coordenadas existentes o centro de CDMX
    const mapCenter = mapCoordinates || { latitude: 19.4326, longitude: -99.1332 };
    
    navigation.navigate('AddressMap', {
      addressForm: {},
      selectedLocation: mapCoordinates || mapCenter,
      pickerId,
      fromGuestCheckout: route.params?.fromGuestCheckout || false,
      userWrittenAddress: userWrittenAddress, // Pasar dirección escrita para contexto
      // CRITICAL: Preservar TODOS los parámetros para que no se pierdan en el mapa
      ...route.params, // Pasar todos los parámetros originales
    });
  };

  // Función para finalizar con validaciones mejoradas
  const handleConfirm = async () => {
    // Validaciones básicas antes de proceder
    if (!userWrittenAddress?.trim()) {
      Alert.alert('Error', 'Por favor escribe una dirección válida.');
      return;
    }
    
    // Solo validar coordenadas si NO es Profile (Profile no usa mapa)
    if (!skipMapStep && !mapCoordinates) {
      Alert.alert('Error', 'Por favor selecciona tu ubicación en el mapa.');
      return;
    }
    
    if (!references?.trim() || references.trim().length < 10) {
      Alert.alert('Error', 'Por favor agrega referencias de al menos 10 caracteres.');
      return;
    }
    
    const finalAddress = {
      userWrittenAddress: userWrittenAddress.trim(), // Lo que escribió el usuario
      fullAddress: userWrittenAddress.trim(), // Para compatibilidad
      coordinates: skipMapStep ? null : mapCoordinates, // Coordenadas solo si no es Profile
      references: references.trim(),
      verified: skipMapStep ? false : true, // Profile no está verificado con mapa
      hasUserWrittenAddress: true, // Flag para identificar el nuevo formato
      timestamp: new Date().toISOString(), // Timestamp de creación
      isProfileAddress: skipMapStep, // Flag para indicar que viene de Profile
    };

    // Ejecutar callback si existe (sistema antiguo)
    if (callbacks?.onConfirm) {
      callbacks.onConfirm(finalAddress);
      if (pickerId) {
        cleanupAddressPickerCallbacks(pickerId);
      }
      navigation.goBack();
    }
    // Si viene de Profile (NUEVO CASO)
    else if (route.params?.fromProfile && userId) {
      try {
        console.log('🚀 Iniciando actualización de dirección para usuario:', userId);
        
        // Primero obtener datos actuales del usuario para no sobrescribir nada
        const userDetailsResponse = await axios.get(
          `https://food.siliconsoft.pk/api/userdetails/${userId}`,
          { timeout: 10000 } // Timeout de 10 segundos
        );
        
        if (!userDetailsResponse.data?.data?.[0]) {
          throw new Error('No se pudieron obtener los datos del usuario');
        }
        
        const currentData = userDetailsResponse.data.data[0];
        
        // Preparar payload completo preservando todos los campos existentes
        const payload = {
          userid: userId,
          first_name: currentData.first_name || '',
          last_name: currentData.last_name || '',
          phone: currentData.phone || '',
          email: currentData.email || '',
          address: `${finalAddress.userWrittenAddress}${finalAddress.references ? `, Referencias: ${finalAddress.references}` : ''}`, // Dirección completa con referencias
        };
        
        // Preservar fecha de nacimiento si existe
        if (currentData.birthDate || currentData.birth_date || currentData.dob) {
          const dateValue = currentData.birthDate || currentData.birth_date || currentData.dob;
          if (dateValue) {
            payload.dob = dateValue;
          }
        }
        
        console.log('🚀 Payload para actualización:', {
          ...payload,
          address: payload.address.substring(0, 50) + '...' // Solo mostrar inicio de dirección
        });
        
        const response = await axios.post(
          'https://food.siliconsoft.pk/api/updateuserprofile',
          payload,
          { timeout: 15000 } // Timeout de 15 segundos para actualización
        );
        
        if (response.status === 200) {
          console.log('✓ Dirección actualizada exitosamente');
          
          // Mostrar confirmación al usuario
          Alert.alert(
            '✓ Dirección actualizada',
            'Tu dirección se ha actualizado correctamente.',
            [{ 
              text: 'Continuar', 
              onPress: () => {
                // Regresar a Profile (no necesitamos pasar parámetros ya que el Profile se actualizará automáticamente)
                navigation.goBack();
              }
            }]
          );
        } else {
          throw new Error(`Error del servidor: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Error actualizando dirección:', error);
        
        let errorMessage = 'No se pudo actualizar la dirección.';
        
        if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
          errorMessage = 'La conexión tardó demasiado. Verifica tu internet e inténtalo de nuevo.';
        } else if (error.message?.includes('Network Error')) {
          errorMessage = 'Sin conexión a internet. Verifica tu conexión e inténtalo de nuevo.';
        } else if (error.response?.status === 500) {
          errorMessage = 'Error en el servidor. Inténtalo de nuevo en unos momentos.';
        } else if (error.response?.status === 400) {
          errorMessage = 'Datos inválidos. Verifica la información e inténtalo de nuevo.';
        }
        
        Alert.alert(
          'Error al actualizar',
          errorMessage,
          [
            { text: 'Reintentar', onPress: () => handleConfirm() },
            { text: 'Cancelar', onPress: () => navigation.goBack(), style: 'cancel' }
          ]
        );
      }
    }
    // Si viene de GuestCheckout
    else if (route.params?.fromGuestCheckout) {
      try {
        // Asegurar que tenemos una dirección válida para enviar
        const addressToSend = finalAddress.userWrittenAddress;
        
        console.log('=== ADDRESS FORM UBER STYLE NAVEGANDO DE VUELTA ===');
        console.log('Dirección final:', addressToSend.substring(0, 50) + '...');
        console.log('Coordenadas:', finalAddress.coordinates);
        console.log('Referencias:', finalAddress.references.substring(0, 30) + '...');
        
        // Validar parámetros críticos antes de navegar
        if (!route.params?.totalPrice || !route.params?.itemCount) {
          throw new Error('Faltan parámetros del carrito');
        }
        
        // Preservar información de entrega con validación
        let preservedDeliveryInfo = route.params?.preservedDeliveryInfo;
        if (preservedDeliveryInfo && preservedDeliveryInfo.date) {
          // Asegurar que la fecha esté en formato string
          if (typeof preservedDeliveryInfo.date !== 'string') {
            preservedDeliveryInfo = {
              ...preservedDeliveryInfo,
              date: preservedDeliveryInfo.date.toISOString()
            };
          }
        }
        
        // Preservar TODOS los parámetros originales de GuestCheckout explícitamente
        navigation.navigate('GuestCheckout', {
          // Parámetros básicos validados
          totalPrice: route.params.totalPrice,
          itemCount: route.params.itemCount,
          returnToCart: route.params?.returnToCart || false,
          
          // Datos preservados del Cart
          preservedDeliveryInfo,
          preservedNeedInvoice: route.params?.preservedNeedInvoice || false,
          preservedTaxDetails: route.params?.preservedTaxDetails || null,
          
          // Email actuales
          currentEmail: route.params?.currentEmail || '',
          currentAddress: route.params?.currentAddress || '',
          
          // Parámetros específicos de regreso - NUEVOS DATOS
          selectedAddress: addressToSend,
          selectedCoordinates: finalAddress.coordinates,
          selectedReferences: finalAddress.references,
          shouldGoToStep2: true, // Indicar que debe ir al paso 2
          
          // Preservar el email del usuario
          preservedEmail: route.params?.currentEmail || '',
          
          // Flag de éxito
          addressCompleted: true,
        });
        
        console.log('✓ Navegación a GuestCheckout completada exitosamente');
        
      } catch (error) {
        console.error('❌ Error navegando de vuelta a GuestCheckout:', error);
        Alert.alert(
          'Error',
          'Hubo un problema al regresar al checkout. Inténtalo de nuevo.',
          [
            { text: 'Reintentar', onPress: () => handleConfirm() },
            { text: 'Cancelar', onPress: () => navigation.goBack(), style: 'cancel' }
          ]
        );
        return;
      }
    }
    // Fallback
    else {
      navigation.goBack();
    }
  };

  // Manejar coordenadas seleccionadas del mapa (sin cambiar dirección escrita)
  useEffect(() => {
    if (selectedLocationFromMap) {
      setMapCoordinates(selectedLocationFromMap);
      // Si venimos del mapa y estamos en el paso 4, las coordenadas ya están listas
      console.log('=== COORDENADAS RECIBIDAS DEL MAPA ===');
      console.log('Coordenadas:', selectedLocationFromMap);
      console.log('Dirección escrita preservada:', userWrittenAddress);
    }
  }, [selectedLocationFromMap]);

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
          ref={(ref) => registerInput('searchQuery', ref)}
          style={styles.searchInput}
          placeholder="Calle, colonia, código postal..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={createFocusHandler('searchQuery')}
          placeholderTextColor="#999"
          autoFocus={false}
          returnKeyType="search"
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

  // Renderizar paso 2: Dirección Manual con Campos Estructurados
  const renderManualAddressStep = () => {
    // Verificar si hay campos requeridos llenos
    const hasRequiredFields = streetName.trim() && exteriorNumber.trim() && neighborhood.trim();
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Escribe tu dirección exacta</Text>
        <Text style={styles.stepSubtitle}>
          Completa los datos para que el repartidor encuentre tu dirección fácilmente.
        </Text>
        
        {/* Fila 1: Calle y Número Exterior */}
        <View style={styles.addressRow}>
          <View style={[styles.addressField, {flex: 2}]}>
            <Text style={styles.fieldLabel}>Calle *</Text>
            <TextInput
              ref={(ref) => registerInput('street', ref)}
              style={styles.addressInput}
              placeholder="Ej: Insurgentes Sur"
              value={streetName}
              onChangeText={setStreetName}
              onFocus={createFocusHandler('street')}
              placeholderTextColor="#999"
            />
          </View>
          <View style={[styles.addressField, {flex: 1}]}>
            <Text style={styles.fieldLabel}>No. Ext *</Text>
            <TextInput
              ref={(ref) => registerInput('extNum', ref)}
              style={styles.addressInput}
              placeholder="123"
              value={exteriorNumber}
              onChangeText={setExteriorNumber}
              onFocus={createFocusHandler('extNum')}
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Fila 2: Número Interior y Colonia */}
        <View style={styles.addressRow}>
          <View style={[styles.addressField, {flex: 1}]}>
            <Text style={styles.fieldLabel}>No. Int</Text>
            <TextInput
              ref={(ref) => registerInput('intNum', ref)}
              style={styles.addressInput}
              placeholder="A, 4, etc"
              value={interiorNumber}
              onChangeText={setInteriorNumber}
              onFocus={createFocusHandler('intNum')}
              placeholderTextColor="#999"
            />
          </View>
          <View style={[styles.addressField, {flex: 2}]}>
            <Text style={styles.fieldLabel}>Colonia *</Text>
            <TextInput
              ref={(ref) => registerInput('colony', ref)}
              style={styles.addressInput}
              placeholder="Roma Norte"
              value={neighborhood}
              onChangeText={setNeighborhood}
              onFocus={createFocusHandler('colony')}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Fila 3: Código Postal y Alcaldía/Municipio */}
        <View style={styles.addressRow}>
          <View style={[styles.addressField, {flex: 1}]}>
            <Text style={styles.fieldLabel}>CP</Text>
            <TextInput
              ref={(ref) => registerInput('postalCode', ref)}
              style={styles.addressInput}
              placeholder="06700"
              value={postalCode}
              onChangeText={setPostalCode}
              onFocus={createFocusHandler('postalCode')}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
          <View style={[styles.addressField, {flex: 2}]}>
            <Text style={styles.fieldLabel}>Alcaldía/Municipio</Text>
            <TextInput
              ref={(ref) => registerInput('municipality', ref)}
              style={styles.addressInput}
              placeholder="Cuauhtémoc"
              value={municipality}
              onChangeText={setMunicipality}
              onFocus={createFocusHandler('municipality')}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Fila 4: Estado */}
        <View style={styles.addressRow}>
          <View style={styles.addressField}>
            <Text style={styles.fieldLabel}>Estado</Text>
            <View style={styles.stateSelector}>
              <TouchableOpacity
                style={[styles.stateOption, state === 'CDMX' && styles.stateOptionActive]}
                onPress={() => setState('CDMX')}>
                <Text style={[styles.stateOptionText, state === 'CDMX' && styles.stateOptionTextActive]}>
                  CDMX
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stateOption, state === 'Estado de México' && styles.stateOptionActive]}
                onPress={() => setState('Estado de México')}>
                <Text style={[styles.stateOptionText, state === 'Estado de México' && styles.stateOptionTextActive]}>
                  Edo. Méx
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Vista previa de dirección construida */}
        <View style={styles.addressPreview}>
          <Text style={styles.previewLabel}>Vista previa:</Text>
          <Text style={styles.previewText}>
            {buildFinalAddress() || 'Completa los campos requeridos (*)'}
          </Text>
        </View>

        {/* Mensaje informativo */}
        <View style={styles.loadingContainer}>
          <Ionicons name="information-circle" size={20} color="#D27F27" />
          <Text style={styles.loadingText}>
            Los campos con * son obligatorios
          </Text>
        </View>

        {/* Botón continuar */}
        <TouchableOpacity
          style={[
            styles.confirmButton, 
            !hasRequiredFields && styles.confirmButtonDisabled
          ]}
          onPress={() => {
            // Construir dirección final y guardarla
            setUserWrittenAddress(buildFinalAddress());
            setCurrentStep(3);
          }}
          disabled={!hasRequiredFields}>
          <Ionicons name="arrow-forward" size={24} color="#FFF" />
          <Text style={styles.confirmButtonText}>Continuar a referencias</Text>
        </TouchableOpacity>

        {/* Botón regresar */}
        <TouchableOpacity
          style={styles.backStepButton}
          onPress={() => setCurrentStep(1)}>
          <Text style={styles.backStepButtonText}>← Regresar a búsqueda</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Renderizar paso 3: Referencias (COHERENTE)
  const renderReferencesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Agrega referencias importantes</Text>
      <Text style={styles.stepSubtitle}>
        Ayúdanos a encontrar tu dirección más fácil con referencias útiles
      </Text>

      {/* Campo de referencias - MISMO ESTILO QUE OTROS PASOS */}
      <View style={styles.selectedAddressCard}>
        <Ionicons name="information-circle" size={24} color="#33A744" />
        <View style={styles.selectedAddressContent}>
          <TextInput
            ref={(ref) => registerInput('references', ref)}
            style={styles.manualAddressInput}
            placeholder="Ej: Casa azul, junto al Oxxo, entre Starbucks y farmacia..."
            value={references}
            onChangeText={setReferences}
            onFocus={createFocusHandler('references', 30)}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
            maxLength={300}
            returnKeyType="done"
            textAlignVertical="top"
          />
        </View>
      </View>

      <Text style={styles.characterCount}>
        {references.length}/300 caracteres
      </Text>
      
      {/* Mensaje informativo consistente */}
      <View style={styles.loadingContainer}>
        <Ionicons name="checkmark-circle" size={20} color="#33A744" />
        <Text style={styles.loadingText}>
          Referencias mejoran la entrega exitosa
        </Text>
      </View>

      {/* Botón continuar - Condicional según si es Profile o no */}
      {skipMapStep ? (
        // Si es Profile, finalizar aquí (sin mapa)
        <TouchableOpacity
          style={[
            styles.confirmButton,
            references.trim().length < 10 && styles.confirmButtonDisabled
          ]}
          onPress={handleConfirm}
          disabled={references.trim().length < 10}>
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
          <Text style={styles.confirmButtonText}>Guardar dirección</Text>
        </TouchableOpacity>
      ) : (
        // Si no es Profile, continuar al mapa
        <TouchableOpacity
          style={[
            styles.confirmButton,
            references.trim().length < 10 && styles.confirmButtonDisabled
          ]}
          onPress={() => setCurrentStep(4)}
          disabled={references.trim().length < 10}>
          <Ionicons name="map" size={24} color="#FFF" />
          <Text style={styles.confirmButtonText}>Ir al mapa</Text>
        </TouchableOpacity>
      )}

      {/* Botón regresar */}
      <TouchableOpacity
        style={styles.backStepButton}
        onPress={() => setCurrentStep(2)}>
        <Text style={styles.backStepButtonText}>← Editar dirección</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Renderizar paso 4: Mapa (COHERENTE)
  const renderMapStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Confirma tu ubicación exacta</Text>
      <Text style={styles.stepSubtitle}>
        Selecciona tu ubicación en el mapa para entregas precisas
      </Text>
      
      {/* Resumen - MISMO ESTILO QUE CONFIRMACIÓN */}
      <View style={styles.selectedAddressCard}>
        <Ionicons name="location" size={24} color="#33A744" />
        <View style={styles.selectedAddressContent}>
          <Text style={styles.selectedAddressText} numberOfLines={2}>
            {userWrittenAddress}
          </Text>
          {references.trim() && (
            <Text style={styles.referencesText} numberOfLines={1}>
              {references}
            </Text>
          )}
        </View>
      </View>
      
      {/* Estado de mapa - COHERENTE CON LOADING */}
      {mapCoordinates ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#33A744" />
          <Text style={styles.loadingText}>
            Ubicación confirmada en el mapa
          </Text>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <Ionicons name="location-outline" size={20} color="#D27F27" />
          <Text style={styles.loadingText}>
            Selecciona tu ubicación en el mapa
          </Text>
        </View>
      )}

      {/* Botón ir al mapa - MISMO ESTILO QUE MAPA ORIGINAL */}
      <TouchableOpacity
        style={styles.mapButton}
        onPress={goToMap}>
        <Ionicons name="map" size={24} color="#FFF" />
        <Text style={styles.mapButtonText}>
          {mapCoordinates ? 'Ajustar ubicación' : 'Ir al mapa'}
        </Text>
      </TouchableOpacity>

      {/* Botón finalizar - MISMO ESTILO QUE CONFIRMACIÓN */}
      <TouchableOpacity
        style={[
          styles.confirmButton,
          !mapCoordinates && styles.confirmButtonDisabled
        ]}
        onPress={handleConfirm}
        disabled={!mapCoordinates}>
        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
        <Text style={styles.confirmButtonText}>Confirmar dirección</Text>
      </TouchableOpacity>

      {/* Botón regresar */}
      <TouchableOpacity
        style={styles.backStepButton}
        onPress={() => setCurrentStep(3)}>
        <Text style={styles.backStepButtonText}>← Editar referencias</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      {...keyboardAvoidingViewProps}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.containerInner}>
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

          {/* Indicador de pasos - Condicional según si incluye mapa */}
          <View style={styles.stepsIndicator}>
            {(skipMapStep ? [1, 2, 3] : [1, 2, 3, 4]).map((step) => (
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
                {step < (skipMapStep ? 3 : 4) && <View style={styles.stepLine} />}
              </View>
            ))}
          </View>

          {/* Contenido del paso actual */}
          <ScrollView 
            {...scrollViewProps}
            style={styles.content}>
            {currentStep === 1 && renderSearchStep()}
            {currentStep === 2 && renderManualAddressStep()}
            {currentStep === 3 && renderReferencesStep()}
            {currentStep === 4 && !skipMapStep && renderMapStep()}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerInner: {
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
  
  manualAddressInput: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    textAlignVertical: 'top',
    minHeight: 60,
    maxHeight: 120,
    borderWidth: 0,
    padding: 0,
    margin: 0,
  },
  finalButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  referencesText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    marginTop: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  
  // Nuevos estilos para campos estructurados
  addressRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  addressField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 6,
  },
  addressInput: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  stateSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  stateOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  stateOptionActive: {
    backgroundColor: '#D27F27',
  },
  stateOptionText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  stateOptionTextActive: {
    color: '#FFF',
    fontFamily: fonts.bold,
  },
  addressPreview: {
    backgroundColor: 'rgba(210, 127, 39, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.3)',
  },
  previewLabel: {
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#D27F27',
    marginBottom: 4,
  },
  previewText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 20,
  },
});

export default AddressFormUberStyle;