import React, { useState, useEffect, useContext, useRef } from 'react';
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
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import axios from 'axios';
import { geocodeFormAddress } from '../utils/geocodingUtils';
import fonts from '../theme/fonts';
import { useAlert } from '../context/AlertContext';
import { getCurrentLocation } from '../utils/locationUtils';
import { getAddressPickerCallbacks, cleanupAddressPickerCallbacks } from '../components/AddressPicker';
import { validatePostalCode, getPostalCodeInfo } from '../utils/postalCodeValidator';
import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';
import { 
  generateCallbackId, 
  registerNavigationCallback, 
  cleanupNavigationCallback 
} from '../utils/navigationCallbacks';
import { addressService } from '../services/addressService';
import { AuthContext } from '../context/AuthContext';

const AddressFormUberStyle = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);
  const { showAlert } = useAlert();
  
  // 🔧 RESTAURADO CON PROTECCIONES: Hook para manejo profesional del teclado
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
    skipMapStep = false, // NUEVO: Flag para saltar paso 4 (mapa) en Profile
    isLegacyEdit = false // NUEVO: Flag para edición de dirección legacy
  } = route.params || {};

  // Obtener callbacks
  const callbacks = pickerId ? getAddressPickerCallbacks(pickerId) : null;

  // Estados principales
  // 🔇 OCULTADO: Paso 1 deshabilitado - ir directo al formulario manual
  const [currentStep, setCurrentStep] = useState(2); // 1: Búsqueda (OCULTADO), 2: Dirección Manual con Mapa Opcional
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
  const [userHasConfirmedLocation, setUserHasConfirmedLocation] = useState(false); // Usuario confirmó en mapa
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [mapCallbackId] = useState(() => generateCallbackId()); // ID único para callbacks del mapa
  
  // 🆕 ESTADOS PARA VALIDACIÓN DE CÓDIGO POSTAL
  const [postalCodeError, setPostalCodeError] = useState('');
  const [postalCodeInfo, setPostalCodeInfo] = useState(null); // Información de la zona
  
  // Estados para modal de confirmación
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [successModalCallback, setSuccessModalCallback] = useState(null);

  // Función para mostrar modal de éxito personalizado
  const displaySuccessModal = (title, message, callback = null) => {
    setSuccessModalTitle(title);
    setSuccessModalMessage(message);
    setSuccessModalCallback(() => callback);
    setShowSuccessModal(true);
  };

  // Función para parsear dirección de Google y auto-rellenar campos
  const parseGoogleAddress = (googleAddress) => {
    if (!googleAddress || !googleAddress.description) return;
    
    // console.log('=== PARSEANDO DIRECCIÓN DE GOOGLE ===');
    // console.log('Dirección completa:', googleAddress.description);
    
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
      
      // console.log('✅ Campos auto-rellenados:');
      // console.log('- Calle:', streetMatch?.[1]?.trim() || 'No detectada');
      // console.log('- No. Ext:', numberMatch?.[1] || 'No detectado');
      // console.log('- Colonia:', neighborhood || 'No detectada');
      // console.log('- CP:', postalMatch?.[1] || 'No detectado');
      // console.log('- Alcaldía/Mun:', municipality || 'No detectada');
      // console.log('- Estado:', state);
      
    } catch (error) {
      // console.log('❌ Error parseando dirección:', error);
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

  // ✅ GEOCODING INTELIGENTE: Obtener coordenadas automáticamente de la dirección manual (MEJORADO - MÁS ESTRICTO)
  // Geocoding inteligente usando utility unificada
  const handleIntelligentGeocoding = async (addressString) => {
    const coordinates = await geocodeFormAddress(addressString);
    
    if (coordinates) {
      console.log('✅ GEOCODING EXITOSO - Guardando coordenadas:', coordinates);
      setMapCoordinates(coordinates);
      return coordinates;
    }
    
    console.log('⚠️ GEOCODING: No se pudieron obtener coordenadas válidas');
    return null;
  };

  // 🆕 FUNCIÓN: Manejar cambios en código postal con validación (MEJORADA para iOS)
  const handlePostalCodeChange = (value) => {
    setPostalCode(value);
    setPostalCodeError(''); // Limpiar error anterior
    setPostalCodeInfo(null); // Limpiar información anterior
    
    // 🛡️ PROTECCIÓN iOS: Debounce para evitar múltiples validaciones muy rápidas
    if (handlePostalCodeChange._timeout) {
      clearTimeout(handlePostalCodeChange._timeout);
    }
    
    // Solo validar si tiene 5 dígitos
    if (value.length === 5) {
      handlePostalCodeChange._timeout = setTimeout(() => {
        try {
          const validation = validatePostalCode(value);
          
          if (!validation.isValid) {
            setPostalCodeError(validation.message);
            
            // Mostrar sugerencia si está disponible
            if (validation.suggestion) {
              setPostalCodeError(`${validation.message}\n${validation.suggestion}`);
            }
          } else {
            // CP válido - mostrar información de la zona
            setPostalCodeInfo(validation.location);
            console.log('✅ CP válido:', validation.location);
            
            // Auto-completar estado basado en la zona
            if (validation.location.state === 'CDMX') {
              setState('CDMX');
            } else {
              setState('Estado de México');
            }
          }
        } catch (error) {
          console.log('⚠️ Error validando CP:', error.message);
          setPostalCodeError('Error validando código postal');
        }
      }, Platform.OS === 'ios' ? 500 : 200); // iOS necesita más debounce
    }
  };

  // ✅ NUEVA: Función para parsear dirección legacy del perfil y pre-llenar campos
  const parseLegacyAddress = (legacyAddress) => {
    if (!legacyAddress || typeof legacyAddress !== 'string') return;
    
    console.log('📋 Parseando dirección legacy:', legacyAddress);
    
    // Separar dirección principal de referencias si las hay
    let mainAddress = legacyAddress;
    let extractedReferences = '';
    
    // Buscar referencias al final (después de "Referencias:")
    const refMatch = legacyAddress.match(/(.*?),?\s*Referencias:\s*(.+)$/i);
    if (refMatch) {
      mainAddress = refMatch[1].trim();
      extractedReferences = refMatch[2].trim();
    }
    
    // Establecer la dirección completa como texto
    setUserWrittenAddress(mainAddress);
    
    // Establecer referencias si existen
    if (extractedReferences) {
      setReferences(extractedReferences);
    }
    
    // Intentar parsear componentes básicos para pre-llenar campos estructurados
    const addressStr = mainAddress.toLowerCase();
    
    // Detectar número exterior (primer número que aparece)
    const numberMatch = mainAddress.match(/\b(\d+)(?:-?[a-zA-Z]?)?\b/);
    if (numberMatch) {
      setExteriorNumber(numberMatch[1]);
    }
    
    // Detectar calle (parte antes del primer número)
    const streetMatch = mainAddress.match(/^([^,\d]+?)(?:\s*\d|,)/);
    if (streetMatch) {
      const street = streetMatch[1].trim()
        .replace(/^(calle|av\.|avenida|blvd\.|boulevard|calz\.|calzada)\s+/i, '');
      setStreetName(street);
    }
    
    // Detectar colonia (después de Col., Colonia, etc.)
    const colonyPatterns = [
      /(?:col\.|colonia|fracc\.|fraccionamiento)\s+([^,]+)/i,
      /,\s*([^,]+?)(?:,|\s*\d{5})/
    ];
    
    for (const pattern of colonyPatterns) {
      const match = mainAddress.match(pattern);
      if (match) {
        setNeighborhood(match[1].trim());
        break;
      }
    }
    
    // Detectar código postal (5 dígitos)
    const cpMatch = mainAddress.match(/(\d{5})/);
    if (cpMatch) {
      setPostalCode(cpMatch[1]);
      // Auto-detectar estado basado en CP
      const cp = cpMatch[1];
      if (cp >= '01000' && cp <= '16999') {
        setState('CDMX');
      } else if (cp >= '50000' && cp <= '56999') {
        setState('Estado de México');
      }
    }
    
    // Detectar municipio/alcaldía
    const municipalityPatterns = [
      /(Álvaro Obregón|Azcapotzalco|Benito Juárez|Coyoacán|Cuajimalpa|Gustavo A\. Madero|Iztacalco|Iztapalapa|Magdalena Contreras|Miguel Hidalgo|Milpa Alta|Tláhuac|Tlalpan|Venustiano Carranza|Xochimilco|Cuauhtémoc|Naucalpan|Tlalnepantla|Ecatepec|Nezahualcóyotl|Chimalhuacán|Atizapán|Tultitlán|Coacalco|Cuautitlán Izcalli|Huixquilucan)/i
    ];
    
    for (const pattern of municipalityPatterns) {
      const match = mainAddress.match(pattern);
      if (match) {
        setMunicipality(match[1]);
        break;
      }
    }
    
    console.log('✅ Campos pre-llenados:', {
      userWrittenAddress: mainAddress,
      references: extractedReferences,
      streetName: streetMatch?.[1]?.trim() || '',
      exteriorNumber: numberMatch?.[1] || '',
      neighborhood: neighborhood,
    });
  };

  // Función para obtener ubicación actual usando locationUtils - CON DEBUG MEJORADO
  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      // console.log('🚀 INICIANDO PRUEBA DE UBICACIÓN');
      // console.log('Platform:', Platform.OS);
      // console.log('Llamando a getCurrentLocation con userType: guest');
      
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
            // console.warn('Geocoding error:', geocodingError);
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
            
            showAlert({
              type: 'success',
              title: 'Ubicación actual detectada',
              message: 'Puedes confirmar o editar tu dirección en el siguiente paso.'
            });
          }
        },
        // onError callback mejorado para iOS y Android
        (error) => {
          // console.error('❌ Location error details:', {
            // code: error.code,
            // message: error.message,
            // platform: Platform.OS
          // });
          
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
                    showAlert({
                      type: 'info',
                      title: 'Configuración de ubicación',
                      message: 'Configuración > Privacidad y seguridad > Servicio de ubicación > FAMAC > "Al usar la App"'
                    });
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
          
          showAlert({
            type: 'error',
            title: errorTitle,
            message: errorMessage
          });
        }
      );
      
      // Si no se obtuvo ubicación (permisos denegados, etc.)
      if (!location) {
        showAlert({
          type: 'warning',
          title: 'Ubicación no disponible',
          message: 'No se pudo acceder a tu ubicación. Puedes buscar manualmente tu dirección abajo.'
        });
      }
    } catch (error) {
      // console.error('Location error:', error);
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
      // console.error('Error searching addresses:', error);
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

  // Función para ir al mapa con geocoding inteligente
  const goToMap = async () => {
    console.log('🗺️ NAVEGANDO AL MAPA CON COORDENADAS:', {
      mapCoordinatesState: mapCoordinates,
      willUseDefault: !mapCoordinates
    });
    
    let mapCenter = mapCoordinates || { latitude: 19.4326, longitude: -99.1332 };
    
    // NUEVO: Si hay dirección escrita pero no coordenadas previas, geocodificar para centrar mapa
    if (!mapCoordinates && userWrittenAddress?.trim()) {
      try {
        // console.log('🗺️ Geocodificando dirección para centrar mapa:', userWrittenAddress);
        
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json`,
          {
            params: {
              address: userWrittenAddress.trim(),
              key: Config.GOOGLE_DIRECTIONS_API_KEY,
              language: 'es',
              region: 'mx',
              bounds: '19.048,-99.365|19.761,-98.877', // Bounds para CDMX y Edomex
            },
          }
        );

        if (response.data.results && response.data.results[0]) {
          const location = response.data.results[0].geometry.location;
          mapCenter = {
            latitude: location.lat,
            longitude: location.lng,
          };
          // console.log('✅ Mapa centrado cerca de la dirección del usuario:', mapCenter);
        } else {
          // console.log('⚠️ No se pudo geocodificar, usando centro CDMX');
        }
      } catch (error) {
        // console.warn('❌ Error geocodificando dirección:', error);
        // console.log('⚠️ Usando centro CDMX como fallback');
      }
    }
    
    // ✅ REGISTRAR CALLBACK para recibir coordenadas del mapa
    const handleLocationReturn = (coordinates) => {
      setMapCoordinates(coordinates);
      setUserHasConfirmedLocation(true);
    };
    
    registerNavigationCallback(mapCallbackId, handleLocationReturn);
    
    navigation.navigate('AddressMap', {
      addressForm: {},
      selectedLocation: mapCenter, // ✅ USAR mapCenter (ya incluye lógica completa de geocoding)
      pickerId,
      callbackId: mapCallbackId, // ✅ PASAR ID DE CALLBACK
      fromGuestCheckout: route.params?.fromGuestCheckout || false,
      userWrittenAddress: userWrittenAddress, // Pasar dirección escrita para contexto
      references: references, // NUEVO: Pasar referencias para preservarlas
      // CRITICAL: Preservar TODOS los parámetros para que no se pierdan en el mapa
      ...route.params, // Pasar todos los parámetros originales
    });
  };

  // Función para finalizar con validaciones EXACTAMENTE IGUALES a Profile.jsx
  const handleConfirm = async (providedAddress = null) => {
    console.log('🔍 DEBUGGING handleConfirm - Parámetros recibidos:', {
      fromAddressManager: route.params?.fromAddressManager,
      fromCart: route.params?.fromCart,
      fromProfile: route.params?.fromProfile,
      userId: user?.id,
      usertype: user?.usertype,
      editMode: route.params?.editMode
    });

    // VALIDACIONES EXACTAS DE PROFILE - NO CAMBIAR
    // Usar providedAddress si se pasó, sino userWrittenAddress del estado
    const addressToValidate = providedAddress || userWrittenAddress;
    if (!addressToValidate?.trim()) {
      Alert.alert('Error', 'Por favor escribe una dirección válida.');
      return;
    }
    
    // Referencias son completamente opcionales - no validar
    
    // DIFERENCIA: Guest puede usar ubicación detectada automáticamente o del mapa (Profile no requiere ubicación específica)
    // Nota: Si no hay coordenadas, se procede normalmente ya que el geocoding es opcional
    
    // CONSTRUCCIÓN DE DIRECCIÓN FINAL - INTELIGENTE
    const finalAddress = {
      userWrittenAddress: addressToValidate.trim(),
      fullAddress: addressToValidate.trim(),
      coordinates: skipMapStep ? null : mapCoordinates, // Guest incluye coordenadas, Profile no
      references: references.trim(),
      verified: skipMapStep ? false : !!mapCoordinates, // Verificado si tiene coordenadas (manual o inteligente)
      hasUserWrittenAddress: true,
      timestamp: new Date().toISOString(),
      isProfileAddress: skipMapStep, // false para Guest, true para Profile
      geocodingSource: userHasConfirmedLocation ? 'user_map_selection' : 'intelligent_geocoding', // ✅ NUEVO: Origen de coordenadas
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
        // console.log('🚀 Iniciando actualización de dirección para usuario:', userId);
        
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
        
        // console.log('🚀 Payload para actualización:', {
          // ...payload,
          // address: payload.address.substring(0, 50) + '...' // Solo mostrar inicio de dirección
        // });
        
        const response = await axios.post(
          'https://food.siliconsoft.pk/api/updateuserprofile',
          payload,
          { timeout: 15000 } // Timeout de 15 segundos para actualización
        );
        
        if (response.status === 200) {
          // console.log('✓ Dirección actualizada exitosamente');
          
          // Mostrar confirmación al usuario
          displaySuccessModal(
            '✓ Dirección actualizada',
            'Tu dirección se ha actualizado correctamente.',
            () => {
              if (route.params?.fromAddressManager) {
                // Si viene de AddressManager, regresar allí para que se actualice la lista
                navigation.goBack();
              } else {
                // Si viene directamente del Profile, regresar al Profile
                navigation.goBack();
              }
            }
          );
        } else {
          throw new Error(`Error del servidor: ${response.status}`);
        }
      } catch (error) {
        // console.error('❌ Error actualizando dirección:', error);
        
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
    // Si viene del AddressManager, Cart, o necesita guardar como nueva dirección
    else if (route.params?.fromAddressManager || route.params?.fromCart || (user?.id && user?.usertype !== 'Guest' && !route.params?.fromProfile)) {
      try {
        // Preparar datos de la dirección
        const addressData = {
          userId: user.id,
          address: `${finalAddress.userWrittenAddress}${finalAddress.references ? `, Referencias: ${finalAddress.references}` : ''}`,
          phone: route.params?.phone || '', // Si se proporciona teléfono
          isDefault: route.params?.setAsDefault || false // Si debe ser predeterminada
        };

        // Validar datos antes de enviar
        const validation = addressService.validateAddressData(addressData);
        if (!validation.isValid) {
          Alert.alert('Error', validation.errors.join('\n'));
          return;
        }

        let response;
        if (route.params?.editMode && route.params?.addressData?.id) {
          // Actualizar dirección existente
          response = await addressService.updateAddress({
            ...addressData,
            addressId: route.params.addressData.id
          });
        } else {
          // Crear nueva dirección
          response = await addressService.addAddress(addressData);
        }

        // Mostrar confirmación al usuario
        displaySuccessModal(
          '✓ Dirección guardada',
          route.params?.editMode ? 'Tu dirección se ha actualizado correctamente.' : 'Tu dirección se ha guardado correctamente.',
          () => {
            if (route.params?.fromAddressManager) {
              navigation.goBack();
            } else if (route.params?.fromCart) {
              // Si viene del cart, refrescar las direcciones
              navigation.navigate('MainTabs', { screen: 'Carrito', params: { refreshAddresses: true } });
            } else {
              navigation.goBack();
            }
          }
        );
      } catch (error) {
        console.error('❌ Error guardando dirección:', error);
        
        let errorMessage = 'No se pudo guardar la dirección.';
        
        if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
          errorMessage = 'La conexión tardó demasiado. Verifica tu internet e inténtalo de nuevo.';
        } else if (error.message?.includes('Network Error')) {
          errorMessage = 'Sin conexión a internet. Verifica tu conexión e inténtalo de nuevo.';
        }
        
        Alert.alert(
          'Error al guardar',
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
        // USAR EXACTAMENTE EL MISMO FORMATO QUE PROFILE.JSX
        const addressToSend = `${finalAddress.userWrittenAddress}${finalAddress.references ? `, Referencias: ${finalAddress.references}` : ''}`;
        
        // console.log('=== ADDRESS FORM UBER STYLE NAVEGANDO DE VUELTA ===');
        // console.log('Dirección final:', addressToSend.substring(0, 50) + '...');
        // console.log('Coordenadas:', finalAddress.coordinates);
        // console.log('Referencias:', finalAddress.references.substring(0, 30) + '...');
        // console.log('returnToCart:', route.params?.returnToCart);
        
        // Validar parámetros críticos antes de navegar
        if (!route.params?.totalPrice || !route.params?.itemCount) {
          throw new Error('Faltan parámetros del carrito');
        }
        
        // Si returnToCart es true, ir directamente al Cart
        // ✅ FIX: Evitar regreso a GuestCheckout, ir directo al carrito
        if (route.params?.returnToCart) {
          // console.log('✅ FIX: Yendo directo al carrito con datos completos');
          
          // Navegar directo al carrito con todos los datos necesarios
          navigation.navigate('MainTabs', {
            screen: 'Carrito',
            params: {
              guestData: {
                email: route.params?.currentEmail || '',
                address: addressToSend,
                // Datos preservados del formulario de Cart
                preservedDeliveryInfo: route.params?.preservedDeliveryInfo,
                preservedNeedInvoice: route.params?.preservedNeedInvoice || false,
                preservedTaxDetails: route.params?.preservedTaxDetails || null,
                preservedCoordinates: finalAddress.coordinates ? {
                  latitude: finalAddress.coordinates.latitude,
                  longitude: finalAddress.coordinates.longitude
                } : null,
              },
              mapCoordinates: finalAddress.coordinates ? {
                latitude: finalAddress.coordinates.latitude,
                longitude: finalAddress.coordinates.longitude
              } : null
            }
          });
          
          // console.log('✓ Navegación directa a Cart con datos completos');
          return;
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
          selectedCoordinates: finalAddress.coordinates ? {
            driver_lat: finalAddress.coordinates.latitude,
            driver_long: finalAddress.coordinates.longitude
          } : null, // ✅ Convertir formato para Cart.jsx
          selectedReferences: finalAddress.references,
          shouldGoToStep2: true, // Indicar que debe ir al paso 2
          
          // Preservar el email del usuario
          preservedEmail: route.params?.currentEmail || '',
          
          // Flag de éxito
          addressCompleted: true,
        });
        
        // console.log('✓ Navegación a GuestCheckout completada exitosamente');
        
      } catch (error) {
        // console.error('❌ Error navegando de vuelta a GuestCheckout:', error);
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

  // Manejar coordenadas seleccionadas del mapa (PRESERVANDO dirección y referencias)
  useEffect(() => {
    if (selectedLocationFromMap) {
      setMapCoordinates(selectedLocationFromMap);
      setUserHasConfirmedLocation(true); // ✅ Usuario confirmó ubicación en el mapa
      
      // CRITICAL FIX: Si venimos del mapa, ir automáticamente al paso 3 (renumerado)
      setCurrentStep(3);
      
      // CRITICAL: RESTAURAR dirección y referencias preservadas del usuario
      if (route.params?.preservedUserAddress) {
        setUserWrittenAddress(route.params.preservedUserAddress);
        // console.log('🔄 Dirección del usuario restaurada:', route.params.preservedUserAddress);
      }
      
      if (route.params?.preservedReferences) {
        setReferences(route.params.preservedReferences);
        // console.log('🔄 Referencias del usuario restauradas:', route.params.preservedReferences);
      }
      
      // console.log('=== COORDENADAS RECIBIDAS DEL MAPA ===');
      // console.log('Coordenadas:', selectedLocationFromMap);
      // console.log('✅ Usuario confirmó ubicación en mapa - DIRECCIÓN Y REFERENCIAS PRESERVADAS');
    }
  }, [selectedLocationFromMap]);

  // 🔇 OCULTADO: Efecto para buscar cuando cambia la query (no necesario con paso 1 oculto)
  // useEffect(() => {
  //   const timeoutId = setTimeout(() => {
  //     if (searchQuery && currentStep === 1) {
  //       searchAddresses(searchQuery);
  //     }
  //   }, 300); // Debounce de 300ms
  //   return () => clearTimeout(timeoutId);
  // }, [searchQuery, currentStep]);

  // ✅ NUEVO: Inicializar campos cuando es edición legacy
  useEffect(() => {
    if (isLegacyEdit && initialAddress) {
      console.log('🔧 Inicializando edición legacy...');
      
      // Parsear y pre-llenar dirección
      parseLegacyAddress(initialAddress);
      
      // Ir directamente al paso 2 (campos estructurados)
      setCurrentStep(2);
      
      console.log('✅ Edición legacy inicializada');
    }
  }, [isLegacyEdit, initialAddress]);

  // ✅ CLEANUP: Limpiar callback del mapa al desmontar componente
  useEffect(() => {
    return () => {
      cleanupNavigationCallback(mapCallbackId);
    };
  }, [mapCallbackId]);

  // 🆕 GEOCODING AUTOMÁTICO: Cuando la dirección está completa
  useEffect(() => {
    const isAddressComplete = 
      streetName?.trim() &&
      exteriorNumber?.trim() &&
      neighborhood?.trim() &&
      postalCode?.trim() &&
      municipality?.trim() &&
      !postalCodeError && // 🆕 CP debe ser válido (sin errores)
      postalCodeInfo; // 🆕 CP debe tener información de zona válida

    if (isAddressComplete && currentStep === 2) {
      const finalAddress = buildFinalAddress();
      if (finalAddress && finalAddress.length > 15) {
        console.log('🤖 GEOCODING AUTOMÁTICO - Dirección completa detectada:', finalAddress);
        
        // Delay para evitar múltiples calls mientras user escribe
        const timer = setTimeout(async () => {
          const coords = await handleIntelligentGeocoding(finalAddress);
          if (coords) {
            console.log('✅ COORDENADAS OBTENIDAS AUTOMÁTICAMENTE:', coords);
          }
        }, 1500); // 1.5 segundos de delay

        return () => clearTimeout(timer);
      }
    }
  }, [streetName, exteriorNumber, neighborhood, postalCode, municipality, postalCodeError, postalCodeInfo, currentStep]);

  // 🔇 OCULTADO TEMPORALMENTE: Renderizar paso 1: Búsqueda  
  // Mantener código comentado para uso futuro si es necesario
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

      {/* ✅ NUEVA OPCIÓN: Dirección manual */}
      <TouchableOpacity
        style={styles.manualAddressButton}
        onPress={() => {
          // console.log('📝 Usuario eligió: Agregar dirección manualmente');
          // Ir directo al paso 2 (dirección manual)
          setCurrentStep(2);
        }}
        activeOpacity={0.8}>
        <Ionicons name="create-outline" size={24} color="#8B5E3C" />
        <Text style={styles.manualAddressText}>
          Agregar dirección manualmente
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
    // Verificar si hay campos requeridos llenos (incluye validación CP)
    const hasRequiredFields = streetName.trim() && exteriorNumber.trim() && neighborhood.trim() && postalCode.trim() && municipality.trim() && !postalCodeError && postalCodeInfo;
    
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
              placeholder="Calle o avenida"
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
              placeholder="Número"
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
              placeholder="Opcional"
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
              placeholder="Colonia"
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
            <Text style={styles.fieldLabel}>CP *</Text>
            <TextInput
              ref={(ref) => registerInput('postalCode', ref)}
              style={[
                styles.addressInput,
                postalCodeError && styles.addressInputError
              ]}
              placeholder="5 dígitos"
              value={postalCode}
              onChangeText={handlePostalCodeChange}
              onFocus={createFocusHandler('postalCode', 0, { disableOnIOS: true })}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={5}
            />
            
            {/* Error de código postal */}
            {postalCodeError ? (
              <Text style={styles.errorText}>{postalCodeError}</Text>
            ) : null}
            
            {/* Información de zona válida */}
            {postalCodeInfo ? (
              <View style={styles.postalCodeInfo}>
                <Ionicons name="checkmark-circle" size={16} color="#33A744" />
                <Text style={styles.postalCodeInfoText}>
                  ✅ {postalCodeInfo.description}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.addressField, {flex: 2}]}>
            <Text style={styles.fieldLabel}>Alcaldía/Municipio</Text>
            <TextInput
              ref={(ref) => registerInput('municipality', ref)}
              style={styles.addressInput}
              placeholder="Alcaldía"
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

        {/* Vista previa de dirección construida - OCULTADA POR SOLICITUD */}
        {false && (
          <View style={styles.addressPreview}>
            <Text style={styles.previewLabel}>Vista previa:</Text>
            <Text style={styles.previewText}>
              {buildFinalAddress() || 'Completa los campos requeridos (*)'}
            </Text>
          </View>
        )}

        {/* Mensaje informativo */}
        <View style={styles.loadingContainer}>
          <Ionicons name="information-circle" size={20} color="#D27F27" />
          <Text style={styles.loadingText}>
            Los campos con * son obligatorios
          </Text>
        </View>

        {/* Campo de referencias integrado */}
        <View style={styles.addressField}>
          <Text style={styles.fieldLabel}>Referencias (Opcional)</Text>
          <TextInput
            ref={(ref) => registerInput('references', ref)}
            style={[styles.addressInput, styles.referencesInput]}
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
          <Text style={styles.characterCount}>
            {references.length}/300 caracteres
          </Text>
        </View>


        {/* NUEVA SECCIÓN: Ubicación en Mapa (Opcional) */}
        {hasRequiredFields && (
          <View style={styles.mapSection}>
            <Text style={styles.mapSectionTitle}>Ubicación en mapa (Opcional)</Text>
            <Text style={styles.mapSectionSubtitle}>
              Para mayor precisión en la entrega, puedes ajustar tu ubicación exacta
            </Text>
            
            {/* 🔇 OCULTADO PARA GUEST: Estado del geocoding inteligente (mostrar solo texto estático) */}
            {/* {mapCoordinates ? (
              <View style={styles.coordinatesStatus}>
                <Ionicons name="checkmark-circle" size={20} color="#33A744" />
                <Text style={styles.coordinatesStatusText}>
                  Ubicación detectada automáticamente
                </Text>
                <TouchableOpacity
                  style={styles.adjustLocationButton}
                  onPress={goToMap}>
                  <Ionicons name="map-outline" size={16} color="#8B5E3C" />
                  <Text style={styles.adjustLocationButtonText}>Ajustar</Text>
                </TouchableOpacity>
              </View>
            */}
            
            {/* Siempre mostrar texto estático sin indicadores de geocoding */}
            <View style={styles.coordinatesStatus}>
              <Ionicons name="location-outline" size={20} color="#D27F27" />
              <Text style={styles.coordinatesStatusText}>
                Puedes seleccionar ubicación para mayor precisión
              </Text>
              <TouchableOpacity
                style={userHasConfirmedLocation ? styles.adjustLocationButton : styles.selectLocationButton}
                onPress={async () => {
                  // Construir dirección y hacer geocoding antes de ir al mapa
                  const finalAddress = buildFinalAddress();
                  console.log('🎯 BOTÓN IR AL MAPA presionado - Dirección construida:', finalAddress);
                  setUserWrittenAddress(finalAddress);
                  console.log('🧠 Ejecutando geocoding...');
                  const geocodedCoordinates = await handleIntelligentGeocoding(finalAddress);
                  
                  // 🔧 TIMING FIX: Pequeño delay para asegurar que el estado se actualice
                  setTimeout(() => {
                    console.log('🚀 Ir al mapa después del geocoding y delay');
                    goToMap();
                  }, 200);
                }}>
                <Ionicons 
                  name={userHasConfirmedLocation ? "map-outline" : "map"} 
                  size={16} 
                  color={userHasConfirmedLocation ? "#8B5E3C" : "#FFF"} 
                />
                <Text style={userHasConfirmedLocation ? styles.adjustLocationButtonText : styles.selectLocationButtonText}>
                  {userHasConfirmedLocation ? 'Ajustar' : 'Ir al mapa'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botón completar dirección - ahora incluye geocoding automático */}
        <TouchableOpacity
          style={[
            styles.confirmButton, 
            !hasRequiredFields && styles.confirmButtonDisabled
          ]}
          onPress={async () => {
            // Construir dirección final y guardarla
            const finalAddress = buildFinalAddress();
            setUserWrittenAddress(finalAddress);
            
            // ✅ GEOCODING INTELIGENTE: Obtener coordenadas automáticamente si no las tiene
            if (!mapCoordinates) {
              await handleIntelligentGeocoding(finalAddress);
            }
            
            // Completar dirección directamente (sin ir a paso 3)
            // 🔧 TIMING FIX: Pasar finalAddress directamente en lugar de esperar setState
            handleConfirm(finalAddress);
          }}
          disabled={!hasRequiredFields}>
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
          <Text style={styles.confirmButtonText}>
            Completar dirección
          </Text>
        </TouchableOpacity>

        {/* 🔇 OCULTADO: Botón regresar a búsqueda (paso 1 oculto) */}
        {/* <TouchableOpacity
          style={styles.backStepButton}
          onPress={() => setCurrentStep(1)}>
          <Text style={styles.backStepButtonText}>← Regresar a búsqueda</Text>
        </TouchableOpacity> */}
      </View>
    );
  };


  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      {...keyboardAvoidingViewProps}>
      
      {/* Header estático */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            // 🔇 SIMPLIFICADO: Con paso 1 oculto, siempre regresar navegación
            navigation.goBack();
            // Lógica anterior comentada:
            // if (currentStep === 1) {
            //   navigation.goBack();
            // } else {
            //   setCurrentStep(currentStep - 1);
            // }
          }}
          style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 🔇 OCULTADO: Indicador de pasos (ya no necesario con un solo paso) */}
      {/* <View style={styles.stepsIndicator}>
        {[1, 2].map((step) => (
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
            {step < 2 && <View style={styles.stepLine} />}
          </View>
        ))}
      </View> */}
      
      {/* Contenido scrolleable */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          {...scrollViewProps}
          style={styles.containerInner}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          bounces={true}>

          {/* Contenido del paso actual */}
          <View style={styles.content}>
            {/* 🔇 OCULTADO: {currentStep === 1 && renderSearchStep()} */}
            {currentStep === 2 && renderManualAddressStep()}
          </View>
          
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Modal de confirmación de éxito */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={50} color="#33A744" />
              <Text style={styles.modalTitle}>{successModalTitle}</Text>
            </View>
            <Text style={styles.modalMessage}>{successModalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                if (successModalCallback) {
                  successModalCallback();
                }
              }}>
              <Text style={styles.modalButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 120, // Espacio extra para dispositivos pequeños y botones flotantes
  },
  stepContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    minHeight: 400, // Asegurar altura mínima para scroll en dispositivos pequeños
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
  manualAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#8B5E3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  manualAddressText: {
    flex: 1,
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#8B5E3C',
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
  smartGeocodingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 167, 68, 0.2)',
  },
  smartGeocodingText: {
    flex: 1,
    marginLeft: 8,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#33A744',
    lineHeight: 18,
  },
  
  // NUEVOS ESTILOS PARA MAPA OPCIONAL INTEGRADO
  mapSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(210, 127, 39, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  mapSectionTitle: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    marginBottom: 4,
  },
  mapSectionSubtitle: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    marginBottom: 12,
    lineHeight: 18,
  },
  coordinatesStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(139, 94, 60, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.1)',
  },
  coordinatesStatusText: {
    flex: 1,
    marginLeft: 8,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
  },
  adjustLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(139, 94, 60, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B5E3C',
  },
  adjustLocationButtonText: {
    marginLeft: 4,
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#8B5E3C',
  },
  selectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#8B5E3C',
    borderRadius: 6,
  },
  selectLocationButtonText: {
    marginLeft: 4,
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },

  // Estilos para modal de confirmación
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 300,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: fonts.size.XL,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
    textAlign: 'center',
    marginTop: 15,
  },
  modalMessage: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  modalButton: {
    backgroundColor: '#33A744',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 150,
    shadowColor: '#33A744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    textAlign: 'center',
  },

  // 🆕 ESTILOS PARA VALIDACIÓN DE CÓDIGO POSTAL  
  addressInputError: {
    borderColor: '#E53935',
    borderWidth: 2,
    backgroundColor: 'rgba(229, 57, 53, 0.05)',
  },
  errorText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular, 
    color: '#E53935',
    marginTop: 4,
    lineHeight: 16,
  },
  postalCodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(51, 167, 68, 0.1)',
    borderRadius: 6,
  },
  postalCodeInfoText: {
    flex: 1,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#33A744',
    marginLeft: 4,
    lineHeight: 16,
  },
});

export default AddressFormUberStyle;