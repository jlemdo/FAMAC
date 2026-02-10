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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { geocodeFormAddress } from '../utils/geocodingUtils';
import fonts from '../theme/fonts';
import { useAlert } from '../context/AlertContext';
import { getCurrentLocation } from '../utils/locationUtils';
import { getAddressPickerCallbacks, cleanupAddressPickerCallbacks } from '../components/AddressPicker';
import { newAddressService } from '../services/newAddressService';

import { useKeyboardBehavior } from '../hooks/useKeyboardBehavior';
import { 
  generateCallbackId, 
  registerNavigationCallback, 
  cleanupNavigationCallback 
} from '../utils/navigationCallbacks';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/environment';
import {
  ALCALDIAS_CDMX,
  MUNICIPIOS_EDOMEX,
  validateEmail
} from '../utils/addressValidators';
// Debugging removido para producciónn

const AddressFormUberStyle = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, updateUser } = useContext(AuthContext);
  const { showAlert } = useAlert();
  
  // 🔧 RESTAURADO CON PROTECCIONES: Hook para manejo profesional del teclado
  const { 
    scrollViewRef, 
    registerInput, 
    createFocusHandler, 
    keyboardAvoidingViewProps, 
    scrollViewProps 
  } = useKeyboardBehavior();

  // Debugging removido para producción
  
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
    isLegacyEdit = false, // NUEVO: Flag para edición de dirección legacy
    // NUEVOS PARÁMETROS PARA FLUJO GUEST CONSOLIDADO
    fromGuestCheckout = false,
    currentEmail = '',
    returnToCart = false,
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
  const [showMunicipalityModal, setShowMunicipalityModal] = useState(false);
  const [availableOptions, setAvailableOptions] = useState(ALCALDIAS_CDMX); // Default CDMX
  
  const [references, setReferences] = useState('');

  // NUEVO: Estados para flujo Guest consolidado
  const [guestEmail, setGuestEmail] = useState(currentEmail || '');
  const [emailLocked, setEmailLocked] = useState(false);

  // Estados para manejo del mapa
  const [mapCoordinates, setMapCoordinates] = useState(null); // Coordenadas actuales
  const [coordinatesSource, setCoordinatesSource] = useState(null); // 'auto' | 'user' | null
  const [userHasConfirmedLocation, setUserHasConfirmedLocation] = useState(false); // Usuario confirmó en mapa
  const [isProcessingLocation, setIsProcessingLocation] = useState(false); // Estado único de carga
  const [mapCallbackId] = useState(() => generateCallbackId()); // ID único para callbacks del mapa
  
  
  
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
      
      
    } catch (error) {
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

  // ✅ SIMPLIFICADO: Geocoding inteligente unificado
  const handleIntelligentGeocoding = async (addressString) => {
    try {
      const coordinates = await geocodeFormAddress(addressString);
      
      if (coordinates) {
        setMapCoordinates(coordinates);
        setCoordinatesSource('auto'); // Marcar como automático
        return coordinates;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // 🆕 FUNCIÓN: Manejar cambios en código postal (SIN VALIDACIÓN)
  const handlePostalCodeChange = (value) => {
    setPostalCode(value);
    
    // 🎯 NUEVA LÓGICA: Auto-actualizar opciones según CP
    if (value.length === 5) {
      const postalCodeNum = parseInt(value);
      
      if ((postalCodeNum >= 1000 && postalCodeNum <= 16999) || (postalCodeNum >= 1 && postalCodeNum <= 9999)) {
        // CDMX (rango corregido: incluye 00001-09999 y 01000-16999)
        setState('CDMX');
        setAvailableOptions(ALCALDIAS_CDMX);
        // Limpiar municipio si no está en alcaldías
        if (municipality && !ALCALDIAS_CDMX.includes(municipality)) {
          setMunicipality('');
        }
      } else if (postalCodeNum >= 50000 && postalCodeNum <= 56999) {
        // Estado de México
        setState('Estado de México');
        setAvailableOptions(MUNICIPIOS_EDOMEX);
        // Limpiar municipio si no está en municipios
        if (municipality && !MUNICIPIOS_EDOMEX.includes(municipality)) {
          setMunicipality('');
        }
      } else {
      }
    }
  };

  // ✅ NUEVA: Función para parsear dirección legacy del perfil y pre-llenar campos
  const parseLegacyAddress = (legacyAddress) => {
    if (!legacyAddress || typeof legacyAddress !== 'string') return;
    
    
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
    
    // console.log('✅ Campos pre-llenados:', {
      // userWrittenAddress: mainAddress,
      // references: extractedReferences,
      // streetName: streetMatch?.[1]?.trim() || '',
      // exteriorNumber: numberMatch?.[1] || '',
      // neighborhood: neighborhood,
    // });
  };

  // ✅ NUEVA: Función para parsear dirección guardada y extraer componentes
  const parseAddressForEdit = (fullAddress) => {
    if (!fullAddress || typeof fullAddress !== 'string') {
      return {};
    }

    // Separar dirección principal de referencias si las hay
    let mainAddress = fullAddress;
    let extractedReferences = '';

    // Buscar referencias al final (después de "Referencias:")
    const refMatch = fullAddress.match(/(.*?),?\s*Referencias:\s*(.+)$/i);
    if (refMatch) {
      mainAddress = refMatch[1].trim();
      extractedReferences = refMatch[2].trim();
    }

    // Intentar extraer componentes de la dirección
    const addressComponents = {
      street: '',
      exteriorNumber: '',
      interiorNumber: '',
      neighborhood: '',
      postalCode: '',
      municipality: '',
      state: 'CDMX',
      references: extractedReferences
    };

    try {
      // Dividir por comas y procesar cada parte
      const parts = mainAddress.split(',').map(part => part.trim());

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // Buscar número (probable que sea el primer o segundo elemento)
        if (i <= 1 && /\d+/.test(part)) {
          const numberMatch = part.match(/(\d+)(.*)$/);
          if (numberMatch) {
            addressComponents.exteriorNumber = numberMatch[1];
            // Lo que queda después del número podría ser el nombre de la calle
            const remainder = numberMatch[2].trim();
            if (remainder && !addressComponents.street) {
              addressComponents.street = remainder;
            }
          }
        }

        // Buscar código postal (5 dígitos)
        const postalMatch = part.match(/\b(\d{5})\b/);
        if (postalMatch) {
          addressComponents.postalCode = postalMatch[1];
          continue;
        }

        // Si no tiene números, probablemente sea colonia, municipio o estado
        if (!/\d/.test(part)) {
          if (part.toLowerCase().includes('cdmx') || part.toLowerCase().includes('ciudad de méxico')) {
            addressComponents.state = 'CDMX';
          } else if (part.toLowerCase().includes('estado de méxico') || part.toLowerCase().includes('edomex')) {
            addressComponents.state = 'Estado de México';
          } else if (!addressComponents.neighborhood) {
            addressComponents.neighborhood = part;
          } else if (!addressComponents.municipality) {
            addressComponents.municipality = part;
          }
        }

        // Si no hemos asignado street y esta parte tiene letras sin números
        if (!addressComponents.street && /^[a-záéíóúñü\s]+$/i.test(part)) {
          addressComponents.street = part;
        }
      }

      // Si no pudimos extraer componentes específicos, usar toda la dirección como street
      if (!addressComponents.street && !addressComponents.neighborhood) {
        addressComponents.street = mainAddress;
      }

    } catch (error) {
      // Si falla el parsing, devolver la dirección completa como street
      addressComponents.street = mainAddress;
    }

    return addressComponents;
  };

  // Función para obtener ubicación actual usando locationUtils - CON DEBUG MEJORADO
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
    let mapCenter = mapCoordinates || { latitude: 19.4326, longitude: -99.1332 };

    // Si hay dirección escrita pero no coordenadas previas, geocodificar para centrar mapa
    if (!mapCoordinates && userWrittenAddress?.trim()) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json`,
          {
            params: {
              address: userWrittenAddress.trim(),
              key: Config.GOOGLE_DIRECTIONS_API_KEY,
              language: 'es',
              region: 'mx',
              bounds: '19.048,-99.365|19.761,-98.877',
            },
          }
        );

        if (response.data.results && response.data.results[0]) {
          const location = response.data.results[0].geometry.location;
          mapCenter = {
            latitude: location.lat,
            longitude: location.lng,
          };
        }
      } catch (error) {
        // Silenciar errores de geocoding
      }
    }

    // Callback para recibir coordenadas del mapa
    const handleLocationReturn = (coordinates) => {
      setMapCoordinates(coordinates);
      setCoordinatesSource('user');
      setUserHasConfirmedLocation(true);
    };

    registerNavigationCallback(mapCallbackId, handleLocationReturn);

    const builtAddress = buildFinalAddress();

    const navParams = {
      addressForm: {},
      selectedLocation: mapCenter,
      pickerId,
      callbackId: mapCallbackId,
      fromGuestCheckout: fromGuestCheckout,
      userWrittenAddress: builtAddress,
      references: references,
      fromMapSelector: false,
      preservedUserAddress: builtAddress,
      preservedReferences: references,
      fromAddressManager: route.params?.fromAddressManager || false,
      fromCart: route.params?.fromCart || false,
      fromProfile: route.params?.fromProfile || false,
    };

    navigation.navigate('AddressMap', navParams);
  };

  // Función para finalizar con validaciones EXACTAMENTE IGUALES a Profile.jsx
  const handleConfirm = async (providedAddress = null) => {
    try {
      // console.log('🔍 DEBUGGING handleConfirm - Parámetros recibidos:', {
        // fromAddressManager: route.params?.fromAddressManager,
        // fromCart: route.params?.fromCart,
        // fromProfile: route.params?.fromProfile,
        // userId: user?.id,
        // usertype: user?.usertype,
        // editMode: route.params?.editMode
      // });
      

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

        // Primero obtener datos actuales del usuario para no sobrescribir nada
        const userDetailsResponse = await axios.get(
          `${API_BASE_URL}/api/userdetails/${userId}`,
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
        
        // USAR newAddressService PARA ACTUALIZAR DIRECCIÓN DEL PERFIL
        const updateResponse = await axios.post(
          `${API_BASE_URL}/api/updateuserprofile`,
          payload,
          { timeout: 15000 } // Timeout de 15 segundos para actualización del perfil
        );
        const response = updateResponse;
        
        if (response.status === 200) {
          
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
        // Preparar datos de la dirección CON COORDENADAS
        const addressData = {
          userId: user.id,
          address: `${finalAddress.userWrittenAddress}${finalAddress.references ? `, Referencias: ${finalAddress.references}` : ''}`,
          latitude: finalAddress.coordinates?.latitude || null,
          longitude: finalAddress.coordinates?.longitude || null,
          phone: route.params?.phone || '', // Si se proporciona teléfono
          isDefault: route.params?.setAsDefault || false // Si debe ser predeterminada
        };

        // Validar datos antes de enviar
        const validation = newAddressService.validateAddressData(addressData);
        if (!validation.isValid) {
          Alert.alert('Error', validation.errors.join('\n'));
          return;
        }

        let response;
        if (route.params?.editMode && route.params?.addressData?.id) {
          // Actualizar dirección existente
          response = await newAddressService.updateUserAddress({
            ...addressData,
            addressId: route.params.addressData.id
          });
        } else {
          // Crear nueva dirección
          
          // ✅ LÓGICA: Primera dirección automáticamente predeterminada
          // Verificar si el usuario no tiene ninguna dirección (ni en perfil ni adicionales)
          const userResponse = await axios.get(`${API_BASE_URL}/api/userdetails/${user.id}`);
          const currentUserData = userResponse.data?.data?.[0];
          const hasProfileAddress = currentUserData?.address && currentUserData.address.trim() !== '';
          
          // Obtener direcciones adicionales del usuario
          const existingAddresses = await newAddressService.getUserAddresses(user.id);
          const hasAdditionalAddresses = existingAddresses && existingAddresses.length > 0;
          
          // console.log('📊 Estado de direcciones:', {
            // hasProfileAddress,
            // hasAdditionalAddresses,
            // addressCount: existingAddresses?.length || 0
          // });
          
          if (!hasProfileAddress && !hasAdditionalAddresses) {
            // CASO: Primera dirección del usuario - hacerla automáticamente predeterminada
            
            // AGREGAR PRIMERA DIRECCIÓN CON newAddressService
            await newAddressService.addUserAddress({
              ...addressData,
              isDefault: true // Primera dirección siempre es predeterminada
            });
            
            // También actualizar el perfil del usuario para compatibilidad
            const profilePayload = {
              userid: user.id,
              first_name: currentUserData?.first_name || user.first_name,
              last_name: currentUserData?.last_name || user.last_name,
              phone: currentUserData?.phone || user.phone,
              email: currentUserData?.email || user.email,
              address: addressData.address
            };
            
            // 🔧 CRÍTICO: Preservar DOB para que no se elimine al agregar primera dirección
            if (currentUserData?.dob) {
              profilePayload.dob = currentUserData.dob;
            }
            
            await axios.post(`${API_BASE_URL}/api/updateuserprofile`, profilePayload);
            
            // Actualizar contexto local
            await updateUser({
              address: addressData.address,
              phone: addressData.phone || user.phone
            });
            
            response = { success: true, message: 'Primera dirección establecida como predeterminada' };
          } else {
            // CASO: Dirección adicional normal
            response = await newAddressService.addUserAddress({
              ...addressData,
              isDefault: false // Nunca predeterminada para direcciones adicionales
            });
          }
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
      // 🛡️ iOS FIX: Envolver toda la lógica de Guest con setTimeout para liberar UI Thread
      setTimeout(async () => {
        try {
        // USAR EXACTAMENTE EL MISMO FORMATO QUE PROFILE.JSX
        const addressToSend = `${finalAddress.userWrittenAddress}${finalAddress.references ? `, Referencias: ${finalAddress.references}` : ''}`;
        
        
        // ✅ FLUJO CONSOLIDADO: Validar email ingresado en este formulario
        const emailToUse = guestEmail?.trim() || route.params?.currentEmail || '';

        if (!emailToUse || !validateEmail(emailToUse)) {
          showAlert({
            type: 'warning',
            title: 'Email requerido',
            message: 'Por favor ingresa un correo electrónico válido para continuar.',
          });
          return;
        }

        // 1. PRE-PROCESAR fechas ANTES de guardar (evitar toISOString en main thread)
        let processedDeliveryInfo = route.params?.preservedDeliveryInfo;
        if (processedDeliveryInfo?.date && typeof processedDeliveryInfo.date !== 'string') {
          processedDeliveryInfo = {
            ...processedDeliveryInfo,
            date: processedDeliveryInfo.date.toISOString()
          };
        }

        // 2. GUARDAR datos complejos en AsyncStorage temporal
        const tempGuestData = {
          email: emailToUse,
          address: addressToSend,
          preservedDeliveryInfo: processedDeliveryInfo,
          preservedNeedInvoice: route.params?.preservedNeedInvoice || false,
          preservedTaxDetails: route.params?.preservedTaxDetails || null,
          preservedCoordinates: finalAddress.coordinates ? {
            driver_lat: finalAddress.coordinates.latitude,
            driver_long: finalAddress.coordinates.longitude
          } : null,
          mapCoordinates: finalAddress.coordinates ? {
            driver_lat: finalAddress.coordinates.latitude,
            driver_long: finalAddress.coordinates.longitude
          } : null,
          timestamp: Date.now()
        };

        await AsyncStorage.setItem('tempGuestData', JSON.stringify(tempGuestData));

        // 🔄 También guardar en BD para persistencia
        try {
          if (tempGuestData.email?.trim() && tempGuestData.address?.trim() && tempGuestData.mapCoordinates) {
            await newAddressService.saveGuestAddress({
              guestEmail: tempGuestData.email.trim(),
              address: tempGuestData.address,
              latitude: tempGuestData.mapCoordinates.driver_lat,
              longitude: tempGuestData.mapCoordinates.driver_long,
              phone: null
            });
          }
        } catch (error) {
          // Continuar con el flujo aunque falle el guardado en BD
        }

        // 3. NAVEGACIÓN SIMPLE - ir directamente al Cart con datos en AsyncStorage
        navigation.navigate('MainTabs', {
          screen: 'Carrito',
          params: {
            hasGuestDataInStorage: true,
            guestDataTimestamp: Date.now()
          }
        });
        
        
      } catch (error) {
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
      }, 0); // Cierre del setTimeout de iOS fix
    }
    // Fallback
    else {
      navigation.goBack();
    }

    } catch (error) {
      
      // Alert de emergencia para el usuario
      Alert.alert(
        '⚠️ Error Crítico',
        `Error en handleConfirm: ${error.message}. Por favor reporta este error.`,
        [
          { text: 'Reintentar', onPress: () => navigation.goBack(), style: 'default' },
          { text: 'Cancelar', onPress: () => navigation.goBack(), style: 'cancel' }
        ]
      );
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
      }
      
      if (route.params?.preservedReferences) {
        setReferences(route.params.preservedReferences);
      }
      
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

      // Parsear y pre-llenar dirección
      parseLegacyAddress(initialAddress);

      // Ir directamente al paso 2 (campos estructurados)
      setCurrentStep(2);

    }
  }, [isLegacyEdit, initialAddress]);

  // ✅ NUEVO: Inicializar campos cuando es edición desde AddressManager
  useEffect(() => {
    if (route.params?.editMode && route.params?.addressData) {
      const addressData = route.params.addressData;

      // Parsear la dirección completa para extraer componentes
      try {
        const addressComponents = parseAddressForEdit(addressData.address);

        // Pre-llenar los campos con los datos existentes
        setStreetName(addressComponents.street || '');
        setExteriorNumber(addressComponents.exteriorNumber || '');
        setInteriorNumber(addressComponents.interiorNumber || '');
        setNeighborhood(addressComponents.neighborhood || '');
        setPostalCode(addressComponents.postalCode || '');
        setMunicipality(addressComponents.municipality || '');
        setState(addressComponents.state || 'CDMX');
        setReferences(addressComponents.references || '');

        // Si hay coordenadas, establecerlas (convertir a números por si vienen como strings)
        if (addressData.latitude && addressData.longitude) {
          setMapCoordinates({
            latitude: parseFloat(addressData.latitude),
            longitude: parseFloat(addressData.longitude)
          });
          setCoordinatesSource('auto'); // Marcar como existente para mostrar "Ajustar"
          setUserHasConfirmedLocation(true);
        }

        // Ir directamente al paso 2 (campos estructurados)
        setCurrentStep(2);

      } catch (error) {
        // Si falla el parsing, al menos llenar la dirección completa
        setUserWrittenAddress(addressData.address || '');
        setCurrentStep(2);
      }
    }
  }, [route.params?.editMode, route.params?.addressData]);

  // ✅ NUEVO: Inicializar email de Guest si viene del flujo consolidado
  useEffect(() => {
    if (fromGuestCheckout) {
      // Inicializar email si el guest ya tiene uno en context
      if (user?.usertype === 'Guest' && user?.email?.trim()) {
        setGuestEmail(user.email);
        setEmailLocked(true);
      }
      // Si viene con currentEmail, usar ese
      if (currentEmail?.trim()) {
        setGuestEmail(currentEmail);
        setEmailLocked(true);
      }
    }
  }, [fromGuestCheckout, user, currentEmail]);

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
      municipality?.trim();

    if (isAddressComplete && currentStep === 2) {
      const finalAddress = buildFinalAddress();
      if (finalAddress && finalAddress.length > 15) {
        
        // ✅ SIMPLIFICADO: Delay para evitar múltiples calls mientras user escribe
        const timer = setTimeout(async () => {
          setIsProcessingLocation(true); // Estado único de carga
          try {
            const coords = await handleIntelligentGeocoding(finalAddress);
            // handleIntelligentGeocoding ya maneja setCoordinatesSource('auto')
          } finally {
            setIsProcessingLocation(false);
          }
        }, 1500); // 1.5 segundos de delay

        return () => clearTimeout(timer);
      }
    }
  }, [streetName, exteriorNumber, neighborhood, postalCode, municipality, currentStep]);

  // 🎯 Función helper para cerrar modal cuando se toque otro campo  
  const closeModalOnFocus = () => {
    if (showMunicipalityModal) {
      setShowMunicipalityModal(false);
    }
  };

  // 🎯 NUEVO: Cerrar modal al hacer scroll o tocar otros elementos
  const handleScrollViewTouch = () => {
    if (showMunicipalityModal) {
      setShowMunicipalityModal(false);
    }
  };

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
    const hasRequiredFields = streetName.trim() && exteriorNumber.trim() && neighborhood.trim() && postalCode.trim() && municipality.trim();
    // NUEVO: Validación adicional para Guest - requiere email válido
    const hasValidEmail = !fromGuestCheckout || (guestEmail?.trim() && validateEmail(guestEmail.trim()));
    const canSubmit = hasRequiredFields && hasValidEmail;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>
          {fromGuestCheckout ? 'Datos de entrega' : 'Escribe tu dirección exacta'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {fromGuestCheckout
            ? 'Ingresa tu email y dirección para completar tu pedido.'
            : 'Completa los datos para que el repartidor encuentre tu dirección fácilmente.'
          }
        </Text>

        {/* ✅ NUEVO: Campo de Email para Guest Checkout */}
        {fromGuestCheckout && (
          <View style={styles.guestEmailSection}>
            <View style={styles.addressField}>
              <Text style={styles.fieldLabel}>Correo electrónico *</Text>
              <TextInput
                ref={(ref) => registerInput('guestEmail', ref)}
                style={[
                  styles.addressInput,
                  emailLocked && styles.inputDisabled,
                  guestEmail.trim() && !validateEmail(guestEmail.trim()) && styles.inputError
                ]}
                placeholder="correo@ejemplo.com"
                value={guestEmail}
                onChangeText={setGuestEmail}
                onFocus={!emailLocked ? createFocusHandler('guestEmail') : undefined}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!emailLocked}
                placeholderTextColor="#999"
                returnKeyType="next"
              />
              {guestEmail.trim() && !validateEmail(guestEmail.trim()) && !emailLocked && (
                <Text style={styles.fieldError}>
                  Por favor ingresa un email válido
                </Text>
              )}
              {emailLocked && (
                <Text style={styles.fieldNote}>
                  Este email ya fue usado en tu dispositivo
                </Text>
              )}
            </View>
            <View style={styles.sectionDivider} />
          </View>
        )}

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
              onFocus={() => {
                createFocusHandler('street')();
                closeModalOnFocus();
              }}
              placeholderTextColor="#999"
            />
          </View>
          <View style={[styles.addressField, {flex: 1}]}>
            <Text style={styles.fieldLabel}>No. Ext *</Text>
            <TextInput
              ref={(ref) => registerInput('extNum', ref)}
              style={[styles.addressInput, fonts.numericStyles.tabular]}
              placeholder="Número"
              value={exteriorNumber}
              onChangeText={setExteriorNumber}
              onFocus={() => {
                createFocusHandler('extNum')();
                closeModalOnFocus();
              }}
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
              style={[styles.addressInput, fonts.numericStyles.tabular]}
              placeholder="Opcional"
              value={interiorNumber}
              onChangeText={setInteriorNumber}
              onFocus={() => {
                createFocusHandler('intNum')();
                closeModalOnFocus();
              }}
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
              onFocus={() => {
                createFocusHandler('colony')();
                closeModalOnFocus();
              }}
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
              style={[styles.addressInput, fonts.numericStyles.tabular]}
              placeholder="5 dígitos"
              value={postalCode}
              onChangeText={handlePostalCodeChange}
              onFocus={() => {
                createFocusHandler('postalCode', 0, { disableOnIOS: true })();
                closeModalOnFocus();
              }}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
          <View style={[styles.addressField, {flex: 2}]}>
            <Text style={styles.fieldLabel}>Alcaldía/Municipio *</Text>
            <TouchableOpacity
              style={[
                styles.addressInput,
                styles.modalSelector,
                municipality && styles.modalSelectorSelected
              ]}
              onPress={() => setShowMunicipalityModal(true)}>
              <Text style={[
                styles.modalSelectorText,
                !municipality && styles.modalSelectorPlaceholder
              ]}>
                {municipality || 'Seleccionar...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8B5E3C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fila 4: Estado */}
        <View style={styles.addressRow}>
          <View style={styles.addressField}>
            <Text style={styles.fieldLabel}>Estado</Text>
            <View style={styles.stateSelector}>
              <TouchableOpacity
                style={[styles.stateOption, state === 'CDMX' && styles.stateOptionActive]}
                onPress={() => {
                  setState('CDMX');
                  setAvailableOptions(ALCALDIAS_CDMX);
                  if (municipality && !ALCALDIAS_CDMX.includes(municipality)) {
                    setMunicipality('');
                  }
                }}>
                <Text style={[styles.stateOptionText, state === 'CDMX' && styles.stateOptionTextActive]}>
                  CDMX
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stateOption, state === 'Estado de México' && styles.stateOptionActive]}
                onPress={() => {
                  setState('Estado de México');
                  setAvailableOptions(MUNICIPIOS_EDOMEX);
                  if (municipality && !MUNICIPIOS_EDOMEX.includes(municipality)) {
                    setMunicipality('');
                  }
                }}>
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
            onFocus={createFocusHandler('references', Platform.OS === 'ios' ? 120 : 80)}
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
                  <Ionicons name="map-outline" size={16} color="#FFF" />
                  <Text style={styles.adjustLocationButtonText}>Ajustar</Text>
                </TouchableOpacity>
              </View>
            */}
            
            {/* ✅ SIMPLIFICADO: UI limpia basada en coordinatesSource */}
            <View style={styles.coordinatesStatus}>
              <Ionicons 
                name={coordinatesSource === 'user' ? "checkmark-circle" : coordinatesSource === 'auto' ? "location" : "location-outline"} 
                size={20} 
                color="#D27F27" 
              />
              <Text style={styles.coordinatesStatusText}>
                Puedes seleccionar ubicación para mayor precisión
              </Text>
              <TouchableOpacity
                style={[
                  coordinatesSource ? styles.adjustLocationButton : styles.selectLocationButton,
                  isProcessingLocation && styles.buttonDisabled
                ]}
                disabled={isProcessingLocation}
                onPress={async () => {
                  setIsProcessingLocation(true);
                  
                  try {
                    // Construir dirección y hacer geocoding solo si no tiene coordenadas
                    const finalAddress = buildFinalAddress();
                    setUserWrittenAddress(finalAddress);
                    
                    if (!mapCoordinates) {
                      await handleIntelligentGeocoding(finalAddress);
                    }
                    
                    // Ir al mapa directamente (sin delay artificial)
                    goToMap();
                  } finally {
                    setIsProcessingLocation(false);
                  }
                }}>
                <Ionicons
                  name={isProcessingLocation ? "time-outline" : (coordinatesSource ? "map-outline" : "map")}
                  size={16}
                  color="#FFF"
                />
                <Text style={coordinatesSource ? styles.adjustLocationButtonText : styles.selectLocationButtonText}>
                  {isProcessingLocation ? 'Preparando mapa...' : (coordinatesSource ? 'Ajustar' : 'Ir al mapa')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botón completar dirección */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !canSubmit && styles.confirmButtonDisabled
          ]}
          onPress={() => {
            // Fix crítico para iOS: Ejecutar en próximo tick para evitar UI freeze
            setTimeout(async () => {
              try {
                // Construir dirección final y guardarla
                const finalAddress = buildFinalAddress();
                setUserWrittenAddress(finalAddress);

                // Geocoding inteligente: Obtener coordenadas automáticamente si no las tiene
                if (!mapCoordinates) {
                  await handleIntelligentGeocoding(finalAddress);
                }

                // Fix iOS: Delay adicional antes de navegación para liberar UI thread
                await new Promise(resolve => setTimeout(resolve, 100));

                // Completar dirección directamente
                await handleConfirm(finalAddress);

              } catch (error) {
              }
            }, 0);
          }}
          disabled={!canSubmit}>
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
          <Text style={styles.confirmButtonText}>
            {fromGuestCheckout ? 'Continuar con pago' : 'Completar dirección'}
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
      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss();
        handleScrollViewTouch();
      }}>
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

      {/* Modal para seleccionar Alcaldía/Municipio (mismos estilos que DOB picker) */}
      <Modal
        visible={showMunicipalityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMunicipalityModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMunicipalityModal(false)}>
          <View style={styles.pickerModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.municipalityModalContent}>
                <Text style={styles.municipalityModalTitle}>
                  {state === 'CDMX' ? 'Seleccionar Alcaldía' : 'Seleccionar Municipio'}
                </Text>
                
                <ScrollView 
                  style={styles.municipalityList}
                  showsVerticalScrollIndicator={false}>
                  {availableOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.municipalityOption,
                        municipality === option && styles.municipalityOptionSelected
                      ]}
                      onPress={() => {
                        setMunicipality(option);
                        setShowMunicipalityModal(false);
                      }}>
                      <Text style={[
                        styles.municipalityOptionText,
                        municipality === option && styles.municipalityOptionTextSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.municipalityModalButtons}>
                  <TouchableOpacity
                    style={styles.municipalityModalCancel}
                    onPress={() => setShowMunicipalityModal(false)}>
                    <Text style={styles.municipalityModalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFF',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    textAlignVertical: 'top',
    marginBottom: 8,
    minHeight: Platform.OS === 'ios' ? 100 : 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 54,
    shadowColor: '#D27F27',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  finalButtonText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.bold,
    color: '#FFF',
    marginLeft: 10,
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
    shadowOpacity: 0,
  },
  referencesText: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: 'rgba(47,47,47,0.7)',
    marginTop: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  stateSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  stateOption: {
    flex: 1,
    paddingVertical: 14,
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
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  smartGeocodingText: {
    flex: 1,
    marginLeft: 8,
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    lineHeight: 18,
  },
  
  // NUEVOS ESTILOS PARA MAPA OPCIONAL INTEGRADO
  mapSection: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    padding: 14,
    backgroundColor: 'rgba(139, 94, 60, 0.04)',
    borderRadius: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#8B5E3C',
    borderRadius: 10,
  },
  adjustLocationButtonText: {
    marginLeft: 6,
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  selectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#D27F27',
    borderRadius: 10,
  },
  selectLocationButtonText: {
    marginLeft: 6,
    fontSize: fonts.size.small,
    fontFamily: fonts.bold,
    color: '#FFF',
  },
  // 🔧 NUEVO: Estilo para botón deshabilitado durante geocoding
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: '#CCCCCC',
    borderColor: '#CCCCCC',
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
  
  // ✅ ESTILOS PARA MODAL SELECTOR DE ALCALDÍAS/MUNICIPIOS
  modalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  modalSelectorSelected: {
    borderColor: '#D27F27',
    borderWidth: 1,
  },
  modalSelectorText: {
    fontSize: fonts.size.medium,
    fontFamily: fonts.regular,
    color: '#2F2F2F',
    flex: 1,
  },
  modalSelectorPlaceholder: {
    color: '#999',
  },
  
  // ✅ ESTILOS DEL MODAL (IGUALES AL DOB PICKER DE PROFILE.JSX)
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  municipalityModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  municipalityModalTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
    marginBottom: 20,
  },
  municipalityList: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  municipalityOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 94, 60, 0.1)',
  },
  municipalityOptionSelected: {
    backgroundColor: 'rgba(139, 94, 60, 0.15)',
  },
  municipalityOptionText: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    textAlign: 'center',
  },
  municipalityOptionTextSelected: {
    fontFamily: fonts.bold,
    color: '#8B5E3C',
  },
  municipalityModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  municipalityModalCancel: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#8B5E3C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  municipalityModalCancelText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#8B5E3C',
  },

  // ✅ ESTILOS PARA FLUJO GUEST CONSOLIDADO (EMAIL INTEGRADO)
  guestEmailSection: {
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(139, 94, 60, 0.15)',
    marginTop: 16,
    marginBottom: 8,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: 'rgba(47,47,47,0.6)',
  },
  inputError: {
    borderColor: '#E63946',
    borderWidth: 2,
  },
  fieldError: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#E63946',
    marginTop: 4,
  },
  fieldNote: {
    fontSize: fonts.size.small,
    fontFamily: fonts.regular,
    color: '#D27F27',
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default AddressFormUberStyle;